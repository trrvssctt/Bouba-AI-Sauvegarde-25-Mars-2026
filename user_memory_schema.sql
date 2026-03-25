-- ============================================================
-- Mémoire persistante de Bouba par utilisateur
-- Permet à Bouba de se souvenir des faits importants entre sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_memory (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL,
  key          TEXT        NOT NULL,   -- ex: "prénom_préféré", "dernière_action_proposée", "thème_favori"
  value        JSONB       NOT NULL,   -- valeur flexible (string, objet, tableau...)
  source       TEXT        NOT NULL DEFAULT 'bouba'  -- 'bouba' | 'user' | 'system'
                             CHECK (source IN ('bouba','user','system')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_memory_pkey    PRIMARY KEY (id),
  CONSTRAINT user_memory_user_fk FOREIGN KEY (user_id)
               REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_memory_unique_key UNIQUE (user_id, key)
);

-- Index pour accès rapide par user_id
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id
  ON public.user_memory(user_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_user_memory_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_memory_updated_at ON public.user_memory;
CREATE TRIGGER trg_user_memory_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW EXECUTE FUNCTION update_user_memory_updated_at();

-- Commentaires
COMMENT ON TABLE public.user_memory IS 'Mémoire contextuelle persistante de Bouba par utilisateur';
COMMENT ON COLUMN public.user_memory.key IS 'Identifiant du fait mémorisé (ex: derniere_action_proposee, sujet_en_cours)';
COMMENT ON COLUMN public.user_memory.value IS 'Valeur JSON flexible du fait mémorisé';
COMMENT ON COLUMN public.user_memory.source IS 'Origine de la mémoire: bouba (auto-extrait), user (explicite), system';
