BEGIN;

-- Widen bet_slips columns to prevent overflow on huge accumulators
ALTER TABLE bet_slips ALTER COLUMN total_odds TYPE NUMERIC(24, 4);
ALTER TABLE bet_slips ALTER COLUMN potential_payout TYPE NUMERIC(24, 2);
ALTER TABLE bet_slips ALTER COLUMN stake TYPE NUMERIC(24, 2);

-- Widen bet_legs columns
ALTER TABLE bet_legs ALTER COLUMN odds TYPE NUMERIC(24, 4);

-- Widen bet_bookings columns
ALTER TABLE bet_bookings ALTER COLUMN total_odds TYPE NUMERIC(24, 4);

COMMIT;