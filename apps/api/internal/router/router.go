package router

import (
	"net/http"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/handlers"
	"github.com/miraclbet/api/internal/middleware"
)

func New(cfg *config.Config, db *database.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))

	healthHandler := handlers.NewHealthHandler()
	r.Get("/health", healthHandler.Health)

	sportsHandler := handlers.NewSportsHandler()
	fixturesHandler := handlers.NewFixturesHandler(db, cfg)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/sports", sportsHandler.List)
		r.Get("/fixtures/live", fixturesHandler.Live)
		r.Get("/fixtures/today", fixturesHandler.Today)
	})

	return r
}
