package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/miraclbet/api/internal/database"
)

type WithdrawalsHandler struct {
	db *database.DB
}

func NewWithdrawalsHandler(db *database.DB) *WithdrawalsHandler {
	return &WithdrawalsHandler{db: db}
}

type Withdrawal struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"user_id"`
	UserPhone          string    `json:"user_phone,omitempty"`
	WithdrawalMethodID string    `json:"withdrawal_method_id"`
	ProviderName       string    `json:"provider_name,omitempty"`
	AccountName        string    `json:"account_name"`
	AccountNumber      string    `json:"account_number"`
	Amount             float64   `json:"amount"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
}

// User requests a withdrawal
func (h *WithdrawalsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID             string  `json:"user_id"`
		WithdrawalMethodID string  `json:"withdrawal_method_id"`
		AccountName        string  `json:"account_name"`
		AccountNumber      string  `json:"account_number"`
		Amount             float64 `json:"amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "Amount must be greater than 0", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Pool.Begin(r.Context())
	if err != nil {
		http.Error(w, "Transaction failed to start", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Check if user has a pending withdrawal
	var pendingCount int
	err = tx.QueryRow(r.Context(), "SELECT COUNT(*) FROM withdrawals WHERE user_id = $1 AND status = 'pending'", req.UserID).Scan(&pendingCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if pendingCount > 0 {
		http.Error(w, "You already have a pending withdrawal request.", http.StatusBadRequest)
		return
	}

	// Lock user to check balance safely
	var currentBalance float64
	err = tx.QueryRow(r.Context(), "SELECT balance FROM users WHERE id = $1 FOR UPDATE", req.UserID).Scan(&currentBalance)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if currentBalance < req.Amount {
		http.Error(w, "Insufficient balance", http.StatusBadRequest)
		return
	}

	// Deduct balance immediately
	_, err = tx.Exec(r.Context(), "UPDATE users SET balance = balance - $1 WHERE id = $2", req.Amount, req.UserID)
	if err != nil {
		http.Error(w, "Failed to deduct balance", http.StatusInternalServerError)
		return
	}

	// Insert withdrawal request
	var newID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO withdrawals (user_id, withdrawal_method_id, account_name, account_number, amount, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id
	`, req.UserID, req.WithdrawalMethodID, req.AccountName, req.AccountNumber, req.Amount).Scan(&newID)
	
	if err != nil {
		http.Error(w, "Failed to create withdrawal request", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "Transaction commit failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": newID, "status": "pending"})
}

// ListAdmin — Returns all withdrawals for admin UI
func (h *WithdrawalsHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT w.id, w.user_id, w.withdrawal_method_id, w.account_name, w.account_number, w.amount, w.status, w.created_at,
		       u.phone, m.provider_name
		FROM withdrawals w
		JOIN users u ON w.user_id = u.id
		JOIN withdrawal_methods m ON w.withdrawal_method_id = m.id
		ORDER BY CASE WHEN w.status = 'pending' THEN 1 ELSE 2 END, w.created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var withdrawals []Withdrawal
	for rows.Next() {
		var wd Withdrawal
		if err := rows.Scan(&wd.ID, &wd.UserID, &wd.WithdrawalMethodID, &wd.AccountName, &wd.AccountNumber, &wd.Amount, &wd.Status, &wd.CreatedAt, &wd.UserPhone, &wd.ProviderName); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		withdrawals = append(withdrawals, wd)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(withdrawals)
}

// UpdateStatus — Admin accepts or rejects
func (h *WithdrawalsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"` // 'accepted' or 'rejected'
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if req.Status != "accepted" && req.Status != "rejected" {
		http.Error(w, "Status must be accepted or rejected", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Pool.Begin(r.Context())
	if err != nil {
		http.Error(w, "Transaction failed to start", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Lock the withdrawal row
	var currentStatus string
	var amount float64
	var userID string
	err = tx.QueryRow(r.Context(), `
		SELECT status, amount, user_id FROM withdrawals WHERE id = $1 FOR UPDATE
	`, id).Scan(&currentStatus, &amount, &userID)

	if err == pgx.ErrNoRows {
		http.Error(w, "Withdrawal not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if currentStatus != "pending" {
		http.Error(w, "Withdrawal is already processed", http.StatusBadRequest)
		return
	}

	if req.Status == "accepted" {
		// Just mark as accepted (balance already deducted on request)
		_, err = tx.Exec(r.Context(), `UPDATE withdrawals SET status = 'accepted', updated_at = NOW() WHERE id = $1`, id)
		if err != nil {
			http.Error(w, "Failed to update status", http.StatusInternalServerError)
			return
		}
	} else {
		// REJECTED → Refund the balance back to the user
		_, err = tx.Exec(r.Context(), `UPDATE users SET balance = balance + $1 WHERE id = $2`, amount, userID)
		if err != nil {
			http.Error(w, "Failed to refund user balance", http.StatusInternalServerError)
			return
		}
		// Hard delete the request
		_, err = tx.Exec(r.Context(), `DELETE FROM withdrawals WHERE id = $1`, id)
		if err != nil {
			http.Error(w, "Failed to delete withdrawal record", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, "Transaction commit failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true", "status": req.Status})
}

// CheckPending — returns pending withdrawal for a user
func (h *WithdrawalsHandler) CheckPending(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	var wd Withdrawal
	err := h.db.Pool.QueryRow(r.Context(), `
		SELECT w.id, w.user_id, w.withdrawal_method_id, w.account_name, w.account_number, w.amount, w.status, w.created_at,
		       m.provider_name
		FROM withdrawals w
		JOIN withdrawal_methods m ON w.withdrawal_method_id = m.id
		WHERE w.user_id = $1 AND w.status = 'pending'
		ORDER BY w.created_at DESC
		LIMIT 1
	`, userID).Scan(&wd.ID, &wd.UserID, &wd.WithdrawalMethodID, &wd.AccountName, &wd.AccountNumber, &wd.Amount, &wd.Status, &wd.CreatedAt, &wd.ProviderName)

	if err == pgx.ErrNoRows {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nil)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wd)
}
