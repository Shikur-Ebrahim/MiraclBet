package config

import (
    "fmt"
    "os"
    "strconv"
    "strings"
    "github.com/joho/godotenv"
)

type Config struct {
    AppName  string
    AppEnv   string
    Port     string

    DatabaseURL string

    SupabaseURL            string
    SupabaseServiceRoleKey string

    JWTSecret string

    CORSAllowedOrigins []string

    FootballAPIBaseURL   string
    FootballAPIKey       string
    FootballAPIDailyLimit int
    FootballSyncEnabled  bool
}

func Load() (*Config, error) {
    _ = godotenv.Load() // best-effort .env load

    dailyLimit, _ := strconv.Atoi(getEnv("FOOTBALL_API_DAILY_LIMIT", "7500"))
    syncEnabled, _ := strconv.ParseBool(getEnv("FOOTBALL_SYNC_ENABLED", "false"))

    cfg := &Config{
        AppName:  getEnv("APP_NAME", "MiraclBet"),
        AppEnv:   getEnv("APP_ENV", "development"),
        Port:     getEnv("PORT", "8080"),

        DatabaseURL: getEnv("DATABASE_URL", ""),

        SupabaseURL:            getEnv("SUPABASE_URL", ""),
        SupabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),

        JWTSecret: getEnv("JWT_SECRET", ""),

        CORSAllowedOrigins: parseCORSOrigins(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),

        FootballAPIBaseURL:    getEnv("FOOTBALL_API_BASE_URL", ""),
        FootballAPIKey:        getEnv("FOOTBALL_API_KEY", ""),
        FootballAPIDailyLimit: dailyLimit,
        FootballSyncEnabled:   syncEnabled,
    }

    if cfg.DatabaseURL == "" {
        fmt.Println("[config] WARNING: DATABASE_URL not set — database features will be unavailable")
    }

    return cfg, nil
}

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}

func parseCORSOrigins(s string) []string {
    var origins []string
    for _, o := range strings.Split(s, ",") {
        o = strings.TrimSpace(o)
        if o != "" {
            origins = append(origins, o)
        }
    }
    return origins
}
