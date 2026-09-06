package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/miraclbet/api/internal/football/provider"
)

type AdvancedOdds struct {
	MatchWinner  []OddValue `json:"match_winner,omitempty"`
	OverUnder    []OddValue `json:"over_under,omitempty"`
	BTTS         []OddValue `json:"btts,omitempty"`
	DoubleChance []OddValue `json:"double_chance,omitempty"`
}

type OddValue struct {
	Value string `json:"value"`
	Odd   string `json:"odd"`
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

	// CRITICAL FIX: pgx v5 requires []byte for JSONB columns — NOT string.
	// Passing string causes a silent type mismatch that saves nothing.
	query := `
		UPDATE fixtures
		SET advanced_odds = $1, odds_updated_at = NOW()
		WHERE external_id = $2
	`

	updated := 0
	skipped := 0
	errCount := 0

	for _, o := range odds {
		advOdds := AdvancedOdds{}

		for _, m := range o.Markets {
			var vals []OddValue
			for _, v := range m.Values {
				vals = append(vals, OddValue{Value: v.Value, Odd: v.Odd})
			}
			// API-Sports v3 market IDs:
			// 1  = Match Winner (1X2)
			// 5  = Goals Over/Under
			// 8  = Both Teams To Score (BTTS)  ← correct ID (NOT 11)
			// 12 = Double Chance
			switch m.ID {
			case 1:
				advOdds.MatchWinner = vals
			case 5:
				advOdds.OverUnder = vals
			case 8:
				advOdds.BTTS = vals
			case 12:
				advOdds.DoubleChance = vals
			}
		}

		if advOdds.MatchWinner == nil && advOdds.OverUnder == nil && advOdds.BTTS == nil && advOdds.DoubleChance == nil {
			skipped++
			continue
		}

		// Pass as []byte — pgx v5 maps this directly to JSONB
		jsonBytes, err := json.Marshal(advOdds)
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

	log.Printf("[odds] RESULT — Saved: %d, Skipped: %d, Errors: %d, Total: %d",
		updated, skipped, errCount, len(odds))
	return nil
}
