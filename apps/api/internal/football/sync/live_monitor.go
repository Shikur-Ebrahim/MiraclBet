package sync

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

func (s *Syncer) StartLiveMonitor(ctx context.Context) {
	log.Println("[monitor] Starting live market monitor (checks for stale odds & finished matches via JSONB)")
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
	// Suspend markets in JSON that haven't been updated in 2 minutes
	rows, err := s.db.Pool.Query(ctx, "SELECT external_id, advanced_odds FROM fixtures WHERE is_live = true AND advanced_odds IS NOT NULL")
	if err != nil {
		log.Printf("[monitor] error checking stale odds: %v", err)
		return
	}
	defer rows.Close()

	type updateJob struct {
		fixtureID string
		oddsJSON  []byte
	}
	var jobs []updateJob

	for rows.Next() {
		var fixID string
		var oddsJSON []byte
		if err := rows.Scan(&fixID, &oddsJSON); err != nil {
			continue
		}

		var ao AdvancedOdds
		if err := json.Unmarshal(oddsJSON, &ao); err != nil {
			continue
		}

		changed := false
		for i, m := range ao.Markets {
			if m.Status == "OPEN" && m.LastUpdateAt != "" {
				t, err := time.Parse(time.RFC3339, m.LastUpdateAt)
				if err == nil && time.Since(t) > 2*time.Minute {
					ao.Markets[i].Status = "SUSPENDED"
					changed = true
					log.Printf("[monitor] suspended stale market %d for fixture %s", m.ID, fixID)
				}
			}
		}

		if changed {
			newJSON, _ := json.Marshal(ao)
			jobs = append(jobs, updateJob{fixtureID: fixID, oddsJSON: newJSON})
		}
	}
	rows.Close()

	for _, j := range jobs {
		s.db.Pool.Exec(ctx, "UPDATE fixtures SET advanced_odds = $1, odds_updated_at = NOW() WHERE external_id = $2", j.oddsJSON, j.fixtureID)
	}
}

func (s *Syncer) closeFinishedMatches(ctx context.Context) {
	// Close markets in JSON for matches that are finished or cancelled
	rows, err := s.db.Pool.Query(ctx, "SELECT external_id, advanced_odds FROM fixtures WHERE status_short IN ('FT', 'AET', 'PEN', 'AWD', 'CANC', 'ABD') AND advanced_odds IS NOT NULL")
	if err != nil {
		log.Printf("[monitor] error closing finished matches: %v", err)
		return
	}
	defer rows.Close()

	type updateJob struct {
		fixtureID string
		oddsJSON  []byte
	}
	var jobs []updateJob

	for rows.Next() {
		var fixID string
		var oddsJSON []byte
		if err := rows.Scan(&fixID, &oddsJSON); err != nil {
			continue
		}

		var ao AdvancedOdds
		if err := json.Unmarshal(oddsJSON, &ao); err != nil {
			continue
		}

		changed := false
		for i, m := range ao.Markets {
			if m.Status != "CLOSED" {
				ao.Markets[i].Status = "CLOSED"
				changed = true
			}
		}

		if changed {
			log.Printf("[monitor] closed all markets for finished fixture %s", fixID)
			newJSON, _ := json.Marshal(ao)
			jobs = append(jobs, updateJob{fixtureID: fixID, oddsJSON: newJSON})
		}
	}
	rows.Close()

	for _, j := range jobs {
		s.db.Pool.Exec(ctx, "UPDATE fixtures SET advanced_odds = $1, odds_updated_at = NOW() WHERE external_id = $2", j.oddsJSON, j.fixtureID)
	}
}
