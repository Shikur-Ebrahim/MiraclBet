package handlers

import (
    "encoding/json"
    "net/http"
)

type SportsHandler struct{}

func NewSportsHandler() *SportsHandler {
    return &SportsHandler{}
}

func (h *SportsHandler) List(w http.ResponseWriter, r *http.Request) {
    sports := []map[string]interface{}{
        {"id": "1", "name": "Football", "slug": "football", "is_active": true},
        {"id": "2", "name": "Basketball", "slug": "basketball", "is_active": true},
        {"id": "3", "name": "Tennis", "slug": "tennis", "is_active": true},
    }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(sports)
}
