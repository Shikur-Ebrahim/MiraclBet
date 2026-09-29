package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
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
		if _, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, potentialPayout, userID); err != nil {
			log.Printf("[settle] error crediting balance for user %s: %v", userID, err)
			jsonError(w, "Failed to credit balance", http.StatusInternalServerError)
			return
		}
		log.Printf("[settle] credited %.2f to user %s for winning slip %s", potentialPayout, userID, slipID)
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

// GetAllBets â€” ADMIN: GET /api/v1/admin/bets
func (h *SettlementHandler) GetAllBets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
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



