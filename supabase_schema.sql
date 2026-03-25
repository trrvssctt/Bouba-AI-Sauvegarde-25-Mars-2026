-- BOUBA Database Schema
-- Run this in the Supabase SQL Editor

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  work_type TEXT,
  timezone TEXT DEFAULT 'Europe/Paris',
  language TEXT DEFAULT 'Français',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  plan_id TEXT DEFAULT 'starter' REFERENCES public.plans(id),
  messages_used INTEGER DEFAULT 0,
  messages_limit INTEGER DEFAULT 500,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- Prix en centimes
  currency TEXT DEFAULT 'EUR',
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  stripe_price_id TEXT,
  popular BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.plans (id, name, description, price, features, limits, popular, stripe_price_id) VALUES
('starter', 'Starter', 'Plan gratuit pour découvrir Bouba''ia', 0, 
 '["Agent IA Chat", "500 messages/mois", "Gmail uniquement", "Mémoire session", "Support communauté"]', 
 '{"messages": 500, "agents": 1, "integrations": ["gmail"], "memory_days": 0}', false, null),
('pro', 'Pro', 'Plan complet pour les professionnels', 2900, 
 '["4 agents IA", "10 000 messages/mois", "Gmail + Calendar + Contacts", "Finance (Airtable)", "RAG/Vector Store", "Recherche web", "Mémoire 30 jours", "Support email 48h"]', 
 '{"messages": 10000, "agents": 4, "integrations": ["gmail", "calendar", "contacts", "finance"], "memory_days": 30}', true, 'price_pro_monthly'),
('enterprise', 'Enterprise', 'Solution complète pour les entreprises', 9900, 
 '["Agents IA illimités", "Messages illimités", "Toutes intégrations", "Finance + Custom DB", "RAG + Custom", "API Access", "White-label", "Support dédié SLA 4h"]', 
 '{"messages": -1, "agents": -1, "integrations": ["all"], "memory_days": -1}', false, 'price_enterprise_monthly')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  popular = EXCLUDED.popular,
  stripe_price_id = EXCLUDED.stripe_price_id;

-- Enable RLS for plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view plans" 
ON public.plans FOR SELECT 
TO public USING (active = true);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES public.plans(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')) DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" 
ON public.subscriptions FOR ALL 
USING (auth.uid() = user_id);

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- Montant en centimes
  currency TEXT DEFAULT 'EUR',
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
USING (auth.uid() = user_id);

-- 5. USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  messages_used INTEGER DEFAULT 0,
  agent_calls JSONB DEFAULT '{}', -- {"email": 5, "calendar": 3, ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS for usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" 
ON public.usage_tracking FOR ALL 
USING (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  avatar TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  groups TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts" 
ON public.contacts FOR ALL 
USING (auth.uid() = user_id);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL 
USING (auth.uid() = user_id);

-- 4. FINANCE GOALS TABLE
CREATE TABLE IF NOT EXISTS public.finance_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'revenue',
  target DECIMAL(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, period)
);

-- Enable RLS for finance_goals
ALTER TABLE public.finance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals" 
ON public.finance_goals FOR ALL 
USING (auth.uid() = user_id);

-- 5. FINANCE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable RLS for finance_categories
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own categories" 
ON public.finance_categories FOR ALL 
USING (auth.uid() = user_id);

-- 6. FUNCTIONS & TRIGGERS
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, plan_id, messages_limit)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', 'starter', 500);
  
  -- Create initial subscription for starter plan
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'starter', 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profile when subscription changes
CREATE OR REPLACE FUNCTION public.handle_subscription_change() 
RETURNS TRIGGER AS $$
DECLARE
  plan_limits JSONB;
BEGIN
  -- Get plan limits
  SELECT limits INTO plan_limits FROM public.plans WHERE id = NEW.plan_id;
  
  -- Update profile with new plan details
  UPDATE public.profiles SET 
    plan_id = NEW.plan_id,
    messages_limit = CASE 
      WHEN (plan_limits->>'messages')::INTEGER = -1 THEN 999999999 
      ELSE (plan_limits->>'messages')::INTEGER 
    END,
    subscription_status = NEW.status,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track message usage
CREATE OR REPLACE FUNCTION public.increment_message_usage(user_uuid UUID, agent_type TEXT DEFAULT 'chat') 
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get current usage and limit
  SELECT messages_used, messages_limit INTO current_usage, usage_limit
  FROM public.profiles WHERE id = user_uuid;
  
  -- Check if user has exceeded limit
  IF current_usage >= usage_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Update profile usage
  UPDATE public.profiles 
  SET messages_used = messages_used + 1, updated_at = NOW()
  WHERE id = user_uuid;
  
  -- Update daily usage tracking
  INSERT INTO public.usage_tracking (user_id, date, messages_used, agent_calls)
  VALUES (user_uuid, today_date, 1, jsonb_build_object(agent_type, 1))
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    messages_used = usage_tracking.messages_used + 1,
    agent_calls = usage_tracking.agent_calls || jsonb_build_object(
      agent_type, 
      COALESCE((usage_tracking.agent_calls->>agent_type)::INTEGER, 0) + 1
    ),
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly usage (call via cron job)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage() 
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET messages_used = 0, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_subscription_change();
