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
	// 3. Check known super admin IDs and phone numbers
	adminID := r.Header.Get("X-Admin-ID")
	if adminID == "" {
		adminID = r.Header.Get("X-User-ID")
	}
	if adminID == "" {
		adminID = r.URL.Query().Get("admin_id")
	}
	if adminID == "2603395b-b8e1-47e2-84bb-619f01c9eb7d" || adminID == "46c2e295-24a1-4101-9ec9-2569ca947c70" {
		return true
	}
	adminPhone := r.URL.Query().Get("admin_phone")
	if strings.HasSuffix(adminPhone, "999992524") || strings.HasSuffix(adminPhone, "959595959") {
		return true
	}
	if adminID != "" && db != nil {
		var role string
		_ = db.Pool.QueryRow(r.Context(), "SELECT role::text FROM users WHERE id::text = $1", adminID).Scan(&role)
		if role == "SUPER_ADMIN" {
			return true
		}
	}
	return false
}

// GetSuperAdminPromoCode retrieves the exact promo code assigned to the caller Super Admin
func GetSuperAdminPromoCode(r *http.Request, db *database.DB) string {
	// 1. Check header
	code := strings.TrimSpace(r.Header.Get("X-Admin-Promo-Code"))
	if code != "" {
		return strings.ToUpper(code)
	}
	// 2. Check query param
	code = strings.TrimSpace(r.URL.Query().Get("admin_promo_code"))
	if code == "" {
		code = strings.TrimSpace(r.URL.Query().Get("promo_code"))
	}
	if code != "" {
		return strings.ToUpper(code)
	}
	// 3. Look up promo_code from DB for caller admin ID or phone
	adminID := r.Header.Get("X-Admin-ID")
	if adminID == "" {
		adminID = r.Header.Get("X-User-ID")
	}
	if adminID == "" {
		adminID = r.URL.Query().Get("admin_id")
	}
	adminPhone := r.URL.Query().Get("admin_phone")
	if db != nil {
		if adminID != "" {
			_ = db.Pool.QueryRow(r.Context(), "SELECT COALESCE(promo_code, '') FROM users WHERE id::text = $1", adminID).Scan(&code)
		} else if adminPhone != "" {
			_ = db.Pool.QueryRow(r.Context(), "SELECT COALESCE(promo_code, '') FROM users WHERE phone = $1", adminPhone).Scan(&code)
		}
	}
	code = strings.TrimSpace(code)
	if code != "" {
		return strings.ToUpper(code)
	}
	// 4. Fallback to settings
	if db != nil {
		_ = db.Pool.QueryRow(r.Context(), "SELECT value FROM settings WHERE key = 'super_admin_promo_code'").Scan(&code)
	}
	return strings.ToUpper(strings.TrimSpace(code))
}

// GetPromoStats — GET /api/v1/admin/super/promo-stats
func (h *SuperAdminHandler) GetPromoStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get the caller super admin's specific promo code
	promoCode := GetSuperAdminPromoCode(r, h.db)
	if promoCode == "" {
		promoCode = "7777"
	}

	// 1. Total registered promo users for THIS specific promo code
	var totalUsers int
	_ = h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE promo_code = $1", promoCode).Scan(&totalUsers)

	// 2. Total deposits & counts for THIS specific promo code
	var totalDeposited float64
	var acceptedDeposits, pendingDeposits int
	_ = h.db.Pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN d.status = 'accepted' THEN d.amount ELSE 0 END), 0)::float8,
			COUNT(*) FILTER (WHERE d.status = 'accepted')::int,
			COUNT(*) FILTER (WHERE d.status = 'pending')::int
		FROM deposits d
		JOIN users u ON d.user_id = u.id
		WHERE u.promo_code = $1
	`, promoCode).Scan(&totalDeposited, &acceptedDeposits, &pendingDeposits)

	// 3. Total withdrawals & counts for THIS specific promo code
	var totalWithdrawn float64
	var acceptedWithdrawals, pendingWithdrawals int
	_ = h.db.Pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN w.status = 'accepted' THEN w.amount ELSE 0 END), 0)::float8,
			COUNT(*) FILTER (WHERE w.status = 'accepted')::int,
			COUNT(*) FILTER (WHERE w.status = 'pending')::int
		FROM withdrawals w
		JOIN users u ON w.user_id = u.id
		WHERE u.promo_code = $1
	`, promoCode).Scan(&totalWithdrawn, &acceptedWithdrawals, &pendingWithdrawals)

	// 4. Total bets & staked for THIS specific promo code
	var totalBets int
	var totalStaked float64
	_ = h.db.Pool.QueryRow(ctx, `
		SELECT 
			COUNT(*)::int,
			COALESCE(SUM(bs.stake), 0)::float8
		FROM bet_slips bs
		JOIN users u ON bs.user_id = u.id
		WHERE u.promo_code = $1
	`, promoCode).Scan(&totalBets, &totalStaked)

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
