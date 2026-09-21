-- Migration 012: Live market states for tracking stale odds and suspending markets independently

CREATE TABLE IF NOT EXISTS live_market_states (
    fixture_external_id TEXT REFERENCES fixtures(external_id) ON DELETE CASCADE,
    market_id INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, SUSPENDED, CLOSED
    odds_version INT NOT NULL DEFAULT 1,
    last_update_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    suspended_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    close_reason TEXT,
    PRIMARY KEY (fixture_external_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_live_market_states_status ON live_market_states(status);

-- Table for bets placement simulation and validation
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
