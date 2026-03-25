-- ======================================
-- SETUP COMPLET BASE DE DONNÉES BOUBA'IA
-- ======================================
-- Ce script configure complètement la base de données Supabase 
-- pour l'authentification, les paiements et la gestion des agents IA
--
-- ORDRE D'EXÉCUTION RECOMMANDÉ :
-- 1. supabase_schema.sql (tables de base)
-- 2. supabase-functions.sql (fonctions métier)
-- 3. supabase-rpc-endpoints.sql (endpoints RPC)
-- 4. supabase-triggers.sql (automatisations)
-- 5. Ce fichier pour les données initiales
--
-- ⚠️  IMPORTANT : Exécuter dans l'ordre avec les permissions service_role
-- ======================================

-- Créer les plans de base
INSERT INTO public.plans (id, name, description, price, currency, features, limits, stripe_price_id, popular, active)
VALUES
(
    'starter', 
    'Starter', 
    'Pour tester Bouba gratuitement.', 
    0, 
    'eur',
    jsonb_build_array(
        '1 agent IA',
        '500 messages/mois',
        'Gmail uniquement',
        'Mémoire session',
        'Support communauté'
    ),
    jsonb_build_object(
        'messages', 500,
        'agents', 1,
        'integrations', jsonb_build_array('gmail'),
        'memory_days', 0,
        'storage', '100MB'
    ),
    NULL,
    false,
    true
),
(
    'pro',
    'Pro', 
    'Pour les entrepreneurs et freelances.', 
    2900, 
    'eur',
    jsonb_build_array(
        '4 agents IA',
        '10 000 messages/mois',
        'Gmail + Calendar + Contacts',
        'Finance (Airtable)',
        'RAG/Vector Store (Pinecone)',
        'Recherche web (Tavily)',
        'Mémoire 30 jours',
        'Support email 48h'
    ),
    jsonb_build_object(
        'messages', 10000,
        'agents', 4,
        'integrations', jsonb_build_array('gmail', 'calendar', 'contacts', 'finance', 'all'),
        'memory_days', 30,
        'storage', '10GB'
    ),
    'price_1ProPlanId', -- À remplacer par le vrai ID Stripe
    true,
    true
),
(
    'enterprise',
    'Enterprise', 
    'Pour les équipes et organisations.', 
    9900, 
    'eur',
    jsonb_build_array(
        'Agents IA illimités',
        'Messages illimités',
        'Toutes intégrations',
        'Finance + Custom DB',
        'RAG/Vector Store + Custom',
        'Recherche web (Tavily)',
        'Mémoire illimitée',
        'Support dédié SLA 4h',
        'API Access',
        'White-label'
    ),
    jsonb_build_object(
        'messages', -1,
        'agents', -1,
        'integrations', jsonb_build_array('all'),
        'memory_days', -1,
        'storage', '1TB'
    ),
    'price_1EnterprisePlanId', -- À remplacer par le vrai ID Stripe
    false,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    stripe_price_id = EXCLUDED.stripe_price_id,
    popular = EXCLUDED.popular,
    active = EXCLUDED.active;

-- ======================================
-- CONFIGURATION DES WEBHOOKS N8N
-- ======================================

-- Table pour stocker les configurations des webhooks
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    endpoint_url TEXT NOT NULL,
    secret_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les configurations par défaut des webhooks N8N
INSERT INTO public.webhook_configs (name, endpoint_url, secret_key, is_active)
VALUES
('calendar_agent', 'https://n8n.realtechprint.com/webhook/calendar-agent', NULL, true),
('contact_agent', 'https://n8n.realtechprint.com/webhook/contact-agent', NULL, true),
('email_agent', 'https://n8n.realtechprint.com/webhook/email-agent', NULL, true),
('finance_agent', 'https://n8n.realtechprint.com/webhook/finance-agent', NULL, true),
('orchestrator_agent', 'https://n8n.realtechprint.com/webhook/orchestrator', NULL, true)
ON CONFLICT (name) DO UPDATE SET
    endpoint_url = EXCLUDED.endpoint_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ======================================
-- DONNÉES DE TEST (DÉVELOPPEMENT UNIQUEMENT)
-- ======================================

DO $$
BEGIN
    -- Vérifier si on est en environnement de développement
    IF current_setting('app.environment', true) = 'development' THEN
        
        -- Créer un utilisateur de test s'il n'existe pas
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token,
            email_change_token_new,
            email_change_token_current,
            recovery_token
        )
        SELECT
            '00000000-0000-0000-0000-000000000000'::uuid,
            'test-user-123'::uuid,
            'authenticated',
            'authenticated',
            'test@boubaia.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"plan_id": "pro"}',
            false,
            '',
            '',
            '',
            ''
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.users WHERE email = 'test@boubaia.com'
        );

        -- Message informatif
        RAISE NOTICE 'Utilisateur de test créé: test@boubaia.com / password123';
        
    END IF;
END
$$;

-- ======================================
-- VÉRIFICATIONS ET VALIDATIONS
-- ======================================

-- Fonction de vérification de l'installation
CREATE OR REPLACE FUNCTION public.verify_installation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB := '{}';
    table_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
    plan_count INTEGER;
BEGIN
    -- Compter les tables principales
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'plans', 'subscriptions', 'payments', 'user_usage', 'user_activities');
    
    -- Compter les fonctions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name LIKE '%bouba%' OR routine_name LIKE '%rpc_%';
    
    -- Compter les triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    
    -- Compter les plans actifs
    SELECT COUNT(*) INTO plan_count
    FROM public.plans
    WHERE active = true;
    
    -- Construire le résultat
    result := jsonb_build_object(
        'installation_status', CASE 
            WHEN table_count >= 6 AND plan_count >= 3 THEN 'success'
            ELSE 'incomplete'
        END,
        'tables_created', table_count,
        'functions_created', function_count,
        'triggers_created', trigger_count,
        'plans_available', plan_count,
        'rls_enabled', (
            SELECT COUNT(*) > 0
            FROM pg_policies
            WHERE schemaname = 'public'
        ),
        'auth_configured', (
            SELECT COUNT(*) > 0
            FROM information_schema.triggers
            WHERE trigger_name = 'on_auth_user_created'
        )
    );
    
    RETURN result;
END;
$$;

-- ======================================
-- PERMISSIONS ET FINALISATION
-- ======================================

-- S'assurer que les permissions sont correctes
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Permissions spécifiques pour les plans (accès public en lecture)
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.webhook_configs TO authenticated;

-- Activer RLS sur toutes les tables sensibles
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'subscriptions', 'payments', 'user_usage', 'user_activities', 'email_history')
    LOOP
        EXECUTE 'ALTER TABLE public.' || tbl || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END
$$;

-- ======================================
-- ANALYSE ET OPTIMISATION
-- ======================================

-- Créer des index pour optimiser les performances
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_plan_id ON public.profiles(plan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_usage_user_id ON public.user_usage(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_timestamp ON public.user_activities(timestamp DESC);

-- Analyser les tables pour mettre à jour les statistiques
ANALYZE public.profiles;
ANALYZE public.plans;
ANALYZE public.subscriptions;
ANALYZE public.payments;
ANALYZE public.user_usage;
ANALYZE public.user_activities;

-- ======================================
-- RÉSULTAT DE L'INSTALLATION
-- ======================================

-- Afficher le résumé d'installation
SELECT 
    '🚀 INSTALLATION BOUBA''IA TERMINÉE' as status,
    jsonb_pretty(public.verify_installation()) as details;

-- Lister les endpoints RPC disponibles
SELECT 
    'Endpoints RPC disponibles:' as info,
    array_agg(routine_name ORDER BY routine_name) as rpc_functions
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name LIKE 'rpc_%';

COMMENT ON TABLE public.plans IS 'Plans d''abonnement avec fonctionnalités et limites';
COMMENT ON TABLE public.profiles IS 'Profils utilisateurs avec plan et statut d''abonnement';
COMMENT ON TABLE public.subscriptions IS 'Souscriptions Stripe actives';
COMMENT ON TABLE public.payments IS 'Historique des paiements';
COMMENT ON TABLE public.user_usage IS 'Suivi d''usage des fonctionnalités par utilisateur';
COMMENT ON TABLE public.user_activities IS 'Journal d''activité utilisateur';
COMMENT ON TABLE public.webhook_configs IS 'Configuration des webhooks N8N';

-- ======================================
-- NOTES IMPORTANTES
-- ======================================

/*
NOTES DE DÉPLOIEMENT :

1. VARIABLES D'ENVIRONNEMENT REQUISES :
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - STRIPE_PUBLIC_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - N8N_WEBHOOK_URL

2. CONFIGURATION STRIPE :
   - Remplacer les stripe_price_id dans les plans
   - Configurer les webhooks Stripe vers votre endpoint
   - Tester les paiements en mode sandbox

3. CONFIGURATION N8N :
   - Importer les workflows depuis Backend_n8n/
   - Configurer les webhooks endpoints
   - Tester les connexions avec Supabase

4. SÉCURITÉ :
   - Vérifier que RLS est activé sur toutes les tables
   - Configurer les CORS dans Supabase Dashboard
   - Activer l'audit logging si nécessaire

5. MONITORING :
   - Surveiller les error_logs
   - Mettre en place des alertes sur les paiements échoués
   - Monitorer l'usage des API

6. MAINTENANCE :
   - Programmer le nettoyage automatique (cron)
   - Sauvegarde régulière de la base
   - Mise à jour des prix et plans selon besoin

COMMANDES UTILES :
- SELECT public.verify_installation(); -- Vérifier l'installation
- SELECT public.get_system_stats(); -- Statistiques système  
- SELECT * FROM public.error_logs ORDER BY created_at DESC LIMIT 10; -- Dernières erreurs
*/