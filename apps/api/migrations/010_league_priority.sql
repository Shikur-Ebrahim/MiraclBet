-- Migration 010: Add league_priority to fixtures and leagues tables
-- This allows top-15 leagues to be prioritized in queries without client-side sorting

-- Add priority column to fixtures (lower = higher priority, 0 = unset/unknown)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS league_priority INT NOT NULL DEFAULT 99;

-- Add is_top_league and priority to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_top_league BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS league_priority INT NOT NULL DEFAULT 99;

-- Update existing leagues to mark top 15 (by their known API-Sports IDs)
-- Premier League (England)   = 39
-- La Liga (Spain)             = 140
-- Serie A (Italy)             = 135
-- Bundesliga (Germany)        = 78
-- Ligue 1 (France)            = 61
-- Brasileirão Série A         = 71
-- Primeira Liga (Portugal)    = 94
-- Eredivisie (Netherlands)    = 88
-- Belgian Pro League          = 144
-- Süper Lig (Turkey)          = 203
-- Argentine Primera División  = 128
-- MLS (USA & Canada)          = 253
-- Saudi Pro League            = 307
-- Paraguayan Primera División = 239
-- J1 League (Japan)           = 98

UPDATE leagues SET is_top_league = true, league_priority = 1  WHERE external_id = '39';
UPDATE leagues SET is_top_league = true, league_priority = 2  WHERE external_id = '140';
UPDATE leagues SET is_top_league = true, league_priority = 3  WHERE external_id = '135';
UPDATE leagues SET is_top_league = true, league_priority = 4  WHERE external_id = '78';
UPDATE leagues SET is_top_league = true, league_priority = 5  WHERE external_id = '61';
UPDATE leagues SET is_top_league = true, league_priority = 6  WHERE external_id = '71';
UPDATE leagues SET is_top_league = true, league_priority = 7  WHERE external_id = '94';
UPDATE leagues SET is_top_league = true, league_priority = 8  WHERE external_id = '88';
UPDATE leagues SET is_top_league = true, league_priority = 9  WHERE external_id = '144';
UPDATE leagues SET is_top_league = true, league_priority = 10 WHERE external_id = '203';
UPDATE leagues SET is_top_league = true, league_priority = 11 WHERE external_id = '128';
UPDATE leagues SET is_top_league = true, league_priority = 12 WHERE external_id = '253';
UPDATE leagues SET is_top_league = true, league_priority = 13 WHERE external_id = '307';
UPDATE leagues SET is_top_league = true, league_priority = 14 WHERE external_id = '239';
UPDATE leagues SET is_top_league = true, league_priority = 15 WHERE external_id = '98';

-- Propagate priority from leagues to existing fixtures
UPDATE fixtures f
SET league_priority = l.league_priority
FROM leagues l
WHERE f.league_external_id = l.external_id
  AND l.is_top_league = true;

-- Index for fast sorted queries by priority + date
CREATE INDEX IF NOT EXISTS idx_fixtures_priority_date ON fixtures (league_priority, starts_at);
