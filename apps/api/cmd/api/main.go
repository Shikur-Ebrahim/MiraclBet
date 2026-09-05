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
        }
    }

    _ = db // for future handlers

    srv := &http.Server{
        Addr:         fmt.Sprintf(":%s", cfg.Port),
        Handler:      router.New(cfg),
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
