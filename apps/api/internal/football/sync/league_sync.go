package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// LeagueAPIResponse from API-Sports /leagues
type leagueAPIResp struct {
	Response []struct {
		League struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Logo string `json:"logo"`
		} `json:"league"`
		Country struct {
			Name string `json:"name"`
			Code string `json:"code"`
		} `json:"country"`
		Seasons []struct {
			Year    int  `json:"year"`
			Current bool `json:"current"`
		} `json:"seasons"`
	} `json:"response"`
}

// SyncLeagues fetches leagues from API-Sports and saves/updates them in the DB.
// It runs for football only (7500 req/day budget).
func SyncLeagues(db *pgxpool.Pool, apiKey string) {
	log.Println("[LeagueSync] Fetching football leagues from API-Sports...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Fetch current-season football leagues
	url := "https://v3.football.api-sports.io/leagues?current=true&type=League"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		log.Printf("[LeagueSync] Error building request: %v", err)
		return
	}
	req.Header.Set("x-apisports-key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[LeagueSync] HTTP error: %v", err)
		return
	}
	defer resp.Body.Close()

	var data leagueAPIResp
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		log.Printf("[LeagueSync] JSON decode error: %v", err)
		return
	}

	log.Printf("[LeagueSync] Got %d leagues from API", len(data.Response))

	saved := 0
	for _, item := range data.Response {
		if item.League.ID == 0 {
			continue
		}

		// Find current season year
		season := 0
		for _, s := range item.Seasons {
			if s.Current {
				season = s.Year
				break
			}
		}

		externalID := fmt.Sprintf("%d", item.League.ID)
		country := item.Country.Name
		if country == "" {
			country = "World"
		}
		logoURL := item.League.Logo
		if logoURL == "" {
			logoURL = fmt.Sprintf("https://media.api-sports.io/football/leagues/%d.png", item.League.ID)
		}

		// Upsert into leagues table
		_, err := db.Exec(ctx, `
			INSERT INTO leagues (external_id, sport_slug, name, country, logo_url, season, is_active, updated_at)
			VALUES ($1, 'football', $2, $3, $4, $5, true, NOW())
			ON CONFLICT (external_id) DO UPDATE SET
				name       = EXCLUDED.name,
				country    = EXCLUDED.country,
				logo_url   = EXCLUDED.logo_url,
				season     = EXCLUDED.season,
				is_active  = true,
				updated_at = NOW()
		`, externalID, item.League.Name, country, logoURL, season)

		if err != nil {
			log.Printf("[LeagueSync] Error saving league %s: %v", item.League.Name, err)
		} else {
			saved++
		}
	}

	log.Printf("[LeagueSync] Saved/updated %d leagues", saved)
}
