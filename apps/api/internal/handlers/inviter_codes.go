package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
)

type InviterCodesHandler struct {
	db *database.DB
}

func NewInviterCodesHandler(db *database.DB) *InviterCodesHandler {
	return &InviterCodesHandler{db: db}
}

type InviterCodeRow struct {
	ID        string     `json:"id"`
	Phone     string     `json:"phone"`
	Code      string     `json:"code"`
	UserID    *string    `json:"user_id,omitempty"`
	UserName  *string    `json:"user_name,omitempty"`
	IsUsed    bool       `json:"is_used"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// normalizePhone extracts the key digits (e.g. last 9 digits for Ethiopian numbers)
func normalizePhone(p string) string {
	digits := ""
	for _, ch := range p {
		if ch >= '0' && ch <= '9' {
			digits += string(ch)
		}
	}
	if len(digits) >= 9 {
		return digits[len(digits)-9:]
	}
	return digits
}

// generateInviterCode produces an attractive 9-character code with letters and digits:
// "INV" (3 letters) + 6 secure random digits = 9 characters total (e.g. "INV839201")
func generateInviterCode() (string, error) {
	const digits = "0123456789"
	b := make([]byte, 6)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		b[i] = digits[n.Int64()]
	}
	return "INV" + string(b), nil
}

// AdminCreateInviterCode - POST /api/v1/admin/inviter-codes
func (h *InviterCodesHandler) AdminCreateInviterCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	phone := strings.TrimSpace(req.Phone)
	if phone == "" {
		http.Error(w, "Phone number is required", http.StatusBadRequest)
		return
	}

	norm := normalizePhone(phone)
	if norm == "" {
		http.Error(w, "Valid phone number is required", http.StatusBadRequest)
		return
	}

	// Try to link existing user by phone if found
	var matchedUserID *string
	var matchedUserName *string
	row := h.db.Pool.QueryRow(r.Context(), `
		SELECT id, full_name FROM users
		WHERE RIGHT(phone, 9) = $1 OR phone = $2
		LIMIT 1
	`, norm, phone)
	var uid, uname string
	if err := row.Scan(&uid, &uname); err == nil {
		matchedUserID = &uid
		matchedUserName = &uname
	}

	// Generate a unique 9-character code
	var code string
	for attempt := 0; attempt < 10; attempt++ {
		candidate, err := generateInviterCode()
		if err != nil {
			http.Error(w, "Code generation error", http.StatusInternalServerError)
			return
		}

		var exists bool
		_ = h.db.Pool.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM inviter_codes WHERE code = $1)", candidate).Scan(&exists)
		if !exists {
			code = candidate
			break
		}
	}
	if code == "" {
		http.Error(w, "Failed to generate unique code", http.StatusInternalServerError)
		return
	}

	var insertedID string
	var createdAt time.Time
	err := h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO inviter_codes (phone, code, user_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`, phone, code, matchedUserID).Scan(&insertedID, &createdAt)
	if err != nil {
		http.Error(w, "Failed to save inviter code: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(InviterCodeRow{
		ID:        insertedID,
		Phone:     phone,
		Code:      code,
		UserID:    matchedUserID,
		UserName:  matchedUserName,
		IsUsed:    false,
		CreatedAt: createdAt,
	})
}

// AdminListInviterCodes - GET /api/v1/admin/inviter-codes
func (h *InviterCodesHandler) AdminListInviterCodes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT 
			ic.id, ic.phone, ic.code, ic.user_id, u.full_name, ic.is_used, ic.used_at, ic.created_at
		FROM inviter_codes ic
		LEFT JOIN users u ON ic.user_id = u.id
		ORDER BY ic.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		http.Error(w, "Failed to query inviter codes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []InviterCodeRow
	for rows.Next() {
		var rRow InviterCodeRow
		if err := rows.Scan(
			&rRow.ID, &rRow.Phone, &rRow.Code, &rRow.UserID, &rRow.UserName,
			&rRow.IsUsed, &rRow.UsedAt, &rRow.CreatedAt,
		); err == nil {
			list = append(list, rRow)
		}
	}
	if list == nil {
		list = []InviterCodeRow{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

// AdminDeleteInviterCode - DELETE /api/v1/admin/inviter-codes/{id}
func (h *InviterCodesHandler) AdminDeleteInviterCode(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id required", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), "DELETE FROM inviter_codes WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete inviter code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// VerifyInviterCode - POST /api/v1/withdrawals/verify-inviter-code
// Called by user in the withdrawal modal when prompted to enter their inviter code
func (h *InviterCodesHandler) VerifyInviterCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"user_id"`
		Code   string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	if req.UserID == "" || req.Code == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Please enter your Inviter Code.",
		})
		return
	}

	ctx := r.Context()

	// 1. Fetch user phone and current verified status
	var userPhone string
	var alreadyVerified bool
	err := h.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(phone, ''), COALESCE(inviter_code_verified, false)
		FROM users WHERE id = $1
	`, req.UserID).Scan(&userPhone, &alreadyVerified)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "User account not found.",
		})
		return
	}

	if alreadyVerified {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Inviter code already verified for this account.",
		})
		return
	}

	normUserPhone := normalizePhone(userPhone)

	// 2. Check if code exists and belongs to this user or their phone number
	var codeID string
	var codePhone string
	var isUsed bool
	err = h.db.Pool.QueryRow(ctx, `
		SELECT id, phone, is_used
		FROM inviter_codes
		WHERE UPPER(code) = $1
		  AND (
		      (user_id = $2)
		      OR ($3 <> '' AND RIGHT(phone, 9) = $3)
		      OR ($4 <> '' AND phone = $4)
		  )
		ORDER BY created_at DESC
		LIMIT 1
	`, req.Code, req.UserID, normUserPhone, userPhone).Scan(&codeID, &codePhone, &isUsed)

	if err != nil {
		// Code not found for this user
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid Inviter Code for phone %s. Please enter the exact code provided by your inviter/agent.", userPhone),
		})
		return
	}

	// 3. Mark code as used and update user verified status in a transaction
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		http.Error(w, "Transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE inviter_codes
		SET is_used = true, used_at = NOW(), user_id = $1
		WHERE id = $2
	`, req.UserID, codeID)
	if err != nil {
		http.Error(w, "Failed to update inviter code", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(ctx, `
		UPDATE users
		SET inviter_code_verified = true, verified_inviter_code = $1
		WHERE id = $2
	`, req.Code, req.UserID)
	if err != nil {
		http.Error(w, "Failed to update user status", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "Commit error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Inviter code verified successfully! Withdrawals are now unlocked.",
		"code":    req.Code,
	})
}
