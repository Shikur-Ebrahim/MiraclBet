-- Migration 014: Add min_deposit to payment_methods
-- Allows admin to set per-method minimum deposit amount

BEGIN;

ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS min_deposit NUMERIC(10,2) NOT NULL DEFAULT 450;

COMMENT ON COLUMN payment_methods.min_deposit IS 'Minimum deposit amount in Birr for this payment method';

COMMIT;
