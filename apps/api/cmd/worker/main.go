package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/miraclbet/api/internal/config"
    "github.com/miraclbet/api/internal/database"
    "github.com/miraclbet/api/internal/football/gateway"
    "github.com/miraclbet/api/internal/football/quota"
    "github.com/miraclbet/api/internal/football/sync"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("[worker] failed to load config: %v", err)
    }

    log.Printf("[worker] starting MiraclBet Football Worker (env=%s)", cfg.AppEnv)

    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    dbCtx, dbCancel := context.WithTimeout(ctx, 10*time.Second)
    db, err := database.Connect(dbCtx, cfg.DatabaseURL)
    dbCancel()
    if err != nil {
        log.Fatalf("[worker] database connection failed: %v", err)
    }
    defer db.Close()
    log.Println("[worker] database connected")

    footballProvider := gateway.New(cfg)
    log.Printf("[worker] football provider: %s", footballProvider.Name())

    quotaService := quota.New(db, cfg.FootballAPIDailyLimit)
    log.Printf("[worker] quota service initialized (daily limit: %d)", cfg.FootballAPIDailyLimit)

    syncer := sync.New(db, footballProvider, quotaService)
    log.Println("[worker] syncer initialized")

    if !cfg.FootballSyncEnabled {
        log.Println("[worker] FOOTBALL_SYNC_ENABLED=false — sync disabled. Worker is idle and ready.")
        <-ctx.Done()
        log.Println("[worker] shutdown signal received")
        return
    }

    ticker := time.NewTicker(10 * time.Minute)
    defer ticker.Stop()

    log.Println("[worker] sync loop started (10 minute interval)")
    for {
        select {
        case <-ctx.Done():
            log.Println("[worker] shutting down")
            return
        case t := <-ticker.C:
            log.Printf("[worker] tick at %s", t.Format(time.RFC3339))
            if err := syncer.SyncFixtures(ctx, time.Now().UTC()); err != nil {
                log.Printf("[worker] sync error: %v", err)
            }
        }
    }
}
