-- ============================================================================
-- Migration : colonne metadata sur notifications
-- Contexte  : les annonces admin portent un type visuel (feature/promotion/
--             maintenance/info) et une cible que la bannière utilisateur doit
--             connaître pour se styler. Stockés dans metadata JSONB.
-- Exécution : manuelle (psql) — additive et sans risque.
-- ============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;
