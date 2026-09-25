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

type RegisterRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	// Validate phone length and prefix (9 or 7)
	if len(req.Phone) != 9 || (req.Phone[0] != '9' && req.Phone[0] != '7') {
		h.respondError(w, http.StatusBadRequest, "Please enter a valid Ethiopian phone number (must start with 9 or 7 and be 9 digits)")
		return
	}

	// Validate password
	if len(req.Password) < 6 {
		h.respondError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to secure password")
		return
	}

	var user User
	err = h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO users (phone, password_hash, role) 
		VALUES ($1, $2, 'USER') 
		RETURNING id, phone, role
	`, req.Phone, string(hash)).Scan(&user.ID, &user.Phone, &user.Role)

	if err != nil {
		// Mostly unique violation for duplicate phone
		h.respondError(w, http.StatusConflict, "Phone number is already registered")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{
		Success: true,
		Message: "Account created successfully!",
		User:    &user,
	})
}

