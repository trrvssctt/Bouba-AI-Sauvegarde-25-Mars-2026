-- Migration : Base de connaissance utilisateur
-- Crée la table knowledge_documents si elle n'existe pas encore,
-- puis ajoute les colonnes manquantes (idempotent).

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  file_type   VARCHAR(20)   NOT NULL DEFAULT 'txt',
  size_bytes  INTEGER       NOT NULL DEFAULT 0,
  status      VARCHAR(20)   NOT NULL DEFAULT 'processing', -- processing | indexed | error
  chunk_count INTEGER       NOT NULL DEFAULT 0,
  content     TEXT,         -- texte extrait du fichier
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Ajouter les colonnes si la table existe déjà sans elles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='knowledge_documents' AND column_name='content'
  ) THEN
    ALTER TABLE public.knowledge_documents ADD COLUMN content TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='knowledge_documents' AND column_name='file_type'
  ) THEN
    ALTER TABLE public.knowledge_documents ADD COLUMN file_type VARCHAR(20) NOT NULL DEFAULT 'txt';
  END IF;
END $$;

-- Index full-text pour la recherche (français)
CREATE INDEX IF NOT EXISTS knowledge_documents_content_fts
  ON public.knowledge_documents
  USING gin(to_tsvector('french', coalesce(content, '')));

-- Index basique sur user_id
CREATE INDEX IF NOT EXISTS knowledge_documents_user_id_idx
  ON public.knowledge_documents(user_id);
