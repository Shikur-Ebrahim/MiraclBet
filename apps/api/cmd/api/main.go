package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/router"
	"github.com/miraclbet/api/internal/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[api] failed to load config: %v", err)
	}

	log.Printf("[api] starting %s (env=%s) on port %s", cfg.AppName, cfg.AppEnv, cfg.Port)

	var db *database.DB
	if cfg.DatabaseURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		db, err = database.Connect(ctx, cfg.DatabaseURL)
		cancel()
		if err != nil {
			log.Printf("[api] WARNING: database connection failed: %v — continuing without DB", err)
		} else {
			defer db.Close()
			log.Printf("[api] database connected")
			// Auto-migrate bet tables so they always exist
			autoMigrateCtx, autoMigrateCancel := context.WithTimeout(context.Background(), 15*time.Second)
			if migrateErr := autoMigrate(autoMigrateCtx, db); migrateErr != nil {
				log.Printf("[api] WARNING: auto-migrate failed: %v", migrateErr)
			} else {
				log.Printf("[api] auto-migrate complete")
			}
			autoMigrateCancel()
		}
	}

	var r2Service *storage.R2Service
	if cfg.R2AccountID != "" {
		r2Service, err = storage.NewR2Service(cfg)
		if err != nil {
			log.Printf("[api] WARNING: R2 connection failed: %v", err)
		} else {
			log.Printf("[api] R2 storage connected")
		}
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router.New(cfg, db, r2Service),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[api] listening on http://0.0.0.0:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[api] server error: %v", err)
		}
	}()

	<-quit
	log.Println("[api] shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[api] forced shutdown: %v", err)
	}
	log.Println("[api] stopped")
}

func autoMigrate(ctx context.Context, db *database.DB) error {
	_, err := db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS bet_slips (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			stake NUMERIC(15, 2) NOT NULL CHECK (stake > 0),
			total_odds NUMERIC(10, 2) NOT NULL,
			potential_payout NUMERIC(15, 2) NOT NULL,
			status TEXT NOT NULL DEFAULT 'PENDING',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_bet_slips_user_id ON bet_slips(user_id);

		CREATE TABLE IF NOT EXISTS bet_legs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			bet_slip_id UUID NOT NULL REFERENCES bet_slips(id) ON DELETE CASCADE,
			fixture_id TEXT NOT NULL,
			match_name TEXT NOT NULL,
			market_name TEXT NOT NULL,
			selection_id TEXT NOT NULL,
			selection_name TEXT NOT NULL,
			odds NUMERIC(10, 2) NOT NULL,
			status TEXT NOT NULL DEFAULT 'PENDING'
		);

		CREATE INDEX IF NOT EXISTS idx_bet_legs_slip_id ON bet_legs(bet_slip_id);
	`)
	return err
}
