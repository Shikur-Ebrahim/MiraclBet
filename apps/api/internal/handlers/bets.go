package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/miraclbet/api/internal/database"
)

type BetsHandler struct {
	db *database.DB
}

func NewBetsHandler(db *database.DB) *BetsHandler {
	return &BetsHandler{db: db}
}

type PlaceBetSlipRequest struct {
	UserID      string         `json:"user_id"`
	Stake       float64        `json:"stake"`
	TotalOdds   float64        `json:"total_odds"`
	Selections  []BetSelection `json:"selections"`
	BookingCode string         `json:"booking_code"`
}

type PlaceBetSlipResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	SlipID  string `json:"slip_id,omitempty"`
}

type BetLegResult struct {
	ID            string  `json:"id"`
	FixtureID     string  `json:"fixture_id"`
	MatchName     string  `json:"match_name"`
	MarketName    string  `json:"market_name"`
	SelectionName string  `json:"selection_name"`
	Odds          float64 `json:"odds"`
	Status        string  `json:"status"`
	HomeLogo      string  `json:"homeLogo"`
	AwayLogo      string  `json:"awayLogo"`
	KickoffAt     string  `json:"kickoffAt"`
}

type BetSlipResult struct {
	ID              string         `json:"id"`
	Stake           float64        `json:"stake"`
	TotalOdds       float64        `json:"total_odds"`
	PotentialPayout float64        `json:"potential_payout"`
	Status          string         `json:"status"`
	CreatedAt       time.Time      `json:"created_at"`
	Legs            []BetLegResult `json:"legs"`
}

func (h *BetsHandler) PlaceBet(w http.ResponseWriter, r *http.Request) {
	var req PlaceBetSlipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.UserID == "" {
		h.respondError(w, http.StatusUnauthorized, "You must be logged in to place bets")
		return
	}
	if req.Stake <= 0 {
		h.respondError(w, http.StatusBadRequest, "Stake must be greater than 0")
		return
	}
	if len(req.Selections) == 0 {
		h.respondError(w, http.StatusBadRequest, "No selections provided")
		return
	}

	// Check user role FIRST — agents bypass balance + kickoff time checks
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
		log.Printf("ERROR: User not found in PlaceBet (balance query): %v", err); h.respondError(w, http.StatusNotFound, "User not found: " + err.Error())
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
			log.Printf("ERROR: Failed to update balance: %v", execErr); h.respondError(w, http.StatusInternalServerError, "Failed to update balance")
			return
		}
	}

	// 3. Create Bet Slip
	var slipID string
	potentialPayout := req.Stake * req.TotalOdds
	
	initialStatus := "PENDING"
	if isAutoWin {
		initialStatus = "WON"
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO bet_slips (user_id, stake, total_odds, potential_payout, status, is_auto_win)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, req.UserID, req.Stake, req.TotalOdds, potentialPayout, initialStatus, isAutoWin).Scan(&slipID)
	if err != nil {
		log.Printf("ERROR: Failed to create bet slip: %v", err); h.respondError(w, http.StatusInternalServerError, "Failed to create bet slip: " + err.Error())
		return
	}

	// 4. Create Bet Legs
	for _, sel := range req.Selections {
		_, err = tx.Exec(ctx, `
			INSERT INTO bet_legs (bet_slip_id, fixture_id, match_name, market_name, selection_id, selection_name, odds, home_logo, away_logo, kickoff_at, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, slipID, sel.FixtureID, sel.MatchName, sel.MarketName, sel.SelectionID, sel.SelectionName, sel.Odds, sel.HomeLogo, sel.AwayLogo, sel.KickoffAt, initialStatus)
		if err != nil {
			log.Printf("ERROR: Failed to save selections: %v", err); h.respondError(w, http.StatusInternalServerError, "Failed to save selections: " + err.Error())
			return
		}
	}

	// 5. If it's an instant auto-win, immediately credit the payout to the user
	if isAutoWin {
		if _, execErr := tx.Exec(ctx, "UPDATE users SET balance = balance + $1 WHERE id = $2", potentialPayout, req.UserID); execErr != nil {
			log.Printf("ERROR: Failed to credit auto-win payout: %v", execErr)
			h.respondError(w, http.StatusInternalServerError, "Failed to credit winnings")
			return
		}
		log.Printf("[auto-settle] INSTANT WIN: slip %s placed by %s won %.2f immediately", slipID, req.UserID, potentialPayout)
	}

	if err := tx.Commit(ctx); err != nil {
		h.respondError(w, http.StatusInternalServerError, "Transaction failed")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PlaceBetSlipResponse{
		Success: true,
		Message: "Bet placed successfully!",
		SlipID:  slipID,
	})
}

func (h *BetsHandler) ListMyBets(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "user_id required"})
		return
	}

	ctx := r.Context()
	rows, err := h.db.Pool.Query(ctx, `
		SELECT id, stake, total_odds, potential_payout, status, created_at
		FROM bet_slips
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch bets"})
		return
	}
	defer rows.Close()

	var slips []BetSlipResult
	for rows.Next() {
		var s BetSlipResult
		if err := rows.Scan(&s.ID, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt); err != nil {
			log.Printf("[bets] error scanning slip row: %v", err)
			continue
		}
		slips = append(slips, s)
	}
	if slips == nil {
		slips = []BetSlipResult{}
	}

	// Fetch legs for each slip — also JOIN fixtures for live status resolution
	for i, slip := range slips {
		legRows, err := h.db.Pool.Query(ctx, `
			SELECT
				bl.id, bl.fixture_id, bl.match_name, bl.market_name, bl.selection_name, bl.odds,
				CASE
					WHEN bl.status IN ('WON','LOST','VOID') THEN bl.status
					WHEN f.status_short IN ('FT','AET','PEN') THEN
						CASE bl.market_name
							WHEN 'Match Winner' THEN
								CASE
									WHEN bl.selection_name = 'Home Win' AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
									WHEN bl.selection_name = 'Away Win' AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
									WHEN bl.selection_name = 'Draw'     AND COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'WON'
									ELSE 'LOST'
								END
							WHEN 'Both Teams to Score' THEN
								CASE
									WHEN bl.selection_name = 'Yes' AND COALESCE(f.score_home,0) > 0 AND COALESCE(f.score_away,0) > 0 THEN 'WON'
									WHEN bl.selection_name = 'No'  AND (COALESCE(f.score_home,0) = 0 OR COALESCE(f.score_away,0) = 0) THEN 'WON'
									ELSE 'LOST'
								END
							WHEN 'Over 2.5 Goals' THEN
								CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) > 2 THEN 'WON' ELSE 'LOST' END
							WHEN 'Under 2.5 Goals' THEN
								CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) <= 2 THEN 'WON' ELSE 'LOST' END
							WHEN 'Draw No Bet' THEN
								CASE
									WHEN bl.selection_name = 'Home' AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
									WHEN bl.selection_name = 'Away' AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
									WHEN COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'VOID'
									ELSE 'LOST'
								END
							ELSE 'LOST'
						END
					WHEN f.status_short IN ('CANC','PSTP','ABD') THEN 'VOID'
					ELSE bl.status
				END as effective_status,
				COALESCE(bl.home_logo, ''), COALESCE(bl.away_logo, ''), COALESCE(bl.kickoff_at, '')
			FROM bet_legs bl
			LEFT JOIN fixtures f ON f.external_id = bl.fixture_id
			WHERE bl.bet_slip_id = $1
		`, slip.ID)
		if err != nil {
			continue
		}
		var legs []BetLegResult
		for legRows.Next() {
			var l BetLegResult
			if err := legRows.Scan(&l.ID, &l.FixtureID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status, &l.HomeLogo, &l.AwayLogo, &l.KickoffAt); err != nil {
				continue
			}
			legs = append(legs, l)
		}
		legRows.Close()
		if legs == nil {
			legs = []BetLegResult{}
		}
		slips[i].Legs = legs
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slips)
}

func (h *BetsHandler) GetBet(w http.ResponseWriter, r *http.Request) {
	slipID := chi.URLParam(r, "id")
	userID := r.URL.Query().Get("user_id")

	ctx := r.Context()
	var s BetSlipResult
	err := h.db.Pool.QueryRow(ctx, `
		SELECT id, stake, total_odds, potential_payout, status, created_at
		FROM bet_slips WHERE id = $1 AND user_id = $2
	`, slipID, userID).Scan(&s.ID, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bet not found"})
		return
	}

	legRows, _ := h.db.Pool.Query(ctx, `
		SELECT id, fixture_id, match_name, market_name, selection_name, odds, status, COALESCE(home_logo, ''), COALESCE(away_logo, ''), COALESCE(kickoff_at, '')
		FROM bet_legs WHERE bet_slip_id = $1
	`, s.ID)
	defer legRows.Close()
	var legs []BetLegResult
	for legRows.Next() {
		var l BetLegResult
		legRows.Scan(&l.ID, &l.FixtureID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status, &l.HomeLogo, &l.AwayLogo, &l.KickoffAt)
		legs = append(legs, l)
	}
	if legs == nil {
		legs = []BetLegResult{}
	}
	s.Legs = legs

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func (h *BetsHandler) respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(PlaceBetSlipResponse{
		Success: false,
		Message: message,
	})
}

// CheckBet is a PUBLIC endpoint — no auth needed.
// GET /api/v1/bets/check?code=TICKET-XXXXXXXX  or  ?code=MXXXXX (admin booking code)
// The TICKET- prefix comes from the barcode shown in Bet History.
// Also accepts partial slip IDs and booking codes.
func (h *BetsHandler) CheckBet(w http.ResponseWriter, r *http.Request) {
	raw := r.URL.Query().Get("code")
	if raw == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "code is required"})
		return
	}

	ctx := r.Context()

	// Normalise: strip "TICKET-" prefix (shown in bet history barcode)
	code := raw
	if len(code) > 7 && code[:7] == "TICKET-" {
		code = code[7:]
	}

	var s BetSlipResult

	// 1. Try: exact slip ID match (UUID or partial — TICKET-70D8B690-0F5 → 70d8b690…)
	//    The barcode shows slip.id.slice(0,12).toUpperCase() so we do ILIKE prefix search
	err := h.db.Pool.QueryRow(ctx, `
		SELECT id, stake, total_odds, potential_payout, status, created_at
		FROM bet_slips
		WHERE UPPER(REPLACE(id::text, '-', '')) LIKE UPPER(REPLACE($1, '-', '')) || '%'
		   OR id::text ILIKE $1 || '%'
		ORDER BY created_at DESC
		LIMIT 1
	`, code).Scan(&s.ID, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt)

	// 2. If not found, try booking_code column
	if err != nil {
		err = h.db.Pool.QueryRow(ctx, `
			SELECT id, stake, total_odds, potential_payout, status, created_at
			FROM bet_slips
			WHERE booking_code = $1
			ORDER BY created_at DESC
			LIMIT 1
		`, code).Scan(&s.ID, &s.Stake, &s.TotalOdds, &s.PotentialPayout, &s.Status, &s.CreatedAt)
	}

	if err != nil {
		// Also try: admin manual booking code (bet_bookings.code = code)
		// In this case, show the booking template itself rather than a user slip
		var selJSON string
		var totalOdds float64
		var createdAt string
		err2 := h.db.Pool.QueryRow(ctx, `
			SELECT selections, total_odds, created_at FROM bet_bookings WHERE code = $1
		`, code).Scan(&selJSON, &totalOdds, &createdAt)
		if err2 != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Ticket not found. Please check the code and try again."})
			return
		}
		// Return admin booking as a pseudo-slip
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":               code,
			"code":             code,
			"stake":            0,
			"total_odds":       totalOdds,
			"potential_payout": 0,
			"status":           "BOOKING",
			"created_at":       createdAt,
			"is_booking":       true,
			"selections_raw":   selJSON,
		})
		return
	}

	// Fetch legs with live status evaluation
	legRows, err := h.db.Pool.Query(ctx, `
		SELECT
			bl.id, bl.fixture_id, bl.match_name, bl.market_name, bl.selection_name, bl.odds,
			CASE
				WHEN bl.status IN ('WON','LOST','VOID') THEN bl.status
				WHEN f.status_short IN ('FT','AET','PEN') THEN
					CASE bl.market_name
						WHEN 'Match Winner' THEN
							CASE
								WHEN bl.selection_name = 'Home Win' AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
								WHEN bl.selection_name = 'Away Win' AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
								WHEN bl.selection_name = 'Draw'     AND COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'WON'
								ELSE 'LOST'
							END
						WHEN 'Both Teams to Score' THEN
							CASE
								WHEN bl.selection_name = 'Yes' AND COALESCE(f.score_home,0) > 0 AND COALESCE(f.score_away,0) > 0 THEN 'WON'
								WHEN bl.selection_name = 'No'  AND (COALESCE(f.score_home,0) = 0 OR COALESCE(f.score_away,0) = 0) THEN 'WON'
								ELSE 'LOST'
							END
						WHEN 'Over 2.5 Goals' THEN
							CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) > 2 THEN 'WON' ELSE 'LOST' END
						WHEN 'Under 2.5 Goals' THEN
							CASE WHEN COALESCE(f.score_home,0) + COALESCE(f.score_away,0) <= 2 THEN 'WON' ELSE 'LOST' END
						WHEN 'Draw No Bet' THEN
							CASE
								WHEN bl.selection_name = 'Home' AND COALESCE(f.score_home,0) > COALESCE(f.score_away,0) THEN 'WON'
								WHEN bl.selection_name = 'Away' AND COALESCE(f.score_away,0) > COALESCE(f.score_home,0) THEN 'WON'
								WHEN COALESCE(f.score_home,0) = COALESCE(f.score_away,0) THEN 'VOID'
								ELSE 'LOST'
							END
						ELSE 'LOST'
					END
				WHEN f.status_short IN ('CANC','PSTP','ABD') THEN 'VOID'
				ELSE bl.status
			END as effective_status,
			COALESCE(bl.home_logo, ''), COALESCE(bl.away_logo, ''), COALESCE(bl.kickoff_at, '')
		FROM bet_legs bl
		LEFT JOIN fixtures f ON f.external_id = bl.fixture_id
		WHERE bl.bet_slip_id = $1
	`, s.ID)
	if err == nil {
		defer legRows.Close()
		var legs []BetLegResult
		for legRows.Next() {
			var l BetLegResult
			legRows.Scan(&l.ID, &l.FixtureID, &l.MatchName, &l.MarketName, &l.SelectionName, &l.Odds, &l.Status, &l.HomeLogo, &l.AwayLogo, &l.KickoffAt)
			legs = append(legs, l)
		}
		if legs == nil {
			legs = []BetLegResult{}
		}
		s.Legs = legs
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

