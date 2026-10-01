package aviator

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Handlers struct {
	Engine *Engine
}

func NewHandlers(e *Engine) *Handlers {
	return &Handlers{Engine: e}
}

// SSEHandler serves the live game stream to clients
func (h *Handlers) SSEHandler(w http.ResponseWriter, r *http.Request) {
	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no") // Crucial for SSE behind Nginx!

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	// Pad the initial connection to bypass Nginx/Vercel proxy buffers (forces immediate flush)
	padding := make([]byte, 2048)
	for i := range padding {
		padding[i] = ' '
	}
	fmt.Fprintf(w, ":%s\n\n", string(padding))
	flusher.Flush()

	ch := make(chan []byte, 10)
	h.Engine.AddClient(ch)
	defer h.Engine.RemoveClient(ch)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		}
	}
}

func (h *Handlers) PlaceBet(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, "unauthorized - missing X-User-ID header", http.StatusUnauthorized)
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "amount must be greater than zero", http.StatusBadRequest)
		return
	}

	err := h.Engine.PlaceBet(r.Context(), userID, req.Amount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) CashOut(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, "unauthorized - missing X-User-ID header", http.StatusUnauthorized)
		return
	}

	multiplier, winAmount, err := h.Engine.CashOut(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"multiplier": multiplier,
		"win_amount": winAmount,
	})
}
