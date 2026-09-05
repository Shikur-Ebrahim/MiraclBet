-- Migration 003: Full fixtures schema for all sports
-- Run this in Supabase SQL Editor

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  sport TEXT DEFAULT 'football',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixtures table
CREATE TABLE IF NOT EXISTS fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_logo TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'NS',
  status_short TEXT DEFAULT 'NS',
  score_home INTEGER,
  score_away INTEGER,
  elapsed INTEGER,
  is_live BOOLEAN DEFAULT false,
  sport TEXT DEFAULT 'football',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Odds table
CREATE TABLE IF NOT EXISTS odds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
  market TEXT DEFAULT 'Match Winner',
  home DECIMAL(6,2) DEFAULT 1.90,
  draw DECIMAL(6,2) DEFAULT 3.20,
  away DECIMAL(6,2) DEFAULT 1.90,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixture_id, market)
);

-- API usage tracker
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL DEFAULT 'football',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  requests_used INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 7500,
  UNIQUE(sport, date)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_fixtures_live ON fixtures(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_fixtures_starts_at ON fixtures(starts_at);
CREATE INDEX IF NOT EXISTS idx_fixtures_sport ON fixtures(sport);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status_short);
CREATE INDEX IF NOT EXISTS idx_odds_fixture ON odds(fixture_id);

-- Seed some sample fixtures so the frontend shows something immediately
INSERT INTO leagues (external_id, name, country, sport) VALUES
  ('39',  'Premier League',  'England',  'football'),
  ('140', 'La Liga',         'Spain',    'football'),
  ('135', 'Serie A',         'Italy',    'football'),
  ('78',  'Bundesliga',      'Germany',  'football'),
  ('61',  'Ligue 1',         'France',   'football')
ON CONFLICT (external_id) DO NOTHING;

-- Sample fixtures (visible immediately before worker syncs real data)
WITH pl AS (SELECT id FROM leagues WHERE external_id = '39' LIMIT 1),
     ll AS (SELECT id FROM leagues WHERE external_id = '140' LIMIT 1),
     sa AS (SELECT id FROM leagues WHERE external_id = '135' LIMIT 1),
     bl AS (SELECT id FROM leagues WHERE external_id = '78' LIMIT 1)
INSERT INTO fixtures (external_id, league_id, home_team_name, away_team_name, starts_at, status_short, score_home, score_away, is_live, sport)
VALUES
  ('SAMPLE-1', (SELECT id FROM pl), 'Arsenal',     'Chelsea',      NOW() - interval '60 min', '2H', 1, 0, true,  'football'),
  ('SAMPLE-2', (SELECT id FROM ll), 'Real Madrid', 'Barcelona',    NOW() - interval '20 min', '1H', 0, 0, true,  'football'),
  ('SAMPLE-3', (SELECT id FROM sa), 'Juventus',    'AC Milan',     NOW() + interval '2 hours','NS', NULL, NULL, false, 'football'),
  ('SAMPLE-4', (SELECT id FROM bl), 'Bayern',      'Dortmund',     NOW() + interval '4 hours','NS', NULL, NULL, false, 'football'),
  ('SAMPLE-5', (SELECT id FROM pl), 'Liverpool',   'Man City',     NOW() + interval '1 day', 'NS', NULL, NULL, false, 'football')
ON CONFLICT (external_id) DO NOTHING;

-- Seed odds for sample fixtures
INSERT INTO odds (fixture_id, home, draw, away)
SELECT id, 1.45, 3.80, 5.50 FROM fixtures WHERE external_id = 'SAMPLE-1'
ON CONFLICT (fixture_id, market) DO NOTHING;

INSERT INTO odds (fixture_id, home, draw, away)
SELECT id, 2.10, 3.40, 2.80 FROM fixtures WHERE external_id = 'SAMPLE-2'
ON CONFLICT (fixture_id, market) DO NOTHING;

INSERT INTO odds (fixture_id, home, draw, away)
SELECT id, 1.75, 3.50, 4.20 FROM fixtures WHERE external_id = 'SAMPLE-3'
ON CONFLICT (fixture_id, market) DO NOTHING;

INSERT INTO odds (fixture_id, home, draw, away)
SELECT id, 1.30, 5.00, 8.00 FROM fixtures WHERE external_id = 'SAMPLE-4'
ON CONFLICT (fixture_id, market) DO NOTHING;

INSERT INTO odds (fixture_id, home, draw, away)
SELECT id, 2.50, 3.20, 2.60 FROM fixtures WHERE external_id = 'SAMPLE-5'
ON CONFLICT (fixture_id, market) DO NOTHING;
