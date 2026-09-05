package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/football/gateway"
	"github.com/miraclbet/api/internal/config"
)

type FixtureResponse struct {
	ID           string   `json:"id"`
	HomeTeam     string   `json:"home_team"`
	AwayTeam     string   `json:"away_team"`
	League       string   `json:"league"`
	Country      string   `json:"country"`
	KickoffAt    string   `json:"kickoff_at"`
	Status       string   `json:"status"`
	HomeScore    *int     `json:"home_score"`
	AwayScore    *int     `json:"away_score"`
	IsLive       bool     `json:"is_live"`
	OddsHome     float64  `json:"odds_home"`
	OddsDraw     float64  `json:"odds_draw"`
	OddsAway     float64  `json:"odds_away"`
}

type FixturesHandler struct {
	db      *database.DB
	gateway *gateway.HTTPGateway
}

func NewFixturesHandler(db *database.DB, cfg *config.Config) *FixturesHandler {
	return &FixturesHandler{
		db:      db,
		gateway: gateway.New(cfg),
	}
}

// Live returns live fixtures — tries DB first, falls back to API
func (h *FixturesHandler) Live(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	liveStatuses := map[string]bool{
		"1H": true, "HT": true, "2H": true, "ET": true, "P": true, "LIVE": true,
	}

	// Try DB first
	if h.db != nil {
		rows, err := h.db.Pool.Query(ctx, `
			SELECT 
				f.external_id, f.home_team_name, f.away_team_name,
				COALESCE(l.name, 'Unknown League') as league,
				COALESCE(l.country, '') as country,
				f.starts_at, f.status_short,
				f.score_home, f.score_away, f.is_live,
				COALESCE(o.home, 1.90) as odds_home,
				COALESCE(o.draw, 3.20) as odds_draw,
				COALESCE(o.away, 1.90) as odds_away
			FROM fixtures f
			LEFT JOIN leagues l ON f.league_id = l.id
			LEFT JOIN odds o ON o.fixture_id = f.id
			WHERE f.is_live = true
			ORDER BY f.starts_at DESC
			LIMIT 20
		`)
		if err == nil {
			defer rows.Close()
			var fixtures []FixtureResponse
			for rows.Next() {
				var fx FixtureResponse
				var kickoff time.Time
				_ = rows.Scan(
					&fx.ID, &fx.HomeTeam, &fx.AwayTeam,
					&fx.League, &fx.Country,
					&kickoff, &fx.Status,
					&fx.HomeScore, &fx.AwayScore, &fx.IsLive,
					&fx.OddsHome, &fx.OddsDraw, &fx.OddsAway,
				)
				fx.KickoffAt = kickoff.Format(time.RFC3339)
				fixtures = append(fixtures, fx)
			}
			if len(fixtures) > 0 {
				writeJSON(w, fixtures)
				return
			}
		}
	}

	// Fallback: call API directly
	providerFixtures, err := h.gateway.GetLiveFixtures(ctx)
	if err != nil {
		writeJSON(w, []FixtureResponse{})
		return
	}

	var fixtures []FixtureResponse
	for i, f := range providerFixtures {
		if i >= 20 { break }
		home, away := 1.90, 1.90
		draw := 3.20
		fixtures = append(fixtures, FixtureResponse{
			ID:        f.ExternalID,
			HomeTeam:  f.HomeTeamName,
			AwayTeam:  f.AwayTeamName,
			League:    f.LeagueName,
			Country:   f.Country,
			KickoffAt: f.KickoffAt.Format(time.RFC3339),
			Status:    f.Status,
			HomeScore: f.HomeScore,
			AwayScore: f.AwayScore,
			IsLive:    liveStatuses[f.Status],
			OddsHome:  home,
			OddsDraw:  draw,
			OddsAway:  away,
		})
	}
	writeJSON(w, fixtures)
}

// Today returns today's upcoming fixtures
func (h *FixturesHandler) Today(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Try DB first
	if h.db != nil {
		rows, err := h.db.Pool.Query(ctx, `
			SELECT
				f.external_id, f.home_team_name, f.away_team_name,
				COALESCE(l.name, 'Unknown League') as league,
				COALESCE(l.country, '') as country,
				f.starts_at, f.status_short,
				f.score_home, f.score_away, f.is_live,
				COALESCE(o.home, 1.90) as odds_home,
				COALESCE(o.draw, 3.20) as odds_draw,
				COALESCE(o.away, 1.90) as odds_away
			FROM fixtures f
			LEFT JOIN leagues l ON f.league_id = l.id
			LEFT JOIN odds o ON o.fixture_id = f.id
			WHERE DATE(f.starts_at) = CURRENT_DATE
			  AND f.status_short IN ('NS', 'TBD')
			ORDER BY f.starts_at ASC
			LIMIT 30
		`)
		if err == nil {
			defer rows.Close()
			var fixtures []FixtureResponse
			for rows.Next() {
				var fx FixtureResponse
				var kickoff time.Time
				_ = rows.Scan(
					&fx.ID, &fx.HomeTeam, &fx.AwayTeam,
					&fx.League, &fx.Country,
					&kickoff, &fx.Status,
					&fx.HomeScore, &fx.AwayScore, &fx.IsLive,
					&fx.OddsHome, &fx.OddsDraw, &fx.OddsAway,
				)
				fx.KickoffAt = kickoff.Format(time.RFC3339)
				fixtures = append(fixtures, fx)
			}
			if len(fixtures) > 0 {
				writeJSON(w, fixtures)
				return
			}
		}
	}

	// Fallback: call API
	providerFixtures, err := h.gateway.GetFixturesByDate(ctx, time.Now())
	if err != nil {
		writeJSON(w, []FixtureResponse{})
		return
	}

	var fixtures []FixtureResponse
	for i, f := range providerFixtures {
		if i >= 30 { break }
		fixtures = append(fixtures, FixtureResponse{
			ID:        f.ExternalID,
			HomeTeam:  f.HomeTeamName,
			AwayTeam:  f.AwayTeamName,
			League:    f.LeagueName,
			Country:   f.Country,
			KickoffAt: f.KickoffAt.Format(time.RFC3339),
			Status:    f.Status,
			HomeScore: f.HomeScore,
			AwayScore: f.AwayScore,
			IsLive:    false,
			OddsHome:  1.90,
			OddsDraw:  3.20,
			OddsAway:  1.90,
		})
	}
	writeJSON(w, fixtures)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
