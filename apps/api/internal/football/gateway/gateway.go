package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/football/provider"
)

type HTTPGateway struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	name       string
}

var _ provider.FootballProvider = (*HTTPGateway)(nil)

func New(cfg *config.Config) *HTTPGateway {
	return &HTTPGateway{
		baseURL: cfg.FootballAPIBaseURL,
		apiKey:  cfg.FootballAPIKey,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		name: "http-football-gateway",
	}
}

func (g *HTTPGateway) Name() string { return g.name }

// --- API-Football response shapes ---

type apiFixtureResponse struct {
	Response []struct {
		Fixture struct {
			ID     int    `json:"id"`
			Status struct {
				Short   string `json:"short"`
				Elapsed *int   `json:"elapsed"`
			} `json:"status"`
			Date string `json:"date"`
		} `json:"fixture"`
		League struct {
			ID      int    `json:"id"`
			Name    string `json:"name"`
			Country string `json:"country"`
			Logo    string `json:"logo"`
		} `json:"league"`
		Teams struct {
			Home struct {
				Name string `json:"name"`
				Logo string `json:"logo"`
			} `json:"home"`
			Away struct {
				Name string `json:"name"`
				Logo string `json:"logo"`
			} `json:"away"`
		} `json:"teams"`
		Goals struct {
			Home *int `json:"home"`
			Away *int `json:"away"`
		} `json:"goals"`
	} `json:"response"`
}

type apiLeagueResponse struct {
	Response []struct {
		League struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Logo string `json:"logo"`
		} `json:"league"`
		Country struct {
			Name string `json:"name"`
		} `json:"country"`
	} `json:"response"`
}

func (g *HTTPGateway) GetFixturesByDate(ctx context.Context, date time.Time) ([]provider.ProviderFixture, error) {
	if g.baseURL == "" || g.apiKey == "" {
		return nil, fmt.Errorf("football API credentials not configured")
	}
	dateStr := date.Format("2006-01-02")
	var raw apiFixtureResponse
	if err := g.doRequest(ctx, fmt.Sprintf("/fixtures?date=%s&timezone=UTC", dateStr), &raw); err != nil {
		return nil, err
	}
	return g.mapFixtures(raw), nil
}

func (g *HTTPGateway) GetLiveFixtures(ctx context.Context) ([]provider.ProviderFixture, error) {
	if g.baseURL == "" || g.apiKey == "" {
		return nil, fmt.Errorf("football API credentials not configured")
	}
	var raw apiFixtureResponse
	if err := g.doRequest(ctx, "/fixtures?live=all", &raw); err != nil {
		return nil, err
	}
	return g.mapFixtures(raw), nil
}

func (g *HTTPGateway) GetLeagues(ctx context.Context) ([]provider.ProviderLeague, error) {
	if g.baseURL == "" || g.apiKey == "" {
		return nil, fmt.Errorf("football API credentials not configured")
	}
	var raw apiLeagueResponse
	if err := g.doRequest(ctx, "/leagues?current=true", &raw); err != nil {
		return nil, err
	}
	var leagues []provider.ProviderLeague
	for _, l := range raw.Response {
		leagues = append(leagues, provider.ProviderLeague{
			ExternalID: fmt.Sprintf("%d", l.League.ID),
			Name:       l.League.Name,
			Country:    l.Country.Name,
			LogoURL:    l.League.Logo,
		})
	}
	return leagues, nil
}

func (g *HTTPGateway) mapFixtures(raw apiFixtureResponse) []provider.ProviderFixture {
	var fixtures []provider.ProviderFixture
	for _, f := range raw.Response {
		kickoff, _ := time.Parse(time.RFC3339, f.Fixture.Date)
		fixtures = append(fixtures, provider.ProviderFixture{
			ExternalID:       fmt.Sprintf("%d", f.Fixture.ID),
			HomeTeamName:     f.Teams.Home.Name,
			AwayTeamName:     f.Teams.Away.Name,
			HomeTeamLogo:     f.Teams.Home.Logo,
			AwayTeamLogo:     f.Teams.Away.Logo,
			LeagueExternalID: fmt.Sprintf("%d", f.League.ID),
			LeagueName:       f.League.Name,
			LeagueLogo:       f.League.Logo,
			Country:          f.League.Country,
			KickoffAt:        kickoff,
			Status:           f.Fixture.Status.Short,
			HomeScore:        f.Goals.Home,
			AwayScore:        f.Goals.Away,
		})
	}
	return fixtures
}

func (g *HTTPGateway) doRequest(ctx context.Context, path string, result interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, g.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("x-apisports-key", g.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("football API returned status %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(result)
}
