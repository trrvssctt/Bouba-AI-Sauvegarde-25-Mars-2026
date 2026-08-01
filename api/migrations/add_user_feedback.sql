-- ============================================================================
-- Migration : retours utilisateurs (👍/👎 sur les réponses de Bouba)
-- Contexte  : les pouces du chat n'étaient jamais persistés côté serveur —
--             impossible de mesurer la satisfaction. Cette table alimente
--             l'onglet « Retours & satisfaction » du panel admin.
-- Exécution : manuelle (psql) — additive et sans risque.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  rating          TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  agent           TEXT,
  message_excerpt TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created
  ON public.user_feedback (created_at DESC);
