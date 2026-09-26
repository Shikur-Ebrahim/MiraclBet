package handlers

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/miraclbet/api/internal/database"
)

type BetSlipsHandler struct {
	db *database.DB
}

func NewBetSlipsHandler(db *database.DB) *BetSlipsHandler {
	return &BetSlipsHandler{db: db}
}

type BetSelection struct {
	FixtureID     string  `json:"fixtureId"`
	MatchName     string  `json:"matchName"`
	MarketName    string  `json:"marketName"`
	SelectionID   string  `json:"selectionId"`
	SelectionName string  `json:"selectionName"`
	Odds          float64 `json:"odds"`
}

type BookBetRequest struct {
	Selections []BetSelection `json:"selections"`
	TotalOdds  float64        `json:"total_odds"`
}

func generateBetCode() string {
	src := rand.NewSource(time.Now().UnixNano())
	rng := rand.New(src)
	digits := "0123456789"
	letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	n1 := string(digits[rng.Intn(10)]) + string(digits[rng.Intn(10)])
	l1 := string(letters[rng.Intn(26)]) + string(letters[rng.Intn(26)])
	n2 := string(digits[rng.Intn(10)]) + string(digits[rng.Intn(10)])
	return "M" + n1 + l1 + n2
}

func (h *BetSlipsHandler) BookBet(w http.ResponseWriter, r *http.Request) {
	var req BookBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
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
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process selections"})
		return
	}

	var code string
	for i := 0; i < 10; i++ {
		code = generateBetCode()
		_, err = h.db.Pool.Exec(r.Context(),
			"INSERT INTO bet_bookings (code, selections, total_odds) VALUES ($1, $2, $3)",
			code, string(selectionsJSON), req.TotalOdds,
		)
		if err == nil {
			break
		}
	}
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save bet booking"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"code": code})
}

func (h *BetSlipsHandler) GetBooking(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Booking code is required"})
		return
	}

	var selectionsJSON string
	var totalOdds float64

	err := h.db.Pool.QueryRow(r.Context(),
		"SELECT selections, total_odds FROM bet_bookings WHERE code = $1", code,
	).Scan(&selectionsJSON, &totalOdds)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		if err == pgx.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Bet code not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		}
		return
	}

	var selections []BetSelection
	_ = json.Unmarshal([]byte(selectionsJSON), &selections)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":       code,
		"selections": selections,
		"total_odds": totalOdds,
	})
}
