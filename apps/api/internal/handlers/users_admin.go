package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
)

type UsersAdminHandler struct {
	db *database.DB
}

func NewUsersAdminHandler(db *database.DB) *UsersAdminHandler {
	return &UsersAdminHandler{db: db}
}

type AdminUser struct {
	ID         string    `json:"id"`
	Phone      string    `json:"phone"`
	Role       string    `json:"role"`
	Balance    float64   `json:"balance"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	Privileges []string  `json:"privileges"`
	PromoCode  string    `json:"promo_code,omitempty"`
}

type AdminUserDetail struct {
	AdminUser
	TotalDeposits    float64 `json:"total_deposits"`
	TotalWithdrawals float64 `json:"total_withdrawals"`
	DepositCount     int     `json:"deposit_count"`
	WithdrawalCount  int     `json:"withdrawal_count"`
	TotalTickets     int     `json:"total_tickets"`
	TotalStaked      float64 `json:"total_staked"`
	WonTickets       int     `json:"won_tickets"`
	LostTickets      int     `json:"lost_tickets"`
}

// List — all users (filtered for regular admin; per-promo-code for super admin)
func (h *UsersAdminHandler) List(w http.ResponseWriter, r *http.Request) {
	isSuper := IsSuperAdminRequest(r, h.db)

	var rows interface {
		Close()
		Next() bool
		Scan(dest ...any) error
	}
	var err error

	if isSuper {
		superPromo := GetSuperAdminPromoCode(r, h.db)
		if superPromo != "" {
			rows, err = h.db.Pool.Query(r.Context(), `
				SELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
				FROM users
				WHERE UPPER(COALESCE(promo_code, '')) = UPPER($1)
				ORDER BY created_at DESC
			`, superPromo)
		} else {
			rows, err = h.db.Pool.Query(r.Context(), `
				SELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
				FROM users
				WHERE COALESCE(promo_code, '') != ''
				ORDER BY created_at DESC
			`)
		}
	} else {
		rows, err = h.db.Pool.Query(r.Context(), `
			SELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
			FROM users
			WHERE COALESCE(promo_code, '') = ''
			ORDER BY created_at DESC
		`)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		var privs []byte
		if err := rows.Scan(&u.ID, &u.Phone, &u.Role, &u.Balance, &u.IsActive, &u.CreatedAt, &privs, &u.PromoCode); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.Unmarshal(privs, &u.Privileges)
		if u.Privileges == nil {
			u.Privileges = []string{}
		}
		users = append(users, u)
	}
	if users == nil {
		users = []AdminUser{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// Get - single user with stats
func (h *UsersAdminHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_ = IsSuperAdminRequest(r, h.db)

	var u AdminUserDetail
	var privs []byte
	err := h.db.Pool.QueryRow(r.Context(), `
		SELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Phone, &u.Role, &u.Balance, &u.IsActive, &u.CreatedAt, &privs, &u.PromoCode)

	if err == nil {
		json.Unmarshal(privs, &u.Privileges)
		if u.Privileges == nil {
			u.Privileges = []string{}
		}
	}

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Deposit stats
	h.db.Pool.QueryRow(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = $1 AND status = 'accepted'
	`, id).Scan(&u.DepositCount, &u.TotalDeposits)

	// Withdrawal stats
	h.db.Pool.QueryRow(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = $1 AND status = 'accepted'
	`, id).Scan(&u.WithdrawalCount, &u.TotalWithdrawals)

	// Ticket stats
	h.db.Pool.QueryRow(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(stake), 0),
		       COUNT(*) FILTER (WHERE status = 'WON'),
		       COUNT(*) FILTER (WHERE status = 'LOST')
		FROM bet_slips WHERE user_id = $1
	`, id).Scan(&u.TotalTickets, &u.TotalStaked, &u.WonTickets, &u.LostTickets)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

// ToggleStatus — activate or deactivate user
func (h *UsersAdminHandler) ToggleStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), "UPDATE users SET is_active = $1 WHERE id = $2", req.IsActive, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"is_active": req.IsActive})
}

// UpdateRole — set USER or ADMIN
func (h *UsersAdminHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if req.Role != "USER" && req.Role != "ADMIN" && req.Role != "SUPER_ADMIN" && req.Role != "WORKER" && req.Role != "AGENT" {
		http.Error(w, "Role must be USER, WORKER, AGENT, ADMIN or SUPER_ADMIN", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), "UPDATE users SET role = $1 WHERE id = $2", req.Role, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"role": req.Role})
}

// AdjustBalance — manually set or add to user balance
func (h *UsersAdminHandler) AdjustBalance(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Amount float64 `json:"amount"` // positive = add, negative = subtract
		Mode   string  `json:"mode"`   // "set" or "adjust"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	var newBalance float64
	var err error
	if req.Mode == "set" {
		err = h.db.Pool.QueryRow(r.Context(),
			"UPDATE users SET balance = $1::numeric WHERE id = $2 RETURNING balance::float8",
			req.Amount, id).Scan(&newBalance)
	} else {
		err = h.db.Pool.QueryRow(r.Context(),
			"UPDATE users SET balance = COALESCE(balance, 0) + $1::numeric WHERE id = $2 RETURNING balance::float8",
			req.Amount, id).Scan(&newBalance)
	}
	if err != nil {
		http.Error(w, "Failed to update balance: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"balance": newBalance,
		"user_id": id,
		"success": true,
	})
}

// GetPendingCounts returns the count of pending deposits and withdrawals for the admin dashboard.
func (h *UsersAdminHandler) GetPendingCounts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	isSuper := IsSuperAdminRequest(r, h.db)
	var deposits, withdrawals int

	if isSuper {
		superPromo := GetSuperAdminPromoCode(r, h.db)
		if superPromo != "" {
			h.db.Pool.QueryRow(ctx, `
				SELECT COUNT(*)
				FROM deposits d
				JOIN users u ON d.user_id = u.id
				WHERE d.status = 'pending' AND u.promo_code = $1
			`, superPromo).Scan(&deposits)
			h.db.Pool.QueryRow(ctx, `
				SELECT COUNT(*)
				FROM withdrawals w
				JOIN users u ON w.user_id = u.id
				WHERE w.status = 'pending' AND u.promo_code = $1
			`, superPromo).Scan(&withdrawals)
		} else {
			h.db.Pool.QueryRow(ctx, `
				SELECT COUNT(*)
				FROM deposits d
				JOIN users u ON d.user_id = u.id
				WHERE d.status = 'pending' AND COALESCE(u.promo_code, '') != ''
			`).Scan(&deposits)
			h.db.Pool.QueryRow(ctx, `
				SELECT COUNT(*)
				FROM withdrawals w
				JOIN users u ON w.user_id = u.id
				WHERE w.status = 'pending' AND COALESCE(u.promo_code, '') != ''
			`).Scan(&withdrawals)
		}
	} else {
		// Exclude promo users from normal admin badges
		h.db.Pool.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM deposits d
			JOIN users u ON d.user_id = u.id
			WHERE d.status = 'pending' AND COALESCE(u.promo_code, '') = ''
		`).Scan(&deposits)
		h.db.Pool.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM withdrawals w
			JOIN users u ON w.user_id = u.id
			WHERE w.status = 'pending' AND COALESCE(u.promo_code, '') = ''
		`).Scan(&withdrawals)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{
		"deposits":    deposits,
		"withdrawals": withdrawals,
	})
}

// UpdatePrivileges - set WORKER privileges
func (h *UsersAdminHandler) UpdatePrivileges(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Privileges []string `json:"privileges"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	privBytes, _ := json.Marshal(req.Privileges)
	_, err := h.db.Pool.Exec(r.Context(), "UPDATE users SET privileges = $1 WHERE id = $2 AND role = 'WORKER'", privBytes, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"privileges": req.Privileges})
}

// AssignRoleByPhone - assigns a role using a phone number directly
func (h *UsersAdminHandler) AssignRoleByPhone(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone string `json:"phone"`
		Role  string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if req.Role != "USER" && req.Role != "ADMIN" && req.Role != "SUPER_ADMIN" && req.Role != "WORKER" && req.Role != "AGENT" {
		http.Error(w, "Role must be USER, WORKER, AGENT, ADMIN or SUPER_ADMIN", http.StatusBadRequest)
		return
	}

	// Normalize: strip leading 0 or country code for robust lookup
	phone := req.Phone
	if len(phone) > 9 && phone[0] == '0' {
		phone = phone[1:]
	} else if len(phone) > 12 && phone[:4] == "+251" {
		phone = phone[4:]
	} else if len(phone) > 11 && phone[:3] == "251" {
		phone = phone[3:]
	}

	result, err := h.db.Pool.Exec(r.Context(),
		"UPDATE users SET role = $1 WHERE phone = $2 OR phone = $3",
		req.Role, phone, req.Phone,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if result.RowsAffected() == 0 {
		http.Error(w, "User not found with this phone number", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Role assigned successfully"})
}

type UserDepositItem struct {
	ID            string    `json:"id"`
	Amount        float64   `json:"amount"`
	ProviderName  string    `json:"provider_name"`
	ScreenshotURL string    `json:"screenshot_url"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// GetUserDeposits — GET /api/v1/admin/users/{id}/deposits
func (h *UsersAdminHandler) GetUserDeposits(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	rows, err := h.db.Pool.Query(ctx, `
		SELECT d.id, d.amount, COALESCE(p.provider_name, 'Direct Transfer'), COALESCE(d.screenshot_url, ''), d.status, d.created_at
		FROM deposits d
		LEFT JOIN payment_methods p ON d.payment_method_id = p.id
		WHERE d.user_id = $1
		ORDER BY d.created_at DESC
	`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []UserDepositItem
	for rows.Next() {
		var item UserDepositItem
		if err := rows.Scan(&item.ID, &item.Amount, &item.ProviderName, &item.ScreenshotURL, &item.Status, &item.CreatedAt); err == nil {
			list = append(list, item)
		}
	}
	if list == nil {
		list = []UserDepositItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

type UserTicketLeg struct {
	ID            string  `json:"id"`
	MatchName     string  `json:"match_name"`
	MarketName    string  `json:"market_name"`
	SelectionName string  `json:"selection_name"`
	Odds          float64 `json:"odds"`
	Status        string  `json:"status"`
	KickoffAt     string  `json:"kickoff_at"`
}

type UserTicketItem struct {
	ID              string          `json:"id"`
	Stake           float64         `json:"stake"`
	TotalOdds       float64         `json:"total_odds"`
	PotentialPayout float64         `json:"potential_payout"`
	Status          string          `json:"status"`
	BookingCode     string          `json:"booking_code,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	Legs            []UserTicketLeg `json:"legs"`
}

// GetUserTickets — GET /api/v1/admin/users/{id}/tickets
func (h *UsersAdminHandler) GetUserTickets(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	rows, err := h.db.Pool.Query(ctx, `
		SELECT bs.id, bs.stake, bs.total_odds, bs.potential_payout, bs.status, COALESCE(bs.booking_code, ''), bs.created_at
		FROM bet_slips bs
		WHERE bs.user_id = $1
		ORDER BY bs.created_at DESC
	`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tickets []UserTicketItem
	for rows.Next() {
		var t UserTicketItem
		if err := rows.Scan(&t.ID, &t.Stake, &t.TotalOdds, &t.PotentialPayout, &t.Status, &t.BookingCode, &t.CreatedAt); err == nil {
			t.Legs = []UserTicketLeg{}
			tickets = append(tickets, t)
		}
	}
	rows.Close()

	for i := range tickets {
		legRows, err := h.db.Pool.Query(ctx, `
			SELECT bl.id, bl.match_name, bl.market_name, bl.selection_name, bl.odds, bl.status, COALESCE(bl.kickoff_at, '')
			FROM bet_legs bl
			WHERE bl.bet_slip_id = $1
			ORDER BY bl.id ASC
		`, tickets[i].ID)
		if err == nil {
			for legRows.Next() {
				var l UserTicketLeg
				if err := legRows.Scan(&l.ID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status, &l.KickoffAt); err == nil {
					tickets[i].Legs = append(tickets[i].Legs, l)
				}
			}
			legRows.Close()
		}
	}

	if tickets == nil {
		tickets = []UserTicketItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tickets)
}

