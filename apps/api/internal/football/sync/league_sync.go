package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Top-15 league priority map: API-Sports league ID → priority rank (1 = highest)
var topLeaguePriority = map[string]int{
	"39":  1,  // Premier League (England)
	"140": 2,  // La Liga (Spain)
	"135": 3,  // Serie A (Italy)
	"78":  4,  // Bundesliga (Germany)
	"61":  5,  // Ligue 1 (France)
	"71":  6,  // Brasileirão Série A (Brazil)
	"94":  7,  // Primeira Liga (Portugal)
	"88":  8,  // Eredivisie (Netherlands)
	"144": 9,  // Belgian Pro League
	"203": 10, // Süper Lig (Turkey)
	"128": 11, // Argentine Primera División
	"253": 12, // MLS (USA & Canada)
	"307": 13, // Saudi Pro League
	"239": 14, // Paraguayan Primera División
	"98":  15, // J1 League (Japan)
}

// LeagueAPIPriority returns the priority for a league ID, or 99 if not in top 15
func LeagueAPIPriority(externalID string) int {
	if p, ok := topLeaguePriority[externalID]; ok {
		return p
	}
	return 99
}

// IsTopLeague returns true if the league ID is one of the top 15 priority leagues
func IsTopLeague(externalID string) bool {
	_, ok := topLeaguePriority[externalID]
	return ok
}

// LeagueNamePriority computes priority from the league name (fallback for leagues not in the ID map)
func LeagueNamePriority(name string) int {
	n := strings.ToLower(name)
	if strings.Contains(n, "premier league") && !strings.Contains(n, "russia") && !strings.Contains(n, "egypt") && !strings.Contains(n, "saudi") {
		return 1
	}
	if strings.Contains(n, "la liga") && !strings.Contains(n, "peru") {
		return 2
	}
	if strings.Contains(n, "serie a") && !strings.Contains(n, "brazil") {
		return 3
	}
	if strings.Contains(n, "bundesliga") && !strings.Contains(n, "2. ") && !strings.Contains(n, "austria") {
		return 4
	}
	if strings.Contains(n, "ligue 1") {
		return 5
	}
	if strings.Contains(n, "brasileiro") || strings.Contains(n, "brasileirao") {
		return 6
	}
	if strings.Contains(n, "primeira liga") || (strings.Contains(n, "liga portugal") && !strings.Contains(n, "2")) {
		return 7
	}
	if strings.Contains(n, "eredivisie") {
		return 8
	}
	if strings.Contains(n, "belgian pro league") || (strings.Contains(n, "pro league") && strings.Contains(n, "belgi")) {
		return 9
	}
	if strings.Contains(n, "süper lig") || strings.Contains(n, "super lig") {
		return 10
	}
	if strings.Contains(n, "primera división") || strings.Contains(n, "primera division") {
		return 11
	}
	if strings.Contains(n, "mls") || strings.Contains(n, "major league soccer") {
		return 12
	}
	if strings.Contains(n, "saudi") && strings.Contains(n, "pro league") {
		return 13
	}
	if strings.Contains(n, "paraguayan primera") {
		return 14
	}
	if strings.Contains(n, "j1 league") || strings.Contains(n, "j. league") {
		return 15
	}
	return 99
}

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
			Flag string `json:"flag"`
		} `json:"country"`
		Seasons []struct {
			Year    int  `json:"year"`
			Current bool `json:"current"`
		} `json:"seasons"`
	} `json:"response"`
}

// SyncLeagues fetches leagues from API-Sports and saves/updates them in the DB.
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

	query := `
		INSERT INTO leagues (
			external_id, sport_slug, name, country, country_flag_url, logo_url, season,
			is_active, is_top_league, league_priority, updated_at
		) VALUES (
			$1, 'football', $2, $3, $4, $5, $6, true, $7, $8, NOW()
		) ON CONFLICT (external_id) DO UPDATE SET
			name             = EXCLUDED.name,
			country          = EXCLUDED.country,
			country_flag_url = EXCLUDED.country_flag_url,
			logo_url         = EXCLUDED.logo_url,
			season           = EXCLUDED.season,
			is_active        = true,
			is_top_league    = EXCLUDED.is_top_league,
			league_priority  = EXCLUDED.league_priority,
			updated_at       = NOW()
	`

	saved := 0
	for _, item := range data.Response {
		if item.League.ID == 0 {
			continue
		}

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

		flagURL := item.Country.Flag

		// Determine priority: use ID map first, fall back to name matching
		priority := LeagueAPIPriority(externalID)
		if priority == 99 {
			priority = LeagueNamePriority(item.League.Name)
		}
		isTop := priority <= 15

		_, err := db.Exec(ctx, query,
			externalID, item.League.Name, country, flagURL, logoURL, season,
			isTop, priority,
		)

		if err != nil {
			log.Printf("[LeagueSync] Error saving league %s: %v", item.League.Name, err)
		} else {
			saved++
		}
	}

	log.Printf("[LeagueSync] Saved/updated %d leagues", saved)
}
