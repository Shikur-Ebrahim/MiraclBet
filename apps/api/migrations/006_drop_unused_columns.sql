-- Drop the old relations that we no longer need
ALTER TABLE fixtures DROP COLUMN IF EXISTS sport_id CASCADE;
ALTER TABLE fixtures DROP COLUMN IF EXISTS league_id CASCADE;
ALTER TABLE fixtures DROP COLUMN IF EXISTS home_team_id CASCADE;
ALTER TABLE fixtures DROP COLUMN IF EXISTS away_team_id CASCADE;

-- Drop the teams table entirely, since we store team names and logos directly in the fixtures table now
DROP TABLE IF EXISTS teams CASCADE;
