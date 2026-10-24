package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
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
	h.settleNormalSlips(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("[auto-settle] stopping")
			return
		case <-ticker.C:
			SettleDueAutoWinSlips(ctx, h.db)
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
		odds          float64
		scoreHome     int
		scoreAway     int
		statusShort   string
	}
	var legs []legResult
	defer legRows.Close()
	for legRows.Next() {
		var l legResult
		legRows.Scan(&l.id, &l.marketName, &l.selectionName, &l.odds, &l.scoreHome, &l.scoreAway, &l.statusShort)
		legs = append(legs, l)
	}
	legRows.Close()

	// Settle each finished leg
	for _, l := range legs {
		status := h.determineLegStatus(l.marketName, l.selectionName, l.scoreHome, l.scoreAway, l.statusShort)
		_, err := h.db.Pool.Exec(ctx,
			`UPDATE bet_legs SET status = $1 WHERE id = $2`, status, l.id,
		)
		if err != nil {
			log.Printf("[auto-settle] failed to update leg %s: %v", l.id, err)
			continue
		}
		log.Printf("[auto-settle] slip %s leg %s -> %s (%s %d-%d)", slipID, l.id, status, l.marketName, l.scoreHome, l.scoreAway)
	}

	// Now try to settle the whole slip
	if err := h.trySettleSlip(ctx, slipID); err != nil {
		log.Printf("[auto-settle] trySettleSlip error for %s: %v", slipID, err)
	}
}

// determineLegStatus evaluates a finished match against the selection and returns WON/LOST/VOID
func (h *SettlementHandler) determineLegStatus(marketName, selectionName string, scoreHome, scoreAway int, statusShort string) string {
	// Cancelled/postponed/abandoned = VOID
	if statusShort == "CANC" || statusShort == "PSTP" || statusShort == "ABD" {
		return "VOID"
	}

	totalGoals := scoreHome + scoreAway

	switch marketName {
	case "Match Winner":
		switch selectionName {
		case "Home Win":
			if scoreHome > scoreAway { return "WON" }
		case "Away Win":
			if scoreAway > scoreHome { return "WON" }
		case "Draw":
			if scoreHome == scoreAway { return "WON" }
		}
		return "LOST"

	case "Both Teams to Score":
		switch selectionName {
		case "Yes":
			if scoreHome > 0 && scoreAway > 0 { return "WON" }
		case "No":
			if scoreHome == 0 || scoreAway == 0 { return "WON" }
		}
		return "LOST"

	case "Over 2.5 Goals", "Over/Under 2.5 Goals":
		if selectionName == "Over 2.5" || selectionName == "Over 2.5 Goals" {
			if totalGoals > 2 { return "WON" }
		} else {
			if totalGoals <= 2 { return "WON" }
		}
		return "LOST"

	case "Over 1.5 Goals":
		if selectionName == "Over 1.5" { if totalGoals > 1 { return "WON" } }
		if selectionName == "Under 1.5" { if totalGoals <= 1 { return "WON" } }
		return "LOST"

	case "Over 3.5 Goals":
		if selectionName == "Over 3.5" { if totalGoals > 3 { return "WON" } }
		if selectionName == "Under 3.5" { if totalGoals <= 3 { return "WON" } }
		return "LOST"

	case "Double Chance":
		switch selectionName {
		case "Home or Draw":
			if scoreHome >= scoreAway { return "WON" }
		case "Away or Draw":
			if scoreAway >= scoreHome { return "WON" }
		case "Home or Away":
			if scoreHome != scoreAway { return "WON" }
		}
		return "LOST"

	case "Draw No Bet":
		if scoreHome == scoreAway { return "VOID" }
		switch selectionName {
		case "Home":
			if scoreHome > scoreAway { return "WON" }
		case "Away":
			if scoreAway > scoreHome { return "WON" }
		}
		return "LOST"

	case "Correct Score":
		// selectionName like "2-0" or "2-1"
		expected := fmt.Sprintf("%d-%d", scoreHome, scoreAway)
		if selectionName == expected { return "WON" }
		return "LOST"

	case "Half-Time Result":
		// Requires HT score — not available, treat as VOID for now
		return "VOID"
	}

	// Unknown market — treat as LOST so we don't block settlement forever
	log.Printf("[auto-settle] unknown market '%s', defaulting to LOST", marketName)
	return "LOST"
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

	_ = IsSuperAdminRequest(r, h.db)
	promoFilter := r.URL.Query().Get("promo_filter")
	whereClause := ""
	if promoFilter == "none" {
		whereClause += " AND COALESCE(u.promo_code, '') = '' "
	} else if promoFilter == "only" {
		whereClause += " AND COALESCE(u.promo_code, '') != '' "
	}

	var rows pgx.Rows
	var err error
	if statusFilter == "ALL" {
		rows, err = h.db.Pool.Query(ctx, `
			SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at, COALESCE(u.promo_code, '')
			FROM bet_slips bs
			LEFT JOIN users u ON u.id = bs.user_id
			WHERE 1=1 ` + whereClause + `
			ORDER BY bs.created_at DESC
			LIMIT 500
		`)
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
						CASE bl.market_name
							WHEN 'Match Winner' THEN
								CASE
									WHEN bl.selection_name = 'Home Win' AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
									WHEN bl.selection_name = 'Away Win' AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
									WHEN bl.selection_name = 'Draw'     AND COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'WON'
									ELSE 'LOST'
								END
							WHEN 'Both Teams to Score' THEN
								CASE
									WHEN bl.selection_name = 'Yes' AND COALESCE(f.score_home,0) > 0 AND COALESCE(f.score_away,0) > 0 THEN 'WON'
									WHEN bl.selection_name = 'No'  AND (COALESCE(f.score_home,0) = 0 OR COALESCE(f.score_away,0) = 0) THEN 'WON'
									ELSE 'LOST'
								END
							WHEN 'Over 2.5 Goals' THEN
								CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) > 2 THEN 'WON' ELSE 'LOST' END
							WHEN 'Under 2.5 Goals' THEN
								CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) <= 2 THEN 'WON' ELSE 'LOST' END
							WHEN 'Draw No Bet' THEN
								CASE
									WHEN bl.selection_name = 'Home' AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
									WHEN bl.selection_name = 'Away' AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
									WHEN COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'VOID'
									ELSE 'LOST'
								END
							ELSE 'LOST'
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



