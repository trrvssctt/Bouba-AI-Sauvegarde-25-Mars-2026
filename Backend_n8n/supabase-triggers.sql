-- ======================================
-- TRIGGERS ET AUTOMATISATIONS SUPABASE
-- ======================================

-- Fonction trigger : Créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_plan_id TEXT := 'starter';
    selected_plan_id TEXT;
BEGIN
    -- Récupérer le plan depuis les métadonnées si disponible
    IF NEW.raw_user_meta_data->>'plan_id' IS NOT NULL THEN
        selected_plan_id := NEW.raw_user_meta_data->>'plan_id';
    ELSE
        selected_plan_id := default_plan_id;
    END IF;
    
    -- Créer le profil utilisateur avec les bonnes colonnes
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        plan_id,
        subscription_status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        selected_plan_id,
        'active',
        NOW(),
        NOW()
    );
    
    -- TODO: Initialiser l'usage utilisateur (table user_usage à créer)
    /*
    INSERT INTO public.user_usage (
        user_id,
        plan_id,
        messages_count,
        calendar_count,
        contact_count,
        email_count,
        finance_count,
        last_reset_at,
        created_at
    )
    VALUES (
        NEW.id,
        selected_plan_id,
        0,
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
    );
    */
    
    -- Log de l'activité de création de compte
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        NEW.id,
        'account_created',
        jsonb_build_object(
            'plan_id', selected_plan_id,
            'email', NEW.email,
            'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
            'source', COALESCE(NEW.raw_user_meta_data->>'source', 'direct')
        ),
        NOW()
    );
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Log de l'erreur
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        NEW.id,
        'profile_creation_trigger_error',
        SQLERRM,
        jsonb_build_object(
            'email', NEW.email,
            'selected_plan_id', selected_plan_id
        ),
        NOW()
    );
    
    -- Ne pas empêcher la création du compte même en cas d'erreur
    RETURN NEW;
END;
$$;

-- Créer le trigger pour les nouveaux utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction trigger : Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Fonction trigger : Réinitialiser l'usage mensuel
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- TODO: Réinitialiser l'usage (table user_usage à créer)
    /*
    UPDATE public.user_usage SET
        messages_count = 0,
        calendar_count = 0,
        contact_count = 0,
        email_count = 0,
        finance_count = 0,
        last_reset_at = NOW()
    WHERE user_id IN (
        SELECT id FROM public.profiles 
        WHERE subscription_status IN ('active', 'trialing')
    );
    */
    
    -- Log de l'activité de reset
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    SELECT 
        id,
        'usage_reset',
        jsonb_build_object(
            'reset_type', 'monthly',
            'plan_id', plan_id
        ),
        NOW()
    FROM public.profiles
    WHERE subscription_status IN ('active', 'trialing');
    
END;
$$;

-- Fonction trigger : Expiration des trials
CREATE OR REPLACE FUNCTION public.handle_trial_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_user RECORD;
BEGIN
    -- Traiter tous les utilisateurs avec trial expiré
    FOR expired_user IN
        SELECT id, email, plan_id, trial_ends_at
        FROM public.profiles
        WHERE subscription_status = 'trialing'
        AND trial_ends_at <= NOW()
    LOOP
        -- Rétrograder vers le plan starter
        UPDATE public.profiles SET
            plan_id = 'starter',
            subscription_status = 'active',
            trial_ends_at = NULL,
            updated_at = NOW()
        WHERE id = expired_user.id;
        
        -- Mettre à jour l'usage (TODO: créer table user_usage)
        /*
        UPDATE public.user_usage SET
            plan_id = 'starter',
            messages_count = 0,
            last_reset_at = NOW()
        WHERE user_id = expired_user.id;
        */
        
        -- Log de l'expiration
        INSERT INTO public.user_activities (user_id, action, details, timestamp)
        VALUES (
            expired_user.id,
            'trial_expired',
            jsonb_build_object(
                'previous_plan', expired_user.plan_id,
                'new_plan', 'starter',
                'trial_ended_at', expired_user.trial_ends_at
            ),
            NOW()
        );
        
    END LOOP;
    
END;
$$;

-- Fonction trigger : Validation des limites d'usage (DÉSACTIVÉE - table user_usage manquante)
/*
CREATE OR REPLACE FUNCTION public.validate_usage_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    user_plan RECORD;
    message_limit INTEGER;
BEGIN
    -- Récupérer le plan utilisateur
    SELECT p.* INTO user_plan
    FROM public.plans p
    JOIN public.profiles prof ON prof.plan_id = p.id
    WHERE prof.id = NEW.user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User plan not found';
    END IF;
    
    -- Vérifier la limite de messages
    message_limit := (user_plan.limits->>'messages')::INTEGER;
    
    IF message_limit != -1 AND NEW.messages_count > message_limit THEN
        RAISE EXCEPTION 'Message limit exceeded for plan %', user_plan.name;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger pour validation des limites
DROP TRIGGER IF EXISTS trigger_validate_usage_limits ON public.user_usage;
CREATE TRIGGER trigger_validate_usage_limits
    BEFORE UPDATE ON public.user_usage
    FOR EACH ROW EXECUTE FUNCTION public.validate_usage_limits();
*/

-- Fonction trigger : Nettoyage automatique des données expirées
CREATE OR REPLACE FUNCTION public.auto_cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer les activités anciennes (90 jours)
    DELETE FROM public.user_activities 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Supprimer les logs d'erreur résolus (30 jours)
    DELETE FROM public.error_logs
    WHERE resolved = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer l'historique email ancien (1 an)
    DELETE FROM public.email_history
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Anonymiser les profils supprimés (6 mois)
    UPDATE public.profiles SET
        email = 'deleted@boubaia.com',
        stripe_customer_id = NULL,
        subscription_status = 'deleted'
    WHERE subscription_status = 'canceled'
    AND updated_at < NOW() - INTERVAL '6 months';
    
    -- Log du nettoyage
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    SELECT 
        gen_random_uuid(),
        'system_cleanup',
        jsonb_build_object(
            'cleanup_type', 'auto',
            'timestamp', NOW()
        ),
        NOW();
        
END;
$$;

-- ======================================
-- FONCTIONS UTILITAIRES
-- ======================================

-- Fonction : Obtenir les statistiques système
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'active_subscribers', (
            SELECT COUNT(*) 
            FROM public.profiles 
            WHERE subscription_status IN ('active', 'trialing')
        ),
        'total_messages_today', (
            -- TODO: Remplacer par vraie requête quand user_usage existera
            SELECT 0
            /*
            SELECT COALESCE(SUM(messages_count), 0)
            FROM public.user_usage u
            JOIN public.profiles p ON p.id = u.user_id
            WHERE u.last_reset_at::date = CURRENT_DATE
            */
        ),
        'revenue_this_month', (
            SELECT COALESCE(SUM(amount), 0)
            FROM public.payments
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
            AND status = 'succeeded'
        ),
        'plans_distribution', (
            SELECT jsonb_object_agg(plan_id, count)
            FROM (
                SELECT plan_id, COUNT(*) as count
                FROM public.profiles
                WHERE subscription_status IN ('active', 'trialing')
                GROUP BY plan_id
            ) t
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Fonction : Migrer un utilisateur vers un nouveau plan
CREATE OR REPLACE FUNCTION public.migrate_user_to_plan(
    user_id_param UUID,
    new_plan_id TEXT,
    reason TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_plan_id TEXT;
    result JSONB;
BEGIN
    -- Récupérer l'ancien plan
    SELECT plan_id INTO old_plan_id
    FROM public.profiles
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Vérifier que le nouveau plan existe
    IF NOT EXISTS(SELECT 1 FROM public.plans WHERE id = new_plan_id AND active = true) THEN
        RAISE EXCEPTION 'Plan % does not exist or is not active', new_plan_id;
    END IF;
    
    -- Mettre à jour le profil
    UPDATE public.profiles SET
        plan_id = new_plan_id,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Mettre à jour l'usage (TODO: créer table user_usage)
    /*
    UPDATE public.user_usage SET
        plan_id = new_plan_id,
        messages_count = 0, -- Reset usage on plan change
        last_reset_at = NOW()
    WHERE user_id = user_id_param;
    */
    
    -- Log de la migration
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,
        'plan_migrated',
        jsonb_build_object(
            'old_plan', old_plan_id,
            'new_plan', new_plan_id,
            'reason', reason,
            'migrated_by', COALESCE(auth.uid()::TEXT, 'system')
        ),
        NOW()
    );
    
    result := jsonb_build_object(
        'success', true,
        'old_plan', old_plan_id,
        'new_plan', new_plan_id,
        'user_id', user_id_param
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id_param,
        'plan_migration_error',
        SQLERRM,
        jsonb_build_object(
            'new_plan_id', new_plan_id,
            'reason', reason
        ),
        NOW()
    );
    
    RAISE EXCEPTION 'Failed to migrate user to plan: %', SQLERRM;
END;
$$;

-- ======================================
-- COMMENTAIRES ET DOCUMENTATION
-- ======================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger automatique : Créé un profil et initialise les données pour chaque nouvel utilisateur';
COMMENT ON FUNCTION public.reset_monthly_usage() IS 'Réinitialise l''usage mensuel de tous les utilisateurs actifs';
COMMENT ON FUNCTION public.handle_trial_expiration() IS 'Traite l''expiration des périodes d''essai';
COMMENT ON FUNCTION public.auto_cleanup_expired_data() IS 'Nettoyage automatique des données expirées';
COMMENT ON FUNCTION public.get_system_stats() IS 'Retourne les statistiques système pour le dashboard admin';
COMMENT ON FUNCTION public.migrate_user_to_plan(UUID, TEXT, TEXT) IS 'Migre un utilisateur vers un nouveau plan avec logging complet';