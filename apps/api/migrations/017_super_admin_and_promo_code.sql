-- 017_super_admin_and_promo_code.sql
-- Add SUPER_ADMIN to user_role enum
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
    EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN undefined_object THEN null;
    END;
END $$;

-- Add promo_code to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_users_promo_code ON public.users(promo_code);

-- Default Super Admin promo code setting
INSERT INTO settings (key, value) VALUES 
    ('super_admin_promo_code', '7777')
ON CONFLICT (key) DO NOTHING;
