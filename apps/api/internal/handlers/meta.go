package handlers

import (
	"context"
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
	ID      string `json:"id"`
	Name    string `json:"name"`
	Country string `json:"country"`
}

// GetSports returns all active sports with their upcoming fixture counts
func (h *MetaHandler) GetSports(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.db.Pool.Query(ctx, `
		SELECT s.slug, s.name, s.emoji, COUNT(f.id) as fixture_count
		FROM sports s
		LEFT JOIN fixtures f ON f.sport_slug = s.slug AND f.starts_at > NOW()
		WHERE s.is_active = true
		GROUP BY s.id, s.slug, s.name, s.emoji, s.sort_order
		ORDER BY s.sort_order ASC
	`)
	
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
			sports = append(sports, s)
		}
	}
	
	if len(sports) == 0 {
		sports = []SportResponse{}
	}

	writeJSON(w, sports)
}

// GetTopLeagues returns top 15 leagues from DB, falling back to well-known league seeds
func (h *MetaHandler) GetTopLeagues(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Try DB-backed approach: leagues with most upcoming fixtures
	rows, err := h.db.Pool.Query(ctx, `
		SELECT l.external_id, l.name, l.country, COUNT(f.id) as cnt
		FROM leagues l
		LEFT JOIN fixtures f ON f.league_id = l.id AND f.starts_at > NOW()
		WHERE l.sport_slug = 'football'
		GROUP BY l.id, l.external_id, l.name, l.country
		ORDER BY cnt DESC, l.name ASC
		LIMIT 15
	`)

	if err == nil {
		defer rows.Close()
		var leagues []LeagueResponse
		for rows.Next() {
			var l LeagueResponse
			var cnt int
			if err := rows.Scan(&l.ID, &l.Name, &l.Country, &cnt); err == nil {
				leagues = append(leagues, l)
			}
		}
		if len(leagues) > 0 {
			writeJSON(w, leagues)
			return
		}
	}

	// Fallback: well-known top leagues hardcoded as seed data
	writeJSON(w, []LeagueResponse{
		{ID: "2",   Name: "UEFA Champions League",   Country: "World"},
		{ID: "3",   Name: "UEFA Europa League",      Country: "World"},
		{ID: "848", Name: "UEFA Conference League",  Country: "World"},
		{ID: "5",   Name: "UEFA Nations League",     Country: "World"},
		{ID: "39",  Name: "Premier League",          Country: "England"},
		{ID: "140", Name: "La Liga",                 Country: "Spain"},
		{ID: "135", Name: "Serie A",                 Country: "Italy"},
		{ID: "78",  Name: "Bundesliga",              Country: "Germany"},
		{ID: "61",  Name: "Ligue 1",                 Country: "France"},
		{ID: "13",  Name: "Copa Libertadores",       Country: "South America"},
		{ID: "235", Name: "Premier League",          Country: "Russia"},
		{ID: "332", Name: "Premier League",          Country: "Egypt"},
		{ID: "88",  Name: "Eredivisie",              Country: "Netherlands"},
		{ID: "94",  Name: "Primeira Liga",           Country: "Portugal"},
		{ID: "203", Name: "Süper Lig",               Country: "Turkey"},
	})
}
