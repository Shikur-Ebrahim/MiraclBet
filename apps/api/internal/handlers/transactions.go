package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/database"
)

type TransactionsHandler struct {
	db *database.DB
}

func NewTransactionsHandler(db *database.DB) *TransactionsHandler {
	return &TransactionsHandler{db: db}
}

type Transaction struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"` // "deposit" or "withdrawal"
	Amount       float64   `json:"amount"`
	Status       string    `json:"status"`
	ProviderName string    `json:"provider_name"`
	AccountName  string    `json:"account_name,omitempty"`
	AccountNumber string   `json:"account_number,omitempty"`
	ScreenshotURL string   `json:"screenshot_url,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// List returns all deposits + withdrawals for a user, sorted by date desc
func (h *TransactionsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	var txns []Transaction

	// Fetch deposits
	depRows, err := h.db.Pool.Query(r.Context(), `
		SELECT d.id, d.amount, d.status, d.screenshot_url, d.created_at, p.provider_name
		FROM deposits d
		JOIN payment_methods p ON d.payment_method_id = p.id
		WHERE d.user_id = $1
		ORDER BY d.created_at DESC
	`, userID)
	if err == nil {
		defer depRows.Close()
		for depRows.Next() {
			var t Transaction
			t.Type = "deposit"
			if err := depRows.Scan(&t.ID, &t.Amount, &t.Status, &t.ScreenshotURL, &t.CreatedAt, &t.ProviderName); err == nil {
				txns = append(txns, t)
			}
		}
	}

	// Fetch withdrawals
	wdRows, err := h.db.Pool.Query(r.Context(), `
		SELECT w.id, w.amount, w.status, w.account_name, w.account_number, w.created_at, m.provider_name
		FROM withdrawals w
		JOIN withdrawal_methods m ON w.withdrawal_method_id = m.id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if err == nil {
		defer wdRows.Close()
		for wdRows.Next() {
			var t Transaction
			t.Type = "withdrawal"
			if err := wdRows.Scan(&t.ID, &t.Amount, &t.Status, &t.AccountName, &t.AccountNumber, &t.CreatedAt, &t.ProviderName); err == nil {
				txns = append(txns, t)
			}
		}
	}

	// Sort combined list by CreatedAt descending (simple insertion sort for small lists)
	for i := 1; i < len(txns); i++ {
		for j := i; j > 0 && txns[j].CreatedAt.After(txns[j-1].CreatedAt); j-- {
			txns[j], txns[j-1] = txns[j-1], txns[j]
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if txns == nil {
		json.NewEncoder(w).Encode([]Transaction{})
		return
	}
	json.NewEncoder(w).Encode(txns)
}
