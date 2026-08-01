-- ============================================================================
-- Migration : remise à zéro mensuelle du quota de messages
-- Contexte  : profiles.messages_used n'était jamais remis à zéro (seul un
--             reset manuel admin existait). On ajoute quota_reset_at pour
--             permettre un reset paresseux : au login et à chaque contrôle de
--             quota, si le mois de quota_reset_at < mois courant, le backend
--             remet messages_used à 0 (voir api/lib/quota.ts).
-- Exécution : manuelle (psql) — additive et sans risque.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Vérification :
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'quota_reset_at';
