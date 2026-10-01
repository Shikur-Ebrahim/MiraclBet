-- Migration 002: Aviator Game Schema

BEGIN;

-- ─── AVIATOR ROUNDS ──────────────────────────────────────────────────────────
CREATE TYPE aviator_status AS ENUM ('waiting', 'flying', 'crashed');

CREATE TABLE IF NOT EXISTS aviator_rounds (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crash_at    NUMERIC(10,2) NOT NULL,
    hash        TEXT NOT NULL,
    status      aviator_status NOT NULL DEFAULT 'waiting',
    started_at  TIMESTAMPTZ,
    crashed_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aviator_rounds_status ON aviator_rounds(status);
CREATE INDEX IF NOT EXISTS idx_aviator_rounds_created_at ON aviator_rounds(created_at DESC);

-- ─── AVIATOR BETS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aviator_bets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id        UUID NOT NULL REFERENCES aviator_rounds(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    cashed_out_at   NUMERIC(10,2),
    profit          NUMERIC(12,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aviator_bets_round_id ON aviator_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_aviator_bets_user_id ON aviator_bets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aviator_bets_round_user ON aviator_bets(round_id, user_id);

COMMIT;
