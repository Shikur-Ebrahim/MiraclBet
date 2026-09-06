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
	ID     int        `json:"id"`
	Name   string     `json:"name"`
	Values []OddValue `json:"values"`
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
		// Store ALL markets from the API — not just 4
		var allMarkets []MarketData
		for _, m := range o.Markets {
			var vals []OddValue
			for _, v := range m.Values {
				vals = append(vals, OddValue{Value: v.Value, Odd: v.Odd})
			}
			if len(vals) > 0 {
				allMarkets = append(allMarkets, MarketData{ID: m.ID, Name: m.Name, Values: vals})
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

		// Pass as []byte — pgx v5 maps this directly to JSONB
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
	return nil
}
