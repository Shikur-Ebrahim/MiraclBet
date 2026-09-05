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

// HTTPGateway is a generic HTTP-based FootballProvider implementation.
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

func (g *HTTPGateway) GetFixturesByDate(ctx context.Context, date time.Time) ([]provider.ProviderFixture, error) {
    if g.baseURL == "" || g.apiKey == "" {
        return nil, fmt.Errorf("football API credentials not configured")
    }
    return nil, fmt.Errorf("GetFixturesByDate: not yet implemented")
}

func (g *HTTPGateway) GetLeagues(ctx context.Context) ([]provider.ProviderLeague, error) {
    if g.baseURL == "" || g.apiKey == "" {
        return nil, fmt.Errorf("football API credentials not configured")
    }
    return nil, fmt.Errorf("GetLeagues: not yet implemented")
}

func (g *HTTPGateway) GetLiveFixtures(ctx context.Context) ([]provider.ProviderFixture, error) {
    if g.baseURL == "" || g.apiKey == "" {
        return nil, fmt.Errorf("football API credentials not configured")
    }
    return nil, fmt.Errorf("GetLiveFixtures: not yet implemented")
}

func (g *HTTPGateway) doRequest(ctx context.Context, path string, result interface{}) error {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, g.baseURL+path, nil)
    if err != nil {
        return fmt.Errorf("create request: %w", err)
    }
    req.Header.Set("X-Api-Key", g.apiKey)
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
