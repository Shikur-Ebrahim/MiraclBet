package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
)

type BetsHandler struct {
	db *database.DB
}

func NewBetsHandler(db *database.DB) *BetsHandler {
	return &BetsHandler{db: db}
}

type PlaceBetSlipRequest struct {
	UserID     string         `json:"user_id"`
	Stake      float64        `json:"stake"`
	TotalOdds  float64        `json:"total_odds"`
	Selections []BetSelection `json:"selections"`
}

type PlaceBetSlipResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	SlipID  string `json:"slip_id,omitempty"`
}

type BetLegResult struct {
	ID            string  `json:"id"`
	FixtureID     string  `json:"fixture_id"`
	MatchName     string  `json:"match_name"`
	MarketName    string  `json:"market_name"`
	SelectionName string  `json:"selection_name"`
	Odds          float64 `json:"odds"`
	Status        string  `json:"status"`
}

type BetSlipResult struct {
	ID              string         `json:"id"`
	Stake           float64        `json:"stake"`
	TotalOdds       float64        `json:"total_odds"`
	PotentialPayout float64        `json:"potential_payout"`
	Status          string         `json:"status"`
	CreatedAt       string         `json:"created_at"`
	Legs            []BetLegResult `json:"legs"`
}

func (h *BetsHandler) PlaceBet(w http.ResponseWriter, r *http.Request) {
	var req PlaceBetSlipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.UserID == "" {
		h.respondError(w, http.StatusUnauthorized, "You must be logged in to place bets")
		return
	}
	if req.Stake <= 0 {
		h.respondError(w, http.StatusBadRequest, "Stake must be greater than 0")
		return
	}
	if len(req.Selections) == 0 {
		h.respondError(w, http.StatusBadRequest, "No selections provided")
		return
	}

	ctx := r.Context()
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	defer tx.Rollback(ctx)

	// 1. Check user balance with a row-level lock
	var currentBalance float64
	err = tx.QueryRow(ctx,
		"SELECT COALESCE(balance, 0) FROM users WHERE id = $1 FOR UPDATE",
		req.UserID,
	).Scan(&currentBalance)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "User not found")
		return
	}

	if currentBalance < req.Stake {
		h.respondError(w, http.StatusBadRequest, "Insufficient balance")
		return
	}

	// 2. Deduct balance
	_, err = tx.Exec(ctx,
		"UPDATE users SET balance = balance - $1 WHERE id = $2",
		req.Stake, req.UserID,
	)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to update balance")
		return
	}

	// 3. Create Bet Slip
	var slipID string
	potentialPayout := req.Stake * req.TotalOdds
	err = tx.QueryRow(ctx, `
		INSERT INTO bet_slips (user_id, stake, total_odds, potential_payout, status)
		VALUES ($1, $2, $3, $4, 'PENDING')
		RETURNING id
	`, req.UserID, req.Stake, req.TotalOdds, potentialPayout).Scan(&slipID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to create bet slip")
		return
	}

	// 4. Create Bet Legs
	for _, sel := range req.Selections {
		_, err = tx.Exec(ctx, `
			INSERT INTO bet_legs (bet_slip_id, fixture_id, match_name, market_name, selection_id, selection_name, odds, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
		`, slipID, sel.FixtureID, sel.MatchName, sel.MarketName, sel.SelectionID, sel.SelectionName, sel.Odds)
		if err != nil {
			h.respondError(w, http.StatusInternalServerError, "Failed to save selections")
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		h.respondError(w, http.StatusInternalServerError, "Transaction failed")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PlaceBetSlipResponse{
		Success: true,
		Message: "Bet placed successfully!",
		SlipID:  slipID,
	})
}

func (h *BetsHandler) ListMyBets(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "user_id required"})
		return
	}

	ctx := r.Context()
	rows, err := h.db.Pool.Query(ctx, `
		SELECT id, stake, total_odds, potential_payout, status, created_at
		FROM bet_slips
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch bets"})
		return
	}
	defer rows.Close()

	var slips []BetSlipResult
	for rows.Next() {
		var s BetSlipResult
		if err := rows.Scan(&s.ID, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt); err != nil {
			continue
		}
		slips = append(slips, s)
	}
	if slips == nil {
		slips = []BetSlipResult{}
	}

	// Fetch legs for each slip
	for i, slip := range slips {
		legRows, err := h.db.Pool.Query(ctx, `
			SELECT id, fixture_id, match_name, market_name, selection_name, odds, status
			FROM bet_legs WHERE bet_slip_id = $1
		`, slip.ID)
		if err != nil {
			continue
		}
		var legs []BetLegResult
		for legRows.Next() {
			var l BetLegResult
			if err := legRows.Scan(&l.ID, &l.FixtureID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status); err != nil {
				continue
			}
			legs = append(legs, l)
		}
		legRows.Close()
		if legs == nil {
			legs = []BetLegResult{}
		}
		slips[i].Legs = legs
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slips)
}

func (h *BetsHandler) GetBet(w http.ResponseWriter, r *http.Request) {
	slipID := chi.URLParam(r, "id")
	userID := r.URL.Query().Get("user_id")

	ctx := r.Context()
	var s BetSlipResult
	err := h.db.Pool.QueryRow(ctx, `
		SELECT id, stake, total_odds, potential_payout, status, created_at
		FROM bet_slips WHERE id = $1 AND user_id = $2
	`, slipID, userID).Scan(&s.ID, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bet not found"})
		return
	}

	legRows, _ := h.db.Pool.Query(ctx, `
		SELECT id, fixture_id, match_name, market_name, selection_name, odds, status
		FROM bet_legs WHERE bet_slip_id = $1
	`, s.ID)
	defer legRows.Close()
	var legs []BetLegResult
	for legRows.Next() {
		var l BetLegResult
		legRows.Scan(&l.ID, &l.FixtureID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status)
		legs = append(legs, l)
	}
	if legs == nil {
		legs = []BetLegResult{}
	}
	s.Legs = legs

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func (h *BetsHandler) respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(PlaceBetSlipResponse{
		Success: false,
		Message: message,
	})
}
