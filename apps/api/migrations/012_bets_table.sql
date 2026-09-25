-- Migration 012: Bets table for tracking user bets

CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_external_id TEXT NOT NULL REFERENCES fixtures(external_id) ON DELETE CASCADE,
    market_id INT NOT NULL,
    selection TEXT NOT NULL,
    odds DECIMAL(6,2) NOT NULL,
    odds_version INT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bets_fixture ON bets(fixture_external_id);
