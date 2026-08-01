-- ============================================================================
-- Migration : suivi des factures de renouvellement envoyées
-- Contexte  : les factures d'échéance de fin de mois sont envoyées
--             automatiquement (email + PDF joint) par le planificateur
--             backend (api/lib/renewals.ts). Cette table garantit
--             l'idempotence : une seule facture par utilisateur et par
--             période d'abonnement.
-- Exécution : manuelle (psql) — additive et sans risque.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewal_invoice_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  period_end     TIMESTAMPTZ NOT NULL,
  invoice_number TEXT NOT NULL,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto           BOOLEAN NOT NULL DEFAULT true,   -- true = envoi planifié, false = envoi manuel admin
  email_sent     BOOLEAN NOT NULL DEFAULT false,  -- false si RESEND_API_KEY absente au moment de l'envoi
  UNIQUE (user_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_renewal_invoice_log_period
  ON public.renewal_invoice_log (period_end);
