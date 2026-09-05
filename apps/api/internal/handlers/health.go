package handlers

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
    return &HealthHandler{}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    _ = json.NewEncoder(w).Encode(map[string]string{
        "status":    "ok",
        "service":   "MiraclBet API",
        "timestamp": time.Now().UTC().Format(time.RFC3339),
    })
}
