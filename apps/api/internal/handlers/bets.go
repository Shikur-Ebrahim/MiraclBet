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

// Minimal struct to extract just what we need from JSON for validation
type JSONOdds struct {
	Markets []struct {
		ID           int    `json:"id"`
		Status       string `json:"status"`
		OddsVersion  int    `json:"odds_version"`
		LastUpdateAt string `json:"last_update_at"`
	} `json:"markets"`
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
	defer tx.Rollback(ctx)

	// 1. Validate Match is LIVE and fetch JSON atomically
	var isLive bool
	var statusShort string
	var oddsJSON []byte
	err = tx.QueryRow(ctx, "SELECT is_live, status_short, advanced_odds FROM fixtures WHERE external_id = $1 FOR UPDATE", req.FixtureExternalID).Scan(&isLive, &statusShort, &oddsJSON)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Match not found")
		return
	}

	if !isLive || statusShort == "FT" || statusShort == "AET" || statusShort == "PEN" {
		h.respondError(w, http.StatusBadRequest, "Match is finished or no longer live")
		return
	}

	// 2. Parse JSON to find the market
	var ao JSONOdds
	if err := json.Unmarshal(oddsJSON, &ao); err != nil {
		h.respondError(w, http.StatusInternalServerError, "Internal parsing error")
		return
	}

	marketFound := false
	var mktStatus string
	var mktVersion int
	var lastUpdateAtStr string

	for _, m := range ao.Markets {
		if m.ID == req.MarketID {
			marketFound = true
			mktStatus = m.Status
			mktVersion = m.OddsVersion
			lastUpdateAtStr = m.LastUpdateAt
			break
		}
	}

	if !marketFound {
		h.respondError(w, http.StatusNotFound, "Market not found")
		return
	}

	// Double-check staleness inline (in case monitor hasn't run yet)
	if mktStatus == "OPEN" && lastUpdateAtStr != "" {
		t, err := time.Parse(time.RFC3339, lastUpdateAtStr)
		if err == nil && time.Since(t) > 2*time.Minute {
			mktStatus = "SUSPENDED"
		}
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
