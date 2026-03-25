# 🚀 Guide Pas-à-Pas - Déploiement Rapide Backend N8N

## 📋 Checklist Pré-Déploiement (5 min)

```bash
# 1. Vérifier les outils
✅ N8N installé et accessible
✅ Comptes créés : OpenAI, Airtable, Supabase, Stripe  
✅ Variables d'environnement configurées
✅ Bases Airtable créées avec bons IDs

# 2. Lancer le script de vérification
chmod +x Backend_n8n/setup-n8n.sh
./Backend_n8n/setup-n8n.sh
```

## 🛠️ ÉTAPE 1 : Configuration Supabase (10 min)

```bash
# 1.1 Exécuter le schéma étendu
# Dans Supabase SQL Editor, exécuter :
supabase_schema.sql

# 1.2 Ajouter les fonctions pour agents
# Exécuter :  
Backend_n8n/supabase-functions.sql

# 1.3 Vérifier les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'plans', 'subscriptions', 'user_activities');
```

## 🗂️ ÉTAPE 2 : Configuration Airtable (15 min)

```bash
# 2.1 Créer Base Finance (appbPZA132gTrGjty)
Tables requises :
├── Revenus (tblG3A1btJqIeofQC) 
├── Dépenses (tblinm2MCclT0BKPL)
└── Rapports (tblQ5c8XAwokoL4kr)

# 2.2 Créer Base Contacts (appUgfSiGIPdCo3a7) 
Table requise :
└── Contacts (tblIbQegC18u6FI7i)

# 2.3 Obtenir l'API Key Airtable
# Account > Developer Hub > Personal access tokens
```

**📚 Détails complets :** `Backend_n8n/airtable-schemas.md`

## ⚙️ ÉTAPE 3 : Configuration N8N (10 min)

```bash
# 3.1 Accéder à N8N Interface  
http://localhost:5678 (ou votre domaine)

# 3.2 Configurer les Credentials
Aller dans Settings > Credentials > Add Credential :

├── OpenAI API Key
├── Airtable Personal Access Token
├── Google OAuth2 (Gmail + Calendar)  
├── Supabase (URL + Service Role Key)
└── Tavily API Key (optionnel)

# 3.3 Importer le Workflow Principal
Workflows > Import from File > workflows.json
```

## 🔌 ÉTAPE 4 : Configuration API Backend (5 min)

```bash
# 4.1 Démarrer l'API Backend
cd api/
npm install
npm run dev  # Port 3001

# 4.2 Vérifier le démarrage
curl http://localhost:3001/health

# 4.3 Configurer les variables N8N si nécessaire
N8N_PAYMENT_WEBHOOK_URL=http://localhost:5678/webhook/payment-completed
N8N_PAYMENT_FAILED_WEBHOOK_URL=http://localhost:5678/webhook/payment-failed
```

## 🧪 ÉTAPE 5 : Tests et Validation (10 min)

```bash  
# 5.1 Lancer le script de test automatisé
chmod +x Backend_n8n/test-agents.sh
./Backend_n8n/test-agents.sh

# 5.2 Test manuel rapide
curl -X POST http://localhost:5678/webhook/7f338448-11b5-458c-ada3-f009feccc184 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour, quels agents sont disponibles ?",
    "user_id": "test-user", 
    "source": "manual-test"
  }'

# Réponse attendue : Liste des agents disponibles
```

## 🚀 ÉTAPE 6 : Démarrage Frontend (5 min)

```bash
# 6.1 Installer les dépendances
npm install

# 6.2 Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés

# 6.3 Démarrer le frontend  
npm run dev  # Port 5173

# 6.4 Tester l'interface complète
http://localhost:5173
```

## ✅ Validation Finale (5 min)

### Tests Manuels Rapides

```javascript
// 1. Test Email Agent  
"Envoie un email de test à contact@example.com"

// 2. Test Calendar Agent
"Crée un rendez-vous demain à 14h avec Jean"  

// 3. Test Contact Agent
"Ajoute le contact Marie Dupont, marie@example.com"

// 4. Test Finance Agent
"Ajoute une dépense de 100€ pour fournitures"

// 5. Test Recherche Web  
"Recherche les actualités sur l'IA"
```

### Vérifications Système

```bash
# Services actifs
✅ N8N : http://localhost:5678
✅ API Backend : http://localhost:3001  
✅ Frontend : http://localhost:5173
✅ Supabase : Connexion OK
✅ Airtable : API répondant
```

## 🔧 Dépannage Express

### Problème : Agents ne répondent pas
```bash
# Solution :
1. Vérifier N8N workflows actifs
2. Vérifier credentials dans N8N
3. Consulter logs N8N (Executions tab)
4. Tester avec ./Backend_n8n/test-agents.sh
```

### Problème : Erreurs Airtable  
```bash
# Solution :
1. Vérifier API Key Airtable
2. Confirmer IDs bases/tables corrects
3. Tester connexion : curl -H "Authorization: Bearer YOUR_KEY" \
   https://api.airtable.com/v0/meta/bases
```

### Problème : Erreurs Supabase
```bash
# Solution :  
1. Vérifier URL/Keys dans .env
2. Confirmer tables créées
3. Tester : curl "YOUR_SUPABASE_URL/rest/v1/profiles?select=*" \
   -H "apikey: YOUR_ANON_KEY"
```

### Problème : Frontend ne charge pas
```bash
# Solution :
1. Vérifier variables .env
2. npm run build puis npm run preview  
3. Consulter console navigateur (F12)
```

## 📊 Métriques de Réussite

Votre système est opérationnel quand :

```bash
✅ Script test-agents.sh : 100% réussite
✅ Frontend accessible et authentification fonctionnelle  
✅ Tous les agents répondent correctement
✅ Intégrations Airtable fonctionnelles
✅ Système de paiement testé (mode test Stripe)
```

## 🎯 Temps Total Estimé

```
Configuration Supabase    : 10 min
Configuration Airtable    : 15 min
Configuration N8N         : 10 min  
API Backend              : 5 min
Tests et Validation      : 10 min
Frontend                 : 5 min
─────────────────────────────────
TOTAL                    : ~55 min
```

## 📞 Support et Ressources

- **Guide Complet** : `Backend_n8n/GUIDE-DEPLOIEMENT-COMPLET.md`
- **Schémas DB** : `supabase_schema.sql` + `Backend_n8n/supabase-functions.sql`  
- **Configuration Airtable** : `Backend_n8n/airtable-schemas.md`
- **API Documentation** : `DEPLOYMENT-GUIDE.md`

---

🎉 **Félicitations !** Votre système Bouba'ia multi-agents est maintenant fonctionnel !

Testez avec des vraies requêtes comme :  
*"Envoie un email à mon équipe pour planifier une réunion demain, puis ajoute ça à mon calendrier et crée un contact pour le nouveau client ABC avec un budget de 5000€"*