package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/storage"
)

type DepositsHandler struct {
	db *database.DB
	r2 *storage.R2Service
}

func NewDepositsHandler(db *database.DB, r2 *storage.R2Service) *DepositsHandler {
	return &DepositsHandler{db: db, r2: r2}
}

type Deposit struct {
	ID                string    `json:"id"`
	UserID            string    `json:"user_id"`
	PaymentMethodID   string    `json:"payment_method_id"`
	Amount            float64   `json:"amount"`
	ScreenshotURL     string    `json:"screenshot_url"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	// Additional fields for admin list
	UserPhone         *string   `json:"user_phone,omitempty"`
	ProviderName      *string   `json:"provider_name,omitempty"`
}

func (h *DepositsHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	userID := r.FormValue("user_id")
	paymentMethodID := r.FormValue("payment_method_id")
	amount := r.FormValue("amount")

	if userID == "" || paymentMethodID == "" || amount == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("screenshot")
	if err != nil {
		http.Error(w, "Screenshot is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	screenshotURL, err := h.r2.UploadFile(r.Context(), file, header)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to upload screenshot: %v", err), http.StatusInternalServerError)
		return
	}

	var depositID string
	err = h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO deposits (user_id, payment_method_id, amount, screenshot_url)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, userID, paymentMethodID, amount, screenshotURL).Scan(&depositID)

	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": depositID, "status": "pending"})
}

func (h *DepositsHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT d.id, d.user_id, d.payment_method_id, d.amount, d.screenshot_url, d.status, d.created_at,
		       u.phone, p.provider_name
		FROM deposits d
		JOIN users u ON d.user_id = u.id
		JOIN payment_methods p ON d.payment_method_id = p.id
		ORDER BY d.created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var deposits []Deposit
	for rows.Next() {
		var d Deposit
		if err := rows.Scan(&d.ID, &d.UserID, &d.PaymentMethodID, &d.Amount, &d.ScreenshotURL, &d.Status, &d.CreatedAt, &d.UserPhone, &d.ProviderName); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		deposits = append(deposits, d)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deposits)
}

func (h *DepositsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
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

	// Begin Transaction
	tx, err := h.db.Pool.Begin(r.Context())
	if err != nil {
		http.Error(w, "Transaction failed to start", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Lock the deposit row and read details
	var currentStatus string
	var amount float64
	var userID string
	err = tx.QueryRow(r.Context(), `
		SELECT status, amount, user_id FROM deposits WHERE id = $1 FOR UPDATE
	`, id).Scan(&currentStatus, &amount, &userID)

	if err == pgx.ErrNoRows {
		http.Error(w, "Deposit not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if currentStatus != "pending" {
		http.Error(w, "Deposit is already processed", http.StatusBadRequest)
		return
	}

	if req.Status == "accepted" {
		// Mark as accepted
		_, err = tx.Exec(r.Context(), `
			UPDATE deposits SET status = 'accepted', updated_at = NOW() WHERE id = $1
		`, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		// Add balance to user instantly
		_, err = tx.Exec(r.Context(), `
			UPDATE users SET balance = balance + $1 WHERE id = $2
		`, amount, userID)
		if err != nil {
			http.Error(w, "Failed to update user balance", http.StatusInternalServerError)
			return
		}
	} else {
		// REJECTED → hard delete the deposit record completely
		_, err = tx.Exec(r.Context(), `DELETE FROM deposits WHERE id = $1`, id)
		if err != nil {
			http.Error(w, "Failed to delete deposit", http.StatusInternalServerError)
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

// CheckPending — returns pending deposit for a user (if any)
func (h *DepositsHandler) CheckPending(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	var deposit Deposit
	err := h.db.Pool.QueryRow(r.Context(), `
		SELECT d.id, d.user_id, d.payment_method_id, d.amount, d.screenshot_url, d.status, d.created_at,
		       p.provider_name
		FROM deposits d
		JOIN payment_methods p ON d.payment_method_id = p.id
		WHERE d.user_id = $1 AND d.status = 'pending'
		ORDER BY d.created_at DESC
		LIMIT 1
	`, userID).Scan(&deposit.ID, &deposit.UserID, &deposit.PaymentMethodID, &deposit.Amount,
		&deposit.ScreenshotURL, &deposit.Status, &deposit.CreatedAt, &deposit.ProviderName)

	if err == pgx.ErrNoRows {
		// No pending deposit — return null
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nil)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deposit)
}