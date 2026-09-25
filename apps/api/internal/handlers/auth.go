package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/miraclbet/api/internal/database"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db *database.DB
}

func NewAuthHandler(db *database.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

type LoginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	User    *User  `json:"user,omitempty"`
}

type User struct {
	ID       string `json:"id"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	var user User
	var hash string

	// Look up user by phone number
	err := h.db.Pool.QueryRow(r.Context(), "SELECT id, phone, role, password_hash FROM users WHERE phone = $1", req.Phone).
		Scan(&user.ID, &user.Phone, &user.Role, &hash)

	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid phone number or password")
		return
	}

	// Compare password hash
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid phone number or password")
		return
	}

	// Success! Return user data (frontend will use Role to redirect)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{
		Success: true,
		Message: "Login successful",
		User:    &user,
	})
}

func (h *AuthHandler) respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(LoginResponse{Success: false, Message: message})
}
