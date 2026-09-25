package router

import (
	"net/http"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/handlers"
	"github.com/miraclbet/api/internal/middleware"
	"github.com/miraclbet/api/internal/storage"
)

func New(cfg *config.Config, db *database.DB, r2 *storage.R2Service) http.Handler {
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

		authHandler := handlers.NewAuthHandler(db)
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/register", authHandler.Register)

		betsHandler := handlers.NewBetsHandler(db)
		r.Post("/bets", betsHandler.PlaceBet)

		// Debug endpoints — shows raw API response to diagnose odds issues
		debugHandler := handlers.NewDebugHandler(cfg)
		r.Get("/debug/odds", debugHandler.TestOdds)
		r.Get("/debug/odds/live", debugHandler.TestLiveOdds)

		paymentMethodsHandler := handlers.NewPaymentMethodsHandler(db, r2)
		r.Get("/payment-methods", paymentMethodsHandler.List) // Public list for deposit page

		depositsHandler := handlers.NewDepositsHandler(db, r2)
		r.Post("/deposits", depositsHandler.Create) // User creates deposit

		// Admin Routes
		r.Route("/admin", func(r chi.Router) {
			r.Get("/payment-methods", paymentMethodsHandler.List)
			r.Post("/payment-methods", paymentMethodsHandler.Create)
			r.Delete("/payment-methods/{id}", paymentMethodsHandler.Delete)
			r.Put("/payment-methods/{id}/status", paymentMethodsHandler.UpdateStatus)

			r.Get("/deposits", depositsHandler.ListAdmin)
			r.Put("/deposits/{id}/status", depositsHandler.UpdateStatus)
		})
	})

	return r
}
