-- ============================================================================
-- Migration : preuve de paiement Wave sur les demandes d'upgrade
-- Contexte  : l'utilisateur scanne le QR Wave, paie, saisit la référence et
--             UPLOADE sa capture de paiement. Stockée en base64 dans proof
--             (même format que payments.metadata.proof).
-- Exécution : manuelle (psql) — additive et sans risque. (Déjà exécutée.)
-- ============================================================================
ALTER TABLE public.upgrade_requests ADD COLUMN IF NOT EXISTS proof JSONB;
