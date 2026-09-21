package sync

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

func (s *Syncer) StartLiveMonitor(ctx context.Context) {
	log.Println("[monitor] Starting live market monitor (checks for stale odds & finished matches)")
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.checkStaleOdds(ctx)
			s.closeFinishedMatches(ctx)
		}
	}
}

func (s *Syncer) checkStaleOdds(ctx context.Context) {
	// Suspend markets that haven't been updated in 2 minutes
	suspendQuery := `
		UPDATE live_market_states
		SET status = 'SUSPENDED', suspended_at = NOW()
		WHERE status = 'OPEN' 
		  AND last_update_at < NOW() - INTERVAL '2 minutes'
		RETURNING fixture_external_id, market_id, status, odds_version
	`
	rows, err := s.db.Pool.Query(ctx, suspendQuery)
	if err != nil {
		log.Printf("[monitor] error checking stale odds: %v", err)
		return
	}
	defer rows.Close()

	updatedFixtures := make(map[string]bool)

	for rows.Next() {
		var fixID string
		var mktID int
		var status string
		var version int
		if err := rows.Scan(&fixID, &mktID, &status, &version); err == nil {
			log.Printf("[monitor] suspended stale market %d for fixture %s", mktID, fixID)
			updatedFixtures[fixID] = true
		}
	}

	// For any fixture that had markets suspended, rebuild its JSONB
	for fixID := range updatedFixtures {
		s.rebuildFixtureOddsJSON(ctx, fixID)
	}
}

func (s *Syncer) closeFinishedMatches(ctx context.Context) {
	// Close markets for matches that are FT, AET, PEN, or no longer marked is_live
	closeQuery := `
		UPDATE live_market_states lms
		SET status = 'CLOSED', closed_at = NOW(), close_reason = 'MATCH_FINISHED'
		FROM fixtures f
		WHERE lms.fixture_external_id = f.external_id
		  AND lms.status != 'CLOSED'
		  AND (f.is_live = false OR f.status_short IN ('FT', 'AET', 'PEN'))
		RETURNING lms.fixture_external_id, lms.market_id
	`
	rows, err := s.db.Pool.Query(ctx, closeQuery)
	if err != nil {
		log.Printf("[monitor] error closing finished matches: %v", err)
		return
	}
	defer rows.Close()

	updatedFixtures := make(map[string]bool)
	for rows.Next() {
		var fixID string
		var mktID int
		if err := rows.Scan(&fixID, &mktID); err == nil {
			updatedFixtures[fixID] = true
		}
	}

	for fixID := range updatedFixtures {
		log.Printf("[monitor] closed all markets for finished fixture %s", fixID)
		s.rebuildFixtureOddsJSON(ctx, fixID)
	}
}

// rebuildFixtureOddsJSON reconstructs the advanced_odds JSONB after state changes
func (s *Syncer) rebuildFixtureOddsJSON(ctx context.Context, fixtureID string) {
	// Get current JSON
	var oddsJSON []byte
	err := s.db.Pool.QueryRow(ctx, "SELECT advanced_odds FROM fixtures WHERE external_id = $1", fixtureID).Scan(&oddsJSON)
	if err != nil {
		return
	}

	var ao AdvancedOdds
	if err := json.Unmarshal(oddsJSON, &ao); err != nil {
		return
	}

	// Fetch new states
	rows, err := s.db.Pool.Query(ctx, "SELECT market_id, status, odds_version FROM live_market_states WHERE fixture_external_id = $1", fixtureID)
	if err != nil {
		return
	}
	defer rows.Close()

	states := make(map[int]struct {
		Status  string
		Version int
	})

	for rows.Next() {
		var mktID int
		var st string
		var ver int
		if err := rows.Scan(&mktID, &st, &ver); err == nil {
			states[mktID] = struct {
				Status  string
				Version int
			}{st, ver}
		}
	}

	// Apply states to markets
	for i := range ao.Markets {
		m := &ao.Markets[i]
		if state, ok := states[m.ID]; ok {
			m.Status = state.Status
			m.OddsVersion = state.Version
		}
	}

	// Save back to fixtures
	newJSON, err := json.Marshal(ao)
	if err == nil {
		s.db.Pool.Exec(ctx, "UPDATE fixtures SET advanced_odds = $1, odds_updated_at = NOW() WHERE external_id = $2", newJSON, fixtureID)
	}
}
