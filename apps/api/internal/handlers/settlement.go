package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/miraclbet/api/internal/database"
)

// SettlementHandler handles admin bet settlement
type SettlementHandler struct {
	db *database.DB
}

func NewSettlementHandler(db *database.DB) *SettlementHandler {
	return &SettlementHandler{db: db}
}

// MatchDuration is the duration of a match from kickoff (105 min including extra time)
const MatchDuration = 105 * time.Minute

// parseKickoff parses timestamp strings into UTC
func parseKickoff(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	formats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time: %s", s)
}

// HasAnyMatchWon checks if at least one match in the given booking code or selections has already ended / won.
// If at least one match has completed its duration (kickoff + 105m) or been settled WON in DB,
// it returns (true, reason) to indicate that this ticket is expired and can no longer be loaded or placed.
// While matches still have time remaining before end time, newly created tickets remain placeable!
func HasAnyMatchWon(ctx context.Context, db *database.DB, bookingCode string, selections []BetSelection, bookingCreatedAt time.Time) (bool, string) {
	if db == nil {
		return false, ""
	}
	now := time.Now().UTC()

	// 1. Check if match duration (kickoff + 105 min) has passed for each selection
	for _, sel := range selections {
		if sel.KickoffAt != "" {
			// Match has a kickoff time — only expire once the match duration has passed
			if ko, err := parseKickoff(sel.KickoffAt); err == nil {
				endTime := ko.Add(MatchDuration)
				if now.After(endTime) || now.Equal(endTime) {
					return true, "At least one game on this ticket has already started."
				}
			}
		} else if !bookingCreatedAt.IsZero() {
			// No kickoff time set — fallback: treat as ended 105 min after booking creation
			if now.After(bookingCreatedAt.Add(MatchDuration)) || now.Equal(bookingCreatedAt.Add(MatchDuration)) {
				return true, "At least one game on this ticket has already started."
			}
		}

		// Also check if this fixture in fixtures table is finished (for real API matches)
		if sel.FixtureID != "" && !strings.HasPrefix(sel.FixtureID, "manual-") {
			var statusShort string
			_ = db.Pool.QueryRow(ctx, "SELECT COALESCE(status_short, '') FROM fixtures WHERE external_id = $1", sel.FixtureID).Scan(&statusShort)
			if statusShort == "FT" || statusShort == "AET" || statusShort == "PEN" || statusShort == "FINISHED" {
				return true, "At least one game on this ticket has already started."
			}
		}

		// Also check if this manual fixture was already settled as WON in bet_legs
		if sel.FixtureID != "" {
			var wonCount int
			_ = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM bet_legs WHERE fixture_id = $1 AND status = 'WON'`, sel.FixtureID).Scan(&wonCount)
			if wonCount > 0 {
				return true, "At least one game on this ticket has already started."
			}
		}
	}

	// 2. Check if any slip with this booking code has already won, or has any won leg
	cleanCode := strings.ToUpper(strings.TrimSpace(bookingCode))
	if cleanCode != "" {
		var wonSlipsOrLegs int
		_ = db.Pool.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM bet_slips bs
			LEFT JOIN bet_legs bl ON bl.bet_slip_id = bs.id
			WHERE UPPER(bs.booking_code) = $1
			  AND (bs.status = 'WON' OR bl.status = 'WON')
		`, cleanCode).Scan(&wonSlipsOrLegs)
		if wonSlipsOrLegs > 0 {
			return true, "At least one game on this ticket has already started."
		}

		// If selections slice was empty, load selections from bet_bookings and check them
		if len(selections) == 0 {
			var selJSON string
			var bCreatedAt time.Time
			err := db.Pool.QueryRow(ctx, `SELECT selections, created_at FROM bet_bookings WHERE UPPER(code) = $1`, cleanCode).Scan(&selJSON, &bCreatedAt)
			if err == nil {
				var bSels []BetSelection
				if json.Unmarshal([]byte(selJSON), &bSels) == nil && len(bSels) > 0 {
					return HasAnyMatchWon(ctx, db, "", bSels, bCreatedAt)
				}
			}
		}
	}

	return false, ""
}

// SettleDueAutoWinSlips checks all auto-win tickets:
// 1. For each match whose end time (kickoff + 105 min) has passed: marks that match as WON.
// 2. Only when ALL matches of a ticket are completed and WON: marks the ticket as WON and credits user balance!
// STRICT IDEMPOTENCY: checks payout_credited = false under row-lock to guarantee balance is NEVER credited twice!
func SettleDueAutoWinSlips(ctx context.Context, db *database.DB) {
	if db == nil {
		return
	}
	now := time.Now().UTC()

	// 1. Settle individual legs of auto-win / manual slips whose match end time has passed
	legRows, err := db.Pool.Query(ctx, `
		SELECT bl.id, bl.bet_slip_id, bl.match_name, COALESCE(bl.kickoff_at, ''), bs.created_at
		FROM bet_legs bl
		JOIN bet_slips bs ON bl.bet_slip_id = bs.id
		WHERE bs.status = 'PENDING'
		  AND bs.is_auto_win = true
		  AND bl.fixture_id LIKE 'manual-%'
		  AND bl.status = 'PENDING'
	`)
	if err == nil {
		type pendingLeg struct {
			id, slipID, matchName, kickoffAt string
			slipCreatedAt                    time.Time
		}
		var pendingLegs []pendingLeg
		for legRows.Next() {
			var pl pendingLeg
			if err := legRows.Scan(&pl.id, &pl.slipID, &pl.matchName, &pl.kickoffAt, &pl.slipCreatedAt); err == nil {
				pendingLegs = append(pendingLegs, pl)
			}
		}
		legRows.Close()

		for _, leg := range pendingLegs {
			var endTime time.Time
			if leg.kickoffAt != "" {
				if ko, err := parseKickoff(leg.kickoffAt); err == nil {
					endTime = ko.Add(MatchDuration)
				}
			}
			if endTime.IsZero() {
				// Fallback: if kickoffAt is empty/unparseable, use slip created_at + MatchDuration
				endTime = leg.slipCreatedAt.Add(MatchDuration)
			}
			if now.After(endTime) || now.Equal(endTime) {
				_, err := db.Pool.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE id = $1 AND status = 'PENDING'`, leg.id)
				if err == nil {
					log.Printf("[auto-settle] Leg %s (%s) reached end time %s -> marked WON", leg.id, leg.matchName, endTime.Format("15:04:05"))
				}
			}
		}
	}

	// 2. Check all PENDING is_auto_win slips — win ticket ONLY IF ALL legs are completed and WON
	slipRows, err := db.Pool.Query(ctx, `
		SELECT bs.id, bs.user_id, bs.potential_payout,
		       COUNT(bl.id) as total_legs,
		       COUNT(bl.id) FILTER (WHERE bl.status = 'WON') as won_legs,
		       COUNT(bl.id) FILTER (WHERE bl.status = 'PENDING') as pending_legs,
		       COUNT(bl.id) FILTER (WHERE bl.status = 'LOST') as lost_legs
		FROM bet_slips bs
		JOIN bet_legs bl ON bl.bet_slip_id = bs.id
		WHERE bs.status = 'PENDING'
		  AND bs.is_auto_win = true
		  AND COALESCE(bs.payout_credited, false) = false
		GROUP BY bs.id, bs.user_id, bs.potential_payout
	`)
	if err == nil {
		type slipCheck struct {
			id, userID                                string
			payout                                    float64
			totalLegs, wonLegs, pendingLegs, lostLegs int
		}
		var slipsToCheck []slipCheck
		for slipRows.Next() {
			var sc slipCheck
			if err := slipRows.Scan(&sc.id, &sc.userID, &sc.payout, &sc.totalLegs, &sc.wonLegs, &sc.pendingLegs, &sc.lostLegs); err == nil {
				slipsToCheck = append(slipsToCheck, sc)
			}
		}
		slipRows.Close()

		for _, s := range slipsToCheck {
			// If any leg was marked LOST, mark the slip as LOST
			if s.lostLegs > 0 {
				_, _ = db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'LOST' WHERE id = $1 AND status = 'PENDING'`, s.id)
				continue
			}

			// ONLY win and credit balance if ALL legs are completed and WON!
			if s.totalLegs > 0 && s.pendingLegs == 0 && s.lostLegs == 0 && s.wonLegs == s.totalLegs {
				tx, err := db.Pool.Begin(ctx)
				if err != nil {
					continue
				}

				// Verify still PENDING and payout NOT yet credited under lock
				var curStatus string
				var curPayoutCredited bool
				var actualPayout float64
				var slipUserID string
				err = tx.QueryRow(ctx, `
					SELECT status, COALESCE(payout_credited, false), potential_payout, user_id 
					FROM bet_slips 
					WHERE id = $1 
					FOR UPDATE
				`, s.id).Scan(&curStatus, &curPayoutCredited, &actualPayout, &slipUserID)
				if err != nil || curStatus != "PENDING" || curPayoutCredited {
					tx.Rollback(ctx)
					continue
				}

				// Check user role: agents are not credited balance (they operate with cash in person)
				var userRole string
				_ = tx.QueryRow(ctx, `SELECT role::text FROM users WHERE id = $1`, slipUserID).Scan(&userRole)
				isAgent := userRole == "AGENT"

				// Update slip status and payout_credited flag atomically
				res, err := tx.Exec(ctx, `
					UPDATE bet_slips 
					SET status = 'WON', payout_credited = true 
					WHERE id = $1 AND status = 'PENDING' AND COALESCE(payout_credited, false) = false
				`, s.id)
				if err != nil || res.RowsAffected() == 0 {
					tx.Rollback(ctx)
					continue
				}

				// Ensure all legs of this slip are also marked WON
				_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE bet_slip_id = $1`, s.id)

				// Credit balance ONLY for real users (not agents) and when payout > 0
				if !isAgent && actualPayout > 0 {
					if _, err := tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, actualPayout, slipUserID); err != nil {
						tx.Rollback(ctx)
						continue
					}
				}

				if err := tx.Commit(ctx); err == nil {
					log.Printf("[auto-settle] 🎉 ALL %d matches completed! Slip %s WON — credited %.2f Br to user %s (isAgent=%v)", s.totalLegs, s.id, actualPayout, slipUserID, isAgent)
				}
			}
		}
	}
}

func (h *SettlementHandler) settleNormalSlips(ctx context.Context) {
	rows, err := h.db.Pool.Query(ctx, `
		SELECT DISTINCT bs.id
		FROM bet_slips bs
		JOIN bet_legs bl ON bl.bet_slip_id = bs.id
		JOIN fixtures f ON f.external_id = bl.fixture_id
		WHERE bs.status = 'PENDING'
		  AND bs.is_auto_win = false
		  AND bl.status = 'PENDING'
		  AND f.status_short IN ('FT','AET','PEN','CANC','PSTP','ABD')
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	var slipIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			slipIDs = append(slipIDs, id)
		}
	}
	rows.Close()

	for _, id := range slipIDs {
		h.autoSettleSlip(ctx, id)
	}
}

// StartAutoSettleLoop runs in the background every 10 seconds.
// For manual/auto-win tickets: settles each match when its end time arrives, and wins the ticket when all are done.
// For normal fixture bets: checks finished fixtures from DB and settles.
func (h *SettlementHandler) StartAutoSettleLoop(ctx context.Context) {
	log.Println("[auto-settle] background settlement loop started (10s interval)")

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	// Run initial settlement on startup
	SettleDueAutoWinSlips(ctx, h.db)
	h.recheckFinishedNormalLegs(ctx)
	h.settleNormalSlips(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("[auto-settle] stopping")
			return
		case <-ticker.C:
			SettleDueAutoWinSlips(ctx, h.db)
			h.recheckFinishedNormalLegs(ctx)
			h.settleNormalSlips(ctx)
		}
	}
}

func (h *SettlementHandler) autoSettleSlip(ctx context.Context, slipID string) {
	// Get all PENDING legs for this slip that have a finished fixture
	legRows, err := h.db.Pool.Query(ctx, `
		SELECT
			bl.id,
			bl.market_name,
			bl.selection_name,
			COALESCE(bl.selection_id, ''),
			COALESCE(bl.match_name, ''),
			COALESCE(f.home_team, ''),
			COALESCE(f.away_team, ''),
			bl.odds,
			COALESCE(f.score_home, -1),
			COALESCE(f.score_away, -1),
			COALESCE(f.status_short, '')
		FROM bet_legs bl
		LEFT JOIN fixtures f ON f.external_id = bl.fixture_id
		WHERE bl.bet_slip_id = $1
		  AND bl.status = 'PENDING'
		  AND f.status_short IN ('FT','AET','PEN','CANC','PSTP','ABD')
	`, slipID)
	if err != nil {
		log.Printf("[auto-settle] leg query error for slip %s: %v", slipID, err)
		return
	}
	type legResult struct {
		id            string
		marketName    string
		selectionName string
		selectionID   string
		matchName     string
		homeTeam      string
		awayTeam      string
		odds          float64
		scoreHome     int
		scoreAway     int
		statusShort   string
	}
	var legs []legResult
	defer legRows.Close()
	for legRows.Next() {
		var l legResult
		legRows.Scan(&l.id, &l.marketName, &l.selectionName, &l.selectionID, &l.matchName, &l.homeTeam, &l.awayTeam, &l.odds, &l.scoreHome, &l.scoreAway, &l.statusShort)
		legs = append(legs, l)
	}
	legRows.Close()

	// Settle each finished leg
	for _, l := range legs {
		status := h.determineLegStatus(l.marketName, l.selectionName, l.selectionID, l.matchName, l.homeTeam, l.awayTeam, l.scoreHome, l.scoreAway, l.statusShort)
		_, err := h.db.Pool.Exec(ctx,
			`UPDATE bet_legs SET status = $1 WHERE id = $2`, status, l.id,
		)
		if err != nil {
			log.Printf("[auto-settle] failed to update leg %s: %v", l.id, err)
			continue
		}
		log.Printf("[auto-settle] slip %s leg %s -> %s (%s: %s | %d-%d)", slipID, l.id, status, l.marketName, l.selectionName, l.scoreHome, l.scoreAway)
	}

	// Now try to settle the whole slip
	if err := h.trySettleSlip(ctx, slipID); err != nil {
		log.Printf("[auto-settle] trySettleSlip error for %s: %v", slipID, err)
	}
}

// recheckFinishedNormalLegs checks all legs of normal (non-auto-win) slips with finished fixtures.
// If a leg's status in DB doesn't match the true result (e.g. was wrongly marked LOST due to legacy exact string matching),
// it corrects the leg status and re-evaluates the slip!
func (h *SettlementHandler) recheckFinishedNormalLegs(ctx context.Context) {
	rows, err := h.db.Pool.Query(ctx, `
		SELECT
			bl.id,
			bl.bet_slip_id,
			bl.market_name,
			bl.selection_name,
			COALESCE(bl.selection_id, ''),
			COALESCE(bl.match_name, ''),
			COALESCE(f.home_team, ''),
			COALESCE(f.away_team, ''),
			bl.status,
			COALESCE(f.score_home, -1),
			COALESCE(f.score_away, -1),
			COALESCE(f.status_short, '')
		FROM bet_legs bl
		JOIN bet_slips bs ON bl.bet_slip_id = bs.id
		JOIN fixtures f ON f.external_id = bl.fixture_id
		WHERE bs.is_auto_win = false
		  AND f.status_short IN ('FT','AET','PEN','CANC','PSTP','ABD')
		  AND f.score_home >= 0 AND f.score_away >= 0
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	type legCorrection struct {
		id, slipID, currentStatus, correctStatus string
	}
	var corrections []legCorrection

	for rows.Next() {
		var id, slipID, market, selName, selID, mName, homeTeam, awayTeam, currentStatus, fStatus string
		var scoreHome, scoreAway int
		if err := rows.Scan(&id, &slipID, &market, &selName, &selID, &mName, &homeTeam, &awayTeam, &currentStatus, &scoreHome, &scoreAway, &fStatus); err != nil {
			continue
		}
		correctStatus := h.determineLegStatus(market, selName, selID, mName, homeTeam, awayTeam, scoreHome, scoreAway, fStatus)
		if correctStatus != currentStatus && (correctStatus == "WON" || correctStatus == "LOST" || correctStatus == "VOID") {
			corrections = append(corrections, legCorrection{
				id: id, slipID: slipID, currentStatus: currentStatus, correctStatus: correctStatus,
			})
		}
	}
	rows.Close()

	if len(corrections) == 0 {
		return
	}

	affectedSlips := make(map[string]bool)
	for _, c := range corrections {
		log.Printf("[auto-settle-fix] Correcting leg %s on slip %s from %s -> %s", c.id, c.slipID, c.currentStatus, c.correctStatus)
		_, _ = h.db.Pool.Exec(ctx, `UPDATE bet_legs SET status = $1 WHERE id = $2`, c.correctStatus, c.id)
		affectedSlips[c.slipID] = true
	}

	for slipID := range affectedSlips {
		// Recompute slip status based on all its legs
		var total, pending, lost int
		_ = h.db.Pool.QueryRow(ctx, `
			SELECT
				COUNT(*),
				COUNT(*) FILTER (WHERE status = 'PENDING'),
				COUNT(*) FILTER (WHERE status = 'LOST')
			FROM bet_legs WHERE bet_slip_id = $1
		`, slipID).Scan(&total, &pending, &lost)

		if pending > 0 {
			// Still has pending games! Set slip status back to PENDING so user can track it
			_, _ = h.db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'PENDING' WHERE id = $1`, slipID)
		} else if lost > 0 {
			_, _ = h.db.Pool.Exec(ctx, `UPDATE bet_slips SET status = 'LOST' WHERE id = $1`, slipID)
		} else if total > 0 && pending == 0 && lost == 0 {
			// All legs are WON! Settle slip as WON and credit payout if not credited
			_ = h.trySettleSlip(ctx, slipID)
		}
	}
}

// determineLegStatus evaluates a finished match against the selection and returns WON/LOST/VOID
func (h *SettlementHandler) determineLegStatus(marketName, selectionName, selectionID, matchName, homeTeam, awayTeam string, scoreHome, scoreAway int, statusShort string) string {
	// Cancelled/postponed/abandoned = VOID
	if statusShort == "CANC" || statusShort == "PSTP" || statusShort == "ABD" {
		return "VOID"
	}

	if scoreHome < 0 || scoreAway < 0 {
		return "PENDING"
	}

	// Extract homeTeam and awayTeam from matchName if not provided
	if (homeTeam == "" || awayTeam == "") && strings.Contains(matchName, " vs ") {
		parts := strings.Split(matchName, " vs ")
		if len(parts) >= 2 {
			if homeTeam == "" {
				homeTeam = strings.TrimSpace(parts[0])
			}
			if awayTeam == "" {
				awayTeam = strings.TrimSpace(parts[1])
			}
		}
	}

	selNameLower := strings.ToLower(strings.TrimSpace(selectionName))
	marketLower := strings.ToLower(strings.TrimSpace(marketName))
	selIDUpper := strings.ToUpper(strings.TrimSpace(selectionID))
	homeLower := strings.ToLower(strings.TrimSpace(homeTeam))
	awayLower := strings.ToLower(strings.TrimSpace(awayTeam))
	totalGoals := scoreHome + scoreAway

	// 1. DOUBLE CHANCE
	isDoubleChance := strings.Contains(marketLower, "double chance") ||
		strings.HasSuffix(selIDUpper, "-1X") || strings.HasSuffix(selIDUpper, "-X2") ||
		strings.HasSuffix(selIDUpper, "-2X") || strings.HasSuffix(selIDUpper, "-12") ||
		strings.Contains(selNameLower, " or ") ||
		selNameLower == "1x" || selNameLower == "x2" || selNameLower == "2x" || selNameLower == "12" ||
		strings.Contains(selNameLower, "home/draw") || strings.Contains(selNameLower, "draw/away") ||
		strings.Contains(selNameLower, "home/away")

	if isDoubleChance {
		// 1X: Home or Draw
		if strings.HasSuffix(selIDUpper, "-1X") ||
			selNameLower == "1x" || selNameLower == "home/draw" || selNameLower == "home or draw" ||
			(strings.Contains(selNameLower, " or draw") && (awayLower == "" || !strings.Contains(selNameLower, awayLower))) ||
			(strings.Contains(selNameLower, "draw or ") && (awayLower == "" || !strings.Contains(selNameLower, awayLower))) ||
			(homeLower != "" && strings.Contains(selNameLower, homeLower) && strings.Contains(selNameLower, "draw")) {
			if scoreHome >= scoreAway {
				return "WON"
			}
			return "LOST"
		}

		// X2: Draw or Away / Away or Draw
		if strings.HasSuffix(selIDUpper, "-X2") || strings.HasSuffix(selIDUpper, "-2X") ||
			selNameLower == "x2" || selNameLower == "2x" ||
			selNameLower == "draw/away" || selNameLower == "away/draw" ||
			selNameLower == "away or draw" || selNameLower == "draw or away" ||
			(strings.Contains(selNameLower, " or draw") && awayLower != "" && strings.Contains(selNameLower, awayLower)) ||
			(strings.Contains(selNameLower, "draw or ") && awayLower != "" && strings.Contains(selNameLower, awayLower)) ||
			(awayLower != "" && strings.Contains(selNameLower, awayLower) && strings.Contains(selNameLower, "draw")) {
			if scoreAway >= scoreHome {
				return "WON"
			}
			return "LOST"
		}

		// 12: Home or Away
		if strings.HasSuffix(selIDUpper, "-12") ||
			selNameLower == "12" || selNameLower == "home/away" || selNameLower == "home or away" ||
			(homeLower != "" && awayLower != "" && strings.Contains(selNameLower, homeLower) && strings.Contains(selNameLower, awayLower)) ||
			(strings.Contains(selNameLower, " or ") && !strings.Contains(selNameLower, "draw")) {
			if scoreHome != scoreAway {
				return "WON"
			}
			return "LOST"
		}
	}

	// 2. MATCH WINNER / 1X2 / FULL TIME RESULT
	if strings.Contains(marketLower, "winner") || strings.Contains(marketLower, "1x2") || strings.Contains(marketLower, "full time") || marketLower == "" {
		// Draw
		if strings.HasSuffix(selIDUpper, "-X") || selNameLower == "draw" || selNameLower == "x" || selNameLower == "tie" {
			if scoreHome == scoreAway {
				return "WON"
			}
			return "LOST"
		}

		// Home Win
		if strings.HasSuffix(selIDUpper, "-1") || selNameLower == "home win" || selNameLower == "home" || selNameLower == "1" ||
			(homeLower != "" && (selNameLower == homeLower || (strings.Contains(selNameLower, homeLower) && !strings.Contains(selNameLower, "draw")))) {
			if scoreHome > scoreAway {
				return "WON"
			}
			return "LOST"
		}

		// Away Win
		if strings.HasSuffix(selIDUpper, "-2") || selNameLower == "away win" || selNameLower == "away" || selNameLower == "2" ||
			(awayLower != "" && (selNameLower == awayLower || (strings.Contains(selNameLower, awayLower) && !strings.Contains(selNameLower, "draw")))) {
			if scoreAway > scoreHome {
				return "WON"
			}
			return "LOST"
		}
	}

	// 3. BOTH TEAMS TO SCORE
	if strings.Contains(marketLower, "both teams") || strings.Contains(marketLower, "btts") {
		if selNameLower == "yes" {
			if scoreHome > 0 && scoreAway > 0 {
				return "WON"
			}
			return "LOST"
		}
		if selNameLower == "no" {
			if scoreHome == 0 || scoreAway == 0 {
				return "WON"
			}
			return "LOST"
		}
	}

	// 4. OVER / UNDER GOALS (Match Total or Team Total)
	if strings.Contains(marketLower, "over") || strings.Contains(marketLower, "under") ||
		strings.Contains(marketLower, "goals") || strings.Contains(marketLower, "total") ||
		strings.Contains(selNameLower, "over") || strings.Contains(selNameLower, "under") {

		isHomeTotal := strings.Contains(marketLower, "home") && !strings.Contains(marketLower, "away")
		isAwayTotal := strings.Contains(marketLower, "away") && !strings.Contains(marketLower, "home")

		goalsToCheck := float64(totalGoals)
		if isHomeTotal {
			goalsToCheck = float64(scoreHome)
		} else if isAwayTotal {
			goalsToCheck = float64(scoreAway)
		}

		// Extract threshold dynamically (0.5, 1.5, 2.5, 3.5, 4.5, 5.5...)
		threshold := 2.5
		for _, token := range strings.Fields(strings.ReplaceAll(selNameLower, ",", ".")) {
			tokenClean := strings.Trim(token, "()[]{}abcdefghijklmnopqrstuvwxyz")
			if f, err := strconv.ParseFloat(tokenClean, 64); err == nil {
				threshold = f
				break
			}
		}

		if strings.Contains(selNameLower, "over") {
			if goalsToCheck > threshold {
				return "WON"
			}
			return "LOST"
		}
		if strings.Contains(selNameLower, "under") {
			if goalsToCheck < threshold {
				return "WON"
			}
			return "LOST"
		}
	}

	// 5. DRAW NO BET
	if strings.Contains(marketLower, "draw no bet") {
		if scoreHome == scoreAway {
			return "VOID"
		}
		if selNameLower == "home" || strings.HasSuffix(selIDUpper, "-1") || (homeLower != "" && strings.Contains(selNameLower, homeLower)) {
			if scoreHome > scoreAway {
				return "WON"
			}
			return "LOST"
		}
		if selNameLower == "away" || strings.HasSuffix(selIDUpper, "-2") || (awayLower != "" && strings.Contains(selNameLower, awayLower)) {
			if scoreAway > scoreHome {
				return "WON"
			}
			return "LOST"
		}
	}

	// 6. CORRECT SCORE / EXACT SCORE
	if strings.Contains(marketLower, "correct score") || strings.Contains(marketLower, "exact score") || strings.Contains(marketLower, "score") {
		clean := strings.ReplaceAll(selNameLower, " ", "")
		clean = strings.ReplaceAll(clean, ":", "-")
		expected := fmt.Sprintf("%d-%d", scoreHome, scoreAway)
		if clean == expected {
			return "WON"
		}
		// If it has digits and hyphen (like "2-0")
		if strings.Contains(clean, "-") {
			return "LOST"
		}
	}

	// 7. ODD / EVEN GOALS
	if strings.Contains(marketLower, "odd/even") || strings.Contains(marketLower, "odd or even") ||
		selNameLower == "odd" || selNameLower == "even" {
		isEven := (totalGoals % 2) == 0
		if selNameLower == "even" {
			if isEven {
				return "WON"
			}
			return "LOST"
		}
		if selNameLower == "odd" {
			if !isEven {
				return "WON"
			}
			return "LOST"
		}
	}

	// 8. CLEAN SHEET
	if strings.Contains(marketLower, "clean sheet") {
		isHome := strings.Contains(marketLower, "home") || (homeLower != "" && strings.Contains(marketLower, homeLower))
		isAway := strings.Contains(marketLower, "away") || (awayLower != "" && strings.Contains(marketLower, awayLower))
		if isHome {
			if selNameLower == "yes" {
				if scoreAway == 0 { return "WON" }
				return "LOST"
			}
			if selNameLower == "no" {
				if scoreAway > 0 { return "WON" }
				return "LOST"
			}
		}
		if isAway {
			if selNameLower == "yes" {
				if scoreHome == 0 { return "WON" }
				return "LOST"
			}
			if selNameLower == "no" {
				if scoreHome > 0 { return "WON" }
				return "LOST"
			}
		}
	}

	// 9. HANDICAP
	if strings.Contains(marketLower, "handicap") {
		isHome := strings.Contains(selNameLower, "home") || (homeLower != "" && strings.Contains(selNameLower, homeLower)) || strings.HasPrefix(selIDUpper, "-1")
		isAway := strings.Contains(selNameLower, "away") || (awayLower != "" && strings.Contains(selNameLower, awayLower)) || strings.HasPrefix(selIDUpper, "-2")

		var handicap float64
		for _, token := range strings.Fields(selNameLower) {
			tokenClean := strings.Trim(token, "()[]{}abcdefghijklmnopqrstuvwxyz")
			if f, err := strconv.ParseFloat(tokenClean, 64); err == nil && (strings.HasPrefix(token, "+") || strings.HasPrefix(token, "-")) {
			handicap = f
			break
			}
		}

		if isHome {
			adjScore := float64(scoreHome) + handicap
			if adjScore > float64(scoreAway) {
				return "WON"
			} else if adjScore == float64(scoreAway) {
				return "VOID"
			}
			return "LOST"
		}
		if isAway {
			adjScore := float64(scoreAway) + handicap
			if adjScore > float64(scoreHome) {
				return "WON"
			} else if adjScore == float64(scoreHome) {
				return "VOID"
			}
			return "LOST"
		}
	}

	// Half-Time, Corners, Cards, or non-fulltime stats — VOID so user is never unfairly penalized
	if strings.Contains(marketLower, "half") || strings.Contains(marketLower, "corner") || strings.Contains(marketLower, "card") {
		return "VOID"
	}

	log.Printf("[auto-settle] unsupported market '%s' (sel: '%s') for %s — treating as VOID", marketName, selectionName, matchName)
	return "VOID"
}

type SettleLegRequest struct {
	Status string `json:"status"` // WON or LOST or VOID
}

// SettleLeg â€” ADMIN endpoint: POST /api/v1/admin/bets/legs/{leg_id}/settle
func (h *SettlementHandler) SettleLeg(w http.ResponseWriter, r *http.Request) {
	legID := chi.URLParam(r, "leg_id")
	var req SettleLegRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || (req.Status != "WON" && req.Status != "LOST" && req.Status != "VOID") {
		jsonError(w, "status must be WON, LOST, or VOID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	var slipID string
	err := h.db.Pool.QueryRow(ctx,
		`UPDATE bet_legs SET status = $1 WHERE id = $2 RETURNING bet_slip_id`,
		req.Status, legID,
	).Scan(&slipID)
	if err != nil {
		log.Printf("[settle] leg %s not found: %v", legID, err)
		jsonError(w, "Leg not found", http.StatusNotFound)
		return
	}

	if err := h.trySettleSlip(ctx, slipID); err != nil {
		log.Printf("[settle] trySettleSlip error for %s: %v", slipID, err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"success": "true", "slip_id": slipID})
}

// SettleSlipManual â€” ADMIN: POST /api/v1/admin/bets/slips/{slip_id}/settle
type SettleSlipRequest struct {
	Status string `json:"status"` // WON or LOST
}

func (h *SettlementHandler) SettleSlipManual(w http.ResponseWriter, r *http.Request) {
	slipID := chi.URLParam(r, "slip_id")
	var req SettleSlipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || (req.Status != "WON" && req.Status != "LOST" && req.Status != "CANCELLED") {
		jsonError(w, "status must be WON, LOST, or CANCELLED", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		jsonError(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var userID string
	var potentialPayout float64
	var currentStatus string
	var payoutCredited bool
	err = tx.QueryRow(ctx,
		`SELECT user_id, potential_payout, status, COALESCE(payout_credited, false) FROM bet_slips WHERE id = $1 FOR UPDATE`,
		slipID,
	).Scan(&userID, &potentialPayout, &currentStatus, &payoutCredited)
	if err != nil {
		jsonError(w, "Slip not found", http.StatusNotFound)
		return
	}
	if currentStatus != "PENDING" || payoutCredited {
		jsonError(w, fmt.Sprintf("Slip already settled: %s", currentStatus), http.StatusConflict)
		return
	}

	var userRole string
	_ = tx.QueryRow(ctx, `SELECT role::text FROM users WHERE id = $1`, userID).Scan(&userRole)
	isAgent := userRole == "AGENT"

	if req.Status == "WON" {
		res, err := tx.Exec(ctx, `UPDATE bet_slips SET status = 'WON', payout_credited = true WHERE id = $1 AND status = 'PENDING' AND COALESCE(payout_credited, false) = false`, slipID)
		if err != nil || res.RowsAffected() == 0 {
			jsonError(w, "Slip was already settled by another process", http.StatusConflict)
			return
		}

		// Update all legs of this slip to WON as well
		_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE bet_slip_id = $1`, slipID)

		if !isAgent && potentialPayout > 0 {
			if _, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, potentialPayout, userID); err != nil {
				log.Printf("[settle] error crediting balance for user %s: %v", userID, err)
				jsonError(w, "Failed to credit balance", http.StatusInternalServerError)
				return
			}
		}
		log.Printf("[settle] credited %.2f to user %s for winning slip %s (isAgent=%v)", potentialPayout, userID, slipID, isAgent)
	} else if req.Status == "LOST" {
		res, err := tx.Exec(ctx, `UPDATE bet_slips SET status = 'LOST' WHERE id = $1 AND status = 'PENDING'`, slipID)
		if err != nil || res.RowsAffected() == 0 {
			jsonError(w, "Slip already settled", http.StatusConflict)
			return
		}
		_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'LOST' WHERE bet_slip_id = $1`, slipID)
	} else if req.Status == "CANCELLED" {
		res, err := tx.Exec(ctx, `UPDATE bet_slips SET status = 'CANCELLED' WHERE id = $1 AND status = 'PENDING'`, slipID)
		if err != nil || res.RowsAffected() == 0 {
			jsonError(w, "Slip already settled", http.StatusConflict)
			return
		}
		_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'VOID' WHERE bet_slip_id = $1`, slipID)
		if !isAgent {
			var stake float64
			_ = tx.QueryRow(ctx, `SELECT stake FROM bet_slips WHERE id = $1`, slipID).Scan(&stake)
			if stake > 0 {
				_, _ = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, stake, userID)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		jsonError(w, "Failed to commit", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":         true,
		"status":          req.Status,
		"payout_credited": req.Status == "WON" && !isAgent,
		"amount":          potentialPayout,
	})
}

// trySettleSlip checks if all legs of a slip are settled and updates the slip accordingly
func (h *SettlementHandler) trySettleSlip(ctx context.Context, slipID string) error {
	var total, pending, lost int
	err := h.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
			COUNT(*) FILTER (WHERE status = 'LOST') AS lost
		FROM bet_legs WHERE bet_slip_id = $1
	`, slipID).Scan(&total, &pending, &lost)
	if err != nil {
		return err
	}

	if pending > 0 {
		return nil // Not fully settled yet
	}

	newStatus := "WON"
	if lost > 0 {
		newStatus = "LOST"
	}

	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var userID string
	var potentialPayout float64
	var currentStatus string
	var payoutCredited bool
	err = tx.QueryRow(ctx,
		`SELECT user_id, potential_payout, status, COALESCE(payout_credited, false) FROM bet_slips WHERE id = $1 FOR UPDATE`,
		slipID,
	).Scan(&userID, &potentialPayout, &currentStatus, &payoutCredited)
	if err != nil || currentStatus != "PENDING" || payoutCredited {
		return nil
	}

	var userRole string
	_ = tx.QueryRow(ctx, `SELECT role::text FROM users WHERE id = $1`, userID).Scan(&userRole)
	isAgent := userRole == "AGENT"

	if newStatus == "WON" {
		res, err := tx.Exec(ctx, `UPDATE bet_slips SET status = 'WON', payout_credited = true WHERE id = $1 AND status = 'PENDING' AND COALESCE(payout_credited, false) = false`, slipID)
		if err != nil || res.RowsAffected() == 0 {
			return nil
		}
		if !isAgent && potentialPayout > 0 {
			if _, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, potentialPayout, userID); err != nil {
				return err
			}
			log.Printf("[settle] auto-credited %.2f to user %s (slip %s)", potentialPayout, userID, slipID)
		}
	} else {
		_, _ = tx.Exec(ctx, `UPDATE bet_slips SET status = $1 WHERE id = $2 AND status = 'PENDING'`, newStatus, slipID)
	}
	return tx.Commit(ctx)
}

// GetAllBets — ADMIN: GET /api/v1/admin/bets
func (h *SettlementHandler) GetAllBets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// Automatically settle any due auto-win / manual slips so admin views real-time won statuses
	SettleDueAutoWinSlips(ctx, h.db)

	statusFilter := r.URL.Query().Get("status")
	if statusFilter == "" {
		statusFilter = "PENDING"
	}

	type LegAdmin struct {
		ID            string  `json:"id"`
		MatchName     string  `json:"match_name"`
		MarketName    string  `json:"market_name"`
		SelectionName string  `json:"selection_name"`
		Odds          float64 `json:"odds"`
		Status        string  `json:"status"`
		KickoffAt     string  `json:"kickoff_at"`
	}
	type SlipAdmin struct {
		ID              string     `json:"id"`
		UserID          string     `json:"user_id"`
		UserPhone       string     `json:"user_phone"`
		Stake           float64    `json:"stake"`
		TotalOdds       float64    `json:"total_odds"`
		PotentialPayout float64    `json:"potential_payout"`
		Status          string     `json:"status"`
		CreatedAt       time.Time  `json:"created_at"`
		PromoCode       string     `json:"promo_code,omitempty"`
		Legs            []LegAdmin `json:"legs"`
	}

	isBetsSuper := IsSuperAdminRequest(r, h.db)
	whereClause := ""
	var filterPromo string

	if isBetsSuper {
		superPromo := GetSuperAdminPromoCode(r, h.db)
		if superPromo != "" {
			filterPromo = superPromo
		} else {
			whereClause += " AND COALESCE(u.promo_code, '') != '' "
		}
	} else {
		whereClause += " AND COALESCE(u.promo_code, '') = '' "
	}

	var rows pgx.Rows
	var err error
	if statusFilter == "ALL" {
		if filterPromo != "" {
			whereClause += " AND u.promo_code = $1 "
			rows, err = h.db.Pool.Query(ctx, `
				SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at, COALESCE(u.promo_code, '')
				FROM bet_slips bs
				LEFT JOIN users u ON u.id = bs.user_id
				WHERE 1=1 ` + whereClause + `
				ORDER BY bs.created_at DESC
				LIMIT 500
			`, filterPromo)
		} else {
			rows, err = h.db.Pool.Query(ctx, `
				SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at, COALESCE(u.promo_code, '')
				FROM bet_slips bs
				LEFT JOIN users u ON u.id = bs.user_id
				WHERE 1=1 ` + whereClause + `
				ORDER BY bs.created_at DESC
				LIMIT 500
			`)
		}
	} else {
		if filterPromo != "" {
			whereClause += " AND u.promo_code = $2 "
			rows, err = h.db.Pool.Query(ctx, `
				SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at, COALESCE(u.promo_code, '')
				FROM bet_slips bs
				LEFT JOIN users u ON u.id = bs.user_id
				WHERE bs.status = $1 ` + whereClause + `
				ORDER BY bs.created_at DESC
				LIMIT 500
			`, statusFilter, filterPromo)
		} else {
			rows, err = h.db.Pool.Query(ctx, `
				SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at, COALESCE(u.promo_code, '')
				FROM bet_slips bs
				LEFT JOIN users u ON u.id = bs.user_id
				WHERE bs.status = $1 ` + whereClause + `
				ORDER BY bs.created_at DESC
				LIMIT 500
			`, statusFilter)
		}
	}
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var slips []SlipAdmin
	for rows.Next() {
		var s SlipAdmin
		if err := rows.Scan(&s.ID, &s.UserID, &s.UserPhone, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt, &s.PromoCode); err != nil {
			continue
		}
		legRows, _ := h.db.Pool.Query(ctx, `
			SELECT
				bl.id, bl.match_name, bl.market_name, bl.selection_name, bl.odds,
				CASE
					WHEN bl.status IN ('WON','LOST','VOID') THEN bl.status
					WHEN f.status_short IN ('FT','AET','PEN') THEN
						CASE
							-- Double chance selections
							WHEN bl.market_name = 'Double Chance'
							     OR bl.selection_name LIKE '% or Draw%'
							     OR bl.selection_name LIKE 'Draw or %'
							     OR bl.selection_name LIKE '% or %'
							     OR bl.selection_name IN ('1X', 'X2', '2X', '12', 'Home/Draw', 'Draw/Away', 'Home/Away') THEN
								CASE
									-- 1X (Home or Draw)
									WHEN bl.selection_name LIKE '% or Draw%' OR (bl.selection_name LIKE 'Draw or %' AND bl.selection_name NOT LIKE '%' || f.away_team || '%')
									     OR bl.selection_name IN ('1X', 'Home/Draw', 'Home or Draw')
									     OR (f.home_team != '' AND bl.selection_name LIKE '%' || f.home_team || '%' AND bl.selection_name LIKE '%Draw%') THEN
										CASE WHEN COALESCE(f.score_home,0) >= COALESCE(f.score_away,0) THEN 'WON' ELSE 'LOST' END
									-- X2 (Draw or Away)
									WHEN bl.selection_name IN ('X2', '2X', 'Draw/Away', 'Away/Draw', 'Away or Draw', 'Draw or Away')
									     OR (f.away_team != '' AND bl.selection_name LIKE '%' || f.away_team || '%' AND bl.selection_name LIKE '%Draw%') THEN
										CASE WHEN COALESCE(f.score_away,0) >= COALESCE(f.score_home,0) THEN 'WON' ELSE 'LOST' END
									-- 12 (Home or Away)
									WHEN bl.selection_name IN ('12', 'Home/Away', 'Home or Away')
									     OR (bl.selection_name LIKE '% or %' AND bl.selection_name NOT LIKE '%Draw%') THEN
										CASE WHEN COALESCE(f.score_home,0) != COALESCE(f.score_away,0) THEN 'WON' ELSE 'LOST' END
									ELSE 'LOST'
								END
							-- Match Winner / 1X2
							WHEN bl.market_name IN ('Match Winner', '1X2', 'Full Time Result') THEN
								CASE
									WHEN bl.selection_name IN ('Draw', 'X') AND COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'WON'
									WHEN (bl.selection_name IN ('Home Win', 'Home', '1') OR (f.home_team != '' AND bl.selection_name = f.home_team))
									     AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
									WHEN (bl.selection_name IN ('Away Win', 'Away', '2') OR (f.away_team != '' AND bl.selection_name = f.away_team))
									     AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
									ELSE 'LOST'
								END
							WHEN bl.market_name = 'Both Teams to Score' THEN
								CASE
									WHEN bl.selection_name = 'Yes' AND COALESCE(f.score_home,0) > 0 AND COALESCE(f.score_away,0) > 0 THEN 'WON'
									WHEN bl.selection_name = 'No'  AND (COALESCE(f.score_home,0) = 0 OR COALESCE(f.score_away,0) = 0) THEN 'WON'
									ELSE 'LOST'
								END
							WHEN bl.market_name IN ('Over 2.5 Goals', 'Over 2.5') THEN
								CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) > 2 THEN 'WON' ELSE 'LOST' END
							WHEN bl.market_name IN ('Under 2.5 Goals', 'Under 2.5') THEN
								CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) <= 2 THEN 'WON' ELSE 'LOST' END
							WHEN bl.market_name = 'Draw No Bet' THEN
								CASE
									WHEN (bl.selection_name IN ('Home', '1') OR (f.home_team != '' AND bl.selection_name = f.home_team)) AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
									WHEN (bl.selection_name IN ('Away', '2') OR (f.away_team != '' AND bl.selection_name = f.away_team)) AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
									WHEN COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'VOID'
									ELSE 'LOST'
								END
							ELSE bl.status
						END
					WHEN f.status_short IN ('CANC','PSTP','ABD') THEN 'VOID'
					ELSE bl.status
				END as effective_status,
				COALESCE(bl.kickoff_at, '')
			FROM bet_legs bl
			LEFT JOIN fixtures f ON f.external_id = bl.fixture_id
			WHERE bl.bet_slip_id = $1
		`, s.ID)
		if legRows != nil {
			for legRows.Next() {
				var l LegAdmin
				legRows.Scan(&l.ID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status, &l.KickoffAt)
				s.Legs = append(s.Legs, l)
			}
			legRows.Close()
		}
		slips = append(slips, s)
	}
	if slips == nil {
		slips = []SlipAdmin{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slips)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
// CreateManualBooking creates an admin-controlled auto-win bet booking code.
// POST /api/v1/admin/bets/manual
func (h *SettlementHandler) CreateManualBooking(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Selections []struct {
            FixtureID     string  `json:"fixtureId"`
            MatchName     string  `json:"matchName"`
            MarketName    string  `json:"marketName"`
            SelectionID   string  `json:"selectionId"`
            SelectionName string  `json:"selectionName"`
            Odds          float64 `json:"odds"`
            HomeLogo      string  `json:"homeLogo"`
            AwayLogo      string  `json:"awayLogo"`
            KickoffAt     string  `json:"kickoffAt"`
        } `json:"selections"`
        TotalOdds float64 `json:"total_odds"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }
    if len(req.Selections) == 0 {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "No selections provided"})
        return
    }

    selectionsJSON, err := json.Marshal(req.Selections)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode selections"})
        return
    }

    // Generate unique code
    src := rand.NewSource(time.Now().UnixNano())
    rng := rand.New(src)
    digits := "0123456789"
    letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    genCode := func() string {
        n1 := string(digits[rng.Intn(10)]) + string(digits[rng.Intn(10)])
        l1 := string(letters[rng.Intn(26)]) + string(letters[rng.Intn(26)])
        n2 := string(digits[rng.Intn(10)]) + string(digits[rng.Intn(10)])
        return "M" + n1 + l1 + n2 // 'M' prefix = Manual/Admin code
    }

    var code string
    var insertErr error
    for i := 0; i < 10; i++ {
        code = genCode()
        _, insertErr = h.db.Pool.Exec(r.Context(),
            `INSERT INTO bet_bookings (code, selections, total_odds, auto_win) VALUES ($1, $2, $3, true)`,
            code, string(selectionsJSON), req.TotalOdds,
        )
        if insertErr == nil {
            break
        }
    }
    if insertErr != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save booking"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{"code": code, "auto_win": true})
}

// ListManualBookings - ADMIN: GET /api/v1/admin/bets/manual/list
func (h *SettlementHandler) ListManualBookings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(),
		`SELECT code, selections, total_odds, created_at FROM bet_bookings WHERE auto_win = true ORDER BY created_at DESC LIMIT 100`,
	)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "DB error"})
		return
	}
	defer rows.Close()

	type BookingRow struct {
		Code       string      `json:"code"`
		Selections interface{} `json:"selections"`
		TotalOdds  float64     `json:"total_odds"`
		CreatedAt  time.Time   `json:"created_at"`
	}

	var result []BookingRow
	for rows.Next() {
		var b BookingRow
		var selJSON string
		if err := rows.Scan(&b.Code, &selJSON, &b.TotalOdds, &b.CreatedAt); err != nil {
			continue
		}
		var sel interface{}
		_ = json.Unmarshal([]byte(selJSON), &sel)
		b.Selections = sel
		result = append(result, b)
	}

	if result == nil {
		result = []BookingRow{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}



