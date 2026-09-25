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

    // ── Tickers ──────────────────────────────────────────────────────────────
    // Every 1 minute  — sync live fixtures + live odds
    liveTicker := time.NewTicker(1 * time.Minute)
    defer liveTicker.Stop()

    // Every 5 minutes — refresh TODAY's prematch odds (High Priority)
    todayOddsTicker := time.NewTicker(5 * time.Minute)
    defer todayOddsTicker.Stop()

    // Every 15 minutes — refresh TOMORROW's prematch odds (Medium Priority)
    tomorrowOddsTicker := time.NewTicker(15 * time.Minute)
    defer tomorrowOddsTicker.Stop()

    // Every 1 hour — delete finished matches older than 24h
    cleanupTicker := time.NewTicker(1 * time.Hour)
    defer cleanupTicker.Stop()

    // Every 3 hours — full 7-day fixture + odds re-sync + league update
    dailyTicker := time.NewTicker(3 * time.Hour)
    defer dailyTicker.Stop()

    log.Println("[worker] sync loop started")

    // ── Startup sync (runs immediately in background) ─────────────────────────
    go func() {
        log.Println("[worker] ── STARTUP SYNC ──")

        // 1. Sync leagues so fixtures can link to league IDs
        sync.SyncLeagues(db.Pool, cfg.FootballAPIKey)

        // 2. Live data immediately
        _ = syncer.SyncLiveFixtures(ctx)
        _ = syncer.SyncLiveOdds(ctx)

        // 3. Sync fixtures for today + next 6 days
        _ = syncer.SyncMultipleDays(ctx, 7)

        // 4. Sync odds for all 7 days
        today := time.Now().UTC()
        for i := 0; i < 7; i++ {
            _ = syncer.SyncOddsByDate(ctx, today.AddDate(0, 0, i))
            time.Sleep(1 * time.Second)
        }

        // 5. Clean up any old finished matches right away
        _ = syncer.CleanupFinishedMatches(ctx)

        log.Println("[worker] ── STARTUP SYNC COMPLETE ──")
    }()

    go syncer.StartLiveMonitor(ctx)

    // ── Main event loop ───────────────────────────────────────────────────────
    for {
        select {
        case <-ctx.Done():
            log.Println("[worker] shutdown signal — exiting")
            return

        case <-liveTicker.C:
            // Every minute: keep live matches + live odds up to date
            log.Println("[worker] tick: live fixtures & odds...")
            _ = syncer.SyncLiveFixtures(ctx)
            _ = syncer.SyncLiveOdds(ctx)

        case <-todayOddsTicker.C:
            // Every 5 min: refresh fixtures & prematch odds for today (HIGH PRIORITY)
            // Syncing fixtures here catches matches that just finished (FT) and dropped out of the /live feed
            log.Println("[worker] tick: fixtures & prematch odds today...")
            _ = syncer.SyncFixtures(ctx, time.Now().UTC())
            _ = syncer.SyncOddsByDate(ctx, time.Now().UTC())

        case <-tomorrowOddsTicker.C:
            // Every 15 min: refresh prematch odds for tomorrow (MEDIUM PRIORITY)
            log.Println("[worker] tick: prematch odds tomorrow...")
            _ = syncer.SyncOddsByDate(ctx, time.Now().UTC().AddDate(0, 0, 1))

        case <-cleanupTicker.C:
            // Every hour: delete finished matches older than 24h
            log.Println("[worker] tick: cleanup finished matches...")
            _ = syncer.CleanupFinishedMatches(ctx)

        case <-dailyTicker.C:
            // Every 3 hours: full re-sync of 7-day window + leagues
            log.Println("[worker] tick: full 7-day sync + leagues...")
            sync.SyncLeagues(db.Pool, cfg.FootballAPIKey)
            _ = syncer.SyncMultipleDays(ctx, 7)
            today := time.Now().UTC()
            for i := 0; i < 7; i++ {
                _ = syncer.SyncOddsByDate(ctx, today.AddDate(0, 0, i))
                time.Sleep(1 * time.Second)
            }
            _ = syncer.CleanupFinishedMatches(ctx)
        }
    }
}
