# 🚀 Backend Bouba'ia - Documentation Complète

## 📋 Vue d'ensemble

Le backend Bouba'ia est une architecture complète basée sur **Supabase** qui gère :
- ✅ **Authentification** utilisateur avec profils automatiques
- ✅ **Gestion des plans** d'abonnement (Starter, Pro, Enterprise)  
- ✅ **Paiements Stripe** avec vérification et webhooks
- ✅ **Système d'usage** avec limitations par plan
- ✅ **Intégration N8N** pour les agents IA
- ✅ **Logging et monitoring** complet

## 📁 Architecture des fichiers

```
Backend_n8n/
├── supabase_schema.sql          # Tables et structure de base
├── supabase-functions.sql       # Fonctions métier principales
├── supabase-rpc-endpoints.sql   # Endpoints RPC pour le frontend
├── supabase-triggers.sql        # Automatisations et triggers
├── supabase-setup-complete.sql  # Setup complet et données initiales
└── README-backend.md           # Cette documentation
```

## 🗄️ Modèle de données

### Tables principales

| Table | Description | Clés importantes |
|-------|-------------|------------------|
| `profiles` | Profils utilisateurs | `id`, `plan_id`, `subscription_status` |
| `plans` | Plans d'abonnement | `id`, `price`, `features`, `limits` |
| `subscriptions` | Souscriptions Stripe | `user_id`, `stripe_subscription_id` |
| `payments` | Historique paiements | `user_id`, `amount`, `status` |
| `user_usage` | Compteurs d'usage | `user_id`, `messages_count`, etc. |
| `user_activities` | Journal activité | `user_id`, `action`, `details` |

### Plans disponibles

| Plan | Prix | Limites | Fonctionnalités |
|------|------|---------|-----------------|
| **Starter** | Gratuit | 500 msg/mois | Gmail, Support communauté |
| **Pro** | 29€/mois | Illimité | Tous agents, Intégrations, Support prioritaire |
| **Enterprise** | 99€/mois | Illimité | Multi-users, API, Account Manager |

## 🔧 Fonctions disponibles

### RPC Endpoints (Frontend)

```sql
-- Récupérer les plans (public)
SELECT * FROM rpc_get_plans();

-- Vérifier l'accès utilisateur
SELECT rpc_check_access('messages');

-- Dashboard utilisateur  
SELECT rpc_get_dashboard();

-- Incrémenter usage
SELECT rpc_increment_usage('email');

-- Logger activité
SELECT rpc_log_activity('email_sent', '{"to": "user@domain.com"}');
```

### Fonctions Webhook (N8N/Stripe)

```sql
-- Traitement paiement Stripe
SELECT rpc_process_stripe_webhook('checkout.session.completed', event_data);

-- Webhook agents N8N
SELECT webhook_calendar(payload);
SELECT webhook_contacts(payload);  
SELECT webhook_emails(payload);
SELECT webhook_finance(payload);
```

### Fonctions métier

```sql
-- Créer profil avec plan
SELECT create_user_profile_with_plan(user_id, 'user@email.com', 'pro');

-- Traiter paiement réussi
SELECT process_successful_payment(user_id, subscription_id, payment_id, 'pro', 2900);

-- Vérifier accès fonctionnalité
SELECT check_user_feature_access(user_id, 'calendar');
```

## 🔒 Sécurité (RLS)

Toutes les tables sensibles utilisent **Row Level Security** :

```sql
-- Exemple : Utilisateurs ne voient que leurs données
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);
```

**Permissions** :
- `anon` : Accès lecture seule aux plans
- `authenticated` : Accès à ses propres données
- `service_role` : Accès complet pour webhooks

## ⚡ Automatisations

### Triggers automatiques

1. **Création de compte** → Profil + usage initialisé automatiquement
2. **Mise à jour** → `updated_at` géré automatiquement  
3. **Validation usage** → Vérification des limites en temps réel
4. **Expiration trial** → Rétrogradation automatique au plan Starter

### Nettoyage automatique

- Activités > 90 jours → Supprimées
- Logs d'erreur résolus > 30 jours → Supprimés  
- Historique email > 1 an → Supprimé
- Comptes annulés > 6 mois → Anonymisés

## 🚀 Installation

### 1. Ordre d'exécution des scripts

```bash
# Dans Supabase SQL Editor (avec service_role)
1. supabase_schema.sql          # Tables de base
2. supabase-functions.sql       # Fonctions métier  
3. supabase-rpc-endpoints.sql   # Endpoints RPC
4. supabase-triggers.sql        # Automatisations
5. supabase-setup-complete.sql  # Setup final + données
```

### 2. Variables d'environnement

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# N8N
VITE_N8N_WEBHOOK_URL=https://n8n.domain.com/webhook-test/...
```

### 3. Configuration Stripe

1. Créer les produits/prix dans Stripe Dashboard
2. Remplacer les `stripe_price_id` dans la table `plans`
3. Configurer webhook Stripe vers `/api/webhooks/stripe`

### 4. Configuration N8N

1. Importer les workflows depuis `Backend_n8n/workflows.json`
2. Configurer les webhooks endpoints
3. Tester les connexions avec Supabase

## 🧪 Tests et validation

### Vérification installation

```sql
SELECT public.verify_installation();
```

**Résultat attendu** :
```json
{
  "installation_status": "success",
  "tables_created": 6,
  "functions_created": 15+,
  "plans_available": 3,
  "rls_enabled": true,
  "auth_configured": true
}
```

### Utilisateur de test (dev uniquement)

```
Email: test@boubaia.com  
Mot de passe: password123
Plan: Pro (trial 7 jours)
```

### Tests fonctionnels

```sql
-- Test création profil
SELECT rpc_authenticate_user('test@domain.com', 'pro');

-- Test vérification accès
SELECT rpc_check_access('messages');

-- Test dashboard
SELECT rpc_get_dashboard();

-- Test statistiques système
SELECT get_system_stats();
```

## 📊 Monitoring

### Logs d'erreur

```sql
-- Dernières erreurs
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10;

-- Erreurs par type
SELECT error_type, COUNT(*) 
FROM error_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type;
```

### Statistiques d'usage

```sql
-- Usage aujourd'hui
SELECT SUM(messages_count) as total_messages_today
FROM user_usage u
JOIN profiles p ON p.id = u.user_id  
WHERE u.last_reset_at::date = CURRENT_DATE;

-- Revenus du mois
SELECT SUM(amount/100) as revenue_eur
FROM payments
WHERE created_at >= date_trunc('month', CURRENT_DATE)
AND status = 'succeeded';
```

### Activité utilisateurs

```sql
-- Utilisateurs actifs (7 derniers jours)
SELECT COUNT(DISTINCT user_id) as active_users
FROM user_activities
WHERE timestamp > NOW() - INTERVAL '7 days';
```

## 🛠️ Maintenance

### Tâches régulières

```sql
-- Nettoyage manuel
SELECT auto_cleanup_expired_data();

-- Reset usage mensuel (1er du mois)
SELECT reset_monthly_usage();

-- Traitement trials expirés (quotidien)
SELECT handle_trial_expiration();
```

### Migration de plan

```sql
-- Migrer un utilisateur
SELECT migrate_user_to_plan(
    'user-uuid'::uuid, 
    'enterprise', 
    'upgrade_manual'
);
```

## 🚨 Résolution de problèmes

### Problèmes courants

**1. Erreur "User not found"**
```sql
-- Vérifier existence du profil
SELECT * FROM profiles WHERE email = 'user@domain.com';

-- Créer manuellement si nécessaire
SELECT rpc_authenticate_user('user@domain.com', 'starter');
```

**2. Paiement non traité**
```sql  
-- Vérifier logs de paiement
SELECT * FROM payments WHERE stripe_payment_intent_id = 'pi_xxx';

-- Retraiter manuellement
SELECT process_successful_payment(user_id, sub_id, payment_id, 'pro', 2900);
```

**3. Usage bloqué**
```sql
-- Reset usage utilisateur
UPDATE user_usage SET 
    messages_count = 0,
    last_reset_at = NOW()
WHERE user_id = 'user-uuid';
```

## 📞 Support

Pour toute question sur l'implémentation :

1. **Vérifier les logs** : `SELECT * FROM error_logs`
2. **Tester les endpoints** : Utiliser les fonctions `rpc_*`  
3. **Valider l'installation** : `SELECT verify_installation()`

---

## 🎉 Fonctionnalités Backend Disponibles

✅ **Authentification complète** avec profils automatiques  
✅ **Gestion des plans** dynamique depuis la base  
✅ **Paiements Stripe** avec validation webhooks  
✅ **Système d'usage** avec limites par plan  
✅ **Intégration N8N** pour agents IA  
✅ **Sécurité RLS** sur toutes les données  
✅ **Monitoring complet** avec logs et stats  
✅ **Nettoyage automatique** des données expirées  
✅ **API complète** pour le frontend React  

Le backend est **prêt pour la production** ! 🚀