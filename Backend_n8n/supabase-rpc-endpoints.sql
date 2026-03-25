-- ======================================
-- SUPABASE RPC ENDPOINTS POUR LE FRONTEND
-- ======================================

-- RPC: Authentification et création de profil
CREATE OR REPLACE FUNCTION public.rpc_authenticate_user(
    user_email TEXT,
    selected_plan_id TEXT DEFAULT 'starter'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    result JSONB;
BEGIN
    -- Récupérer l'ID utilisateur depuis auth.users
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;
    
    -- Créer le profil avec le plan sélectionné
    result := public.create_user_profile_with_plan(
        user_id, 
        user_email, 
        selected_plan_id
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', true,
        'message', SQLERRM
    );
END;
$$;

-- RPC: Récupérer les plans disponibles (accessible publiquement)
CREATE OR REPLACE FUNCTION public.rpc_get_plans()
RETURNS SETOF public.plans
LANGUAGE sql
SECURITY INVOKER
AS $$
    SELECT * FROM public.plans 
    WHERE active = true 
    ORDER BY price ASC;
$$;

-- RPC: Vérifier l'accès utilisateur (nécessite authentification)
CREATE OR REPLACE FUNCTION public.rpc_check_access(feature TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est authentifié
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object(
            'has_access', false,
            'reason', 'not_authenticated'
        );
    END IF;
    
    RETURN public.check_user_feature_access(auth.uid(), feature);
END;
$$;

-- RPC: Obtenir le dashboard utilisateur (nécessite authentification)
CREATE OR REPLACE FUNCTION public.rpc_get_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est authentifié
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN public.get_user_dashboard(auth.uid());
END;
$$;

-- RPC: Incrémenter l'usage (nécessite authentification)
CREATE OR REPLACE FUNCTION public.rpc_increment_usage(agent_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage_result JSONB;
BEGIN
    -- Vérifier que l'utilisateur est authentifié
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Vérifier l'accès avant d'incrémenter
    usage_result := public.check_user_feature_access(auth.uid(), 'messages');
    
    IF NOT (usage_result->>'has_access')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'access_denied',
            'details', usage_result
        );
    END IF;
    
    -- Incrémenter l'usage
    SELECT public.increment_usage(auth.uid(), agent_type) INTO usage_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'usage_result', usage_result
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- RPC: Tracer l'activité utilisateur (nécessite authentification)
CREATE OR REPLACE FUNCTION public.rpc_log_activity(
    action_type TEXT,
    activity_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est authentifié
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Enregistrer l'activité
    INSERT INTO public.user_activities (user_id, action, details, timestamp)
    VALUES (auth.uid(), action_type, activity_details, NOW());
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Activity logged successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- RPC: Webhook pour traitement des paiements Stripe
CREATE OR REPLACE FUNCTION public.rpc_process_stripe_webhook(
    event_type TEXT,
    event_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    customer_id TEXT;
    user_id UUID;
    subscription_id TEXT;
    plan_id TEXT;
    amount INTEGER;
    payment_intent_id TEXT;
    result JSONB;
BEGIN
    -- Traiter selon le type d'événement Stripe
    CASE event_type
        WHEN 'checkout.session.completed' THEN
            -- Extraction des données de session
            customer_id := event_data->'data'->'object'->>'customer';
            subscription_id := event_data->'data'->'object'->>'subscription';
            payment_intent_id := event_data->'data'->'object'->>'payment_intent';
            amount := (event_data->'data'->'object'->>'amount_total')::INTEGER;
            
            -- Trouver l'utilisateur par customer_id
            SELECT id INTO user_id
            FROM public.profiles
            WHERE stripe_customer_id = customer_id;
            
            IF user_id IS NULL THEN
                RAISE EXCEPTION 'User not found for customer_id: %', customer_id;
            END IF;
            
            -- Déterminer le plan depuis les métadonnées
            plan_id := event_data->'data'->'object'->'metadata'->>'plan_id';
            
            IF plan_id IS NULL THEN
                plan_id := 'pro'; -- Plan par défaut
            END IF;
            
            -- Traiter le paiement
            result := public.process_successful_payment(
                user_id,
                subscription_id,
                payment_intent_id,
                plan_id,
                amount
            );
            
        WHEN 'invoice.payment_succeeded' THEN
            -- Renouvellement de souscription
            customer_id := event_data->'data'->'object'->>'customer';
            subscription_id := event_data->'data'->'object'->>'subscription';
            amount := (event_data->'data'->'object'->>'amount_paid')::INTEGER;
            
            SELECT id INTO user_id
            FROM public.profiles
            WHERE stripe_customer_id = customer_id;
            
            IF user_id IS NOT NULL THEN
                -- Mettre à jour la souscription
                UPDATE public.subscriptions SET
                    status = 'active',
                    current_period_end = current_period_end + INTERVAL '1 month',
                    updated_at = NOW()
                WHERE user_id = user_id AND stripe_subscription_id = subscription_id;
                
                -- Log de l'activité
                INSERT INTO public.user_activities (user_id, action, details, timestamp)
                VALUES (
                    user_id,
                    'subscription_renewed',
                    jsonb_build_object(
                        'subscription_id', subscription_id,
                        'amount', amount
                    ),
                    NOW()
                );
            END IF;
            
        WHEN 'customer.subscription.deleted' THEN
            -- Annulation de souscription
            subscription_id := event_data->'data'->'object'->>'id';
            
            -- Mettre à jour le statut
            UPDATE public.subscriptions SET
                status = 'canceled',
                cancel_at_period_end = true,
                updated_at = NOW()
            WHERE stripe_subscription_id = subscription_id;
            
            -- Mettre à jour le profil
            UPDATE public.profiles SET
                subscription_status = 'canceled',
                plan_id = 'starter'
            WHERE id IN (
                SELECT user_id FROM public.subscriptions 
                WHERE stripe_subscription_id = subscription_id
            );
            
        ELSE
            -- Événement non géré
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Event type not handled: ' || event_type
            );
    END CASE;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Webhook processed successfully',
        'event_type', event_type,
        'result', COALESCE(result, '{}'::jsonb)
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log de l'erreur
    INSERT INTO public.error_logs (user_id, error_type, error_message, context, created_at)
    VALUES (
        user_id,
        'stripe_webhook_error',
        SQLERRM,
        jsonb_build_object(
            'event_type', event_type,
            'event_data', event_data
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ======================================
-- PERMISSIONS ET SÉCURITÉ RLS
-- ======================================

-- Autoriser l'accès public aux plans
GRANT EXECUTE ON FUNCTION public.rpc_get_plans() TO anon, authenticated;

-- Autoriser l'accès aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.rpc_check_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_increment_usage(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_log_activity(TEXT, JSONB) TO authenticated;

-- Autoriser l'accès service pour l'authentification
GRANT EXECUTE ON FUNCTION public.rpc_authenticate_user(TEXT, TEXT) TO service_role;

-- Autoriser l'accès service pour les webhooks Stripe
GRANT EXECUTE ON FUNCTION public.rpc_process_stripe_webhook(TEXT, JSONB) TO service_role;

-- Activer RLS sur les tables sensibles si pas déjà fait
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les profils
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Politiques RLS pour les souscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" 
    ON public.subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Politiques RLS pour les paiements
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" 
    ON public.payments FOR SELECT 
    USING (auth.uid() = user_id);

-- Politiques RLS pour l'usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage;
CREATE POLICY "Users can view own usage" 
    ON public.user_usage FOR SELECT 
    USING (auth.uid() = user_id);

-- Politiques RLS pour les activités
DROP POLICY IF EXISTS "Users can view own activities" ON public.user_activities;
CREATE POLICY "Users can view own activities" 
    ON public.user_activities FOR SELECT 
    USING (auth.uid() = user_id);