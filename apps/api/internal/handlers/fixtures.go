package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/football/gateway"
	"github.com/miraclbet/api/internal/football/provider"
)

type FixtureResponse struct {
	ID            string          `json:"id"`
	HomeTeam      string          `json:"home_team"`
	HomeTeamLogo  string          `json:"home_team_logo"`
	AwayTeam      string          `json:"away_team"`
	AwayTeamLogo  string          `json:"away_team_logo"`
	League        string          `json:"league"`
	LeagueLogoURL string          `json:"league_logo_url"`
	Country       string          `json:"country"`
	KickoffAt     string          `json:"kickoff_at"`
	Status        string          `json:"status"`
	Elapsed       *int            `json:"elapsed,omitempty"`
	HomeScore     *int            `json:"home_score"`
	AwayScore     *int            `json:"away_score"`
	IsLive        bool            `json:"is_live"`
	OddsHome      float64         `json:"odds_home"` // Legacy
	OddsDraw      float64         `json:"odds_draw"` // Legacy
	OddsAway      float64         `json:"odds_away"` // Legacy
	Sport         string          `json:"sport"`
	AdvancedOdds  json.RawMessage `json:"advanced_odds,omitempty"`
}

type FixturesHandler struct {
	db      *database.DB
	gateway *gateway.HTTPGateway
}

func NewFixturesHandler(db *database.DB, cfg *config.Config) *FixturesHandler {
	return &FixturesHandler{db: db, gateway: gateway.New(cfg)}
}

// Live returns currently live fixtures, optionally filtered by sport
func (h *FixturesHandler) Live(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sport := r.URL.Query().Get("sport")
	if sport == "" {
		sport = "football"
	}

	if h.db != nil {
		fixtures := h.queryFixturesWithArg(ctx, `
			SELECT f.external_id, f.home_team_name, COALESCE(f.home_team_logo,''), f.away_team_name, COALESCE(f.away_team_logo,''),
				COALESCE(l.name,'Unknown') as league, COALESCE(f.league_logo_url,'') as league_logo_url, COALESCE(l.country,'') as country,
				f.starts_at, f.status_short, f.elapsed, f.score_home, f.score_away, f.is_live,
				COALESCE(o.home,1.90), COALESCE(o.draw,3.20), COALESCE(o.away,1.90),
				COALESCE(f.sport_slug,'football'),
				f.advanced_odds
			FROM fixtures f
			LEFT JOIN leagues l ON f.league_id = l.id
			LEFT JOIN odds o ON o.fixture_id = f.id
			WHERE f.is_live = true AND COALESCE(f.sport_slug,'football') = $1
			ORDER BY f.starts_at DESC LIMIT 200`, sport)
		if len(fixtures) > 0 {
			writeJSON(w, fixtures)
			return
		}
	}

	if sport == "football" {
		pf, err := h.gateway.GetLiveFixtures(ctx)
		if err != nil {
			writeJSON(w, []FixtureResponse{})
			return
		}
		writeJSON(w, fromProvider(pf, 200, true, sport))
		return
	}
	writeJSON(w, []FixtureResponse{})
}

// ByDate returns fixtures for ?date=YYYY-MM-DD&sport=football&league=39
func (h *FixturesHandler) ByDate(w http.ResponseWriter, r *http.Request) {
	dateStr := r.URL.Query().Get("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		date = time.Now().UTC()
	}

	sport := r.URL.Query().Get("sport")
	if sport == "" {
		sport = "football"
	}

	leagueID := r.URL.Query().Get("league") // optional league external_id filter

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if h.db != nil {
		var fixtures []FixtureResponse
		if leagueID != "" {
			// Filter by league
			fixtures = h.queryFixturesWithArgs(ctx, `
				SELECT f.external_id, f.home_team_name, COALESCE(f.home_team_logo,''), f.away_team_name, COALESCE(f.away_team_logo,''),
					COALESCE(l.name,'Unknown') as league, COALESCE(f.league_logo_url,'') as league_logo_url, COALESCE(l.country,'') as country,
					f.starts_at, f.status_short, f.elapsed, f.score_home, f.score_away, f.is_live,
					COALESCE(o.home,1.90), COALESCE(o.draw,3.20), COALESCE(o.away,1.90),
					COALESCE(f.sport_slug,'football'),
					COALESCE(f.advanced_odds, '{}'::jsonb)::text
				FROM fixtures f
				LEFT JOIN leagues l ON l.external_id = $3
				LEFT JOIN odds o ON o.fixture_id = f.id
				WHERE DATE(f.starts_at AT TIME ZONE 'UTC') = $1
				  AND COALESCE(f.sport_slug,'football') = $2
				  AND (f.league_external_id = $3 OR l.external_id = $3)
				ORDER BY f.starts_at ASC LIMIT 200`,
				date.Format("2006-01-02"), sport, leagueID)
		} else {
			fixtures = h.queryFixturesWithArgs(ctx, `
				SELECT f.external_id, f.home_team_name, COALESCE(f.home_team_logo,''), f.away_team_name, COALESCE(f.away_team_logo,''),
					COALESCE(l.name,'Unknown') as league, COALESCE(f.league_logo_url,'') as league_logo_url, COALESCE(l.country,'') as country,
					f.starts_at, f.status_short, f.elapsed, f.score_home, f.score_away, f.is_live,
					COALESCE(o.home,1.90), COALESCE(o.draw,3.20), COALESCE(o.away,1.90),
					COALESCE(f.sport_slug,'football'),
					COALESCE(f.advanced_odds, '{}'::jsonb)::text
				FROM fixtures f
				LEFT JOIN leagues l ON f.league_id = l.id
				LEFT JOIN odds o ON o.fixture_id = f.id
				WHERE DATE(f.starts_at AT TIME ZONE 'UTC') = $1
				  AND COALESCE(f.sport_slug,'football') = $2
				ORDER BY f.starts_at ASC LIMIT 200`,
				date.Format("2006-01-02"), sport)
		}

		if len(fixtures) > 0 {
			writeJSON(w, fixtures)
			return
		}
	}

	// Football fallback to live API
	if sport == "football" && leagueID == "" {
		pf, err := h.gateway.GetFixturesByDate(ctx, date)
		if err != nil {
			writeJSON(w, []FixtureResponse{})
			return
		}
		writeJSON(w, fromProvider(pf, 200, false, sport))
		return
	}
	writeJSON(w, []FixtureResponse{})
}

// Today is convenience alias
func (h *FixturesHandler) Today(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	q.Set("date", time.Now().UTC().Format("2006-01-02"))
	r.URL.RawQuery = q.Encode()
	h.ByDate(w, r)
}

func (h *FixturesHandler) queryFixturesWithArg(ctx context.Context, sql string, arg interface{}) []FixtureResponse {
	rows, err := h.db.Pool.Query(ctx, sql, arg)
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanRows(rows)
}

func (h *FixturesHandler) queryFixturesWithArgs(ctx context.Context, sql string, args ...interface{}) []FixtureResponse {
	rows, err := h.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanRows(rows)
}

type rowScanner interface {
	Next() bool
	Scan(dest ...any) error
}

func scanRows(rows rowScanner) []FixtureResponse {
	var out []FixtureResponse
	for rows.Next() {
		var fx FixtureResponse
		var kickoff time.Time
		var advancedOddsStr *string // pointer handles NULLs safely
		err := rows.Scan(
			&fx.ID, &fx.HomeTeam, &fx.HomeTeamLogo, &fx.AwayTeam, &fx.AwayTeamLogo,
			&fx.League, &fx.LeagueLogoURL, &fx.Country,
			&kickoff, &fx.Status, &fx.Elapsed,
			&fx.HomeScore, &fx.AwayScore, &fx.IsLive,
			&fx.OddsHome, &fx.OddsDraw, &fx.OddsAway,
			&fx.Sport,
			&advancedOddsStr,
		)
		if err != nil {
			fmt.Printf("SCAN ERROR: %v\n", err)
		}
		fx.KickoffAt = kickoff.Format(time.RFC3339)
		if advancedOddsStr != nil && len(*advancedOddsStr) > 2 {
			fx.AdvancedOdds = json.RawMessage(*advancedOddsStr)
		}
		out = append(out, fx)
	}
	return out
}

var liveStatuses = map[string]bool{
	"1H": true, "HT": true, "2H": true, "ET": true, "P": true, "LIVE": true,
}

func fromProvider(pf []provider.ProviderFixture, limit int, forceIsLive bool, sport string) []FixtureResponse {
	var out []FixtureResponse
	for i, f := range pf {
		if i >= limit {
			break
		}
		out = append(out, FixtureResponse{
			ID:            f.ExternalID,
			HomeTeam:      f.HomeTeamName,
			HomeTeamLogo:  f.HomeTeamLogo,
			AwayTeam:      f.AwayTeamName,
			AwayTeamLogo:  f.AwayTeamLogo,
			League:        f.LeagueName,
			LeagueLogoURL: f.LeagueLogo,
			Country:       f.Country,
			KickoffAt:     f.KickoffAt.Format(time.RFC3339),
			Status:        f.Status,
			Elapsed:       f.Elapsed,
			HomeScore:     f.HomeScore,
			AwayScore:     f.AwayScore,
			IsLive:        forceIsLive || liveStatuses[f.Status],
			OddsHome:      1.90,
			OddsDraw:      3.20,
			OddsAway:      1.90,
			Sport:         sport,
		})
	}
	return out
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
