package sync

import (
	"context"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/football/provider"
	"github.com/miraclbet/api/internal/football/quota"
)

type Syncer struct {
	db       *database.DB
	provider provider.FootballProvider
	quota    *quota.QuotaService
}

func New(db *database.DB, p provider.FootballProvider, q *quota.QuotaService) *Syncer {
	return &Syncer{db: db, provider: p, quota: q}
}

// SyncMultipleDays fetches today + N days and saves them to the DB.
// Top-15 league fixtures are always saved first.
func (s *Syncer) SyncMultipleDays(ctx context.Context, days int) error {
	today := time.Now().UTC()
	for i := 0; i < days; i++ {
		date := today.AddDate(0, 0, i)
		log.Printf("[sync] Syncing fixtures for %s...", date.Format("2006-01-02"))
		if err := s.SyncFixtures(ctx, date); err != nil {
			log.Printf("[sync] error syncing date %s: %v", date.Format("2006-01-02"), err)
		}
		time.Sleep(1 * time.Second) // rate limiting
	}
	return nil
}

func (s *Syncer) SyncLiveFixtures(ctx context.Context) error {
	ok, err := s.quota.CanRequest(ctx)
	if err != nil || !ok {
		return fmt.Errorf("quota limit reached or error: %v", err)
	}

	fixtures, err := s.provider.GetLiveFixtures(ctx)
	if err != nil {
		return fmt.Errorf("provider error: %w", err)
	}
	if err := s.quota.Increment(ctx); err != nil {
		log.Printf("[sync] warning: failed to record quota usage: %v", err)
	}

	return s.saveFixtures(ctx, fixtures)
}

func (s *Syncer) SyncFixtures(ctx context.Context, date time.Time) error {
	ok, err := s.quota.CanRequest(ctx)
	if err != nil || !ok {
		return fmt.Errorf("quota limit reached or error: %v", err)
	}

	fixtures, err := s.provider.GetFixturesByDate(ctx, date)
	if err != nil {
		return fmt.Errorf("provider error: %w", err)
	}
	if err := s.quota.Increment(ctx); err != nil {
		log.Printf("[sync] warning: failed to record quota usage: %v", err)
	}

	return s.saveFixtures(ctx, fixtures)
}

func (s *Syncer) saveFixtures(ctx context.Context, fixtures []provider.ProviderFixture) error {
	if len(fixtures) == 0 {
		return nil
	}

	// ── Sort: top-15 leagues first, then by kickoff time ──────────────────────
	sort.SliceStable(fixtures, func(i, j int) bool {
		pi := LeagueAPIPriority(fixtures[i].LeagueExternalID)
		pj := LeagueAPIPriority(fixtures[j].LeagueExternalID)
		if pi != pj {
			return pi < pj
		}
		return fixtures[i].KickoffAt.Before(fixtures[j].KickoffAt)
	})

	liveStatuses := map[string]bool{
		"1H": true, "HT": true, "2H": true, "ET": true, "P": true, "LIVE": true,
	}

	query := `
		INSERT INTO fixtures (
			external_id,
			home_team_name, away_team_name,
			home_team_logo, away_team_logo,
			league_external_id, league_id, league_name, league_logo_url,
			sport_slug,
			starts_at, status_short, elapsed,
			score_home, score_away, is_live,
			league_priority
		) VALUES (
			$1, $2, $3, $4, $5, $6, 
			(SELECT id FROM leagues WHERE external_id = $6 LIMIT 1),
			$7, $8, 'football', $9, $10, $11, $12, $13, $14, $15
		) ON CONFLICT (external_id) DO UPDATE SET
			home_team_name     = EXCLUDED.home_team_name,
			away_team_name     = EXCLUDED.away_team_name,
			home_team_logo     = EXCLUDED.home_team_logo,
			away_team_logo     = EXCLUDED.away_team_logo,
			league_external_id = EXCLUDED.league_external_id,
			league_id          = (SELECT id FROM leagues WHERE external_id = EXCLUDED.league_external_id LIMIT 1),
			league_name        = EXCLUDED.league_name,
			league_logo_url    = EXCLUDED.league_logo_url,
			sport_slug         = 'football',
			starts_at          = EXCLUDED.starts_at,
			status_short       = EXCLUDED.status_short,
			elapsed            = EXCLUDED.elapsed,
			score_home         = EXCLUDED.score_home,
			score_away         = EXCLUDED.score_away,
			is_live            = EXCLUDED.is_live,
			league_priority    = EXCLUDED.league_priority
	`

	saved := 0
	topSaved := 0
	for _, f := range fixtures {
		isLive := liveStatuses[f.Status]
		priority := LeagueAPIPriority(f.LeagueExternalID)
		if priority == 99 {
			priority = LeagueNamePriority(f.LeagueName)
		}

		_, err := s.db.Pool.Exec(ctx, query,
			f.ExternalID,
			f.HomeTeamName, f.AwayTeamName,
			f.HomeTeamLogo, f.AwayTeamLogo,
			f.LeagueExternalID, f.LeagueName, f.LeagueLogo,
			f.KickoffAt, f.Status, f.Elapsed,
			f.HomeScore, f.AwayScore, isLive,
			priority,
		)
		if err != nil {
			log.Printf("[sync] error saving fixture %s: %v", f.ExternalID, err)
		} else {
			saved++
			if priority <= 15 {
				topSaved++
			}
		}
	}

	log.Printf("[sync] Saved/updated %d/%d fixtures (%d from top-15 leagues)", saved, len(fixtures), topSaved)
	return nil
}

// CleanupFinishedMatches deletes stale matches from the DB:
// 1. Finished/cancelled matches older than 24h
// 2. Past-date matches that never started (NS) — yesterday and older
func (s *Syncer) CleanupFinishedMatches(ctx context.Context) error {
	// Delete finished/cancelled matches older than 24 hours
	q1 := `
		DELETE FROM fixtures
		WHERE status_short IN ('FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD', 'INT')
		AND starts_at < NOW() - INTERVAL '24 hours'
	`
	res1, err := s.db.Pool.Exec(ctx, q1)
	if err != nil {
		log.Printf("[cleanup] error deleting finished matches: %v", err)
	} else if res1.RowsAffected() > 0 {
		log.Printf("[cleanup] deleted %d finished matches older than 24h", res1.RowsAffected())
	}

	// Delete past-date matches that never kicked off (status NS or empty)
	// This cleans up old 20/09 matches that are still "Not Started" but the day has passed
	q2 := `
		DELETE FROM fixtures
		WHERE (status_short = 'NS' OR status_short = '' OR status_short IS NULL)
		AND starts_at < CURRENT_DATE AT TIME ZONE 'UTC'
	`
	res2, err2 := s.db.Pool.Exec(ctx, q2)
	if err2 != nil {
		log.Printf("[cleanup] error deleting past NS matches: %v", err2)
	} else if res2.RowsAffected() > 0 {
		log.Printf("[cleanup] deleted %d past NS matches from previous days", res2.RowsAffected())
	}

	return nil
}
