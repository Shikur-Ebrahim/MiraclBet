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

func (s *Syncer) SyncFixtures(ctx context.Context, date time.Time) error {
    ok, err := s.quota.CanRequest(ctx)
    if err != nil {
        return fmt.Errorf("check quota: %w", err)
    }
    if !ok {
        return fmt.Errorf("daily quota exceeded — sync skipped")
    }

    log.Printf("[sync] SyncFixtures for %s via provider %s — full implementation pending",
        date.Format("2006-01-02"), s.provider.Name())
    return nil
}

func (s *Syncer) SyncLeagues(ctx context.Context) error {
    log.Printf("[sync] SyncLeagues via provider %s — full implementation pending", s.provider.Name())
    return nil
}
