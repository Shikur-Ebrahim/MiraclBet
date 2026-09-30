package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/miraclbet/api/internal/config"
)

type ChatHandler struct {
	cfg *config.Config
}

func NewChatHandler(cfg *config.Config) *ChatHandler {
	return &ChatHandler{cfg: cfg}
}

type ChatRequest struct {
	Message string `json:"message"`
	History []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"history"`
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	if h.cfg.GroqAPIKey == "" {
		http.Error(w, "Groq API key not configured", http.StatusInternalServerError)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	messages := []map[string]string{
		{
			"role": "system",
			"content": "You are the MiraclBet AI assistant. You help users with sports betting, odds, and platform navigation. Be concise, friendly, and helpful. Format responses in plain text or simple markdown.",
		},
	}

	for _, m := range req.History {
		messages = append(messages, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	messages = append(messages, map[string]string{
		"role":    "user",
		"content": req.Message,
	})

	groqReqBody, _ := json.Marshal(map[string]interface{}{
		"model":    "openai/gpt-oss-120b",
		"messages": messages,
	})

	groqReq, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(groqReqBody))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	groqReq.Header.Set("Authorization", "Bearer "+h.cfg.GroqAPIKey)
	groqReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(groqReq)
	if err != nil {
		http.Error(w, "Failed to contact Groq API", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Groq API error: %s\n", string(body))
		
		// Fallback to a different model if the requested one is unavailable
		groqReqBody, _ = json.Marshal(map[string]interface{}{
			"model":    "llama3-8b-8192", // solid fallback
			"messages": messages,
		})
		groqReq, _ = http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(groqReqBody))
		groqReq.Header.Set("Authorization", "Bearer "+h.cfg.GroqAPIKey)
		groqReq.Header.Set("Content-Type", "application/json")
		
		resp2, err2 := client.Do(groqReq)
		if err2 != nil || resp2.StatusCode != http.StatusOK {
			http.Error(w, "Groq API error", http.StatusInternalServerError)
			return
		}
		defer resp2.Body.Close()
		
		w.Header().Set("Content-Type", "application/json")
		io.Copy(w, resp2.Body)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}
