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

// SettleDueAutoWinSlips checks all auto-win tickets:
// 1. For each match whose end time (kickoff + 105 min) has passed: marks that match as WON.
// 2. Only when ALL matches of a ticket are WON: marks the ticket as WON and credits user balance!
func SettleDueAutoWinSlips(ctx context.Context, db *database.DB) {
	if db == nil {
		return
	}
	now := time.Now().UTC()

	// 1. Settle individual legs of auto-win / manual slips whose match end time has passed
	legRows, err := db.Pool.Query(ctx, `
		SELECT bl.id, bl.bet_slip_id, bl.match_name, COALESCE(bl.kickoff_at, '')
		FROM bet_legs bl
		JOIN bet_slips bs ON bl.bet_slip_id = bs.id
		WHERE bs.status = 'PENDING'
		  AND (bs.is_auto_win = true OR bl.fixture_id LIKE 'manual-%' OR bs.booking_code IS NOT NULL)
		  AND bl.status = 'PENDING'
	`)
	if err == nil {
		type pendingLeg struct {
			id, slipID, matchName, kickoffAt string
		}
		var pendingLegs []pendingLeg
		for legRows.Next() {
			var pl pendingLeg
			if err := legRows.Scan(&pl.id, &pl.slipID, &pl.matchName, &pl.kickoffAt); err == nil {
				pendingLegs = append(pendingLegs, pl)
			}
		}
		legRows.Close()

		for _, leg := range pendingLegs {
			if leg.kickoffAt == "" {
				continue
			}
			ko, err := parseKickoff(leg.kickoffAt)
			if err != nil {
				continue
			}
			endTime := ko.Add(MatchDuration)
			if now.After(endTime) || now.Equal(endTime) {
				_, err := db.Pool.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE id = $1`, leg.id)
				if err == nil {
					log.Printf("[auto-settle] Leg %s (%s) reached end time %s -> marked WON", leg.id, leg.matchName, endTime.Format("15:04:05"))
				}
			}
		}
	}

	// 2. Check all PENDING is_auto_win slips — win ticket ONLY IF ALL legs are WON
	slipRows, err := db.Pool.Query(ctx, `
		SELECT bs.id, bs.user_id, bs.potential_payout,
		       COUNT(bl.id) as total_legs,
		       COUNT(bl.id) FILTER (WHERE bl.status = 'WON') as won_legs,
		       COUNT(bl.id) FILTER (WHERE bl.status = 'PENDING') as pending_legs
		FROM bet_slips bs
		JOIN bet_legs bl ON bl.bet_slip_id = bs.id
		WHERE bs.status = 'PENDING'
		  AND (bs.is_auto_win = true OR bl.fixture_id LIKE 'manual-%' OR bs.booking_code IS NOT NULL)
		GROUP BY bs.id, bs.user_id, bs.potential_payout
	`)
	if err == nil {
		type slipCheck struct {
			id, userID                    string
			payout                        float64
			totalLegs, wonLegs, pendingLegs int
		}
		var slipsToCheck []slipCheck
		for slipRows.Next() {
			var sc slipCheck
			if err := slipRows.Scan(&sc.id, &sc.userID, &sc.payout, &sc.totalLegs, &sc.wonLegs, &sc.pendingLegs); err == nil {
				slipsToCheck = append(slipsToCheck, sc)
			}
		}
		slipRows.Close()

		for _, s := range slipsToCheck {
			// ONLY win and credit balance if ALL legs are completed and WON!
			if s.totalLegs > 0 && s.pendingLegs == 0 && s.wonLegs == s.totalLegs {
				tx, err := db.Pool.Begin(ctx)
				if err != nil {
					continue
				}
				// Verify still PENDING under lock to prevent race conditions
				var curStatus string
				err = tx.QueryRow(ctx, `SELECT status FROM bet_slips WHERE id = $1 FOR UPDATE`, s.id).Scan(&curStatus)
				if err != nil || curStatus != "PENDING" {
					tx.Rollback(ctx)
					continue
				}

				if _, err := tx.Exec(ctx, `UPDATE bet_slips SET status = 'WON' WHERE id = $1`, s.id); err != nil {
					tx.Rollback(ctx)
					continue
				}
				// Ensure all legs of this slip are also marked WON
				_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE bet_slip_id = $1`, s.id)

				if _, err := tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, s.payout, s.userID); err != nil {
					tx.Rollback(ctx)
					continue
				}
				if err := tx.Commit(ctx); err == nil {
					log.Printf("[auto-settle] 🎉 ALL %d matches completed! Slip %s WON — credited %.2f Br to user %s", s.totalLegs, s.id, s.payout, s.userID)
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
	err = tx.QueryRow(ctx,
		`SELECT user_id, potential_payout, status FROM bet_slips WHERE id = $1 FOR UPDATE`,
		slipID,
	).Scan(&userID, &potentialPayout, &currentStatus)
	if err != nil {
		jsonError(w, "Slip not found", http.StatusNotFound)
		return
	}
	if currentStatus != "PENDING" {
		jsonError(w, fmt.Sprintf("Slip already settled: %s", currentStatus), http.StatusConflict)
		return
	}

	if _, err = tx.Exec(ctx, `UPDATE bet_slips SET status = $1 WHERE id = $2`, req.Status, slipID); err != nil {
		jsonError(w, "Failed to update slip", http.StatusInternalServerError)
		return
	}

	if req.Status == "WON" {
		// Update all legs of this slip to WON as well
		_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'WON' WHERE bet_slip_id = $1`, slipID)

		if _, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, potentialPayout, userID); err != nil {
			log.Printf("[settle] error crediting balance for user %s: %v", userID, err)
			jsonError(w, "Failed to credit balance", http.StatusInternalServerError)
			return
		}
		log.Printf("[settle] credited %.2f to user %s for winning slip %s", potentialPayout, userID, slipID)
	} else if req.Status == "LOST" {
		_, _ = tx.Exec(ctx, `UPDATE bet_legs SET status = 'LOST' WHERE bet_slip_id = $1`, slipID)
	}

	if err := tx.Commit(ctx); err != nil {
		jsonError(w, "Failed to commit", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":         true,
		"status":          req.Status,
		"payout_credited": req.Status == "WON",
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

	var userID string
	var potentialPayout float64
	var currentStatus string
	err = h.db.Pool.QueryRow(ctx,
		`SELECT user_id, potential_payout, status FROM bet_slips WHERE id = $1`,
		slipID,
	).Scan(&userID, &potentialPayout, &currentStatus)
	if err != nil || currentStatus != "PENDING" {
		return err
	}

	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, `UPDATE bet_slips SET status = $1 WHERE id = $2`, newStatus, slipID); err != nil {
		return err
	}
	if newStatus == "WON" {
		if _, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, potentialPayout, userID); err != nil {
			return err
		}
		log.Printf("[settle] auto-credited %.2f to user %s (slip %s)", potentialPayout, userID, slipID)
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
		Legs            []LegAdmin `json:"legs"`
	}

	var rows pgx.Rows
	var err error
	if statusFilter == "ALL" {
		rows, err = h.db.Pool.Query(ctx, `
			SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at
			FROM bet_slips bs
			LEFT JOIN users u ON u.id = bs.user_id
			ORDER BY bs.created_at DESC
			LIMIT 500
		`)
	} else {
		rows, err = h.db.Pool.Query(ctx, `
			SELECT bs.id, bs.user_id, COALESCE(u.phone, ''), bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.created_at
			FROM bet_slips bs
			LEFT JOIN users u ON u.id = bs.user_id
			WHERE bs.status = $1
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
		if err := rows.Scan(&s.ID, &s.UserID, &s.UserPhone, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt); err != nil {
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



