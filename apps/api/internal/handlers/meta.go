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
	
	if err != nil {
		writeJSON(w, []SportResponse{})
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
		// Fallback empty list if DB query fails/empty
		sports = []SportResponse{}
	}

	writeJSON(w, sports)
}

// GetTopLeagues returns the top 15 leagues dynamically based on upcoming fixture count
func (h *MetaHandler) GetTopLeagues(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Dynamic: Get leagues with the most upcoming fixtures
	rows, err := h.db.Pool.Query(ctx, `
		SELECT l.external_id, l.name, l.country, COUNT(f.id) as fixture_count
		FROM leagues l
		JOIN fixtures f ON f.league_id = l.id
		WHERE f.starts_at > NOW()
		GROUP BY l.id, l.external_id, l.name, l.country
		ORDER BY fixture_count DESC
		LIMIT 15
	`)
	
	if err != nil {
		writeJSON(w, []LeagueResponse{})
		return
	}
	defer rows.Close()

	var leagues []LeagueResponse
	for rows.Next() {
		var l LeagueResponse
		var count int
		if err := rows.Scan(&l.ID, &l.Name, &l.Country, &count); err == nil {
			leagues = append(leagues, l)
		}
	}

	writeJSON(w, leagues)
}
