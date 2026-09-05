package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/database"
)

type MetaHandler struct {
	db *database.DB
}

func NewMetaHandler(db *database.DB) *MetaHandler {
	return &MetaHandler{db: db}
}

type SportResponse struct {
	Slug         string `json:"slug"`
	Name         string `json:"name"`
	Emoji        string `json:"emoji"`
	FixtureCount int    `json:"count"`
}

type LeagueResponse struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Country        string `json:"country"`
	CountryFlagURL string `json:"country_flag_url"`
	LogoURL        string `json:"logo_url"` // stored in DB — points to media.api-sports.io or R2
	Season         int    `json:"season"`
	IsTopLeague    bool   `json:"is_top_league"`
}

// GetLeagues returns all active leagues grouped by country for the sidebar
func (h *MetaHandler) GetLeagues(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	live := r.URL.Query().Get("live") == "true"
	days := r.URL.Query().Get("days")

	// Base query
	query := `
		SELECT l.external_id, l.name, l.country, COALESCE(l.country_flag_url,''), COALESCE(l.logo_url,''), COALESCE(l.season, 0), l.is_top_league
		FROM leagues l
		WHERE l.sport_slug = 'football' AND l.is_active = true
	`

	if live {
		query += ` AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_external_id = l.external_id AND f.is_live = true)`
	} else if days != "" {
		// Filter by days
		query += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_external_id = l.external_id AND f.starts_at >= CURRENT_DATE AND f.starts_at < CURRENT_DATE + INTERVAL '%s days' + INTERVAL '1 day')`, days)
	}

	query += ` ORDER BY l.country ASC, l.is_top_league DESC, l.sort_order ASC, l.name ASC`

	rows, err := h.db.Pool.Query(ctx, query)

	if err == nil && rows != nil {
		defer rows.Close()
		var leagues []LeagueResponse
		for rows.Next() {
			var l LeagueResponse
			if err := rows.Scan(&l.ID, &l.Name, &l.Country, &l.CountryFlagURL, &l.LogoURL, &l.Season, &l.IsTopLeague); err == nil {
				if l.LogoURL == "" {
					l.LogoURL = fmt.Sprintf("https://media.api-sports.io/football/leagues/%s.png", l.ID)
				}
				leagues = append(leagues, l)
			}
		}
		if len(leagues) > 0 {
			writeJSON(w, leagues)
			return
		}
	}

	// Fallback to GetTopLeagues static data if DB query fails/empty
	h.GetTopLeagues(w, r)
}

// GetSports returns all active sports with their upcoming fixture counts
func (h *MetaHandler) GetSports(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	live := r.URL.Query().Get("live") == "true"
	days := r.URL.Query().Get("days")

	fixtureJoin := "f.starts_at > NOW()"
	if live {
		fixtureJoin = "f.is_live = true"
	} else if days != "" {
		fixtureJoin = fmt.Sprintf("f.starts_at >= CURRENT_DATE AND f.starts_at < CURRENT_DATE + INTERVAL '%s days' + INTERVAL '1 day'", days)
	}

	query := fmt.Sprintf(`
		SELECT s.slug, s.name, s.emoji, COUNT(f.id) as fixture_count
		FROM sports s
		LEFT JOIN fixtures f ON f.sport_slug = s.slug AND %s
		WHERE s.is_active = true
		GROUP BY s.id, s.slug, s.name, s.emoji, s.sort_order
		ORDER BY s.sort_order ASC
	`, fixtureJoin)

	rows, err := h.db.Pool.Query(ctx, query)

	if err != nil || rows == nil {
		// Fallback static list if sports table not yet seeded
		writeJSON(w, []SportResponse{
			{Slug: "football",   Name: "Football",   Emoji: "⚽", FixtureCount: 0},
			{Slug: "hockey",     Name: "Hockey",     Emoji: "🏒", FixtureCount: 0},
			{Slug: "tennis",     Name: "Tennis",     Emoji: "🎾", FixtureCount: 0},
			{Slug: "basketball", Name: "Basketball", Emoji: "🏀", FixtureCount: 0},
			{Slug: "baseball",   Name: "Baseball",   Emoji: "⚾", FixtureCount: 0},
			{Slug: "volleyball", Name: "Volleyball", Emoji: "🏐", FixtureCount: 0},
			{Slug: "rugby",      Name: "Rugby",      Emoji: "🏉", FixtureCount: 0},
			{Slug: "handball",   Name: "Handball",   Emoji: "🤾", FixtureCount: 0},
			{Slug: "mma",        Name: "MMA",        Emoji: "🥊", FixtureCount: 0},
			{Slug: "nba",        Name: "NBA",        Emoji: "🏀", FixtureCount: 0},
			{Slug: "nfl",        Name: "NFL",        Emoji: "🏈", FixtureCount: 0},
			{Slug: "formula-1",  Name: "Formula 1",  Emoji: "🏎️", FixtureCount: 0},
		})
		return
	}
	defer rows.Close()

	var sports []SportResponse
	for rows.Next() {
		var s SportResponse
		if err := rows.Scan(&s.Slug, &s.Name, &s.Emoji, &s.FixtureCount); err == nil {
			// Only include sport if it has matching fixtures (or if we are just fetching the list)
			// Actually the user wants to filter out sports that have 0 fixtures for that tab!
			if s.FixtureCount > 0 || s.Slug == "football" {
				sports = append(sports, s)
			}
		}
	}

	writeJSON(w, sports)
}

// GetTopLeagues returns top 15 leagues from DB with real logo URLs (API-Sports CDN)
func (h *MetaHandler) GetTopLeagues(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	live := r.URL.Query().Get("live") == "true"
	days := r.URL.Query().Get("days")

	query := `
		SELECT l.external_id, l.name, l.country, COALESCE(l.logo_url,''), COALESCE(l.season, 0), l.is_top_league
		FROM leagues l
		WHERE l.sport_slug = 'football' AND l.is_active = true
	`

	if live {
		query += ` AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_external_id = l.external_id AND f.is_live = true)`
	} else if days != "" {
		query += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM fixtures f WHERE f.league_external_id = l.external_id AND f.starts_at >= CURRENT_DATE AND f.starts_at < CURRENT_DATE + INTERVAL '%s days' + INTERVAL '1 day')`, days)
	}

	query += ` ORDER BY l.is_top_league DESC, l.sort_order ASC, l.name ASC LIMIT 15`

	// Query DB — returns is_top_league rows first, then by sort_order
	rows, err := h.db.Pool.Query(ctx, query)

	if err == nil && rows != nil {
		defer rows.Close()
		var leagues []LeagueResponse
		for rows.Next() {
			var l LeagueResponse
			if err := rows.Scan(&l.ID, &l.Name, &l.Country, &l.LogoURL, &l.Season, &l.IsTopLeague); err == nil {
				// Fallback logo from API-Sports CDN if logo_url is empty
				if l.LogoURL == "" {
					l.LogoURL = fmt.Sprintf("https://media.api-sports.io/football/leagues/%s.png", l.ID)
				}
				leagues = append(leagues, l)
			}
		}
		if len(leagues) > 0 {
			writeJSON(w, leagues)
			return
		}
	}

	// Fallback: seeded well-known top leagues with CDN logos
	writeJSON(w, []LeagueResponse{
		{ID: "2",   Name: "UEFA Champions League",  Country: "World",         LogoURL: "https://media.api-sports.io/football/leagues/2.png",   Season: 2025, IsTopLeague: true},
		{ID: "3",   Name: "UEFA Europa League",     Country: "World",         LogoURL: "https://media.api-sports.io/football/leagues/3.png",   Season: 2025, IsTopLeague: true},
		{ID: "848", Name: "UEFA Conference League", Country: "World",         LogoURL: "https://media.api-sports.io/football/leagues/848.png", Season: 2025, IsTopLeague: true},
		{ID: "5",   Name: "UEFA Nations League",    Country: "World",         LogoURL: "https://media.api-sports.io/football/leagues/5.png",   Season: 2025, IsTopLeague: true},
		{ID: "39",  Name: "Premier League",         Country: "England",       LogoURL: "https://media.api-sports.io/football/leagues/39.png",  Season: 2025, IsTopLeague: true},
		{ID: "140", Name: "La Liga",                Country: "Spain",         LogoURL: "https://media.api-sports.io/football/leagues/140.png", Season: 2025, IsTopLeague: true},
		{ID: "135", Name: "Serie A",                Country: "Italy",         LogoURL: "https://media.api-sports.io/football/leagues/135.png", Season: 2025, IsTopLeague: true},
		{ID: "78",  Name: "Bundesliga",             Country: "Germany",       LogoURL: "https://media.api-sports.io/football/leagues/78.png",  Season: 2025, IsTopLeague: true},
		{ID: "61",  Name: "Ligue 1",               Country: "France",        LogoURL: "https://media.api-sports.io/football/leagues/61.png",  Season: 2025, IsTopLeague: true},
		{ID: "13",  Name: "Copa Libertadores",      Country: "South America", LogoURL: "https://media.api-sports.io/football/leagues/13.png",  Season: 2025, IsTopLeague: true},
		{ID: "235", Name: "Premier League",         Country: "Russia",        LogoURL: "https://media.api-sports.io/football/leagues/235.png", Season: 2025, IsTopLeague: true},
		{ID: "332", Name: "Premier League",         Country: "Egypt",         LogoURL: "https://media.api-sports.io/football/leagues/332.png", Season: 2025, IsTopLeague: true},
		{ID: "88",  Name: "Eredivisie",             Country: "Netherlands",   LogoURL: "https://media.api-sports.io/football/leagues/88.png",  Season: 2025, IsTopLeague: true},
		{ID: "94",  Name: "Primeira Liga",          Country: "Portugal",      LogoURL: "https://media.api-sports.io/football/leagues/94.png",  Season: 2025, IsTopLeague: true},
		{ID: "203", Name: "Süper Lig",              Country: "Turkey",        LogoURL: "https://media.api-sports.io/football/leagues/203.png", Season: 2025, IsTopLeague: true},
	})
}
