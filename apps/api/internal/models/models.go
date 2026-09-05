package models

import "time"

type User struct {
    ID           string     `json:"id" db:"id"`
    Email        string     `json:"email" db:"email"`
    FullName     string     `json:"full_name" db:"full_name"`
    PasswordHash string     `json:"-" db:"password_hash"`
    IsActive     bool       `json:"is_active" db:"is_active"`
    IsVerified   bool       `json:"is_verified" db:"is_verified"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

type Sport struct {
    ID        string    `json:"id" db:"id"`
    Name      string    `json:"name" db:"name"`
    Slug      string    `json:"slug" db:"slug"`
    IsActive  bool      `json:"is_active" db:"is_active"`
    SortOrder int       `json:"sort_order" db:"sort_order"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type League struct {
    ID         string    `json:"id" db:"id"`
    SportID    string    `json:"sport_id" db:"sport_id"`
    ExternalID *string   `json:"external_id,omitempty" db:"external_id"`
    Name       string    `json:"name" db:"name"`
    Country    *string   `json:"country,omitempty" db:"country"`
    LogoURL    *string   `json:"logo_url,omitempty" db:"logo_url"`
    IsActive   bool      `json:"is_active" db:"is_active"`
    CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type Team struct {
    ID         string    `json:"id" db:"id"`
    ExternalID *string   `json:"external_id,omitempty" db:"external_id"`
    Name       string    `json:"name" db:"name"`
    ShortName  *string   `json:"short_name,omitempty" db:"short_name"`
    LogoURL    *string   `json:"logo_url,omitempty" db:"logo_url"`
    CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type FixtureStatus string

const (
    FixtureStatusScheduled FixtureStatus = "scheduled"
    FixtureStatusLive      FixtureStatus = "live"
    FixtureStatusFinished  FixtureStatus = "finished"
    FixtureStatusCancelled FixtureStatus = "cancelled"
    FixtureStatusPostponed FixtureStatus = "postponed"
)

type Fixture struct {
    ID           string        `json:"id" db:"id"`
    LeagueID     string        `json:"league_id" db:"league_id"`
    ExternalID   *string       `json:"external_id,omitempty" db:"external_id"`
    HomeTeamID   string        `json:"home_team_id" db:"home_team_id"`
    AwayTeamID   string        `json:"away_team_id" db:"away_team_id"`
    KickoffAt    time.Time     `json:"kickoff_at" db:"kickoff_at"`
    Status       FixtureStatus `json:"status" db:"status"`
    HomeScore    *int          `json:"home_score,omitempty" db:"home_score"`
    AwayScore    *int          `json:"away_score,omitempty" db:"away_score"`
    CreatedAt    time.Time     `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time     `json:"updated_at" db:"updated_at"`
}

type Market struct {
    ID        string    `json:"id" db:"id"`
    FixtureID string    `json:"fixture_id" db:"fixture_id"`
    Name      string    `json:"name" db:"name"`
    IsOpen    bool      `json:"is_open" db:"is_open"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Selection struct {
    ID       string  `json:"id" db:"id"`
    MarketID string  `json:"market_id" db:"market_id"`
    Name     string  `json:"name" db:"name"`
    Odds     float64 `json:"odds" db:"odds"`
    IsActive bool    `json:"is_active" db:"is_active"`
}

type FootballAPIUsage struct {
    ID              string    `json:"id" db:"id"`
    UsageDate       time.Time `json:"usage_date" db:"usage_date"`
    RequestCount    int       `json:"request_count" db:"request_count"`
    DailyLimit      int       `json:"daily_limit" db:"daily_limit"`
    LastRequestedAt time.Time `json:"last_requested_at" db:"last_requested_at"`
}
