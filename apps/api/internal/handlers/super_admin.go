package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/miraclbet/api/internal/database"
)

type SuperAdminHandler struct {
	db *database.DB
}

func NewSuperAdminHandler(db *database.DB) *SuperAdminHandler {
	return &SuperAdminHandler{db: db}
}

// Helper to check if request is from a SUPER_ADMIN
func IsSuperAdminRequest(r *http.Request, db *database.DB) bool {
	// 1. Check headers
	if r.Header.Get("X-Admin-Role") == "SUPER_ADMIN" || r.Header.Get("X-User-Role") == "SUPER_ADMIN" {
		return true
	}
	// 2. Check query param
	if r.URL.Query().Get("admin_role") == "SUPER_ADMIN" || r.URL.Query().Get("role") == "SUPER_ADMIN" {
		return true
	}
	// 3. Check X-Admin-ID / X-User-ID from database
	adminID := r.Header.Get("X-Admin-ID")
	if adminID == "" {
		adminID = r.Header.Get("X-User-ID")
	}
	if adminID == "" {
		adminID = r.URL.Query().Get("admin_id")
	}
	if adminID != "" && db != nil {
		var role string
		_ = db.Pool.QueryRow(r.Context(), "SELECT role::text FROM users WHERE id = $1", adminID).Scan(&role)
		if role == "SUPER_ADMIN" {
			return true
		}
	}
	return false
}

// GetPromoStats — GET /api/v1/admin/super/promo-stats
func (h *SuperAdminHandler) GetPromoStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get configured 4-digit promo code
	promoCode := "7777"
	_ = h.db.Pool.QueryRow(ctx, "SELECT value FROM settings WHERE key = 'super_admin_promo_code'").Scan(&promoCode)
	promoCode = strings.TrimSpace(promoCode)
	if promoCode == "" {
		promoCode = "7777"
	}

	// 1. Total registered promo users
	var totalUsers int
	_ = h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE COALESCE(promo_code, '') != ''").Scan(&totalUsers)

	// 2. Total deposits & counts
	var totalDeposited float64
	var acceptedDeposits, pendingDeposits int
	_ = h.db.Pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN d.status = 'accepted' THEN d.amount ELSE 0 END), 0)::float8,
			COUNT(*) FILTER (WHERE d.status = 'accepted')::int,
			COUNT(*) FILTER (WHERE d.status = 'pending')::int
		FROM deposits d
		JOIN users u ON d.user_id = u.id
		WHERE COALESCE(u.promo_code, '') != ''
	`).Scan(&totalDeposited, &acceptedDeposits, &pendingDeposits)

	// 3. Total withdrawals & counts
	var totalWithdrawn float64
	var acceptedWithdrawals, pendingWithdrawals int
	_ = h.db.Pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN w.status = 'accepted' THEN w.amount ELSE 0 END), 0)::float8,
			COUNT(*) FILTER (WHERE w.status = 'accepted')::int,
			COUNT(*) FILTER (WHERE w.status = 'pending')::int
		FROM withdrawals w
		JOIN users u ON w.user_id = u.id
		WHERE COALESCE(u.promo_code, '') != ''
	`).Scan(&totalWithdrawn, &acceptedWithdrawals, &pendingWithdrawals)

	// 4. Total bets & staked
	var totalBets int
	var totalStaked float64
	_ = h.db.Pool.QueryRow(ctx, `
		SELECT 
			COUNT(*)::int,
			COALESCE(SUM(bs.stake), 0)::float8
		FROM bet_slips bs
		JOIN users u ON bs.user_id = u.id
		WHERE COALESCE(u.promo_code, '') != ''
	`).Scan(&totalBets, &totalStaked)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"promo_code":                 promoCode,
		"referral_url":               "https://www.miraclbet.com/?ref=" + promoCode,
		"register_url":               "https://www.miraclbet.com/register?promo=" + promoCode,
		"total_users":                totalUsers,
		"total_deposits":             totalDeposited,
		"accepted_deposit_count":     acceptedDeposits,
		"pending_deposits":           pendingDeposits,
		"total_withdrawals":          totalWithdrawn,
		"accepted_withdrawal_count":  acceptedWithdrawals,
		"pending_withdrawals":        pendingWithdrawals,
		"total_bets":                 totalBets,
		"total_staked":               totalStaked,
	})
}

// UpdatePromoCode — PUT /api/v1/admin/super/promo-code
func (h *SuperAdminHandler) UpdatePromoCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	cleanCode := strings.ToUpper(strings.TrimSpace(req.Code))
	if len(cleanCode) != 4 {
		http.Error(w, "Promo code must be exactly 4 alphanumeric characters (e.g. 7777)", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), `
		INSERT INTO settings (key, value) VALUES ('super_admin_promo_code', $1)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
	`, cleanCode)
	if err != nil {
		http.Error(w, "Failed to update promo code: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"promo_code":   cleanCode,
		"referral_url": "https://www.miraclbet.com/?ref=" + cleanCode,
	})
}
