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
	IsExpired bool       `json:"is_expired"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// normalizePhone extracts the last 9 digits from any Ethiopian phone format.
// DB stores phones as plain 9 digits (e.g. "977958603").
// Admin may enter: "0977958603", "+251977958603", "977958603" — all normalise to "977958603".
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
		Phone     string `json:"phone"`
		IsExpired bool   `json:"is_expired"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	rawPhone := strings.TrimSpace(req.Phone)
	if rawPhone == "" {
		http.Error(w, "Phone number is required", http.StatusBadRequest)
		return
	}

	// Always work with the normalised 9-digit phone so it matches DB values like "977958603"
	normPhone := normalizePhone(rawPhone)
	if len(normPhone) < 7 {
		http.Error(w, "Valid phone number is required (at least 7 digits)", http.StatusBadRequest)
		return
	}

	// Try to link existing user — DB phones are stored as plain 9 digits (no "0" prefix)
	var matchedUserID *string
	var matchedUserName *string
	row := h.db.Pool.QueryRow(r.Context(), `
		SELECT id, full_name FROM users
		WHERE RIGHT(phone, 9) = $1
		LIMIT 1
	`, normPhone)
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

	// Store the NORMALISED phone (9 digits) so lookups are consistent
	var insertedID string
	var createdAt time.Time
	err := h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO inviter_codes (phone, code, user_id, is_expired)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`, normPhone, code, matchedUserID, req.IsExpired).Scan(&insertedID, &createdAt)
	if err != nil {
		http.Error(w, "Failed to save inviter code: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(InviterCodeRow{
		ID:        insertedID,
		Phone:     normPhone, // return normalised phone so UI shows consistent value
		Code:      code,
		UserID:    matchedUserID,
		UserName:  matchedUserName,
		IsUsed:    false,
		IsExpired: req.IsExpired,
		CreatedAt: createdAt,
	})
}

// AdminListInviterCodes - GET /api/v1/admin/inviter-codes
func (h *InviterCodesHandler) AdminListInviterCodes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT 
			ic.id, ic.phone, ic.code, ic.user_id, u.full_name, ic.is_used, ic.used_at, ic.created_at, COALESCE(ic.is_expired, false)
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
			&rRow.IsUsed, &rRow.UsedAt, &rRow.CreatedAt, &rRow.IsExpired,
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


// AdminToggleExpiredInviterCode - PUT /api/v1/admin/inviter-codes/{id}/toggle-expired
func (h *InviterCodesHandler) AdminToggleExpiredInviterCode(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id required", http.StatusBadRequest)
		return
	}

	var req struct {
		IsExpired *bool `json:"is_expired"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	var newStatus bool
	if req.IsExpired != nil {
		newStatus = *req.IsExpired
		_, err := h.db.Pool.Exec(r.Context(), "UPDATE inviter_codes SET is_expired = $1 WHERE id = $2", newStatus, id)
		if err != nil {
			http.Error(w, "Failed to update expired status: "+err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		err := h.db.Pool.QueryRow(r.Context(), "UPDATE inviter_codes SET is_expired = NOT COALESCE(is_expired, false) WHERE id = $1 RETURNING is_expired", id).Scan(&newStatus)
		if err != nil {
			http.Error(w, "Failed to toggle expired status: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"id":         id,
		"is_expired": newStatus,
	})
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

	// 1. Fetch user phone (stored as plain 9 digits in DB) and verified status
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

	// Normalise user's phone (DB may store "977958603" as plain 9 digits already,
	// but normalise to be safe regardless of format)
	normUserPhone := normalizePhone(userPhone)

	// 2. Find the inviter code matching this user.
	// inviter_codes.phone is stored as 9-digit normalised string (e.g. "977958603").
	// Match on: user_id link OR normalised phone == stored phone OR RIGHT match as fallback.
	var codeID string
	var isUsed bool
	var isExpired bool
	err = h.db.Pool.QueryRow(ctx, `
		SELECT id, is_used, COALESCE(is_expired, false)
		FROM inviter_codes
		WHERE UPPER(code) = $1
		  AND (
		      user_id = $2
		      OR RIGHT(phone, 9) = $3
		      OR phone = $3
		      OR phone = $4
		  )
		ORDER BY created_at DESC
		LIMIT 1
	`, req.Code, req.UserID, normUserPhone, userPhone).Scan(&codeID, &isUsed, &isExpired)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    false,
			"is_expired": false,
			"error":      fmt.Sprintf("Invalid Inviter Code. Please enter the exact code provided for your phone number (%s).", userPhone),
		})
		return
	}

	if isExpired {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    false,
			"is_expired": true,
			"error":      "This code is expired. Please enter the other new inviter code to proceed to withdraw.",
		})
		return
	}

	if isUsed {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    false,
			"is_expired": false,
			"error":      "This inviter code has already been used.",
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
