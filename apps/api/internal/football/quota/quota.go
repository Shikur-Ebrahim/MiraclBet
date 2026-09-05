package quota

import (
    "context"
    "fmt"
    "time"

    "github.com/miraclbet/api/internal/database"
)

type QuotaService struct {
    db         *database.DB
    dailyLimit int
}

func New(db *database.DB, dailyLimit int) *QuotaService {
    return &QuotaService{db: db, dailyLimit: dailyLimit}
}

func (q *QuotaService) CanRequest(ctx context.Context) (bool, error) {
    count, err := q.todayCount(ctx)
    if err != nil {
        return false, err
    }
    return count < q.dailyLimit, nil
}

func (q *QuotaService) Remaining(ctx context.Context) (int, error) {
    count, err := q.todayCount(ctx)
    if err != nil {
        return 0, err
    }
    remaining := q.dailyLimit - count
    if remaining < 0 {
        return 0, nil
    }
    return remaining, nil
}

func (q *QuotaService) Increment(ctx context.Context) error {
    today := time.Now().UTC().Format("2006-01-02")
    _, err := q.db.Pool.Exec(ctx, `
        INSERT INTO football_api_usage (usage_date, request_count, daily_limit, last_requested_at)
        VALUES ($1, 1, $2, NOW())
        ON CONFLICT (usage_date) DO UPDATE
        SET request_count = football_api_usage.request_count + 1,
            last_requested_at = NOW()
        WHERE football_api_usage.request_count < football_api_usage.daily_limit
    `, today, q.dailyLimit)
    if err != nil {
        return fmt.Errorf("increment quota: %w", err)
    }
    return nil
}

func (q *QuotaService) todayCount(ctx context.Context) (int, error) {
    today := time.Now().UTC().Format("2006-01-02")
    var count int
    err := q.db.Pool.QueryRow(ctx, `
        SELECT COALESCE(request_count, 0)
        FROM football_api_usage
        WHERE usage_date = $1
    `, today).Scan(&count)
    if err != nil {
        return 0, nil
    }
    return count, nil
}
