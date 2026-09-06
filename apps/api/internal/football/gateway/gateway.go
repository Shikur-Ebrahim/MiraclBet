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
			Flag string `json:"flag"`
		} `json:"country"`
	} `json:"response"`
}

type apiPrematchOddResponse struct {
	Response []struct {
		Fixture struct {
			ID int `json:"id"`
		} `json:"fixture"`
		Bookmakers []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Bets []struct {
				ID     int    `json:"id"`
				Name   string `json:"name"`
				Values []struct {
					Value interface{} `json:"value"` // API returns string OR number depending on market
					Odd   string      `json:"odd"`
				} `json:"values"`
			} `json:"bets"`
		} `json:"bookmakers"`
	} `json:"response"`
}

type apiLiveOddResponse struct {
	Response []struct {
		Fixture struct {
			ID int `json:"id"`
		} `json:"fixture"`
		Odds []struct {
			ID     int    `json:"id"`
			Name   string `json:"name"`
			Values []struct {
				Value interface{} `json:"value"` // API returns string OR number depending on market
				Odd   string      `json:"odd"`
			} `json:"values"`
		} `json:"odds"`
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
			ExternalID:      fmt.Sprintf("%d", l.League.ID),
			Name:            l.League.Name,
			Country:         l.Country.Name,
			CountryFlagURL:  l.Country.Flag,
			LogoURL:         l.League.Logo,
		})
	}
	return leagues, nil
}

func (g *HTTPGateway) GetOddsByDate(ctx context.Context, date time.Time) ([]provider.ProviderOdd, error) {
	if g.baseURL == "" || g.apiKey == "" {
		return nil, fmt.Errorf("football API credentials not configured")
	}
	dateStr := date.Format("2006-01-02")

	var allOdds []provider.ProviderOdd
	page := 1

	for {
		var raw apiPrematchOddResponse
		endpoint := fmt.Sprintf("/odds?date=%s&bookmaker=8&page=%d", dateStr, page)
		if err := g.doRequest(ctx, endpoint, &raw); err != nil {
			return nil, err
		}
		if len(raw.Response) == 0 {
			break // no more pages
		}

		for _, f := range raw.Response {
			if len(f.Bookmakers) == 0 {
				continue
			}
			bm := f.Bookmakers[0]
			var markets []provider.ProviderMarket
			for _, m := range bm.Bets {
				var vals []provider.ProviderMarketValue
				for _, v := range m.Values {
					vals = append(vals, provider.ProviderMarketValue{
						Value: fmt.Sprintf("%v", v.Value),
						Odd:   v.Odd,
					})
				}
				markets = append(markets, provider.ProviderMarket{
					ID:     m.ID,
					Name:   m.Name,
					Values: vals,
				})
			}
			allOdds = append(allOdds, provider.ProviderOdd{
				FixtureID: fmt.Sprintf("%d", f.Fixture.ID),
				Bookmaker: bm.Name,
				Markets:   markets,
			})
		}

		// Safety: stop at page 10 to avoid burning too many quota requests
		if page >= 10 {
			break
		}
		page++
	}

	return allOdds, nil
}

func (g *HTTPGateway) GetLiveOdds(ctx context.Context) ([]provider.ProviderOdd, error) {
	if g.baseURL == "" || g.apiKey == "" {
		return nil, fmt.Errorf("football API credentials not configured")
	}
	var raw apiLiveOddResponse
	if err := g.doRequest(ctx, "/odds/live", &raw); err != nil {
		return nil, err
	}

	var odds []provider.ProviderOdd
	for _, f := range raw.Response {
		var markets []provider.ProviderMarket
		for _, m := range f.Odds {
			var vals []provider.ProviderMarketValue
			for _, v := range m.Values {
				vals = append(vals, provider.ProviderMarketValue{
					Value: fmt.Sprintf("%v", v.Value),
					Odd:   v.Odd,
				})
			}
			markets = append(markets, provider.ProviderMarket{
				ID:     m.ID,
				Name:   m.Name,
				Values: vals,
			})
		}
		odds = append(odds, provider.ProviderOdd{
			FixtureID: fmt.Sprintf("%d", f.Fixture.ID),
			Bookmaker: "Live",
			Markets:   markets,
		})
	}
	return odds, nil
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
			Elapsed:          f.Fixture.Status.Elapsed,
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
