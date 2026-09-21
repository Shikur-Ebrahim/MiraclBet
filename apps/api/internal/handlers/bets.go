package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/database"
)

type BetsHandler struct {
	db *database.DB
}

func NewBetsHandler(db *database.DB) *BetsHandler {
	return &BetsHandler{db: db}
}

type PlaceBetRequest struct {
	FixtureExternalID string  `json:"fixture_id"`
	MarketID          int     `json:"market_id"`
	Selection         string  `json:"selection"`
	Odds              float64 `json:"odds"`
	OddsVersion       int     `json:"odds_version"`
}

type PlaceBetResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	BetID   string `json:"bet_id,omitempty"`
}

func (h *BetsHandler) PlaceBet(w http.ResponseWriter, r *http.Request) {
	var req PlaceBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx := r.Context()
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	defer tx.Rollback(ctx) // Rollback if not committed

	// 1. Validate Match is LIVE and not finished
	var isLive bool
	var statusShort string
	err = tx.QueryRow(ctx, "SELECT is_live, status_short FROM fixtures WHERE external_id = $1 FOR SHARE", req.FixtureExternalID).Scan(&isLive, &statusShort)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Match not found")
		return
	}

	if !isLive || statusShort == "FT" || statusShort == "AET" || statusShort == "PEN" {
		h.respondError(w, http.StatusBadRequest, "Match is finished or no longer live")
		return
	}

	// 2. Validate Market state atomically
	var mktStatus string
	var mktVersion int
	var lastUpdateAt time.Time

	err = tx.QueryRow(ctx, `
		SELECT status, odds_version, last_update_at 
		FROM live_market_states 
		WHERE fixture_external_id = $1 AND market_id = $2 
		FOR UPDATE
	`, req.FixtureExternalID, req.MarketID).Scan(&mktStatus, &mktVersion, &lastUpdateAt)

	if err != nil {
		h.respondError(w, http.StatusNotFound, "Market not found")
		return
	}

	// Double-check staleness just in case the monitor hasn't run yet
	if mktStatus == "OPEN" && time.Since(lastUpdateAt) > 2*time.Minute {
		mktStatus = "SUSPENDED" // Treat as suspended inline
	}

	if mktStatus == "SUSPENDED" {
		h.respondError(w, http.StatusBadRequest, "Market suspended")
		return
	}
	if mktStatus == "CLOSED" {
		h.respondError(w, http.StatusBadRequest, "Market closed")
		return
	}

	// 3. Validate Odds Version
	if mktVersion != req.OddsVersion {
		h.respondError(w, http.StatusConflict, "Odds changed")
		return
	}

	// 4. Place Bet
	var betID string
	insertQuery := `
		INSERT INTO bets (fixture_external_id, market_id, selection, odds, odds_version, status)
		VALUES ($1, $2, $3, $4, $5, 'ACCEPTED')
		RETURNING id
	`
	err = tx.QueryRow(ctx, insertQuery, req.FixtureExternalID, req.MarketID, req.Selection, req.Odds, req.OddsVersion).Scan(&betID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to place bet")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		h.respondError(w, http.StatusInternalServerError, "Transaction failed")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PlaceBetResponse{
		Success: true,
		Message: "Bet placed successfully",
		BetID:   betID,
	})
}

func (h *BetsHandler) respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(PlaceBetResponse{
		Success: false,
		Message: message,
	})
}
