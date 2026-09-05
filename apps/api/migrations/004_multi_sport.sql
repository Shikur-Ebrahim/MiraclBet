-- Run this in Supabase SQL Editor
-- Sets up sports table with proper quotas and seeds all 12 sports

-- 1. Clean up and recreate sports table
DROP TABLE IF EXISTS sports CASCADE;

CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add sport_id to fixtures if not exists
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS sport_slug TEXT DEFAULT 'football';
CREATE INDEX IF NOT EXISTS idx_fixtures_sport_slug ON fixtures(sport_slug);
CREATE INDEX IF NOT EXISTS idx_fixtures_sport_date ON fixtures(sport_slug, DATE(starts_at AT TIME ZONE 'UTC'));

-- 3. Add sport_id to leagues if not exists
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS sport_slug TEXT DEFAULT 'football';

-- 4. Seed all sports with correct quotas
INSERT INTO sports (slug, name, emoji, api_base_url, daily_limit, sort_order) VALUES
  ('football',   'Football',   '⚽', 'https://v3.football.api-sports.io',         7500, 1),
  ('hockey',     'Hockey',     '🏒', 'https://v1.hockey.api-sports.io',            100,  2),
  ('tennis',     'Tennis',     '🎾', 'https://v1.tennis.api-sports.io',            100,  3),
  ('basketball', 'Basketball', '🏀', 'https://v1.basketball.api-sports.io',        100,  4),
  ('baseball',   'Baseball',   '⚾', 'https://v1.baseball.api-sports.io',          100,  5),
  ('volleyball', 'Volleyball', '🏐', 'https://v1.volleyball.api-sports.io',        100,  6),
  ('rugby',      'Rugby',      '🏉', 'https://v1.rugby.api-sports.io',             100,  7),
  ('handball',   'Handball',   '🤾', 'https://v1.handball.api-sports.io',          100,  8),
  ('mma',        'MMA',        '🥊', 'https://v1.mma.api-sports.io',               100,  9),
  ('nba',        'NBA',        '🏀', 'https://v2.nba.api-sports.io',               100, 10),
  ('nfl',        'NFL',        '🏈', 'https://v1.american-football.api-sports.io', 100, 11),
  ('formula-1',  'Formula 1',  '🏎️', 'https://v1.formula-1.api-sports.io',         100, 12)
ON CONFLICT (slug) DO UPDATE SET
  daily_limit = EXCLUDED.daily_limit,
  api_base_url = EXCLUDED.api_base_url,
  emoji = EXCLUDED.emoji;

-- 5. Per-sport API usage tracker (replaces football_api_usage)
CREATE TABLE IF NOT EXISTS sport_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_slug TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 100,
  last_requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sport_slug, usage_date)
);

-- 6. Update existing sample fixtures to have sport_slug
UPDATE fixtures SET sport_slug = 'football' WHERE sport_slug IS NULL;
UPDATE leagues SET sport_slug = 'football' WHERE sport_slug IS NULL;

SELECT 'Setup complete! Sports table has ' || COUNT(*) || ' sports.' as result FROM sports;
