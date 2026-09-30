package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/storage"
)

type PaymentMethodsHandler struct {
	db *database.DB
	r2 *storage.R2Service
}

func NewPaymentMethodsHandler(db *database.DB, r2 *storage.R2Service) *PaymentMethodsHandler {
	return &PaymentMethodsHandler{db: db, r2: r2}
}

type PaymentMethod struct {
	ID            string    `json:"id"`
	ProviderName  string    `json:"provider_name"`
	AccountName   string    `json:"account_name"`
	AccountNumber string    `json:"account_number"`
	LogoURL       *string   `json:"logo_url"`
	IsActive      bool      `json:"is_active"`
	MinDeposit    float64   `json:"min_deposit"`
	CreatedAt     time.Time `json:"created_at"`
}

func (h *PaymentMethodsHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT id, provider_name, account_name, account_number, logo_url, is_active, COALESCE(min_deposit, 450), created_at 
		FROM payment_methods 
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var methods []PaymentMethod
	for rows.Next() {
		var m PaymentMethod
		if err := rows.Scan(&m.ID, &m.ProviderName, &m.AccountName, &m.AccountNumber, &m.LogoURL, &m.IsActive, &m.MinDeposit, &m.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		methods = append(methods, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(methods)
}

func (h *PaymentMethodsHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB limit
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	providerName := r.FormValue("provider_name")
	accountName := r.FormValue("account_name")
	accountNumber := r.FormValue("account_number")
	minDepositStr := r.FormValue("min_deposit")
	minDeposit := 450.0
	if minDepositStr != "" {
		if v, err := strconv.ParseFloat(minDepositStr, 64); err == nil && v > 0 {
			minDeposit = v
		}
	}

	if providerName == "" || accountName == "" || accountNumber == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	var logoURL *string
	file, header, err := r.FormFile("logo")
	if err == nil {
		defer file.Close()
		if h.r2 != nil {
			url, err := h.r2.UploadFile(r.Context(), file, header)
			if err != nil {
				http.Error(w, "Failed to upload image: "+err.Error(), http.StatusInternalServerError)
				return
			}
			logoURL = &url
		}
	}

	var newMethod PaymentMethod
	err = h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO payment_methods (provider_name, account_name, account_number, logo_url, min_deposit) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id, provider_name, account_name, account_number, logo_url, is_active, COALESCE(min_deposit, 450), created_at
	`, providerName, accountName, accountNumber, logoURL, minDeposit).Scan(
		&newMethod.ID, &newMethod.ProviderName, &newMethod.AccountName, &newMethod.AccountNumber, &newMethod.LogoURL, &newMethod.IsActive, &newMethod.MinDeposit, &newMethod.CreatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to insert into database: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newMethod)
}

// UpdateMinDeposit — PATCH /api/v1/admin/payment-methods/{id}/min-deposit
func (h *PaymentMethodsHandler) UpdateMinDeposit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing ID", http.StatusBadRequest)
		return
	}

	var req struct {
		MinDeposit float64 `json:"min_deposit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.MinDeposit <= 0 {
		http.Error(w, "min_deposit must be greater than 0", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(),
		"UPDATE payment_methods SET min_deposit = $1 WHERE id = $2",
		req.MinDeposit, id,
	)
	if err != nil {
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "min_deposit": req.MinDeposit})
}

func (h *PaymentMethodsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing ID", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), "DELETE FROM payment_methods WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *PaymentMethodsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing ID", http.StatusBadRequest)
		return
	}

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), "UPDATE payment_methods SET is_active = $1, updated_at = NOW() WHERE id = $2", req.IsActive, id)
	if err != nil {
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
