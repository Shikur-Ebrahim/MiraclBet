package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/miraclbet/api/internal/database"
)

type SettingsHandler struct {
	db *database.DB
}

func NewSettingsHandler(db *database.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

// GetSettings - GET /api/v1/settings
func (h *SettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), "SELECT key, value FROM settings")
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to load settings")
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err == nil {
			settings[k] = v
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// UpdateSettings - PUT /api/v1/admin/settings
func (h *SettingsHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req map[string]string
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	ctx := r.Context()
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback(ctx)

	for k, v := range req {
		_, err := tx.Exec(ctx, `
			INSERT INTO settings (key, value) VALUES ($1, $2)
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
		`, k, v)
		if err != nil {
			h.respondError(w, http.StatusInternalServerError, "Failed to update setting: "+k)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to commit changes")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Settings updated successfully"})
}

func (h *SettingsHandler) respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
