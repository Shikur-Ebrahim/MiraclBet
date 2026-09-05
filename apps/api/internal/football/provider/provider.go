package provider

import (
    "context"
    "time"
)

type ProviderFixture struct {
    ExternalID       string
    HomeTeamName     string
    AwayTeamName     string
    HomeTeamLogo     string    // e.g. https://media.api-sports.io/football/teams/33.png
    AwayTeamLogo     string
    LeagueName       string
    LeagueExternalID string    // API league ID e.g. "39"
    LeagueLogo       string
    Country          string
    KickoffAt        time.Time
    Status           string
    Elapsed          *int
    HomeScore        *int
    AwayScore        *int
}

type ProviderLeague struct {
    ExternalID string
    Name       string
    Country    string
    LogoURL    string
}

type FootballProvider interface {
    GetFixturesByDate(ctx context.Context, date time.Time) ([]ProviderFixture, error)
    GetLeagues(ctx context.Context) ([]ProviderLeague, error)
    GetLiveFixtures(ctx context.Context) ([]ProviderFixture, error)
    Name() string
}
