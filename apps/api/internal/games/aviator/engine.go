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

type GameStatus string

const (
	StatusWaiting GameStatus = "waiting"
	StatusFlying  GameStatus = "flying"
	StatusCrashed GameStatus = "crashed"
)

// Engine runs the Aviator game loop and handles SSE broadcasts.
// IMPORTANT: stateMu and clientsMu are SEPARATE mutexes.
// Never call broadcast() while holding stateMu — deadlock!
type Engine struct {
	db *pgxpool.Pool

	// Game state — protected by stateMu
	stateMu    sync.RWMutex
	status     GameStatus
	multiplier float64
	crashPoint float64
	roundID    string
	countdown  int
	history    []map[string]interface{}

	// SSE clients — protected by clientsMu (completely separate from stateMu)
	clientsMu sync.Mutex
	clients   map[chan []byte]bool
}

func NewEngine(db *pgxpool.Pool) *Engine {
	e := &Engine{
		db:      db,
		clients: make(map[chan []byte]bool),
		status:  StatusWaiting,
		history: make([]map[string]interface{}, 0),
	}
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
		e.doWaiting()
		e.doFlying()
	}
}

// doWaiting runs the 5-second countdown phase.
func (e *Engine) doWaiting() {
	// Generate round
	roundID := uuid.New().String()
	seed := fmt.Sprintf("%s-%d", roundID, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(seed))
	hashStr := hex.EncodeToString(hash[:])
	h := binary.BigEndian.Uint64(hash[:8])
	r := float64(h) / float64(math.MaxUint64)
	crashPoint := math.Max(1.01, math.Floor(0.99/(1-r)*100)/100)

	// Update state
	e.stateMu.Lock()
	e.status = StatusWaiting
	e.roundID = roundID
	e.multiplier = 1.00
	e.crashPoint = crashPoint
	e.countdown = 5
	e.stateMu.Unlock()

	// Insert into DB (outside of stateMu lock)
	if e.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_, err := e.db.Exec(ctx,
			`INSERT INTO aviator_rounds (id, crash_at, hash, status, started_at) VALUES ($1, $2, $3, 'waiting', NOW())`,
			roundID, crashPoint, hashStr)
		cancel()
		if err != nil {
			log.Printf("[aviator] DB insert round error: %v", err)
		}
	}

	// 5-second countdown — broadcast each tick OUTSIDE any stateMu lock
	for i := 5; i >= 1; i-- {
		e.stateMu.Lock()
		e.countdown = i
		e.stateMu.Unlock()

		// broadcast is called with NO locks held
		e.broadcast(map[string]interface{}{
			"event":     "waiting",
			"countdown": i,
			"round_id":  roundID,
		})
		time.Sleep(1 * time.Second)
	}
}

// doFlying runs the multiplier increment phase until crash.
func (e *Engine) doFlying() {
	e.stateMu.Lock()
	e.status = StatusFlying
	roundID := e.roundID
	crashPoint := e.crashPoint
	e.stateMu.Unlock()

	// Update DB outside lock
	if e.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		e.db.Exec(ctx, `UPDATE aviator_rounds SET status = 'flying' WHERE id = $1`, roundID)
		cancel()
	}

	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	m := 1.00
	for range ticker.C {
		m = math.Floor((m+m*0.005)*100) / 100

		if m >= crashPoint {
			break
		}

		// Update state
		e.stateMu.Lock()
		e.multiplier = m
		e.stateMu.Unlock()

		// Broadcast OUTSIDE stateMu lock
		e.broadcast(map[string]interface{}{
			"event":      "flying",
			"multiplier": m,
		})
	}

	// CRASHED — update state first, then DB, then broadcast
	e.stateMu.Lock()
	e.status = StatusCrashed
	e.multiplier = crashPoint
	e.history = append([]map[string]interface{}{{"id": roundID, "crash_at": crashPoint}}, e.history...)
	if len(e.history) > 20 {
		e.history = e.history[:20]
	}
	e.stateMu.Unlock()

	// DB update OUTSIDE stateMu lock
	if e.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		e.db.Exec(ctx, `UPDATE aviator_rounds SET status = 'crashed', crashed_at = NOW() WHERE id = $1`, roundID)
		e.db.Exec(ctx, `UPDATE aviator_bets SET profit = -amount WHERE round_id = $1 AND cashed_out_at IS NULL`, roundID)
		cancel()
	}

	// Broadcast crash OUTSIDE stateMu lock
	e.broadcast(map[string]interface{}{
		"event":    "crashed",
		"crash_at": crashPoint,
	})

	// 4-second crash display before next round
	time.Sleep(4 * time.Second)
}

// broadcast sends to all SSE clients using its own separate mutex.
// MUST be called with NO stateMu lock held.
func (e *Engine) broadcast(data interface{}) {
	b, err := json.Marshal(data)
	if err != nil {
		return
	}

	e.clientsMu.Lock()
	defer e.clientsMu.Unlock()
	for client := range e.clients {
		select {
		case client <- b:
		default:
			// Slow client — close and remove
			delete(e.clients, client)
			close(client)
		}
	}
}

// AddClient registers a new SSE client and sends the current game state.
func (e *Engine) AddClient(ch chan []byte) {
	// Read current state
	e.stateMu.RLock()
	st := e.status
	m := e.multiplier
	cd := e.countdown
	rid := e.roundID
	hist := e.history
	e.stateMu.RUnlock()

	// Register client
	e.clientsMu.Lock()
	e.clients[ch] = true
	e.clientsMu.Unlock()

	// Send init message
	initial, _ := json.Marshal(map[string]interface{}{
		"event":      "init",
		"status":     st,
		"multiplier": m,
		"countdown":  cd,
		"round_id":   rid,
		"history":    hist,
	})
	// Non-blocking send
	select {
	case ch <- initial:
	default:
	}
}

// RemoveClient unregisters a client.
func (e *Engine) RemoveClient(ch chan []byte) {
	e.clientsMu.Lock()
	defer e.clientsMu.Unlock()
	if _, ok := e.clients[ch]; ok {
		delete(e.clients, ch)
		close(ch)
	}
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

func (e *Engine) PlaceBet(ctx context.Context, userID string, amount float64) error {
	e.stateMu.RLock()
	status := e.status
	roundID := e.roundID
	e.stateMu.RUnlock()

	if status != StatusWaiting {
		return fmt.Errorf("round is not accepting bets right now")
	}

	tx, err := e.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var balance float64
	err = tx.QueryRow(ctx, `SELECT balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&balance)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if balance < amount {
		return fmt.Errorf("insufficient balance (have %.2f, need %.2f)", balance, amount)
	}

	_, err = tx.Exec(ctx, `UPDATE users SET balance = balance - $1 WHERE id = $2`, amount, userID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `INSERT INTO aviator_bets (round_id, user_id, amount) VALUES ($1, $2, $3)`, roundID, userID, amount)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (e *Engine) CashOut(ctx context.Context, userID string) (float64, float64, error) {
	e.stateMu.RLock()
	status := e.status
	roundID := e.roundID
	multiplier := e.multiplier
	e.stateMu.RUnlock()

	if status != StatusFlying {
		return 0, 0, fmt.Errorf("plane is not in flight")
	}

	tx, err := e.db.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	var betAmount float64
	var cashedOutAt *float64
	err = tx.QueryRow(ctx,
		`SELECT amount, cashed_out_at FROM aviator_bets WHERE round_id = $1 AND user_id = $2 FOR UPDATE`,
		roundID, userID).Scan(&betAmount, &cashedOutAt)
	if err != nil {
		return 0, 0, fmt.Errorf("no active bet found for this round")
	}
	if cashedOutAt != nil {
		return 0, 0, fmt.Errorf("already cashed out at %.2fx", *cashedOutAt)
	}

	winAmount := math.Floor(betAmount*multiplier*100) / 100
	profit := math.Floor((winAmount-betAmount)*100) / 100

	_, err = tx.Exec(ctx,
		`UPDATE aviator_bets SET cashed_out_at = $1, profit = $2 WHERE round_id = $3 AND user_id = $4`,
		multiplier, profit, roundID, userID)
	if err != nil {
		return 0, 0, err
	}

	_, err = tx.Exec(ctx, `UPDATE users SET balance = balance + $1 WHERE id = $2`, winAmount, userID)
	if err != nil {
		return 0, 0, err
	}

	err = tx.Commit(ctx)
	return multiplier, winAmount, err
}
