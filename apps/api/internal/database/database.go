package database

import (
    "context"
    "fmt"
    "time"
    "github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
    Pool *pgxpool.Pool
}

func Connect(ctx context.Context, databaseURL string) (*DB, error) {
    if databaseURL == "" {
        return nil, fmt.Errorf("DATABASE_URL is required")
    }

    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("parse database config: %w", err)
    }

    config.MaxConns = 20
    config.MinConns = 2
    config.MaxConnLifetime = time.Hour
    config.MaxConnIdleTime = 30 * time.Minute
    config.HealthCheckPeriod = time.Minute

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, fmt.Errorf("create connection pool: %w", err)
    }

    if err := pool.Ping(ctx); err != nil {
        return nil, fmt.Errorf("ping database: %w", err)
    }

    return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
    if db.Pool != nil {
        db.Pool.Close()
    }
}
