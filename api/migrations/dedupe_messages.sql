-- ============================================================================
-- Migration : dédoublonnage de public.messages
-- Contexte  : l'ancien workflow n8n (SOPHIA v2.0) insérait les messages en
--             double (une fois côté n8n, une fois côté backend). Le workflow
--             v3.0 n'écrit plus rien en base : cette migration nettoie
--             l'existant.
-- Règle     : même conversation_id + même role + même content, avec des
--             created_at à moins de 10 secondes d'écart → on garde le PLUS
--             ANCIEN, on supprime les suivants.
-- Exécution : MANUELLE uniquement (psql), jamais automatique.
--   psql -h postgresql-gestionapp.alwaysdata.net -U gestionapp \
--        -d gestionapp_bouba -f api/migrations/dedupe_messages.sql
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. VÉRIFICATION AVANT — groupes de doublons présents
-- ────────────────────────────────────────────────────────────────────────────
SELECT conversation_id,
       role,
       LEFT(content, 60) AS extrait,
       COUNT(*)          AS occurrences
FROM public.messages
GROUP BY conversation_id, role, content
HAVING COUNT(*) > 1
ORDER BY occurrences DESC
LIMIT 50;

-- Nombre exact de lignes qui seront supprimées (dry-run) :
WITH ranked AS (
  SELECT id,
         created_at,
         LAG(created_at) OVER (
           PARTITION BY conversation_id, role, content
           ORDER BY created_at, id
         ) AS prev_created_at
  FROM public.messages
)
SELECT COUNT(*) AS lignes_a_supprimer
FROM ranked
WHERE prev_created_at IS NOT NULL
  AND created_at - prev_created_at <= interval '10 seconds';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. SUPPRESSION — dans une transaction (ROLLBACK possible tant que pas COMMIT)
-- ────────────────────────────────────────────────────────────────────────────
BEGIN;

WITH ranked AS (
  SELECT id,
         created_at,
         LAG(created_at) OVER (
           PARTITION BY conversation_id, role, content
           ORDER BY created_at, id
         ) AS prev_created_at
  FROM public.messages
)
DELETE FROM public.messages m
USING ranked r
WHERE m.id = r.id
  AND r.prev_created_at IS NOT NULL
  AND r.created_at - r.prev_created_at <= interval '10 seconds';

-- Vérifier le nombre de lignes supprimées affiché par psql (DELETE n),
-- il doit correspondre au dry-run ci-dessus. Si OK :
COMMIT;
-- Sinon : ROLLBACK;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. VÉRIFICATION APRÈS — doit renvoyer 0 ligne
-- ────────────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         created_at,
         LAG(created_at) OVER (
           PARTITION BY conversation_id, role, content
           ORDER BY created_at, id
         ) AS prev_created_at
  FROM public.messages
)
SELECT COUNT(*) AS doublons_restants
FROM ranked
WHERE prev_created_at IS NOT NULL
  AND created_at - prev_created_at <= interval '10 seconds';
