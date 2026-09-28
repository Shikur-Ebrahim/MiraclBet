package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/miraclbet/api/internal/config"
	"github.com/miraclbet/api/internal/database"
)

type SavedTeamsHandler struct {
	db  *database.DB
	cfg *config.Config
}

func NewSavedTeamsHandler(db *database.DB, cfg *config.Config) *SavedTeamsHandler {
	return &SavedTeamsHandler{db: db, cfg: cfg}
}

func (h *SavedTeamsHandler) SearchAPI(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	if search == "" {
		h.respondError(w, http.StatusBadRequest, "search query is required")
		return
	}

	if h.cfg.FootballAPIKey == "" {
		h.respondError(w, http.StatusInternalServerError, "Football API Key not configured")
		return
	}

	url := fmt.Sprintf("%s/teams?search=%s", h.cfg.FootballAPIBaseURL, search)
	req, _ := http.NewRequestWithContext(r.Context(), "GET", url, nil)
	req.Header.Set("x-rapidapi-key", h.cfg.FootballAPIKey)
	req.Header.Set("x-rapidapi-host", "v3.football.api-sports.io")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to contact football API")
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		h.respondError(w, http.StatusInternalServerError, "Invalid response from football API")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *SavedTeamsHandler) SaveTeam(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ApiID       int    `json:"api_id"`
		Name        string `json:"name"`
		Logo        string `json:"logo"`
		Country     string `json:"country"`
		CountryFlag string `json:"country_flag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	_, err := h.db.Pool.Exec(r.Context(),
		`INSERT INTO saved_teams (api_id, name, logo, country, country_flag)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (api_id) DO UPDATE SET 
		 name = EXCLUDED.name, logo = EXCLUDED.logo, 
		 country = EXCLUDED.country, country_flag = EXCLUDED.country_flag`,
		req.ApiID, req.Name, req.Logo, req.Country, req.CountryFlag,
	)

	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to save team")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (h *SavedTeamsHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), "SELECT api_id, name, logo, country, country_flag FROM saved_teams ORDER BY name ASC")
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var teams []map[string]interface{}
	for rows.Next() {
		var apiID int
		var name, logo, country, countryFlag string
		if err := rows.Scan(&apiID, &name, &logo, &country, &countryFlag); err == nil {
			teams = append(teams, map[string]interface{}{
				"api_id":       apiID,
				"name":         name,
				"logo":         logo,
				"country":      country,
				"country_flag": countryFlag,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(teams)
}

func (h *SavedTeamsHandler) respondError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
