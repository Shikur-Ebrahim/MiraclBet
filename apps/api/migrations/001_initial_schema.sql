BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    date_of_birth   DATE,
    phone           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sports (name, slug, sort_order) VALUES
    ('Football',    'football',    1),
    ('Basketball',  'basketball',  2),
    ('Tennis',      'tennis',      3),
    ('Cricket',     'cricket',     4),
    ('Baseball',    'baseball',    5),
    ('Rugby',       'rugby',       6)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS leagues (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_id     UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    external_id  TEXT UNIQUE,
    name         TEXT NOT NULL,
    country      TEXT,
    logo_url     TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leagues_sport_id ON leagues(sport_id);
CREATE INDEX IF NOT EXISTS idx_leagues_external_id ON leagues(external_id);

CREATE TABLE IF NOT EXISTS teams (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id  TEXT UNIQUE,
    name         TEXT NOT NULL,
    short_name   TEXT,
    logo_url     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_external_id ON teams(external_id);

CREATE TYPE fixture_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled', 'postponed');

CREATE TABLE IF NOT EXISTS fixtures (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id     UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    external_id   TEXT UNIQUE,
    home_team_id  UUID NOT NULL REFERENCES teams(id),
    away_team_id  UUID NOT NULL REFERENCES teams(id),
    kickoff_at    TIMESTAMPTZ NOT NULL,
    status        fixture_status NOT NULL DEFAULT 'scheduled',
    home_score    INT,
    away_score    INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixtures_league_id ON fixtures(league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff_at ON fixtures(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_fixtures_external_id ON fixtures(external_id);

CREATE TABLE IF NOT EXISTS markets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixture_id  UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_open     BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_fixture_id ON markets(fixture_id);

CREATE TABLE IF NOT EXISTS selections (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id  UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    odds       NUMERIC(10, 3) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_selections_market_id ON selections(market_id);

CREATE TABLE IF NOT EXISTS odds (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    selection_id UUID NOT NULL REFERENCES selections(id) ON DELETE CASCADE,
    odds         NUMERIC(10, 3) NOT NULL,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odds_selection_id ON odds(selection_id);
CREATE INDEX IF NOT EXISTS idx_odds_recorded_at ON odds(recorded_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fixtures_updated_at BEFORE UPDATE ON fixtures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_selections_updated_at BEFORE UPDATE ON selections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
