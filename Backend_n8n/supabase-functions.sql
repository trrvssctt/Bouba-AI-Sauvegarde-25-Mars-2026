-- ======================================
-- SUPABASE FUNCTIONS POUR AGENTS N8N
-- ======================================

-- Function: Webhook Calendar Agent
-- Traite les réponses de l'agent calendrier
CREATE OR REPLACE FUNCTION public.webhook_calendar(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_param UUID;
    agent_response JSONB;
    user_plan TEXT;
    usage_result JSONB;
BEGIN
    -- Extraire l'user_id du payload
    user_id_param := (payload->>'user_id')::UUID;
    agent_response := payload->'response';
    
    -- Log de l'activité
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,
        'calendar_agent_used',
        jsonb_build_object(
            'agent', 'calendar',
            'success', CASE WHEN agent_response->>'error' IS NULL THEN true ELSE false END,
            'response_type', agent_response->>'type'
        ),
        NOW()
    );
    
    -- Incrémenter l'usage si succès
    IF agent_response->>'error' IS NULL THEN
        PERFORM public.increment_usage(user_id_param, 'calendar');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Calendar agent response processed',
        'user_id', user_id_param,
        'timestamp', EXTRACT(EPOCH FROM NOW())
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log de l'erreur
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id_param,
        'webhook_calendar_error',
        SQLERRM,
        payload,
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function: Webhook Contact Agent  
CREATE OR REPLACE FUNCTION public.webhook_contacts(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
DECLARE
    user_id_param UUID;
    agent_response JSONB;
BEGIN
    user_id_param := (payload->>'user_id')::UUID;
    agent_response := payload->'response';
    
    -- Log de l'activité contact
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,
        'contact_agent_used',
        jsonb_build_object(
            'agent', 'contact',
            'success', CASE WHEN agent_response->>'error' IS NULL THEN true ELSE false END,
            'operation', agent_response->>'operation',
            'contacts_affected', COALESCE(agent_response->>'count', '0')
        ),
        NOW()
    );
    
    -- Incrémenter l'usage
    IF agent_response->>'error' IS NULL THEN
        PERFORM public.increment_usage(user_id_param, 'contact');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contact agent response processed',
        'user_id', user_id_param
    );
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (user_id_param, 'webhook_contact_error', SQLERRM, payload, NOW());
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Webhook Email Agent
CREATE OR REPLACE FUNCTION public.webhook_emails(payload JSONB)  
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_param UUID;
    agent_response JSONB;
    email_data JSONB;
BEGIN
    user_id_param := (payload->>'user_id')::UUID;
    agent_response := payload->'response';
    email_data := payload->'email_data';
    
    -- Log de l'activité email
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,
        'email_agent_used',
        jsonb_build_object(
            'agent', 'email',
            'success', CASE WHEN agent_response->>'error' IS NULL THEN true ELSE false END,
            'email_type', COALESCE(email_data->>'type', 'unknown'),
            'recipient', COALESCE(email_data->>'to', 'unknown')
        ),
        NOW()
    );
    
    -- Stocker l'email dans l'historique (si configuré)
    IF email_data IS NOT NULL AND agent_response->>'error' IS NULL THEN
        INSERT INTO public.email_history (
            user_id,
            direction,
            subject, 
            recipient,
            sender,
            content,
            agent_generated,
            created_at
        ) VALUES (
            user_id_param,
            'outgoing',
            COALESCE(email_data->>'subject', 'No Subject'),
            COALESCE(email_data->>'to', 'unknown'),
            COALESCE(email_data->>'from', 'boubaia-agent'), 
            COALESCE(email_data->>'body', ''),
            true,
            NOW()
        );
    END IF;
    
    -- Incrémenter l'usage
    IF agent_response->>'error' IS NULL THEN
        PERFORM public.increment_usage(user_id_param, 'email');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Email agent response processed',
        'user_id', user_id_param
    );
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (user_id_param, 'webhook_email_error', SQLERRM, payload, NOW());
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Webhook Finance Agent
CREATE OR REPLACE FUNCTION public.webhook_finance(payload JSONB)
RETURNS JSONB  
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_param UUID;
    agent_response JSONB;
    finance_data JSONB;
BEGIN
    user_id_param := (payload->>'user_id')::UUID;
    agent_response := payload->'response';
    finance_data := payload->'finance_data';
    
    -- Log de l'activité finance
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,  
        'finance_agent_used',
        jsonb_build_object(
            'agent', 'finance',
            'success', CASE WHEN agent_response->>'error' IS NULL THEN true ELSE false END,
            'operation', COALESCE(finance_data->>'operation', 'unknown'),
            'amount', COALESCE(finance_data->>'amount', '0')
        ),
        NOW()
    );
    
    -- Incrémenter l'usage
    IF agent_response->>'error' IS NULL THEN
        PERFORM public.increment_usage(user_id_param, 'finance');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Finance agent response processed', 
        'user_id', user_id_param
    );
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)  
    VALUES (user_id_param, 'webhook_finance_error', SQLERRM, payload, NOW());
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ======================================
-- TABLES ADDITIONNELLES NÉCESSAIRES
-- ======================================

-- Table: Historique des emails (optionnel)
CREATE TABLE IF NOT EXISTS public.email_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
    subject TEXT,
    recipient TEXT,
    sender TEXT, 
    content TEXT,
    agent_generated BOOLEAN DEFAULT false,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Logs d'erreurs
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL,
    error_message TEXT,
    context JSONB,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Activités utilisateur (étendue)
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- INDEXES POUR PERFORMANCE
-- ======================================

CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON public.email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_created_at ON public.email_history(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON public.user_activities(timestamp);

-- ======================================
-- RLS POLICIES
-- ======================================

-- Email History RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email history" ON public.email_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email history" ON public.email_history  
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Error Logs RLS (admin uniquement)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs" ON public.error_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

-- User Activities RLS  
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert activities" ON public.user_activities
    FOR INSERT WITH CHECK (true); -- Permet aux fonctions d'insérer

-- ======================================
-- FUNCTIONS UTILITAIRES
-- ======================================

-- Function: Obtenir les stats d'usage d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_agent_stats(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
    total_messages INTEGER;
    monthly_usage JSONB;
BEGIN
    -- Usage total
    SELECT messages_used INTO total_messages
    FROM public.profiles p
    WHERE p.id = user_id_param;
    
    -- Usage mensuel par agent
    SELECT jsonb_object_agg(
        split_part(action, '_agent_used', 1),
        COUNT(*)
    ) INTO monthly_usage
    FROM public.user_activities
    WHERE user_id = user_id_param
    AND action LIKE '%_agent_used'
    AND timestamp >= date_trunc('month', NOW());
    
    stats := jsonb_build_object(
        'total_messages', COALESCE(total_messages, 0),
        'monthly_by_agent', COALESCE(monthly_usage, '{}'::jsonb),
        'last_activity', (
            SELECT MAX(timestamp) 
            FROM public.user_activities 
            WHERE user_id = user_id_param
        )
    );
    
    RETURN stats;
END;
$$;

-- Function: Nettoyer les anciens logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer les activités de plus de 90 jours
    DELETE FROM public.user_activities 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Supprimer les logs d'erreur résolus de plus de 30 jours
    DELETE FROM public.error_logs
    WHERE resolved = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer l'historique email de plus de 1 an
    DELETE FROM public.email_history
    WHERE created_at < NOW() - INTERVAL '1 year';
END;  
$$;

-- Créer une tâche cron pour le nettoyage (extension pg_cron requise)
-- SELECT cron.schedule('cleanup-logs', '0 2 * * 0', 'SELECT public.cleanup_old_logs();');

-- ======================================
-- FUNCTIONS POUR GESTION DES PLANS ET PAIEMENTS
-- ======================================

-- Function: Récupérer les plans disponibles
CREATE OR REPLACE FUNCTION public.get_available_plans()
RETURNS TABLE(
    id TEXT,
    name TEXT,
    description TEXT,
    price INTEGER,
    currency TEXT,
    features TEXT[],
    limits JSONB,
    stripe_price_id TEXT,
    popular BOOLEAN,
    active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.currency,
        p.features,
        p.limits,
        p.stripe_price_id,
        p.popular,
        p.active
    FROM public.plans p
    WHERE p.active = true
    ORDER BY p.price ASC;
END;
$$;

-- Function: Créer un profil utilisateur avec plan
CREATE OR REPLACE FUNCTION public.create_user_profile_with_plan(
    user_id_param UUID,
    email_param TEXT,
    plan_id_param TEXT DEFAULT 'starter',
    stripe_customer_id_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    plan_exists BOOLEAN;
    profile_data JSONB;
BEGIN
    -- Vérifier que le plan existe
    SELECT EXISTS(SELECT 1 FROM public.plans WHERE id = plan_id_param AND active = true) 
    INTO plan_exists;
    
    IF NOT plan_exists THEN
        RAISE EXCEPTION 'Plan % does not exist or is not active', plan_id_param;
    END IF;
    
    -- Créer ou mettre à jour le profil
    INSERT INTO public.profiles (
        id,
        email,
        plan_id,
        stripe_customer_id,
        subscription_status,
        trial_ends_at,
        created_at,
        updated_at
    )
    VALUES (
        user_id_param,
        email_param,
        plan_id_param,
        stripe_customer_id_param,
        CASE WHEN plan_id_param = 'starter' THEN 'active' ELSE 'trial' END,
        CASE WHEN plan_id_param = 'starter' THEN NULL ELSE NOW() + INTERVAL '7 days' END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        subscription_status = EXCLUDED.subscription_status,
        trial_ends_at = EXCLUDED.trial_ends_at,
        updated_at = NOW();
    
    -- Initialiser l'usage
    INSERT INTO public.user_usage (
        user_id,
        plan_id,
        messages_count,
        last_reset_at,
        created_at
    )
    VALUES (
        user_id_param,
        plan_id_param,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        last_reset_at = NOW();
    
    -- Log de l'activité
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,
        'profile_created',
        jsonb_build_object(
            'plan_id', plan_id_param,
            'has_stripe_customer', stripe_customer_id_param IS NOT NULL
        ),
        NOW()
    );
    
    -- Retourner le profil créé
    SELECT jsonb_build_object(
        'user_id', p.id,
        'email', p.email,
        'plan_id', p.plan_id,
        'subscription_status', p.subscription_status,
        'trial_ends_at', p.trial_ends_at,
        'stripe_customer_id', p.stripe_customer_id
    )
    INTO profile_data
    FROM public.profiles p
    WHERE p.id = user_id_param;
    
    RETURN profile_data;
    
EXCEPTION WHEN OTHERS THEN
    -- Log de l'erreur
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id_param,
        'profile_creation_error',
        SQLERRM,
        jsonb_build_object(
            'email', email_param,
            'plan_id', plan_id_param,
            'stripe_customer_id', stripe_customer_id_param
        ),
        NOW()
    );
    
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$;

-- Function: Traiter un paiement Stripe réussi
CREATE OR REPLACE FUNCTION public.process_successful_payment(
    user_id_param UUID,
    stripe_subscription_id_param TEXT,
    stripe_payment_intent_id_param TEXT,
    plan_id_param TEXT,
    amount_param INTEGER,
    payment_method_param JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    subscription_data JSONB;
BEGIN
    -- Créer l'enregistrement de souscription
    INSERT INTO public.subscriptions (
        user_id,
        plan_id,
        stripe_subscription_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
    )
    VALUES (
        user_id_param,
        plan_id_param,
        stripe_subscription_id_param,
        'active',
        NOW(),
        NOW() + INTERVAL '1 month',
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        status = 'active',
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 month',
        cancel_at_period_end = false,
        updated_at = NOW();
    
    -- Créer l'enregistrement de paiement
    INSERT INTO public.payments (
        user_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        payment_method,
        created_at
    )
    VALUES (
        user_id_param,
        stripe_payment_intent_id_param,
        amount_param,
        'eur',
        'succeeded',
        payment_method_param,
        NOW()
    );
    
    -- Mettre à jour le profil utilisateur
    UPDATE public.profiles SET
        plan_id = plan_id_param,
        subscription_status = 'active',
        trial_ends_at = NULL,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Mettre à jour l'usage utilisateur
    UPDATE public.user_usage SET
        plan_id = plan_id_param,
        last_reset_at = NOW()
    WHERE user_id = user_id_param;
    
    -- Log de l'activité
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (
        user_id_param,
        'payment_successful',
        jsonb_build_object(
            'plan_id', plan_id_param,
            'amount', amount_param,
            'stripe_subscription_id', stripe_subscription_id_param,
            'stripe_payment_intent_id', stripe_payment_intent_id_param
        ),
        NOW()
    );
    
    -- Retourner les données de souscription
    SELECT jsonb_build_object(
        'subscription_id', s.id,
        'user_id', s.user_id,
        'plan_id', s.plan_id,
        'status', s.status,
        'current_period_start', s.current_period_start,
        'current_period_end', s.current_period_end
    )
    INTO subscription_data
    FROM public.subscriptions s
    WHERE s.user_id = user_id_param;
    
    RETURN subscription_data;
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id_param,
        'payment_processing_error',
        SQLERRM,
        jsonb_build_object(
            'stripe_subscription_id', stripe_subscription_id_param,
            'stripe_payment_intent_id', stripe_payment_intent_id_param,
            'plan_id', plan_id_param,
            'amount', amount_param
        ),
        NOW()
    );
    
    RAISE EXCEPTION 'Failed to process payment: %', SQLERRM;
END;
$$;

-- Function: Vérifier l'accès utilisateur à une fonctionnalité
CREATE OR REPLACE FUNCTION public.check_user_feature_access(
    user_id_param UUID,
    feature_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    user_plan RECORD;
    user_usage_data RECORD;
    has_access BOOLEAN := false;
    usage_limit INTEGER;
    current_usage INTEGER;
    access_details JSONB;
BEGIN
    -- Récupérer le profil utilisateur
    SELECT * INTO user_profile
    FROM public.profiles
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_access', false,
            'reason', 'user_not_found'
        );
    END IF;
    
    -- Récupérer le plan utilisateur
    SELECT * INTO user_plan
    FROM public.plans
    WHERE id = user_profile.plan_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_access', false,
            'reason', 'plan_not_found'
        );
    END IF;
    
    -- Vérifier le statut de la souscription
    IF user_profile.subscription_status NOT IN ('active', 'trialing') THEN
        RETURN jsonb_build_object(
            'has_access', false,
            'reason', 'subscription_inactive',
            'subscription_status', user_profile.subscription_status
        );
    END IF;
    
    -- Récupérer l'usage actuel
    SELECT * INTO user_usage_data
    FROM public.user_usage
    WHERE user_id = user_id_param;
    
    -- Vérifier l'accès selon la fonctionnalité
    CASE feature_param
        WHEN 'messages' THEN
            usage_limit := (user_plan.limits->>'messages')::INTEGER;
            current_usage := COALESCE(user_usage_data.messages_count, 0);
            has_access := (usage_limit = -1 OR current_usage < usage_limit);
            
        WHEN 'calendar' THEN
            has_access := (
                user_plan.limits->'integrations' @> '["calendar"]'::jsonb OR
                user_plan.limits->'integrations' @> '["all"]'::jsonb
            );
            
        WHEN 'contacts' THEN
            has_access := (
                user_plan.limits->'integrations' @> '["contacts"]'::jsonb OR
                user_plan.limits->'integrations' @> '["all"]'::jsonb
            );
            
        WHEN 'finance' THEN
            has_access := (
                user_plan.limits->'integrations' @> '["finance"]'::jsonb OR
                user_plan.limits->'integrations' @> '["all"]'::jsonb
            );
            
        WHEN 'search' THEN
            has_access := user_profile.plan_id != 'starter';
            
        WHEN 'rag' THEN
            has_access := user_profile.plan_id != 'starter';
            
        WHEN 'api' THEN
            has_access := user_profile.plan_id = 'enterprise';
            
        ELSE
            has_access := false;
    END CASE;
    
    -- Construire la réponse détaillée
    access_details := jsonb_build_object(
        'has_access', has_access,
        'plan_id', user_profile.plan_id,
        'plan_name', user_plan.name,
        'subscription_status', user_profile.subscription_status,
        'feature', feature_param
    );
    
    -- Ajouter les détails d'usage si pertinent
    IF feature_param = 'messages' THEN
        access_details := access_details || jsonb_build_object(
            'usage_limit', usage_limit,
            'current_usage', current_usage,
            'remaining', CASE WHEN usage_limit = -1 THEN -1 ELSE usage_limit - current_usage END
        );
    END IF;
    
    -- Ajouter les détails de trial si applicable
    IF user_profile.subscription_status = 'trialing' AND user_profile.trial_ends_at IS NOT NULL THEN
        access_details := access_details || jsonb_build_object(
            'trial_ends_at', user_profile.trial_ends_at,
            'is_trial', true
        );
    END IF;
    
    RETURN access_details;
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id_param,
        'access_check_error',
        SQLERRM,
        jsonb_build_object('feature', feature_param),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'has_access', false,
        'reason', 'error',
        'error', SQLERRM
    );
END;
$$;

-- Function: Obtenir le dashboard utilisateur complet
CREATE OR REPLACE FUNCTION public.get_user_dashboard(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_data RECORD;
    plan_data RECORD;
    usage_data RECORD;
    subscription_data RECORD;
    recent_activities JSONB;
    dashboard_result JSONB;
BEGIN
    -- Récupérer le profil
    SELECT * INTO profile_data
    FROM public.profiles
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Récupérer le plan
    SELECT * INTO plan_data
    FROM public.plans
    WHERE id = profile_data.plan_id;
    
    -- Récupérer l'usage
    SELECT * INTO usage_data
    FROM public.user_usage
    WHERE user_id = user_id_param;
    
    -- Récupérer la souscription
    SELECT * INTO subscription_data
    FROM public.subscriptions
    WHERE user_id = user_id_param;
    
    -- Récupérer les activités récentes
    SELECT jsonb_agg(
        jsonb_build_object(
            'action', action,
            'details', details,
            'timestamp', timestamp
        ) ORDER BY timestamp DESC
    )
    INTO recent_activities
    FROM public.user_activities
    WHERE user_id = user_id_param
    AND timestamp > NOW() - INTERVAL '7 days'
    LIMIT 20;
    
    -- Construire le dashboard
    dashboard_result := jsonb_build_object(
        'profile', jsonb_build_object(
            'id', profile_data.id,
            'email', profile_data.email,
            'plan_id', profile_data.plan_id,
            'subscription_status', profile_data.subscription_status,
            'trial_ends_at', profile_data.trial_ends_at,
            'created_at', profile_data.created_at
        ),
        'plan', CASE WHEN plan_data IS NOT NULL THEN
            jsonb_build_object(
                'id', plan_data.id,
                'name', plan_data.name,
                'description', plan_data.description,
                'price', plan_data.price,
                'features', plan_data.features,
                'limits', plan_data.limits
            )
        ELSE NULL END,
        'usage', CASE WHEN usage_data IS NOT NULL THEN
            jsonb_build_object(
                'messages_count', usage_data.messages_count,
                'calendar_count', usage_data.calendar_count,
                'contact_count', usage_data.contact_count,
                'email_count', usage_data.email_count,
                'finance_count', usage_data.finance_count,
                'last_reset_at', usage_data.last_reset_at
            )
        ELSE NULL END,
        'subscription', CASE WHEN subscription_data IS NOT NULL THEN
            jsonb_build_object(
                'id', subscription_data.id,
                'status', subscription_data.status,
                'current_period_start', subscription_data.current_period_start,
                'current_period_end', subscription_data.current_period_end,
                'cancel_at_period_end', subscription_data.cancel_at_period_end
            )
        ELSE NULL END,
        'recent_activities', COALESCE(recent_activities, '[]'::jsonb)
    );
    
    RETURN dashboard_result;
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id_param,
        'dashboard_error',
        SQLERRM,
        '{}'::jsonb,
        NOW()
    );
    
    RAISE EXCEPTION 'Failed to load dashboard: %', SQLERRM;
END;
$$;