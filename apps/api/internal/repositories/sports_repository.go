package repositories

import (
    "context"
    "github.com/miraclbet/api/internal/database"
    "github.com/miraclbet/api/internal/models"
)

type SportsRepository struct {
    db *database.DB
}

func NewSportsRepository(db *database.DB) *SportsRepository {
    return &SportsRepository{db: db}
}

func (r *SportsRepository) GetAll(ctx context.Context) ([]models.Sport, error) {
    rows, err := r.db.Pool.Query(ctx, `SELECT id, name, slug, is_active, sort_order, created_at FROM sports WHERE is_active = true ORDER BY sort_order`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var sports []models.Sport
    for rows.Next() {
        var s models.Sport
        if err := rows.Scan(&s.ID, &s.Name, &s.Slug, &s.IsActive, &s.SortOrder, &s.CreatedAt); err != nil {
            return nil, err
        }
        sports = append(sports, s)
    }
    return sports, rows.Err()
}
