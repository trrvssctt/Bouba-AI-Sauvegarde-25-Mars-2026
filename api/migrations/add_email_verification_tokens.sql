-- Migration: email verification tokens
-- Les utilisateurs existants sont déjà vérifiés (ils avaient accès avant cette migration)
UPDATE public.users SET email_verified = true WHERE email_verified = false;

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
