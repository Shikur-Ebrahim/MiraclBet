package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/storage"
)

type SupportHandler struct {
	db *database.DB
	r2 *storage.R2Service
}

func NewSupportHandler(db *database.DB, r2 *storage.R2Service) *SupportHandler {
	return &SupportHandler{db: db, r2: r2}
}

type SupportMessage struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	SenderRole string    `json:"sender_role"`
	SenderID   *string   `json:"sender_id,omitempty"`
	Message    string    `json:"message"`
	ImageURL   *string   `json:"image_url,omitempty"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

type ConversationSummary struct {
	UserID         string    `json:"user_id"`
	UserPhone      string    `json:"user_phone"`
	UserFullName   string    `json:"user_full_name"`
	IsBlocked      bool      `json:"is_blocked"`
	LastMessage    string    `json:"last_message"`
	LastImageURL   *string   `json:"last_image_url,omitempty"`
	LastSenderRole string    `json:"last_sender_role"`
	LastMessageAt  time.Time `json:"last_message_at"`
	UnreadCount    int       `json:"unread_count"`
	PromoCode      string    `json:"promo_code,omitempty"`
}

// ─── USER ENDPOINTS ──────────────────────────────────────────────────────────

// GetUserMessages returns all chat messages for a given user and marks admin messages as read.
func (h *SupportHandler) GetUserMessages(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	var isBlocked bool
	err := h.db.Pool.QueryRow(r.Context(), "SELECT COALESCE(is_support_blocked, false) FROM users WHERE id = $1", userID).Scan(&isBlocked)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Mark incoming ADMIN messages as read
	_, _ = h.db.Pool.Exec(r.Context(), `
		UPDATE support_messages 
		SET is_read = true 
		WHERE user_id = $1 AND sender_role = 'ADMIN' AND is_read = false
	`, userID)

	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT id, user_id, sender_role, sender_id, message, image_url, is_read, created_at
		FROM support_messages
		WHERE user_id = $1
		ORDER BY created_at ASC
	`, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := make([]SupportMessage, 0)
	for rows.Next() {
		var m SupportMessage
		if err := rows.Scan(&m.ID, &m.UserID, &m.SenderRole, &m.SenderID, &m.Message, &m.ImageURL, &m.IsRead, &m.CreatedAt); err == nil {
			messages = append(messages, m)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages":   messages,
		"is_blocked": isBlocked,
	})
}

// UserSendMessage sends a message from user to admin.
func (h *SupportHandler) UserSendMessage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID   string `json:"user_id"`
		Message  string `json:"message"`
		ImageURL string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.UserID = strings.TrimSpace(req.UserID)
	req.Message = strings.TrimSpace(req.Message)
	req.ImageURL = strings.TrimSpace(req.ImageURL)

	if req.UserID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}
	if req.Message == "" && req.ImageURL == "" {
		http.Error(w, "Message text or image is required", http.StatusBadRequest)
		return
	}

	// Check if user is blocked from support
	var isBlocked bool
	err := h.db.Pool.QueryRow(r.Context(), "SELECT COALESCE(is_support_blocked, false) FROM users WHERE id = $1", req.UserID).Scan(&isBlocked)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if isBlocked {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "You have been blocked from sending support messages by an administrator.",
		})
		return
	}

	var m SupportMessage
	var imageURLParam *string
	if req.ImageURL != "" {
		imageURLParam = &req.ImageURL
	}

	err = h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO support_messages (user_id, sender_role, message, image_url, is_read)
		VALUES ($1, 'USER', $2, $3, false)
		RETURNING id, user_id, sender_role, sender_id, message, image_url, is_read, created_at
	`, req.UserID, req.Message, imageURLParam).Scan(
		&m.ID, &m.UserID, &m.SenderRole, &m.SenderID, &m.Message, &m.ImageURL, &m.IsRead, &m.CreatedAt,
	)

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save message: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}

// UploadImage handles image uploads for support messages (supporting R2 and local fallback).
func (h *SupportHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File exceeds 10MB limit", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		file, header, err = r.FormFile("file")
	}
	if err != nil {
		file, header, err = r.FormFile("photo")
	}
	if err != nil {
		http.Error(w, "Image file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Try R2 upload if configured
	if h.r2 != nil {
		url, err := h.r2.UploadFile(r.Context(), file, header)
		if err == nil && url != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"url": url})
			return
		}
		// Reset file seek pointer if R2 failed so fallback can read
		if seeker, ok := file.(io.Seeker); ok {
			_, _ = seeker.Seek(0, io.SeekStart)
		}
	}

	// Fallback to local uploads directory
	uploadDir := filepath.Join(".", "uploads", "support")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create uploads directory", http.StatusInternalServerError)
		return
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	dstPath := filepath.Join(uploadDir, fileName)

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to write file", http.StatusInternalServerError)
		return
	}

	publicURL := fmt.Sprintf("/uploads/support/%s", fileName)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": publicURL})
}

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

// AdminListConversations lists all conversation threads with latest messages and unread counts.
func (h *SupportHandler) AdminListConversations(w http.ResponseWriter, r *http.Request) {
	isSupportSuper := IsSuperAdminRequest(r, h.db)
	promoFilterChat := "none"
	if isSupportSuper {
		promoFilterChat = "only"
	}
	// Build promo WHERE clause for support queries
	listPromoWhere := ""
	if promoFilterChat == "none" {
		listPromoWhere = " AND COALESCE(u.promo_code, '') = '' "
	} else if promoFilterChat == "only" {
		listPromoWhere = " AND COALESCE(u.promo_code, '') != '' "
	}

	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT 
			u.id,
			COALESCE(u.phone, ''),
			COALESCE(u.is_support_blocked, false),
			COALESCE(m.last_message, ''),
			m.last_image_url,
			COALESCE(m.last_sender_role, ''),
			COALESCE(m.last_message_at, NOW()),
			COALESCE(m.unread_count, 0),
			COALESCE(u.promo_code, '')
		FROM users u
		INNER JOIN (
			SELECT 
				user_id,
				(ARRAY_AGG(message ORDER BY created_at DESC))[1] AS last_message,
				(ARRAY_AGG(image_url ORDER BY created_at DESC))[1] AS last_image_url,
				(ARRAY_AGG(sender_role ORDER BY created_at DESC))[1] AS last_sender_role,
				MAX(created_at) AS last_message_at,
				COUNT(*) FILTER (WHERE sender_role = 'USER' AND is_read = false) AS unread_count
			FROM support_messages
			GROUP BY user_id
		) m ON u.id = m.user_id
		` + listPromoWhere + `
		ORDER BY m.last_message_at DESC
	`)
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	conversations := make([]ConversationSummary, 0)
	for rows.Next() {
		var c ConversationSummary
		if err := rows.Scan(
			&c.UserID, &c.UserPhone, &c.IsBlocked,
			&c.LastMessage, &c.LastImageURL, &c.LastSenderRole,
			&c.LastMessageAt, &c.UnreadCount, &c.PromoCode,
		); err == nil {
			c.UserFullName = c.UserPhone
			conversations = append(conversations, c)
		}
	}

	if conversations == nil {
		conversations = []ConversationSummary{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}

// AdminGetConversation fetches all messages for a specific user and marks user messages as read.
func (h *SupportHandler) AdminGetConversation(w http.ResponseWriter, r *http.Request) {
	targetUserID := chi.URLParam(r, "userId")
	if targetUserID == "" {
		http.Error(w, "userId param required", http.StatusBadRequest)
		return
	}

	var user struct {
		ID        string `json:"id"`
		Phone     string `json:"phone"`
		FullName  string `json:"full_name"`
		IsBlocked bool   `json:"is_blocked"`
		PromoCode string `json:"promo_code,omitempty"`
	}
	err := h.db.Pool.QueryRow(r.Context(), `
		SELECT id, COALESCE(phone, ''), COALESCE(is_support_blocked, false), COALESCE(promo_code, '')
		FROM users
		WHERE id = $1
	`, targetUserID).Scan(&user.ID, &user.Phone, &user.IsBlocked, &user.PromoCode)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	user.FullName = user.Phone

	// Mark user messages as read
	_, _ = h.db.Pool.Exec(r.Context(), `
		UPDATE support_messages 
		SET is_read = true 
		WHERE user_id = $1 AND sender_role = 'USER' AND is_read = false
	`, targetUserID)

	rows, err := h.db.Pool.Query(r.Context(), `
		SELECT id, user_id, sender_role, sender_id, message, image_url, is_read, created_at
		FROM support_messages
		WHERE user_id = $1
		ORDER BY created_at ASC
	`, targetUserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := make([]SupportMessage, 0)
	for rows.Next() {
		var m SupportMessage
		if err := rows.Scan(&m.ID, &m.UserID, &m.SenderRole, &m.SenderID, &m.Message, &m.ImageURL, &m.IsRead, &m.CreatedAt); err == nil {
			messages = append(messages, m)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":     user,
		"messages": messages,
	})
}

// AdminSendMessage sends a reply from Admin to a user.
func (h *SupportHandler) AdminSendMessage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID   string `json:"user_id"`
		AdminID  string `json:"admin_id"`
		Message  string `json:"message"`
		ImageURL string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.UserID = strings.TrimSpace(req.UserID)
	req.Message = strings.TrimSpace(req.Message)
	req.ImageURL = strings.TrimSpace(req.ImageURL)

	if req.UserID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}
	if req.Message == "" && req.ImageURL == "" {
		http.Error(w, "Message text or image is required", http.StatusBadRequest)
		return
	}

	var adminIDParam *string
	if strings.TrimSpace(req.AdminID) != "" {
		aid := strings.TrimSpace(req.AdminID)
		adminIDParam = &aid
	}

	var imageURLParam *string
	if req.ImageURL != "" {
		imageURLParam = &req.ImageURL
	}

	var m SupportMessage
	err := h.db.Pool.QueryRow(r.Context(), `
		INSERT INTO support_messages (user_id, sender_role, sender_id, message, image_url, is_read)
		VALUES ($1, 'ADMIN', $2, $3, $4, false)
		RETURNING id, user_id, sender_role, sender_id, message, image_url, is_read, created_at
	`, req.UserID, adminIDParam, req.Message, imageURLParam).Scan(
		&m.ID, &m.UserID, &m.SenderRole, &m.SenderID, &m.Message, &m.ImageURL, &m.IsRead, &m.CreatedAt,
	)

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save admin message: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}

// AdminToggleBlockUser blocks or unblocks a user from using the support chat.
func (h *SupportHandler) AdminToggleBlockUser(w http.ResponseWriter, r *http.Request) {
	targetUserID := chi.URLParam(r, "userId")
	if targetUserID == "" {
		http.Error(w, "userId param required", http.StatusBadRequest)
		return
	}

	var req struct {
		Blocked bool `json:"blocked"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	_, err := h.db.Pool.Exec(r.Context(), `
		UPDATE users 
		SET is_support_blocked = $1 
		WHERE id = $2
	`, req.Blocked, targetUserID)

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update block status: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"user_id":    targetUserID,
		"is_blocked": req.Blocked,
	})
}

// AdminGetUnreadCount returns total unread messages sent by users.
func (h *SupportHandler) AdminGetUnreadCount(w http.ResponseWriter, r *http.Request) {
	isSuper := IsSuperAdminRequest(r, h.db)
	var count int

	if isSuper {
		_ = h.db.Pool.QueryRow(r.Context(), `
			SELECT COUNT(*) 
			FROM support_messages sm
			JOIN users u ON sm.user_id = u.id
			WHERE sm.sender_role = 'USER' AND sm.is_read = false AND COALESCE(u.promo_code, '') != ''
		`).Scan(&count)
	} else {
		_ = h.db.Pool.QueryRow(r.Context(), `
			SELECT COUNT(*) 
			FROM support_messages sm
			JOIN users u ON sm.user_id = u.id
			WHERE sm.sender_role = 'USER' AND sm.is_read = false AND COALESCE(u.promo_code, '') = ''
		`).Scan(&count)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"unread": count})
}
