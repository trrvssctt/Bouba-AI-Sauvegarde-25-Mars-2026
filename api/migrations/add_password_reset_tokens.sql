-- Migration : table pour les tokens de réinitialisation de mot de passe
-- À exécuter une seule fois sur la base de données

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  user_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token     TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Index pour la recherche par token
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
