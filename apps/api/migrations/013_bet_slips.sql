-- Migration 013: Proper betting schema for accumulator bets

BEGIN;

-- Drop old mockup table
DROP TABLE IF EXISTS bets CASCADE;

CREATE TABLE IF NOT EXISTS bet_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stake NUMERIC(15, 2) NOT NULL CHECK (stake > 0),
    total_odds NUMERIC(10, 2) NOT NULL,
    potential_payout NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, WON, LOST, CANCELLED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bet_slips_user_id ON bet_slips(user_id);

CREATE TABLE IF NOT EXISTS bet_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_slip_id UUID NOT NULL REFERENCES bet_slips(id) ON DELETE CASCADE,
    fixture_id TEXT NOT NULL,
    match_name TEXT NOT NULL,
    market_name TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    selection_name TEXT NOT NULL,
    odds NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' -- PENDING, WON, LOST, VOID
);

CREATE INDEX IF NOT EXISTS idx_bet_legs_slip_id ON bet_legs(bet_slip_id);

COMMIT;
