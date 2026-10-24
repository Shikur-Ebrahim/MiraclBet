package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
)

type BalanceManagerHandler struct {
	db *database.DB
}

func NewBalanceManagerHandler(db *database.DB) *BalanceManagerHandler {
	return &BalanceManagerHandler{db: db}
}

// BalanceManagerList — GET /api/v1/admin/balance-manager
// Returns all users who have at least one deposit, with their deposit totals and bet stats.
func (h *BalanceManagerHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_ = IsSuperAdminRequest(r, h.db)
	promoFilter := r.URL.Query().Get("promo_filter")

	whereClause := "WHERE (dep.deposit_count > 0 OR dep.pending_deposits > 0)"
	if promoFilter == "none" {
		whereClause += " AND COALESCE(u.promo_code, '') = ''"
	} else if promoFilter == "only" {
		whereClause += " AND COALESCE(u.promo_code, '') != ''"
	}

	rows, err := h.db.Pool.Query(ctx, `
		SELECT
			u.id,
			u.phone,
			u.role::text,
			COALESCE(u.balance, 0)::float8,
			COALESCE(u.is_active, true),
			u.created_at,
			COALESCE(dep.total_deposited, 0)::float8,
			COALESCE(dep.deposit_count, 0)::int,
			COALESCE(dep.pending_deposits, 0)::int,
			COALESCE(bs.total_bets, 0)::int,
			COALESCE(bs.won_bets, 0)::int,
			COALESCE(bs.lost_bets, 0)::int,
			COALESCE(bs.pending_bets, 0)::int,
			COALESCE(bs.total_staked, 0)::float8,
			COALESCE(bs.total_payout, 0)::float8,
			COALESCE(u.promo_code, '')
		FROM users u
		LEFT JOIN (
			SELECT
				user_id,
				COALESCE(SUM(CASE WHEN status = 'accepted' THEN amount ELSE 0 END), 0)::float8 AS total_deposited,
				COUNT(*) FILTER (WHERE status = 'accepted')::int AS deposit_count,
				COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_deposits
			FROM deposits
			GROUP BY user_id
		) dep ON dep.user_id = u.id
		LEFT JOIN (
			SELECT
				user_id,
				COUNT(*)::int AS total_bets,
				COUNT(*) FILTER (WHERE status = 'WON')::int AS won_bets,
				COUNT(*) FILTER (WHERE status = 'LOST')::int AS lost_bets,
				COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_bets,
				COALESCE(SUM(stake), 0)::float8 AS total_staked,
				COALESCE(SUM(CASE WHEN status = 'WON' THEN potential_payout ELSE 0 END), 0)::float8 AS total_payout
			FROM bet_slips
			GROUP BY user_id
		) bs ON bs.user_id = u.id
		` + whereClause + `
		ORDER BY dep.total_deposited DESC NULLS LAST, u.created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type BalanceRow struct {
		ID              string    `json:"id"`
		Phone           string    `json:"phone"`
		Role            string    `json:"role"`
		Balance         float64   `json:"balance"`
		IsActive        bool      `json:"is_active"`
		CreatedAt       time.Time `json:"created_at"`
		TotalDeposited  float64   `json:"total_deposited"`
		DepositCount    int       `json:"deposit_count"`
		PendingDeposits int       `json:"pending_deposits"`
		TotalBets       int       `json:"total_bets"`
		WonBets         int       `json:"won_bets"`
		LostBets        int       `json:"lost_bets"`
		PendingBets     int       `json:"pending_bets"`
		TotalStaked     float64   `json:"total_staked"`
		TotalPayout     float64   `json:"total_payout"`
		PromoCode       string    `json:"promo_code,omitempty"`
	}

	var result []BalanceRow
	for rows.Next() {
		var row BalanceRow
		if err := rows.Scan(
			&row.ID, &row.Phone, &row.Role, &row.Balance, &row.IsActive, &row.CreatedAt,
			&row.TotalDeposited, &row.DepositCount, &row.PendingDeposits,
			&row.TotalBets, &row.WonBets, &row.LostBets, &row.PendingBets,
			&row.TotalStaked, &row.TotalPayout, &row.PromoCode,
		); err != nil {
			continue
		}
		result = append(result, row)
	}
	if result == nil {
		result = []BalanceRow{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// UserDetail — GET /api/v1/admin/balance-manager/{id}
// Returns full deposit history + bet slip list for one user.
func (h *BalanceManagerHandler) UserDetail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	type UserInfo struct {
		ID        string    `json:"id"`
		Phone     string    `json:"phone"`
		Role      string    `json:"role"`
		Balance   float64   `json:"balance"`
		IsActive  bool      `json:"is_active"`
		CreatedAt time.Time `json:"created_at"`
		PromoCode string    `json:"promo_code,omitempty"`
	}
	var u UserInfo
	err := h.db.Pool.QueryRow(ctx, `
		SELECT id, phone, role::text, COALESCE(balance, 0)::float8, COALESCE(is_active, true), created_at, COALESCE(promo_code, '')
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Phone, &u.Role, &u.Balance, &u.IsActive, &u.CreatedAt, &u.PromoCode)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// All deposits
	type DepositRow struct {
		ID           string    `json:"id"`
		Amount       float64   `json:"amount"`
		Status       string    `json:"status"`
		ProviderName string    `json:"provider_name"`
		CreatedAt    time.Time `json:"created_at"`
	}
	depRows, _ := h.db.Pool.Query(ctx, `
		SELECT d.id, d.amount::float8, d.status, COALESCE(pm.provider_name, 'Unknown'), d.created_at
		FROM deposits d
		LEFT JOIN payment_methods pm ON pm.id = d.payment_method_id
		WHERE d.user_id = $1
		ORDER BY d.created_at DESC
	`, id)
	var deposits []DepositRow
	if depRows != nil {
		defer depRows.Close()
		for depRows.Next() {
			var dr DepositRow
			if err := depRows.Scan(&dr.ID, &dr.Amount, &dr.Status, &dr.ProviderName, &dr.CreatedAt); err == nil {
				deposits = append(deposits, dr)
			}
		}
	}
	if deposits == nil {
		deposits = []DepositRow{}
	}

	// All bet slips with leg count
	type BetSlipRow struct {
		ID              string    `json:"id"`
		Stake           float64   `json:"stake"`
		TotalOdds       float64   `json:"total_odds"`
		PotentialPayout float64   `json:"potential_payout"`
		Status          string    `json:"status"`
		IsAutoWin       bool      `json:"is_auto_win"`
		LegCount        int       `json:"leg_count"`
		CreatedAt       time.Time `json:"created_at"`
	}
	slipRows, _ := h.db.Pool.Query(ctx, `
		SELECT
			bs.id, bs.stake::float8, bs.total_odds::float8, bs.potential_payout::float8, bs.status,
			COALESCE(bs.is_auto_win, false),
			COUNT(bl.id)::int as leg_count,
			bs.created_at
		FROM bet_slips bs
		LEFT JOIN bet_legs bl ON bl.bet_slip_id = bs.id
		WHERE bs.user_id = $1
		GROUP BY bs.id, bs.stake, bs.total_odds, bs.potential_payout, bs.status, bs.is_auto_win, bs.created_at
		ORDER BY bs.created_at DESC
		LIMIT 200
	`, id)
	var bets []BetSlipRow
	if slipRows != nil {
		defer slipRows.Close()
		for slipRows.Next() {
			var b BetSlipRow
			if err := slipRows.Scan(&b.ID, &b.Stake, &b.TotalOdds, &b.PotentialPayout, &b.Status, &b.IsAutoWin, &b.LegCount, &b.CreatedAt); err == nil {
				bets = append(bets, b)
			}
		}
	}
	if bets == nil {
		bets = []BetSlipRow{}
	}

	// Aggregates
	var totalDeposited float64
	var depositCount int
	h.db.Pool.QueryRow(ctx, `SELECT COALESCE(SUM(amount),0)::float8, COUNT(*)::int FROM deposits WHERE user_id=$1 AND status='accepted'`, id).Scan(&totalDeposited, &depositCount)

	var totalBets, wonBets, lostBets, pendingBets int
	var totalStaked, totalWonPayout float64
	h.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int,
		       COUNT(*) FILTER (WHERE status='WON')::int,
		       COUNT(*) FILTER (WHERE status='LOST')::int,
		       COUNT(*) FILTER (WHERE status='PENDING')::int,
		       COALESCE(SUM(stake),0)::float8,
		       COALESCE(SUM(CASE WHEN status='WON' THEN potential_payout ELSE 0 END),0)::float8
		FROM bet_slips WHERE user_id=$1
	`, id).Scan(&totalBets, &wonBets, &lostBets, &pendingBets, &totalStaked, &totalWonPayout)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":             u,
		"deposits":         deposits,
		"bets":             bets,
		"total_deposited":  totalDeposited,
		"deposit_count":    depositCount,
		"total_bets":       totalBets,
		"won_bets":         wonBets,
		"lost_bets":        lostBets,
		"pending_bets":     pendingBets,
		"total_staked":     totalStaked,
		"total_won_payout": totalWonPayout,
	})
}
