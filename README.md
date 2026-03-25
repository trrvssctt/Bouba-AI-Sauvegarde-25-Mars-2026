# Bouba'ia - Assistant IA Multi-Agents

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Bouba'ia Banner" width="1200" height="475" />
</div>

## 🎯 Vue d'Ensemble

Bouba'ia est votre assistant IA multi-agents qui révolutionne votre productivité professionnelle. Il combine plusieurs agents spécialisés pour automatiser vos tâches quotidiennes : emails, calendrier, contacts, et finances.

### ✨ Fonctionnalités Principales

- 🤖 **4 Agents IA Spécialisés** : Email, Calendrier, Contacts, Finance
- 💳 **Système de Paiement Intégré** : Abonnements sécurisés via Stripe
- 🔐 **Authentification Robuste** : Supabase Auth avec gestion des profils
- 📊 **Tableau de Bord Avancé** : Interface moderne avec React 19
- 🔄 **Workflows N8N** : Automatisation backend avec validation des paiements

## 📋 Plans et Tarification

| Fonctionnalité | **Starter** | **Pro** | **Enterprise** |
|---|---|---|---|
| **Prix/mois** | **Gratuit** | **29€** | **99€** |
| **Agents IA** | 1 agent | 4 agents | Illimités |
| **Messages/mois** | 500 | 10,000 | Illimité |
| **Intégrations** | Gmail uniquement | Gmail + Calendrier + Contacts | Toutes |
| **Finance** | Non | Oui (Airtable) | Oui + Custom DB |
| **RAG/Vector Store** | Non | Oui (Pinecone) | Oui + Custom |
| **Recherche Web** | Non | Oui (Tavily) | Oui |
| **Mémoire** | Session | 30 jours | Illimitée |
| **Support** | Communauté | Email 48h | Dédié SLA 4h |
| **API Access** | Non | Non | Oui |
| **White-label** | Non | Non | Oui |

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+
- Compte Supabase
- Compte Stripe (pour les paiements)
- Instance N8N (optionnel)

### 1. Installation Frontend
```bash
# Cloner le projet
git clone https://github.com/votre-repo/boubaia.git
cd boubaia

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
```

### 2. Configuration Environment
```env
# Frontend (.env)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
```

### 3. Démarrage
```bash
# Démarrer le frontend
npm run dev

# Démarrer l'API backend (dans un autre terminal)
cd api/
npm install
npm run dev
```

## 🏗 Architecture Technique

### Frontend (React 19 + TypeScript)
- **Interface** : React 19 avec Tailwind CSS v4
- **Routing** : React Router avec routes protégées
- **State** : Hooks personnalisés pour auth/plans/paiements
- **UI** : Composants modulaires avec animations Framer Motion

### Backend API (Express.js + TypeScript)
- **Paiements** : Intégration Stripe complète
- **Webhooks** : Gestion des événements en temps réel
- **Database** : Supabase PostgreSQL avec RLS
- **Notifications** : Système N8N pour workflows

### Base de Données (Supabase)
```sql
-- Tables principales
- profiles (utilisateurs)
- plans (starter, pro, enterprise)
- subscriptions (abonnements actifs)
- payments (historique paiements)
- usage_tracking (suivi utilisation)
```

## 💳 Système de Paiement

### Flux de Paiement Complet
1. **Sélection Plan** → OnboardingPage avec choix du plan
2. **Checkout Stripe** → Redirection sécurisée vers Stripe
3. **Webhook Verification** → Validation automatique du paiement
4. **N8N Processing** → Activation du compte utilisateur
5. **Dashboard Access** → Accès aux fonctionnalités premium

### Endpoints API
```typescript
POST /api/stripe/create-checkout-session
POST /api/stripe/verify-payment
POST /api/stripe/cancel-subscription
POST /api/webhooks/stripe
```

## 🤖 Agents IA Disponibles

### 📧 Agent Email
- Gestion intelligente des emails
- Réponses automatiques
- Classification et tri
- Intégration Gmail

### 📅 Agent Calendrier  
- Planification automatique
- Gestion des rendez-vous  
- Synchronisation multi-calendriers
- Rappels intelligents

### 👤 Agent Contacts
- CRM intelligent
- Enrichissement automatique
- Suivi des interactions
- Segmentation avancée

### 💰 Agent Finance
- Suivi revenus/dépenses
- Rapports automatisés
- Intégration comptable
- Prédictions financières

## 📁 Structure du Projet

```
Bouba'ia/
├── src/
│   ├── components/         # Composants réutilisables
│   ├── hooks/             # Hooks personnalisés (auth, plans, paiements)
│   ├── pages/             # Pages principales
│   ├── lib/               # Utilitaires (Supabase, crypto, utils)
│   └── types/             # Types TypeScript
├── api/
│   ├── stripe.ts          # Endpoints Stripe
│   ├── stripe-webhook.ts  # Gestionnaire webhooks
│   └── server.ts          # Serveur Express
├── Backend_n8n/
│   ├── workflows.json     # Workflows N8N existants
│   └── payment-verification-workflow.json
└── supabase_schema.sql    # Schema complet base de données
```

## 🔧 Configuration Avancée

### Supabase Setup
1. Créer un nouveau projet Supabase
2. Exécuter `supabase_schema.sql` dans l'éditeur SQL
3. Configurer les policies RLS
4. Récupérer les clés API

### Stripe Setup  
1. Créer compte Stripe
2. Configurer les produits/prix (Starter/Pro/Enterprise)
3. Activer les webhooks
4. Récupérer les clés API

### N8N Setup (Optionnel)
1. Déployer instance N8N
2. Importer les workflows
3. Configurer les credentials Supabase
4. Tester les webhooks

## 📚 Documentation

- [Guide de Déploiement Complet](DEPLOYMENT-GUIDE.md)
- [Configuration N8N](Backend_n8n/README-N8N-Setup.md)
- [API Documentation](api/README.md)
- [Database Schema](supabase_schema.sql)

## 🛠 Développement

### Commandes Utiles
```bash
# Développement
npm run dev                # Frontend
npm run api:dev           # Backend API

# Build
npm run build             # Build production
npm run api:build         # Build API

# Tests
npm run test              # Tests unitaires
npm run test:e2e          # Tests e2e

# Linting
npm run lint              # ESLint
npm run type-check        # TypeScript
```

### Contribution
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. Push la branche (`git push origin feature/nouvelle-fonctionnalite`)  
5. Ouvrir une Pull Request

## 📞 Support

- **Documentation** : Consultez les guides dans `/docs`
- **Issues** : Ouvrez un ticket sur GitHub
- **Email** : support@boubaia.com
- **Discord** : Rejoignez notre communauté

## 📜 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">
  <strong>Bouba'ia - L'assistant IA qui transforme votre productivité</strong><br>
  Fait avec ❤️ par l'équipe Bouba'ia
</div>