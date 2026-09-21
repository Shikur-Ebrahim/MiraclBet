-- Migration 011: Clean up stale past matches immediately
-- Run this once in Supabase SQL Editor to wipe bad data

-- 1. Delete finished matches older than 24 hours
DELETE FROM fixtures
WHERE status_short IN ('FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD', 'INT')
  AND starts_at < NOW() - INTERVAL '24 hours';

-- 2. Delete past "Not Started" matches from previous UTC days
DELETE FROM fixtures
WHERE (status_short = 'NS' OR status_short = '' OR status_short IS NULL)
  AND starts_at < CURRENT_DATE AT TIME ZONE 'UTC';

-- 3. Delete duplicate fixtures (keep the one with the latest odds update)
DELETE FROM fixtures a
USING fixtures b
WHERE a.id > b.id
  AND a.home_team_name = b.home_team_name
  AND a.away_team_name = b.away_team_name
  AND DATE(a.starts_at AT TIME ZONE 'UTC') = DATE(b.starts_at AT TIME ZONE 'UTC');

-- 4. Delete fixtures with no odds (orphan rows)
DELETE FROM fixtures
WHERE (advanced_odds IS NULL OR advanced_odds = '{}'::jsonb
       OR jsonb_array_length(COALESCE(advanced_odds->'markets', '[]'::jsonb)) = 0)
  AND created_at < NOW() - INTERVAL '2 hours';
