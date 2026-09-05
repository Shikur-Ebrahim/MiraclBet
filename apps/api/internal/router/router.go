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

	fixturesHandler := handlers.NewFixturesHandler(db, cfg)
	metaHandler := handlers.NewMetaHandler(db)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("OK"))
		})

		r.Get("/fixtures/live", fixturesHandler.Live)
		r.Get("/fixtures/today", fixturesHandler.Today)
		r.Get("/fixtures", fixturesHandler.ByDate)
		
		r.Get("/meta/sports", metaHandler.GetSports)
		r.Get("/meta/leagues/top", metaHandler.GetTopLeagues)
		r.Get("/meta/leagues", metaHandler.GetLeagues)
	})

	return r
}
