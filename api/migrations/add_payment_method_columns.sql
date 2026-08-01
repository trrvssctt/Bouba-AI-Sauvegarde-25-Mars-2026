-- Add missing columns to payments and subscriptions tables
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS plan_id        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS approved_at    TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
