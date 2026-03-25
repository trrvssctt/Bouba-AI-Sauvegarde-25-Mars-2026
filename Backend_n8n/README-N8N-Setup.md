# Configuration N8N pour Bouba'ia

Ce guide vous aide à configurer N8N pour gérer les paiements et notifications de Bouba'ia.

## Installation N8N

### Option 1: Docker (Recommandé)
```bash
# Créer un répertoire pour N8N
mkdir n8n-boubaia
cd n8n-boubaia

# Créer docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme123
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
EOF

# Démarrer N8N
docker-compose up -d
```

### Option 2: NPM
```bash
npm install n8n -g
n8n start
```

## Configuration Supabase dans N8N

1. Accédez à N8N: http://localhost:5678
2. Allez dans **Credentials** > **Add Credential**
3. Sélectionnez **Supabase**
4. Configurez:
   - **Host**: Votre URL Supabase (ex: https://xxxxx.supabase.co)
   - **Service Role Secret**: Votre clé service_role de Supabase

## Importation des Workflows

### 1. Workflow Principal (Agent Orchestrateur)
- Importez `workflows.json` dans N8N
- Ce workflow contient tous les agents IA existants

### 2. Workflow de Vérification de Paiement
- Importez `payment-verification-workflow.json`
- Ce workflow gère la vérification des paiements Stripe

## Configuration des Webhooks

### Webhooks N8N à configurer:

1. **Payment Completed Webhook**
   - Path: `/payment-completed`
   - URL: `http://localhost:5678/webhook/payment-completed`
   
2. **Payment Failed Webhook**
   - Path: `/payment-failed` 
   - URL: `http://localhost:5678/webhook/payment-failed`

### Variables d'environnement pour l'API:

Ajoutez ces URLs dans votre fichier `.env`:

```env
# N8N Webhook URLs
N8N_PAYMENT_WEBHOOK_URL=http://localhost:5678/webhook/payment-completed
N8N_PAYMENT_FAILED_WEBHOOK_URL=http://localhost:5678/webhook/payment-failed
```

## Test des Workflows

### 1. Test du Webhook de Paiement Réussi
```bash
curl -X POST http://localhost:5678/webhook/payment-completed \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_completed",
    "user_id": "test-user-123", 
    "plan_id": "pro",
    "amount": 2900,
    "currency": "eur",
    "session_id": "cs_test_123",
    "customer_email": "test@example.com"
  }'
```

### 2. Test du Webhook de Paiement Échoué
```bash
curl -X POST http://localhost:5678/webhook/payment-failed \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_failed",
    "user_id": "test-user-123",
    "subscription_id": "sub_123",
    "amount": 2900,
    "currency": "eur"
  }'
```

## Monitoring

### Logs N8N
```bash
# Voir les logs Docker
docker-compose logs -f n8n

# Ou si installation NPM
tail -f ~/.n8n/logs/n8n.log
```

### Dashboard N8N
- Accédez à http://localhost:5678
- Vérifiez l'onglet **Executions** pour voir les workflows exécutés
- Consultez les logs pour debugger

## Tables Supabase Nécessaires

Le workflow utilise ces tables (déjà créées dans `supabase_schema.sql`):

- `profiles` - Pour activer les comptes utilisateur
- `notifications` - Pour envoyer des notifications
- `user_activities` - Pour logger les activités

## Sécurité

### Production
1. **Changez les mots de passe par défaut**
2. **Configurez HTTPS** pour N8N
3. **Restreignez l'accès** aux webhooks
4. **Utilisez des tokens d'authentification**

### Exemple de configuration sécurisée:
```yaml
# docker-compose.production.yml
environment:
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=${N8N_USER}
  - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
  - N8N_HOST=${DOMAIN}
  - N8N_PORT=443
  - N8N_PROTOCOL=https
  - WEBHOOK_URL=https://${DOMAIN}/
```

## Troubleshooting

### Problèmes courants:

1. **Webhook non accessible**
   - Vérifiez que N8N est démarré
   - Vérifiez les ports (5678 par défaut)
   - Vérifiez les URLs dans `.env`

2. **Erreur de connexion Supabase**
   - Vérifiez les credentials Supabase dans N8N
   - Vérifiez que la clé service_role est correcte

3. **Workflow ne s'exécute pas**
   - Vérifiez les logs N8N
   - Testez les webhooks manuellement
   - Vérifiez la structure JSON des requêtes

## Support

Pour obtenir de l'aide:
1. Consultez les logs N8N
2. Vérifiez la documentation N8N: https://docs.n8n.io/
3. Testez les endpoints avec curl ou Postman