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
	ID           string    `json:"id"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"`
	Balance      float64   `json:"balance"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	Privileges   []string  `json:"privileges"`
}

type AdminUserDetail struct {
	AdminUser
	TotalDeposits    float64 `json:"total_deposits"`
	TotalWithdrawals float64 `json:"total_withdrawals"`
	DepositCount     int     `json:"deposit_count"`
	WithdrawalCount  int     `json:"withdrawal_count"`
}

// List â€” all users
func (h *UsersAdminHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb)
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		var privs []byte
		if err := rows.Scan(&u.ID, &u.Phone, &u.Role, &u.Balance, &u.IsActive, &u.CreatedAt, &privs); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.Unmarshal(privs, &u.Privileges)
		if u.Privileges == nil { u.Privileges = []string{} }
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

	var u AdminUserDetail
	var privs []byte
	err := h.db.Pool.QueryRow(r.Context(), `
		SELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb)
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Phone, &u.Role, &u.Balance, &u.IsActive, &u.CreatedAt, &privs)
	
	if err == nil {
		json.Unmarshal(privs, &u.Privileges)
		if u.Privileges == nil { u.Privileges = []string{} }
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

// ToggleStatus â€” activate or deactivate user
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

// UpdateRole â€” set USER or ADMIN
func (h *UsersAdminHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if req.Role != "USER" && req.Role != "ADMIN" && req.Role != "WORKER" {
		http.Error(w, "Role must be USER, WORKER or ADMIN", http.StatusBadRequest)
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

// AdjustBalance â€” manually set or add to user balance
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
			"UPDATE users SET balance = $1 WHERE id = $2 RETURNING balance",
			req.Amount, id).Scan(&newBalance)
	} else {
		err = h.db.Pool.QueryRow(r.Context(),
			"UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
			req.Amount, id).Scan(&newBalance)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{"balance": newBalance})
}

// GetPendingCounts returns the count of pending deposits and withdrawals for the admin dashboard.
func (h *UsersAdminHandler) GetPendingCounts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var deposits, withdrawals int

	h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM deposits WHERE status = 'pending'").Scan(&deposits)
	h.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'").Scan(&withdrawals)

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
