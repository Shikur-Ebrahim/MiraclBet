-- Migration 016: Allow deleting payment/withdrawal methods even if history exists
-- Changes FK constraints to SET NULL so records are preserved but methods can be deleted freely

BEGIN;

-- 1. Make payment_method_id nullable on deposits (so history is kept when method deleted)
ALTER TABLE deposits ALTER COLUMN payment_method_id DROP NOT NULL;

-- Drop the old strict FK and add one with ON DELETE SET NULL
ALTER TABLE deposits DROP CONSTRAINT IF EXISTS deposits_payment_method_id_fkey;
ALTER TABLE deposits
  ADD CONSTRAINT deposits_payment_method_id_fkey
  FOREIGN KEY (payment_method_id)
  REFERENCES payment_methods(id)
  ON DELETE SET NULL;

-- 2. Make withdrawal_method_id nullable on withdrawals
ALTER TABLE withdrawals ALTER COLUMN withdrawal_method_id DROP NOT NULL;

-- Drop the old strict FK and add one with ON DELETE SET NULL
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_withdrawal_method_id_fkey;
ALTER TABLE withdrawals
  ADD CONSTRAINT withdrawals_withdrawal_method_id_fkey
  FOREIGN KEY (withdrawal_method_id)
  REFERENCES withdrawal_methods(id)
  ON DELETE SET NULL;

COMMIT;
