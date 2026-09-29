import re

with open(r'apps\api\internal\handlers\bets.go', 'r', encoding='utf-8') as f:
    content = f.read()

old = r'''	// Validate matches haven't started (skip for admin auto-win bets)
	isAutoWin := false
	if req.BookingCode != "" {
		h.db.Pool.QueryRow(r.Context(), `SELECT COALESCE(auto_win, false) FROM bet_bookings WHERE code = $1`, req.BookingCode).Scan(&isAutoWin)
	}

	if !isAutoWin {
		for _, sel := range req.Selections {
			if sel.KickoffAt != "" {
				if kickoff, err := time.Parse(time.RFC3339, sel.KickoffAt); err == nil {
					if time.Now().After(kickoff) {
						h.respondError(w, http.StatusBadRequest, "Match '"+sel.MatchName+"' has already started")
						return
					}
				}
			}
		}
	}

	ctx := r.Context()
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	defer tx.Rollback(ctx)

	// 1. Check user balance with a row-level lock
	var currentBalance float64
	var role string
	err = tx.QueryRow(ctx,
		"SELECT COALESCE(balance, 0), role::text FROM users WHERE id = $1 FOR UPDATE",
		req.UserID,
	).Scan(&currentBalance, &role)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "User not found")
		return
	}

	if role != "AGENT" && currentBalance < req.Stake {
		h.respondError(w, http.StatusBadRequest, "Insufficient balance")
		return
	}

	// 2. Deduct balance
	if role != "AGENT" {
		_, err = tx.Exec(ctx,
			"UPDATE users SET balance = balance - $1 WHERE id = $2",
			req.Stake, req.UserID,
		)
	}
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to update balance")
		return
	}'''

new = '''	// Check user role FIRST — agents bypass balance + kickoff time checks
	var userRolePre string
	h.db.Pool.QueryRow(r.Context(), "SELECT role::text FROM users WHERE id = $1", req.UserID).Scan(&userRolePre)
	isAgent := userRolePre == "AGENT"

	// Validate matches haven't started (skip for auto-win bets AND agents)
	isAutoWin := false
	if req.BookingCode != "" {
		h.db.Pool.QueryRow(r.Context(), `SELECT COALESCE(auto_win, false) FROM bet_bookings WHERE code = $1`, req.BookingCode).Scan(&isAutoWin)
	}

	if !isAutoWin && !isAgent {
		for _, sel := range req.Selections {
			if sel.KickoffAt != "" {
				if kickoff, err := time.Parse(time.RFC3339, sel.KickoffAt); err == nil {
					if time.Now().After(kickoff) {
						h.respondError(w, http.StatusBadRequest, "Match '"+sel.MatchName+"' has already started")
						return
					}
				}
			}
		}
	}

	ctx := r.Context()
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	defer tx.Rollback(ctx)

	// 1. Lock user row and get balance (agents skip balance check — they collect cash in person)
	var currentBalance float64
	err = tx.QueryRow(ctx,
		"SELECT COALESCE(balance, 0) FROM users WHERE id = $1 FOR UPDATE",
		req.UserID,
	).Scan(&currentBalance)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "User not found")
		return
	}

	if !isAgent && currentBalance < req.Stake {
		h.respondError(w, http.StatusBadRequest, "Insufficient balance")
		return
	}

	// 2. Deduct balance (agents do NOT deduct — they collect physical cash)
	if !isAgent {
		if _, execErr := tx.Exec(ctx,
			"UPDATE users SET balance = balance - $1 WHERE id = $2",
			req.Stake, req.UserID,
		); execErr != nil {
			h.respondError(w, http.StatusInternalServerError, "Failed to update balance")
			return
		}
	}'''

if old in content:
    content = content.replace(old, new)
    with open(r'apps\api\internal\handlers\bets.go', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: PlaceBet handler updated")
else:
    print("ERROR: old block not found - check file manually")
    # Show what we have around line 78
    lines = content.split('\n')
    for i, line in enumerate(lines[75:100], start=76):
        print(f"{i}: {line}")
