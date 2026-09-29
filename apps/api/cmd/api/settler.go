package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/miraclbet/api/internal/database"
)

func settleAutoWinBets(db *database.DB) {
	if db == nil {
		return
	}
	ctx := context.Background()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, user_id, potential_payout
		FROM bet_slips
		WHERE status = 'PENDING' AND is_auto_win = true
	`)
	if err != nil {
		log.Printf("[auto-settler] query error: %v", err)
		return
	}

	type slipRow struct {
		id, userID string
		payout     float64
	}
	var slips []slipRow
	for rows.Next() {
		var s slipRow
		if err := rows.Scan(&s.id, &s.userID, &s.payout); err == nil {
			slips = append(slips, s)
		}
	}
	rows.Close()

	for _, s := range slips {
		legRows, err := db.Pool.Query(ctx, `SELECT COALESCE(kickoff_at,'') FROM bet_legs WHERE bet_slip_id = $1`, s.id)
		if err != nil {
			continue
		}
		allReady := true
		hasLegs := false
		for legRows.Next() {
			hasLegs = true
			var kickoffStr string
			if err := legRows.Scan(&kickoffStr); err != nil || kickoffStr == "" {
				continue
			}
			kickoff, err := time.Parse(time.RFC3339, kickoffStr)
			if err != nil {
				continue
			}
			if time.Now().UTC().Before(kickoff.Add(105 * time.Minute)) {
				allReady = false
				break
			}
		}
		legRows.Close()

		if !hasLegs || !allReady {
			continue
		}

		db.Pool.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE bet_slip_id = $1`, s.id)
		db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'WON' WHERE id = $1`, s.id)
		db.Pool.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, s.payout, s.userID)
		log.Printf("[auto-settler] ✅ Settled slip %s as WON (Admin Ticket) — credited %.2f to user %s", s.id, s.payout, s.userID)
	}
}

func settleNormalBets(db *database.DB) {
	if db == nil {
		return
	}
	ctx := context.Background()

	// 1. Settle individual legs based on real fixture data
	legRows, err := db.Pool.Query(ctx, `
		SELECT bl.id, bl.market_name, bl.selection_name, COALESCE(f.score_home, 0), COALESCE(f.score_away, 0), f.status_short
		FROM bet_legs bl
		JOIN fixtures f ON bl.fixture_id = f.external_id
		JOIN bet_slips bs ON bl.bet_slip_id = bs.id
		WHERE bl.status = 'PENDING' 
		  AND bs.is_auto_win = false
		  AND f.status_short IN ('FT', 'AET', 'PEN', 'CANC', 'PSTP', 'ABD')
	`)
	if err != nil {
		log.Printf("[normal-settler] leg query error: %v", err)
		return
	}

	type legRow struct {
		id, market, selection, statusShort string
		homeScore, awayScore               int
	}
	var legsToUpdate []legRow
	for legRows.Next() {
		var l legRow
		if err := legRows.Scan(&l.id, &l.market, &l.selection, &l.homeScore, &l.awayScore, &l.statusShort); err == nil {
			legsToUpdate = append(legsToUpdate, l)
		}
	}
	legRows.Close()

	for _, l := range legsToUpdate {
		legStatus := "LOST"

		if l.statusShort == "CANC" || l.statusShort == "PSTP" || l.statusShort == "ABD" {
			legStatus = "VOID"
		} else {
			// Evaluate WON/LOST based on scores
			switch l.market {
			case "Match Winner":
				if l.selection == "Home Win" && l.homeScore > l.awayScore {
					legStatus = "WON"
				} else if l.selection == "Away Win" && l.awayScore > l.homeScore {
					legStatus = "WON"
				} else if l.selection == "Draw" && l.homeScore == l.awayScore {
					legStatus = "WON"
				}
			case "Both Teams to Score":
				if l.selection == "Yes" && l.homeScore > 0 && l.awayScore > 0 {
					legStatus = "WON"
				} else if l.selection == "No" && (l.homeScore == 0 || l.awayScore == 0) {
					legStatus = "WON"
				}
			case "Over 2.5 Goals":
				if l.homeScore+l.awayScore > 2 {
					legStatus = "WON"
				}
			case "Under 2.5 Goals":
				if l.homeScore+l.awayScore <= 2 {
					legStatus = "WON"
				}
			case "Draw No Bet":
				if l.selection == "Home" && l.homeScore > l.awayScore {
					legStatus = "WON"
				} else if l.selection == "Away" && l.awayScore > l.homeScore {
					legStatus = "WON"
				} else if l.homeScore == l.awayScore {
					legStatus = "VOID" // Refunded
				}
			case "Correct Score":
				expected := fmt.Sprintf("%d-%d", l.homeScore, l.awayScore)
				if l.selection == expected {
					legStatus = "WON"
				}
			default:
				// Fallback generic checking if we don't recognize the market
				if strings.Contains(strings.ToLower(l.selection), "home") && l.homeScore > l.awayScore {
					legStatus = "WON"
				} else if strings.Contains(strings.ToLower(l.selection), "away") && l.awayScore > l.homeScore {
					legStatus = "WON"
				}
			}
		}

		db.Pool.Exec(ctx, `UPDATE bet_legs SET status = $1 WHERE id = $2`, legStatus, l.id)
		log.Printf("[normal-settler] Leg %s evaluated as %s", l.id, legStatus)
	}

	// 2. Evaluate Slips
	// A slip is WON if ALL legs are WON (or VOID, but at least one WON)
	// A slip is LOST if ANY leg is LOST
	// A slip is PENDING if ANY leg is PENDING
	slipRows, err := db.Pool.Query(ctx, `
		SELECT bs.id, bs.user_id, bs.potential_payout,
		       COUNT(bl.id) as total_legs,
		       SUM(CASE WHEN bl.status = 'WON' THEN 1 ELSE 0 END) as won_legs,
		       SUM(CASE WHEN bl.status = 'LOST' THEN 1 ELSE 0 END) as lost_legs,
		       SUM(CASE WHEN bl.status = 'VOID' THEN 1 ELSE 0 END) as void_legs,
		       SUM(CASE WHEN bl.status = 'PENDING' THEN 1 ELSE 0 END) as pending_legs
		FROM bet_slips bs
		JOIN bet_legs bl ON bl.bet_slip_id = bs.id
		WHERE bs.status = 'PENDING' AND bs.is_auto_win = false
		GROUP BY bs.id, bs.user_id, bs.potential_payout
		HAVING SUM(CASE WHEN bl.status = 'PENDING' THEN 1 ELSE 0 END) = 0
	`)
	if err != nil {
		log.Printf("[normal-settler] slip query error: %v", err)
		return
	}

	type slipEval struct {
		id, userID                                  string
		payout                                      float64
		total, won, lost, void, pending             int
	}
	var slipsToEval []slipEval
	for slipRows.Next() {
		var s slipEval
		if err := slipRows.Scan(&s.id, &s.userID, &s.payout, &s.total, &s.won, &s.lost, &s.void, &s.pending); err == nil {
			slipsToEval = append(slipsToEval, s)
		}
	}
	slipRows.Close()

	for _, s := range slipsToEval {
		if s.lost > 0 {
			db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'LOST' WHERE id = $1`, s.id)
			log.Printf("[normal-settler] Slip %s marked as LOST", s.id)
		} else if s.won > 0 || s.void > 0 {
			finalPayout := s.payout
			if s.won == 0 && s.void == s.total {
				// ALL legs voided -> refund stake
				var stake float64
				db.Pool.QueryRow(ctx, `SELECT stake FROM bet_slips WHERE id = $1`, s.id).Scan(&stake)
				finalPayout = stake
				db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'REFUNDED' WHERE id = $1`, s.id)
				db.Pool.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, finalPayout, s.userID)
				log.Printf("[normal-settler] Slip %s REFUNDED — credited %.2f to user %s", s.id, finalPayout, s.userID)
			} else {
				// Normal win
				db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'WON' WHERE id = $1`, s.id)
				db.Pool.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, finalPayout, s.userID)
				log.Printf("[normal-settler] 🎉 Slip %s WON — credited %.2f to user %s", s.id, finalPayout, s.userID)
			}
		}
	}
}
