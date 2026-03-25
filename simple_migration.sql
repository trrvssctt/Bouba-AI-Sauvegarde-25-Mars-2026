-- Simple migration pour ajouter les colonnes d'onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Paris (GMT+1)';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Français';

-- Mettre à jour les valeurs par défaut
UPDATE public.profiles SET work_type = 'Entrepreneur' WHERE work_type IS NULL;