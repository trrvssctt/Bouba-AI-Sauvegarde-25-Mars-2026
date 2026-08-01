-- ============================================================================
-- Migration : journal des requêtes IA (appels n8n)
-- Contexte  : le Monitoring IA a besoin, pour chaque requête utilisateur vers
--             n8n : durée (performance), succès/échec (erreurs agents) et
--             contexte. Alimenté par /api/chat et /api/bouba/action.
-- Exécution : manuelle (psql) — additive et sans risque.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  agent         TEXT,
  source        TEXT,          -- direct | page_action | admin
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  success       BOOLEAN NOT NULL DEFAULT true,
  error_excerpt TEXT,          -- extrait du message d'erreur si success = false
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created
  ON public.ai_request_logs (created_at DESC);
