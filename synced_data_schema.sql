-- Tables pour le cache des données synchronisées depuis les APIs OAuth

-- Table pour stocker les emails synchronisés
CREATE TABLE IF NOT EXISTS public.synced_emails (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email_data jsonb NOT NULL,
    service text NOT NULL DEFAULT 'gmail',
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table pour stocker les contacts synchronisés  
CREATE TABLE IF NOT EXISTS public.synced_contacts (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_data jsonb NOT NULL,
    service text NOT NULL DEFAULT 'google_contacts',
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table pour stocker les événements de calendrier synchronisés
CREATE TABLE IF NOT EXISTS public.synced_calendar_events (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    event_data jsonb NOT NULL,
    service text NOT NULL DEFAULT 'google_calendar',
    calendar_id text,
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table pour stocker les données Airtable synchronisées
CREATE TABLE IF NOT EXISTS public.synced_airtable_records (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    record_data jsonb NOT NULL,
    base_id text NOT NULL,
    table_name text NOT NULL,
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Mettre à jour la table user_connections pour ajouter les champs de synchronisation
ALTER TABLE public.user_connections 
ADD COLUMN IF NOT EXISTS last_sync timestamp with time zone,
ADD COLUMN IF NOT EXISTS sync_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_frequency_minutes integer DEFAULT 30;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_synced_emails_user_service ON public.synced_emails(user_id, service);
CREATE INDEX IF NOT EXISTS idx_synced_emails_synced_at ON public.synced_emails(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_synced_contacts_user_service ON public.synced_contacts(user_id, service);
CREATE INDEX IF NOT EXISTS idx_synced_contacts_synced_at ON public.synced_contacts(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_synced_calendar_user_service ON public.synced_calendar_events(user_id, service);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_synced_at ON public.synced_calendar_events(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_synced_airtable_user_base ON public.synced_airtable_records(user_id, base_id);
CREATE INDEX IF NOT EXISTS idx_synced_airtable_synced_at ON public.synced_airtable_records(synced_at DESC);

-- RLS (Row Level Security) pour sécuriser l'accès aux données
ALTER TABLE public.synced_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_airtable_records ENABLE ROW LEVEL SECURITY;

-- Policies pour synced_emails
CREATE POLICY "Users can access their own synced emails" ON public.synced_emails
    FOR ALL USING (auth.uid() = user_id);

-- Policies pour synced_contacts  
CREATE POLICY "Users can access their own synced contacts" ON public.synced_contacts
    FOR ALL USING (auth.uid() = user_id);

-- Policies pour synced_calendar_events
CREATE POLICY "Users can access their own synced calendar events" ON public.synced_calendar_events
    FOR ALL USING (auth.uid() = user_id);

-- Policies pour synced_airtable_records
CREATE POLICY "Users can access their own synced airtable records" ON public.synced_airtable_records
    FOR ALL USING (auth.uid() = user_id);

-- Fonctions pour nettoyer les anciennes données (optionnel)
CREATE OR REPLACE FUNCTION public.cleanup_old_synced_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Supprimer les données de plus de 30 jours
    DELETE FROM public.synced_emails 
    WHERE synced_at < now() - interval '30 days';
    
    DELETE FROM public.synced_contacts 
    WHERE synced_at < now() - interval '30 days';
    
    DELETE FROM public.synced_calendar_events 
    WHERE synced_at < now() - interval '30 days';
    
    DELETE FROM public.synced_airtable_records 
    WHERE synced_at < now() - interval '30 days';
END;
$$;

-- Fonction RPC pour déclencher la synchronisation
CREATE OR REPLACE FUNCTION public.trigger_sync(service_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid;
    connection_exists boolean;
    result json;
BEGIN
    -- Récupérer l'ID utilisateur
    SELECT auth.uid() INTO user_uuid;
    
    IF user_uuid IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Vérifier si la connexion existe
    SELECT EXISTS(
        SELECT 1 FROM public.user_connections 
        WHERE user_id = user_uuid 
        AND connection_id = service_name 
        AND status = 'connected'
    ) INTO connection_exists;
    
    IF NOT connection_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Service not connected'
        );
    END IF;
    
    -- Mettre à jour le timestamp de demande de sync
    UPDATE public.user_connections 
    SET sync_requested_at = now()
    WHERE user_id = user_uuid 
    AND connection_id = service_name;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Sync requested for ' || service_name
    );
END;
$$;

-- Fonction RPC pour obtenir les statistiques de synchronisation
CREATE OR REPLACE FUNCTION public.get_sync_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid;
    result json;
BEGIN
    SELECT auth.uid() INTO user_uuid;
    
    IF user_uuid IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;
    
    SELECT json_object_agg(
        connection_id,
        json_build_object(
            'last_sync', last_sync,
            'sync_count', sync_count,
            'auto_sync_enabled', auto_sync_enabled,
            'status', status
        )
    ) INTO result
    FROM public.user_connections
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Ajouter une colonne pour les demandes de sync
ALTER TABLE public.user_connections 
ADD COLUMN IF NOT EXISTS sync_requested_at timestamp with time zone;