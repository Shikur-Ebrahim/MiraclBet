package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/miraclbet/api/internal/football/provider"
)

// MarketData holds one betting market (e.g. "Match Winner") with all its values
type MarketData struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	Status      string     `json:"status"`       // OPEN, SUSPENDED, CLOSED
	OddsVersion int        `json:"odds_version"`
	Values      []OddValue `json:"values"`
}

// OddValue is a single selection within a market
type OddValue struct {
	Value string `json:"value"`
	Odd   string `json:"odd"`
}

// AdvancedOdds holds ALL markets returned by the API for a fixture
type AdvancedOdds struct {
	Markets []MarketData `json:"markets"`
}

func (s *Syncer) SyncLiveOdds(ctx context.Context) error {
	ok, err := s.quota.CanRequest(ctx)
	if err != nil || !ok {
		return fmt.Errorf("quota limit reached or error: %v", err)
	}
	odds, err := s.provider.GetLiveOdds(ctx)
	if err != nil {
		log.Printf("[odds] ERROR fetching live odds: %v", err)
		return fmt.Errorf("provider error: %w", err)
	}
	log.Printf("[odds] Fetched %d live odds entries from API", len(odds))
	if err := s.quota.Increment(ctx); err != nil {
		log.Printf("[odds] warning: failed to record quota usage: %v", err)
	}
	return s.saveOdds(ctx, odds)
}

func (s *Syncer) SyncOddsByDate(ctx context.Context, date time.Time) error {
	ok, err := s.quota.CanRequest(ctx)
	if err != nil || !ok {
		return fmt.Errorf("quota limit reached or error: %v", err)
	}
	odds, err := s.provider.GetOddsByDate(ctx, date)
	if err != nil {
		log.Printf("[odds] ERROR fetching odds for date %s: %v", date.Format("2006-01-02"), err)
		return fmt.Errorf("provider error: %w", err)
	}
	log.Printf("[odds] Fetched %d prematch odds entries for date %s", len(odds), date.Format("2006-01-02"))
	if err := s.quota.Increment(ctx); err != nil {
		log.Printf("[odds] warning: failed to record quota usage: %v", err)
	}
	return s.saveOdds(ctx, odds)
}

func (s *Syncer) saveOdds(ctx context.Context, odds []provider.ProviderOdd) error {
	if len(odds) == 0 {
		log.Printf("[odds] No odds data received, skipping save")
		return nil
	}
	log.Printf("[odds] Saving odds for %d fixtures...", len(odds))

	query := `
		UPDATE fixtures
		SET advanced_odds = $1, odds_updated_at = NOW()
		WHERE external_id = $2
	`
	updated, skipped, errCount := 0, 0, 0

	for _, o := range odds {
		var allMarkets []MarketData
		for _, m := range o.Markets {
			var vals []OddValue
			for _, v := range m.Values {
				vals = append(vals, OddValue{Value: v.Value, Odd: v.Odd})
			}
			if len(vals) > 0 {
				// Upsert state tracking for this market
				var newVersion int
				stateQuery := `
					INSERT INTO live_market_states (fixture_external_id, market_id, status, odds_version, last_update_at)
					VALUES ($1, $2, 'OPEN', 1, NOW())
					ON CONFLICT (fixture_external_id, market_id) DO UPDATE SET
						odds_version = live_market_states.odds_version + 1,
						status = 'OPEN',
						last_update_at = NOW()
					RETURNING odds_version
				`
				err := s.db.Pool.QueryRow(ctx, stateQuery, o.FixtureID, m.ID).Scan(&newVersion)
				if err != nil {
					// Fallback if migration hasn't run yet or other DB error
					newVersion = 1
				}

				allMarkets = append(allMarkets, MarketData{
					ID:          m.ID,
					Name:        m.Name,
					Status:      "OPEN",
					OddsVersion: newVersion,
					Values:      vals,
				})
			}
		}

		if len(allMarkets) == 0 {
			skipped++
			continue
		}

		jsonBytes, err := json.Marshal(AdvancedOdds{Markets: allMarkets})
		if err != nil {
			log.Printf("[odds] ERROR marshalling fixture %s: %v", o.FixtureID, err)
			errCount++
			continue
		}

		res, err := s.db.Pool.Exec(ctx, query, jsonBytes, o.FixtureID)
		if err != nil {
			log.Printf("[odds] DB ERROR fixture %s: %v", o.FixtureID, err)
			errCount++
		} else if res.RowsAffected() > 0 {
			updated++
		} else {
			log.Printf("[odds] WARNING: fixture %s not found in DB (no rows matched)", o.FixtureID)
		}
	}

	log.Printf("[odds] DONE — Saved: %d, Skipped: %d, Errors: %d, Total: %d", updated, skipped, errCount, len(odds))

	// Auto-cleanup
	cleanupQuery := `
		DELETE FROM fixtures
		WHERE (
			advanced_odds IS NULL
			OR advanced_odds = '{}'::jsonb
			OR jsonb_array_length(COALESCE(advanced_odds->'markets', '[]'::jsonb)) = 0
		)
		AND created_at < NOW() - INTERVAL '30 minutes'
	`
	cleanRes, cleanErr := s.db.Pool.Exec(ctx, cleanupQuery)
	if cleanErr != nil {
		log.Printf("[odds] cleanup error: %v", cleanErr)
	} else if cleanRes.RowsAffected() > 0 {
		log.Printf("[odds] cleanup: removed %d fixtures with no odds", cleanRes.RowsAffected())
	}

	return nil
}

