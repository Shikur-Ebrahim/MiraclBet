package sync

import (
	"context"
	"fmt"
	"log"
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

// SyncMultipleDays fetches today + N days and saves them to the DB
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
	if err := s.quota.RecordUsage(ctx); err != nil {
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
	if err := s.quota.RecordUsage(ctx); err != nil {
		log.Printf("[sync] warning: failed to record quota usage: %v", err)
	}

	return s.saveFixtures(ctx, fixtures)
}

func (s *Syncer) saveFixtures(ctx context.Context, fixtures []provider.ProviderFixture) error {
	if len(fixtures) == 0 {
		return nil
	}

	// Prepare batch upsert
	query := `
		INSERT INTO fixtures (
			external_id, home_team_name, away_team_name,
			starts_at, status_short, score_home, score_away, is_live, sport
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, 'football'
		) ON CONFLICT (external_id) DO UPDATE SET
			home_team_name = EXCLUDED.home_team_name,
			away_team_name = EXCLUDED.away_team_name,
			starts_at = EXCLUDED.starts_at,
			status_short = EXCLUDED.status_short,
			score_home = EXCLUDED.score_home,
			score_away = EXCLUDED.score_away,
			is_live = EXCLUDED.is_live,
			updated_at = NOW()
	`

	liveStatuses := map[string]bool{
		"1H": true, "HT": true, "2H": true, "ET": true, "P": true, "LIVE": true,
	}

	saved := 0
	for _, f := range fixtures {
		isLive := liveStatuses[f.Status]
		_, err := s.db.Pool.Exec(ctx, query,
			f.ExternalID, f.HomeTeamName, f.AwayTeamName,
			f.KickoffAt, f.Status, f.HomeScore, f.AwayScore, isLive,
		)
		if err != nil {
			log.Printf("[sync] error saving fixture %s: %v", f.ExternalID, err)
		} else {
			saved++
		}
	}

	log.Printf("[sync] Successfully saved/updated %d fixtures", saved)
	return nil
}
