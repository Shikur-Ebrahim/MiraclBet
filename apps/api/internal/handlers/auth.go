package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

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
	ID         string   `json:"id"`
	Phone      string   `json:"phone"`
	Role       string   `json:"role"`
	Balance    float64  `json:"balance"`
	Privileges []string `json:"privileges"`
	PromoCode  string   `json:"promo_code,omitempty"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	var user User
	var hash string
	var isActive bool
	var privBytes []byte

	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT id, phone, role, COALESCE(balance, 0), password_hash, COALESCE(is_active, true), COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '') 
		 FROM users WHERE phone = $1`,
		req.Phone).Scan(&user.ID, &user.Phone, &user.Role, &user.Balance, &hash, &isActive, &privBytes, &user.PromoCode)

	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid phone number or password")
		return
	}

	json.Unmarshal(privBytes, &user.Privileges)
	if user.Privileges == nil {
		user.Privileges = []string{}
	}

	// Check if account is deactivated
	if !isActive {
		h.respondError(w, http.StatusForbidden, "Your account has been deactivated. Please contact support.")
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
	Phone     string `json:"phone"`
	Password  string `json:"password"`
	PromoCode string `json:"promo_code,omitempty"`
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
	cleanPromo := strings.ToUpper(strings.TrimSpace(req.PromoCode))
	validPromo := ""

	// Only accept promo codes that match a SUPER_ADMIN's promo_code or the super_admin_promo_code setting
	if cleanPromo != "" && h.db != nil {
		var promoExists bool
		err = h.db.Pool.QueryRow(r.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM users 
				WHERE role = 'SUPER_ADMIN' 
				  AND UPPER(COALESCE(promo_code, '')) = $1
				UNION
				SELECT 1 FROM settings 
				WHERE key = 'super_admin_promo_code' 
				  AND UPPER(COALESCE(value, '')) = $1
			)
		`, cleanPromo).Scan(&promoExists)
		if err == nil && promoExists {
			validPromo = cleanPromo
		}
	}

	user.PromoCode = validPromo
	if validPromo != "" {
		err = h.db.Pool.QueryRow(r.Context(), `
			INSERT INTO users (phone, password_hash, role, balance, promo_code, inviter_code_verified) 
			VALUES ($1, $2, 'USER', 0.00, $3, false) 
			RETURNING id, phone, role, balance, COALESCE(promo_code, '')
		`, req.Phone, string(hash), validPromo).Scan(&user.ID, &user.Phone, &user.Role, &user.Balance, &user.PromoCode)
	} else {
		err = h.db.Pool.QueryRow(r.Context(), `
			INSERT INTO users (phone, password_hash, role, balance, promo_code, inviter_code_verified) 
			VALUES ($1, $2, 'USER', 0.00, '', false) 
			RETURNING id, phone, role, balance, COALESCE(promo_code, '')
		`, req.Phone, string(hash)).Scan(&user.ID, &user.Phone, &user.Role, &user.Balance, &user.PromoCode)
	}

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

// Me — returns the latest balance and profile for a logged-in user.
// Called by the frontend periodically to refresh balance without full re-login.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		h.respondError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	var user User
	var privBytes []byte
	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT id, phone, role, COALESCE(balance, 0), COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '') FROM users WHERE id = $1`, userID,
	).Scan(&user.ID, &user.Phone, &user.Role, &user.Balance, &privBytes, &user.PromoCode)

	if err != nil {
		h.respondError(w, http.StatusNotFound, "User not found")
		return
	}

	json.Unmarshal(privBytes, &user.Privileges)
	if user.Privileges == nil {
		user.Privileges = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{
		Success: true,
		Message: "ok",
		User:    &user,
	})
}
type ChangePasswordRequest struct {
	UserID      string `json:"user_id"`
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.UserID == "" || req.OldPassword == "" || req.NewPassword == "" {
		h.respondError(w, http.StatusBadRequest, "All fields are required")
		return
	}
	if len(req.NewPassword) < 6 {
		h.respondError(w, http.StatusBadRequest, "New password must be at least 6 characters")
		return
	}

	// Verify old password
	var hash string
	err := h.db.Pool.QueryRow(r.Context(), "SELECT password_hash FROM users WHERE id = $1", req.UserID).Scan(&hash)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid user")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.OldPassword)); err != nil {
		h.respondError(w, http.StatusUnauthorized, "Incorrect current password")
		return
	}

	// Update password
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Error hashing password")
		return
	}

	_, err = h.db.Pool.Exec(r.Context(), "UPDATE users SET password_hash = $1 WHERE id = $2", string(newHash), req.UserID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Password changed successfully"})
}

// ValidatePromo checks if a promo code belongs to any registered SUPER_ADMIN or super_admin_promo_code setting
func (h *AuthHandler) ValidatePromo(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("code")))
	if code == "" || h.db == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"code":  code,
		})
		return
	}

	var exists bool
	_ = h.db.Pool.QueryRow(r.Context(), `
		SELECT EXISTS (
			SELECT 1 FROM users 
			WHERE role = 'SUPER_ADMIN' 
			  AND UPPER(COALESCE(promo_code, '')) = $1
			UNION
			SELECT 1 FROM settings 
			WHERE key = 'super_admin_promo_code' 
			  AND UPPER(COALESCE(value, '')) = $1
		)
	`, code).Scan(&exists)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid": exists,
		"code":  code,
	})
}

