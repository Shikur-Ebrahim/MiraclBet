-- We only use status_short (e.g. NS, FT, 1H, HT), the full status string is redundant.
ALTER TABLE fixtures DROP COLUMN IF EXISTS status CASCADE;
