-- Run in Supabase SQL Editor
-- Drops and recreates leagues table with full proper schema

-- 1. Drop old table
DROP TABLE IF EXISTS leagues CASCADE;

-- 2. Create proper leagues table
CREATE TABLE leagues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT UNIQUE NOT NULL,        -- API-Sports league ID e.g. "39"
  sport_slug      TEXT NOT NULL DEFAULT 'football',  -- which sport
  name            TEXT NOT NULL,               -- "Premier League"
  country         TEXT NOT NULL DEFAULT '',    -- "England"
  logo_url        TEXT NOT NULL DEFAULT '',    -- full URL to logo image
  season          INTEGER,                     -- current season year e.g. 2025
  is_top_league   BOOLEAN DEFAULT false,       -- manually flagged top league
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 999,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast lookups
CREATE INDEX idx_leagues_sport_slug ON leagues(sport_slug);
CREATE INDEX idx_leagues_top        ON leagues(is_top_league, sort_order);
CREATE INDEX idx_leagues_external   ON leagues(external_id);

-- 4. Fix fixtures table to reference leagues by external_id text (not FK)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS league_external_id TEXT;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS league_name TEXT;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS league_logo_url TEXT;

-- 5. Seed the top 15 known football leagues as is_top_league = true
-- (Worker will update these with real API data including logos)
INSERT INTO leagues (external_id, sport_slug, name, country, logo_url, season, is_top_league, sort_order)
VALUES
  ('2',   'football', 'UEFA Champions League',  'World',         'https://media.api-sports.io/football/leagues/2.png',   2025, true,  1),
  ('3',   'football', 'UEFA Europa League',     'World',         'https://media.api-sports.io/football/leagues/3.png',   2025, true,  2),
  ('848', 'football', 'UEFA Conference League', 'World',         'https://media.api-sports.io/football/leagues/848.png', 2025, true,  3),
  ('5',   'football', 'UEFA Nations League',    'World',         'https://media.api-sports.io/football/leagues/5.png',   2025, true,  4),
  ('39',  'football', 'Premier League',         'England',       'https://media.api-sports.io/football/leagues/39.png',  2025, true,  5),
  ('140', 'football', 'La Liga',                'Spain',         'https://media.api-sports.io/football/leagues/140.png', 2025, true,  6),
  ('135', 'football', 'Serie A',                'Italy',         'https://media.api-sports.io/football/leagues/135.png', 2025, true,  7),
  ('78',  'football', 'Bundesliga',             'Germany',       'https://media.api-sports.io/football/leagues/78.png',  2025, true,  8),
  ('61',  'football', 'Ligue 1',                'France',        'https://media.api-sports.io/football/leagues/61.png',  2025, true,  9),
  ('13',  'football', 'Copa Libertadores',      'South America', 'https://media.api-sports.io/football/leagues/13.png',  2025, true, 10),
  ('235', 'football', 'Premier League',         'Russia',        'https://media.api-sports.io/football/leagues/235.png', 2025, true, 11),
  ('332', 'football', 'Premier League',         'Egypt',         'https://media.api-sports.io/football/leagues/332.png', 2025, true, 12),
  ('88',  'football', 'Eredivisie',             'Netherlands',   'https://media.api-sports.io/football/leagues/88.png',  2025, true, 13),
  ('94',  'football', 'Primeira Liga',          'Portugal',      'https://media.api-sports.io/football/leagues/94.png',  2025, true, 14),
  ('203', 'football', 'Süper Lig',              'Turkey',        'https://media.api-sports.io/football/leagues/203.png', 2025, true, 15)
ON CONFLICT (external_id) DO UPDATE SET
  name          = EXCLUDED.name,
  country       = EXCLUDED.country,
  logo_url      = EXCLUDED.logo_url,
  season        = EXCLUDED.season,
  is_top_league = EXCLUDED.is_top_league,
  sort_order    = EXCLUDED.sort_order,
  updated_at    = NOW();

SELECT 'Leagues table setup complete. Top leagues: ' || COUNT(*) FROM leagues WHERE is_top_league = true;
