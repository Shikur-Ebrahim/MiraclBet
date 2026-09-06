package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/football/gateway"
)

type DebugHandler struct {
	gw  *gateway.HTTPGateway
	cfg *config.Config
}

func NewDebugHandler(cfg *config.Config) *DebugHandler {
	return &DebugHandler{gw: gateway.New(cfg), cfg: cfg}
}

// TestOdds fetches raw odds from the API for today and returns the result.
// Call: GET /api/v1/debug/odds?date=2026-09-06
func (h *DebugHandler) TestOdds(w http.ResponseWriter, r *http.Request) {
	dateStr := r.URL.Query().Get("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		date = time.Now().UTC()
	}

	ctx := r.Context()
	odds, err := h.gw.GetOddsByDate(ctx, date)

	result := map[string]interface{}{
		"date":        date.Format("2006-01-02"),
		"api_key_set": h.cfg.FootballAPIKey != "",
		"error":       nil,
		"odds_count":  len(odds),
		"sample":      nil,
	}

	if err != nil {
		result["error"] = err.Error()
	} else if len(odds) > 0 {
		sample := odds[0]
		result["sample"] = map[string]interface{}{
			"fixture_id":    sample.FixtureID,
			"bookmaker":     sample.Bookmaker,
			"market_count":  len(sample.Markets),
			"markets":       func() []string {
				var names []string
				for _, m := range sample.Markets {
					names = append(names, fmt.Sprintf("ID=%d Name=%s Values=%d", m.ID, m.Name, len(m.Values)))
				}
				return names
			}(),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// TestLiveOdds fetches raw live odds and returns the result.
func (h *DebugHandler) TestLiveOdds(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	odds, err := h.gw.GetLiveOdds(ctx)

	result := map[string]interface{}{
		"api_key_set": h.cfg.FootballAPIKey != "",
		"error":       nil,
		"odds_count":  len(odds),
		"sample":      nil,
	}

	if err != nil {
		result["error"] = err.Error()
	} else if len(odds) > 0 {
		sample := odds[0]
		result["sample"] = map[string]interface{}{
			"fixture_id":   sample.FixtureID,
			"bookmaker":    sample.Bookmaker,
			"market_count": len(sample.Markets),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
