package router

import (
	"net/http"
	"os"
	"path/filepath"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/games/aviator"
	"github.com/miraclbet/api/internal/handlers"
	"github.com/miraclbet/api/internal/middleware"
	"github.com/miraclbet/api/internal/storage"
)

func New(cfg *config.Config, db *database.DB, r2 *storage.R2Service, aviatorEngine *aviator.Engine) http.Handler {
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
	chatHandler := handlers.NewChatHandler(cfg)

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
		r.Post("/chat", chatHandler.HandleChat)

		authHandler := handlers.NewAuthHandler(db)
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/register", authHandler.Register)
		r.Get("/auth/me", authHandler.Me) // Live balance fetch
		r.Put("/auth/password", authHandler.ChangePassword)

		betsHandler := handlers.NewBetsHandler(db)
		r.Post("/bets", betsHandler.PlaceBet)
		r.Get("/bets/check", betsHandler.CheckBet)
		r.Get("/bets", betsHandler.ListMyBets)
		r.Get("/bets/{id}", betsHandler.GetBet)

		betslipsHandler := handlers.NewBetSlipsHandler(db)
		r.Post("/betslips", betslipsHandler.BookBet)
		r.Get("/betslips/{code}", betslipsHandler.GetBooking)

		// Aviator Game Routes
		if aviatorEngine != nil {
			aviatorHandler := aviator.NewHandlers(aviatorEngine)
			r.Get("/games/aviator/stream", aviatorHandler.SSEHandler)
			
			r.Post("/games/aviator/bet", aviatorHandler.PlaceBet)
			r.Post("/games/aviator/cashout", aviatorHandler.CashOut)
		}
		
		settlementHandler := handlers.NewSettlementHandler(db)
		settingsHandler := handlers.NewSettingsHandler(db)
		r.Get("/settings", settingsHandler.GetSettings)

		// Debug endpoints â€” shows raw API response to diagnose odds issues
		debugHandler := handlers.NewDebugHandler(cfg)
		r.Get("/debug/odds", debugHandler.TestOdds)
		r.Get("/debug/odds/live", debugHandler.TestLiveOdds)

		paymentMethodsHandler := handlers.NewPaymentMethodsHandler(db, r2)
		r.Get("/payment-methods", paymentMethodsHandler.List) // Public list for deposit page

		withdrawalMethodsHandler := handlers.NewWithdrawalMethodsHandler(db, r2)
		r.Get("/withdrawal-methods", withdrawalMethodsHandler.List) // Public list for withdrawal page

		depositsHandler := handlers.NewDepositsHandler(db, r2)
		r.Post("/deposits", depositsHandler.Create)          // User creates deposit
		r.Get("/deposits/pending", depositsHandler.CheckPending) // Check if user has pending

		withdrawalsHandler := handlers.NewWithdrawalsHandler(db)
		r.Post("/withdrawals", withdrawalsHandler.Create)
		r.Get("/withdrawals/pending", withdrawalsHandler.CheckPending)
		r.Get("/withdrawals/rule-check", withdrawalsHandler.CheckWithdrawalRule)

		inviterCodesHandler := handlers.NewInviterCodesHandler(db)
		r.Post("/withdrawals/verify-inviter-code", inviterCodesHandler.VerifyInviterCode)

		transactionsHandler := handlers.NewTransactionsHandler(db)
		r.Get("/transactions", transactionsHandler.List)

		// Support Chat Routes (User)
		supportHandler := handlers.NewSupportHandler(db, r2)
		r.Get("/support/messages", supportHandler.GetUserMessages)
		r.Post("/support/messages", supportHandler.UserSendMessage)
		r.Post("/support/upload", supportHandler.UploadImage)

		// Admin Routes
		r.Route("/admin", func(r chi.Router) {
			r.Get("/bets", settlementHandler.GetAllBets)
			r.Post("/bets/slips/{slip_id}/settle", settlementHandler.SettleSlipManual)
			r.Post("/bets/legs/{leg_id}/settle", settlementHandler.SettleLeg)
		r.Post("/bets/manual", settlementHandler.CreateManualBooking)
			r.Get("/bets/manual/list", settlementHandler.ListManualBookings)

			r.Get("/payment-methods", paymentMethodsHandler.List)
			r.Post("/payment-methods", paymentMethodsHandler.Create)
			r.Put("/payment-methods/{id}", paymentMethodsHandler.Update)
			r.Delete("/payment-methods/{id}", paymentMethodsHandler.Delete)
			r.Put("/payment-methods/{id}/status", paymentMethodsHandler.UpdateStatus)
			r.Patch("/payment-methods/{id}/min-deposit", paymentMethodsHandler.UpdateMinDeposit)

			r.Get("/withdrawal-methods", withdrawalMethodsHandler.List)
			r.Post("/withdrawal-methods", withdrawalMethodsHandler.Create)
			r.Delete("/withdrawal-methods/{id}", withdrawalMethodsHandler.Delete)
			r.Put("/withdrawal-methods/{id}/status", withdrawalMethodsHandler.UpdateStatus)

			r.Get("/inviter-codes", inviterCodesHandler.AdminListInviterCodes)
			r.Post("/inviter-codes", inviterCodesHandler.AdminCreateInviterCode)
			r.Delete("/inviter-codes/{id}", inviterCodesHandler.AdminDeleteInviterCode)

			r.Get("/deposits", depositsHandler.ListAdmin)
			r.Put("/deposits/{id}/status", depositsHandler.UpdateStatus)
			r.Delete("/deposits/{id}", depositsHandler.Delete)

			r.Get("/withdrawals", withdrawalsHandler.ListAdmin)
			r.Put("/withdrawals/{id}/status", withdrawalsHandler.UpdateStatus)

			usersAdminHandler := handlers.NewUsersAdminHandler(db)
			r.Get("/users", usersAdminHandler.List)
			r.Get("/stats/pending", usersAdminHandler.GetPendingCounts)
			savedTeamsHandler := handlers.NewSavedTeamsHandler(db, cfg)
			r.Get("/teams/api-search", savedTeamsHandler.SearchAPI)
			r.Post("/teams", savedTeamsHandler.SaveTeam)
			r.Get("/teams", savedTeamsHandler.ListTeams)
			r.Post("/users/assign-role", usersAdminHandler.AssignRoleByPhone)
			r.Get("/users/{id}", usersAdminHandler.Get)
			r.Put("/users/{id}/status", usersAdminHandler.ToggleStatus)
			r.Put("/users/{id}/role", usersAdminHandler.UpdateRole)
			r.Put("/users/{id}/privileges", usersAdminHandler.UpdatePrivileges)
			r.Put("/users/{id}/balance", usersAdminHandler.AdjustBalance)

			// Admin Support Chat Routes
			r.Get("/support/conversations", supportHandler.AdminListConversations)
			r.Get("/support/conversations/{userId}", supportHandler.AdminGetConversation)
			r.Post("/support/messages", supportHandler.AdminSendMessage)
			r.Put("/support/users/{userId}/block", supportHandler.AdminToggleBlockUser)
			r.Get("/support/unread-count", supportHandler.AdminGetUnreadCount)

			// Balance Manager Routes
			balanceMgrHandler := handlers.NewBalanceManagerHandler(db)
			r.Get("/balance-manager", balanceMgrHandler.List)
			r.Get("/balance-manager/{id}", balanceMgrHandler.UserDetail)

			// Super Admin Routes
			superAdminHandler := handlers.NewSuperAdminHandler(db)
			r.Get("/super/promo-stats", superAdminHandler.GetPromoStats)
			r.Put("/super/promo-code", superAdminHandler.UpdatePromoCode)

			r.Put("/settings", settingsHandler.UpdateSettings)
		})
	})

	// Static file serving for uploads (local fallback when R2 not used)
	workDir, _ := os.Getwd()
	uploadsDir := filepath.Join(workDir, "uploads")
	_ = os.MkdirAll(filepath.Join(uploadsDir, "support"), 0755)
	fileServer := http.FileServer(http.Dir(uploadsDir))
	r.Handle("/uploads/*", http.StripPrefix("/uploads", fileServer))

	return r
}


