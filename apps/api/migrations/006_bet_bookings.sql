-- Migration 006: Bet Bookings (Bet Code sharing)
-- Stores shared/booked bet slips so users can share a code

BEGIN;

CREATE TABLE IF NOT EXISTS bet_bookings (
    code        VARCHAR(10) PRIMARY KEY,           -- e.g. M12AB34
    selections  JSONB       NOT NULL,              -- array of BetSelection JSON
    total_odds  NUMERIC(15, 4) NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bet_bookings_created_at ON bet_bookings(created_at);

COMMIT;
