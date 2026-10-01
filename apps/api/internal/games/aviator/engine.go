package aviator

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GameStatus enum
type GameStatus string

const (
	StatusWaiting GameStatus = "waiting"
	StatusFlying  GameStatus = "flying"
	StatusCrashed GameStatus = "crashed"
)

// Engine runs the Aviator game loop and handles SSE broadcasts.
type Engine struct {
	db          *pgxpool.Pool
	mu          sync.RWMutex
	status      GameStatus
	multiplier  float64
	crashPoint  float64
	roundID     string
	countdown   int
	clients     map[chan []byte]bool
	history     []map[string]interface{}
}

func NewEngine(db *pgxpool.Pool) *Engine {
	e := &Engine{
		db:      db,
		clients: make(map[chan []byte]bool),
		status:  StatusWaiting,
		history: make([]map[string]interface{}, 0),
	}
	
	// Load initial history
	e.loadHistory()
	
	go e.runLoop()
	return e
}

func (e *Engine) loadHistory() {
	if e.db == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	rows, err := e.db.Query(ctx, `SELECT id, crash_at FROM aviator_rounds WHERE status = 'crashed' ORDER BY created_at DESC LIMIT 20`)
	if err != nil {
		log.Printf("[aviator] failed to load history: %v", err)
		return
	}
	defer rows.Close()
	
	for rows.Next() {
		var id string
		var crashAt float64
		if err := rows.Scan(&id, &crashAt); err == nil {
			e.history = append(e.history, map[string]interface{}{"id": id, "crash_at": crashAt})
		}
	}
}

func (e *Engine) runLoop() {
	for {
		e.startWaiting()
		e.startFlying()
	}
}

func (e *Engine) startWaiting() {
	e.mu.Lock()
	e.status = StatusWaiting
	e.roundID = uuid.New().String()
	e.multiplier = 1.00
	e.countdown = 5
	
	// Generate provably fair crash point
	seed := fmt.Sprintf("%s-%d", e.roundID, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(seed))
	hashStr := hex.EncodeToString(hash[:])
	
	// Convert first 8 bytes of hash to a float between 0 and 1
	h := binary.BigEndian.Uint64(hash[:8])
	r := float64(h) / float64(math.MaxUint64)
	
	// Math to heavily skew towards lower crashes, but allow rare huge crashes (99% RTP)
	c := 0.99 / (1 - r)
	e.crashPoint = math.Max(1.00, math.Floor(c*100)/100)
	
	// Create round in DB
	if e.db != nil {
		_, err := e.db.Exec(context.Background(), `
			INSERT INTO aviator_rounds (id, crash_at, hash, status, started_at) 
			VALUES ($1, $2, $3, 'waiting', NOW())
		`, e.roundID, e.crashPoint, hashStr)
		if err != nil {
			log.Printf("[aviator] failed to insert round: %v", err)
		}
	}
	e.mu.Unlock()

	// 5-second countdown loop
	for i := 5; i > 0; i-- {
		e.mu.Lock()
		e.countdown = i
		e.mu.Unlock()
		e.broadcast(map[string]interface{}{
			"event": "waiting",
			"countdown": i,
			"round_id": e.roundID,
		})
		time.Sleep(1 * time.Second)
	}
}

func (e *Engine) startFlying() {
	e.mu.Lock()
	e.status = StatusFlying
	
	if e.db != nil {
		e.db.Exec(context.Background(), `UPDATE aviator_rounds SET status = 'flying' WHERE id = $1`, e.roundID)
	}
	
	crashPoint := e.crashPoint
	e.mu.Unlock()

	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	
	// Start multiplying (increases by 0.5% every 100ms)
	m := 1.00
	for {
		<-ticker.C
		m = math.Floor((m + m*0.005) * 100) / 100
		
		if m >= crashPoint {
			break
		}
		
		e.mu.Lock()
		e.multiplier = m
		e.mu.Unlock()
		
		e.broadcast(map[string]interface{}{
			"event": "flying",
			"multiplier": m,
		})
	}

	// CRASHED
	e.mu.Lock()
	e.status = StatusCrashed
	e.multiplier = crashPoint
	
	if e.db != nil {
		e.db.Exec(context.Background(), `UPDATE aviator_rounds SET status = 'crashed', crashed_at = NOW() WHERE id = $1`, e.roundID)
		
		// Any bets not cashed out are lost (profit = -amount)
		e.db.Exec(context.Background(), `
			UPDATE aviator_bets 
			SET profit = -amount 
			WHERE round_id = $1 AND cashed_out_at IS NULL
		`, e.roundID)
	}
	
	// Prepend to history
	e.history = append([]map[string]interface{}{{"id": e.roundID, "crash_at": crashPoint}}, e.history...)
	if len(e.history) > 20 {
		e.history = e.history[:20]
	}
	
	e.mu.Unlock()

	e.broadcast(map[string]interface{}{
		"event": "crashed",
		"crash_at": crashPoint,
	})

	// Wait 4 seconds showing crashed screen before next round
	time.Sleep(4 * time.Second)
}

func (e *Engine) broadcast(data interface{}) {
	b, err := json.Marshal(data)
	if err != nil {
		return
	}
	
	e.mu.RLock()
	defer e.mu.RUnlock()
	for client := range e.clients {
		select {
		case client <- b:
		default:
			// Buffer full, drop client (they'll reconnect)
			delete(e.clients, client)
			close(client)
		}
	}
}

func (e *Engine) AddClient(ch chan []byte) {
	e.mu.Lock()
	e.clients[ch] = true
	
	// Send initial state
	st := e.status
	m := e.multiplier
	cd := e.countdown
	rid := e.roundID
	hist := e.history
	e.mu.Unlock()
	
	initial, _ := json.Marshal(map[string]interface{}{
		"event": "init",
		"status": st,
		"multiplier": m,
		"countdown": cd,
		"round_id": rid,
		"history": hist,
	})
	ch <- initial
}

func (e *Engine) RemoveClient(ch chan []byte) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, ok := e.clients[ch]; ok {
		delete(e.clients, ch)
		close(ch)
	}
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────

func (e *Engine) PlaceBet(ctx context.Context, userID string, amount float64) error {
	e.mu.RLock()
	status := e.status
	roundID := e.roundID
	e.mu.RUnlock()

	if status != StatusWaiting {
		return fmt.Errorf("round is not waiting for bets")
	}

	tx, err := e.db.Begin(ctx)
	if err != nil { return err }
	defer tx.Rollback(ctx)

	// Check & deduct balance
	var balance float64
	err = tx.QueryRow(ctx, `SELECT balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&balance)
	if err != nil { return err }
	
	if balance < amount {
		return fmt.Errorf("insufficient balance")
	}

	_, err = tx.Exec(ctx, `UPDATE users SET balance = balance - $1 WHERE id = $2`, amount, userID)
	if err != nil { return err }

	// Insert bet
	_, err = tx.Exec(ctx, `
		INSERT INTO aviator_bets (round_id, user_id, amount) 
		VALUES ($1, $2, $3)
	`, roundID, userID, amount)
	if err != nil { return err }

	return tx.Commit(ctx)
}

func (e *Engine) CashOut(ctx context.Context, userID string) (float64, float64, error) {
	e.mu.RLock()
	status := e.status
	roundID := e.roundID
	multiplier := e.multiplier
	e.mu.RUnlock()

	if status != StatusFlying {
		return 0, 0, fmt.Errorf("round is not in flight")
	}

	tx, err := e.db.Begin(ctx)
	if err != nil { return 0, 0, err }
	defer tx.Rollback(ctx)

	// Fetch active bet
	var betAmount float64
	var cashedOutAt *float64
	err = tx.QueryRow(ctx, `
		SELECT amount, cashed_out_at FROM aviator_bets 
		WHERE round_id = $1 AND user_id = $2 FOR UPDATE
	`, roundID, userID).Scan(&betAmount, &cashedOutAt)
	if err != nil {
		return 0, 0, fmt.Errorf("no active bet found")
	}
	if cashedOutAt != nil {
		return 0, 0, fmt.Errorf("already cashed out")
	}

	// Calculate winnings
	winAmount := math.Floor(betAmount * multiplier * 100) / 100
	profit := math.Floor((winAmount - betAmount) * 100) / 100

	// Update bet
	_, err = tx.Exec(ctx, `
		UPDATE aviator_bets SET cashed_out_at = $1, profit = $2 
		WHERE round_id = $3 AND user_id = $4
	`, multiplier, profit, roundID, userID)
	if err != nil { return 0, 0, err }

	// Credit balance
	_, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, winAmount, userID)
	if err != nil { return 0, 0, err }

	err = tx.Commit(ctx)
	return multiplier, winAmount, err
}
