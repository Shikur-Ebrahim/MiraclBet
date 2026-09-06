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
		log.Printf("[sync] Error fetching live odds: %v", err)
		return fmt.Errorf("provider error: %w", err)
	}
	log.Printf("[sync] Fetched %d live odds from provider", len(odds))
	
	if err := s.quota.Increment(ctx); err != nil {
		log.Printf("[sync] warning: failed to record quota usage: %v", err)
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
		log.Printf("[sync] Error fetching odds for date %s: %v", date.Format("2006-01-02"), err)
		return fmt.Errorf("provider error: %w", err)
	}
	log.Printf("[sync] Fetched %d prematch odds for date %s", len(odds), date.Format("2006-01-02"))
	
	if err := s.quota.Increment(ctx); err != nil {
		log.Printf("[sync] warning: failed to record quota usage: %v", err)
	}

	return s.saveOdds(ctx, odds)
}

func (s *Syncer) saveOdds(ctx context.Context, odds []provider.ProviderOdd) error {
	if len(odds) == 0 {
		return nil
	}

	query := `
		UPDATE fixtures 
		SET advanced_odds = $1::jsonb, odds_updated_at = NOW()
		WHERE external_id = $2
	`
	updated := 0

	for _, o := range odds {
		advOdds := AdvancedOdds{}
		
		for _, m := range o.Markets {
			var vals []OddValue
			for _, v := range m.Values {
				vals = append(vals, OddValue{Value: v.Value, Odd: v.Odd})
			}
			
			switch m.ID {
			case 1:
				advOdds.MatchWinner = vals
			case 5:
				advOdds.OverUnder = vals
			case 11:
				advOdds.BTTS = vals
			case 12:
				advOdds.DoubleChance = vals
			}
		}

		if advOdds.MatchWinner == nil && advOdds.OverUnder == nil && advOdds.BTTS == nil && advOdds.DoubleChance == nil {
			continue
		}

		jsonData, err := json.Marshal(advOdds)
		if err != nil {
			continue
		}

		res, err := s.db.Pool.Exec(ctx, query, string(jsonData), o.FixtureID)
		if err != nil {
			log.Printf("[sync] error saving odds for fixture %s: %v", o.FixtureID, err)
		} else if res.RowsAffected() > 0 {
			updated++
		}
	}

	log.Printf("[sync] Updated odds for %d fixtures", updated)
	return nil
}
