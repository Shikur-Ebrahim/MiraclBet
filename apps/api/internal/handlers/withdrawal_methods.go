package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/storage"
)

type WithdrawalMethodsHandler struct {
	db *database.DB
	r2 *storage.R2Service
}

func NewWithdrawalMethodsHandler(db *database.DB, r2 *storage.R2Service) *WithdrawalMethodsHandler {
	return &WithdrawalMethodsHandler{db: db, r2: r2}
}

type WithdrawalMethod struct {
	ID           string    `json:"id"`
	ProviderName string    `json:"provider_name"`
	LogoURL      *string   `json:"logo_url"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

func (h *WithdrawalMethodsHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT id, provider_name, logo_url, is_active, created_at 
		FROM withdrawal_methods 
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var methods []WithdrawalMethod
	for rows.Next() {
		var m WithdrawalMethod
		if err := rows.Scan(&m.ID, &m.ProviderName, &m.LogoURL, &m.IsActive, &m.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		methods = append(methods, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(methods)
}

func (h *WithdrawalMethodsHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB limit
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	providerName := r.FormValue("provider_name")
	if providerName == "" {
		http.Error(w, "Missing provider name", http.StatusBadRequest)
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

	var newMethod WithdrawalMethod
	err = h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO withdrawal_methods (provider_name, logo_url) 
		VALUES ($1, $2) 
		RETURNING id, provider_name, logo_url, is_active, created_at
	`, providerName, logoURL).Scan(
		&newMethod.ID, &newMethod.ProviderName, &newMethod.LogoURL, &newMethod.IsActive, &newMethod.CreatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to insert into database", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newMethod)
}

func (h *WithdrawalMethodsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing ID", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), "DELETE FROM withdrawal_methods WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *WithdrawalMethodsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
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

	_, err := h.db.Pool.Exec(r.Context(), "UPDATE withdrawal_methods SET is_active = $1 WHERE id = $2", req.IsActive, id)
	if err != nil {
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
