-- Script de test pour vérifier le setup Supabase
-- Exécutez ceci dans le SQL Editor après le setup

-- 1. Vérifier que les tables existent
SELECT 'profiles' as table_name, 
       COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
UNION ALL
SELECT 'plans' as table_name, 
       COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'plans' AND table_schema = 'public'
UNION ALL
SELECT 'subscriptions' as table_name, 
       COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND table_schema = 'public';

-- 2. Vérifier que les plans par défaut existent  
SELECT id, name, price FROM public.plans ORDER BY price;

-- 3. Vérifier que le trigger existe
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. Tester la création d'un profil (simulation)
-- ATTENTION: Ne pas exécuter en production, c'est juste pour tester
-- INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@example.com');