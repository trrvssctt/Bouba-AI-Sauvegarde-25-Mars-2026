# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Le projet

**Bouba'ia** est un SaaS d'assistant IA multi-agents (en français) pour entrepreneurs, freelances et TPE. Un chat central orchestre 4 agents spécialisés — Email (Gmail), Calendrier, Contacts, Finance — qui **agissent** (envoyer un mail, créer un RDV, enregistrer une transaction) et pas seulement répondent. Modèle freemium via Stripe (Free/Starter/Pro/Enterprise), paiements Wave partiellement intégrés.

Documents de référence :
- `Etapes.MD` — feuille de route et état d'avancement (source de vérité sur ce qui est fait/en cours/manquant)
- `Attente_Bouba.MD` — spécification produit : intentions utilisateur et réponses attendues par module
- Le projet, ses commentaires et son UI sont en français.

## Commandes

```bash
# Frontend (racine, Vite sur :5173)
npm run dev
npm run build          # vite build
npm run lint           # tsc --noEmit (pas d'ESLint configuré)

# Backend API (le vrai serveur, port 3001)
cd api
npm run dev            # tsx watch server.ts
npm run build          # tsc
npm run type-check     # tsc --noEmit
```

Il n'y a pas de suite de tests automatisés. Les `test_*.sh` à la racine sont des scripts curl manuels.

Variables d'environnement : `.env.example` (racine, frontend + partagé) et `api/.env.example`. Le frontend cible l'API via `VITE_API_URL` (défaut `http://localhost:3001`, `/api` en prod).

## Architecture

### Deux serveurs Express — ne pas les confondre

- **`api/server.ts`** : le backend réel (~3200 lignes, port 3001). Monte les routeurs `api/auth.ts`, `api/data.ts`, `api/payments.ts`, `api/admin.ts` sur `/api/*`. C'est ici que vivent le chat, le proxy n8n, Stripe.
- **`server.ts`** (racine, port 8000) : serveur alternatif qui sert le frontend via le middleware Vite avec un proxy chat n8n minimal. Usage secondaire.
- Les dizaines de `api/server-*.js` sont des **itérations historiques abandonnées** — seule `api/server.ts` fait foi. Même logique côté pages : plusieurs variantes coexistent (`ChatPageSimple` vs `ChatPageReal`, etc.) ; vérifier dans `src/App.tsx` (~ligne 280+) quelles pages sont réellement routées avant de modifier.

### Flux IA : chat → détection d'agent → webhook n8n → DeepSeek

Le cœur du produit est dans `api/server.ts` autour de `/api/chat` (~ligne 740+), avec les utilitaires n8n dans **`api/lib/n8n.ts`** :
1. Détection de l'agent par mots-clés dans le message (email/calendar/contacts/finance).
2. Routage vers le webhook n8n de l'agent (`N8N_EMAIL_WEBHOOK_URL`, `N8N_CALENDAR_WEBHOOK_URL`, etc.), avec repli sur le webhook principal si non défini. Le champ `agent` est injecté dans le payload pour que les workflows filtrent.
3. Le workflow n8n **SOPHIA v3.0** (instance `n8n.realtechprint.com`) : un seul agent avec tous les outils, modèles **DeepSeek** (préférer `deepseek-chat` à `deepseek-reasoner` — voir `deepseek-reasoning-fix.md`). Réponse unique `{ success, output, agent, ... }` — `success: false` = erreur agent, message dans `output`. n8n n'écrit plus en base.
4. Tout appel n8n passe par `callN8nWebhook()` (timeout 50 s, latence loggée) et `parseN8nResponse()` (parseur unique, ne lève jamais) — `api/lib/n8n.ts`. Miroir frontend : `src/lib/boubaResponse.ts`.
5. Persistance : le backend sauvegarde le message utilisateur avant l'appel n8n, le message assistant après (asynchrone, post-réponse HTTP). `messages.agent_used` a une contrainte CHECK — valeurs valides dans `VALID_AGENTS` (`api/lib/n8n.ts`) ; toute nouvelle valeur d'agent doit passer par `normalizeAgent()`.
6. Voir `N8N_PAGES_INTEGRATION.md` pour le détail page par page (canaux, balises `[EMAIL_TO]`, plafonds de payload).

Les workflows n8n sont versionnés dans `workflows/` via **n8n-as-code** : voir `AGENTS.md`. Règle clé : toujours résoudre l'environnement actif avec `npx --yes n8nac env status --json` et utiliser le `workflowsPath` retourné ; ne jamais éditer `n8nac-config.json` à la main.

### Base de données

PostgreSQL direct (hébergé sur alwaysdata), pool `pg` dans `api/lib/db.ts`. **Attention** : le README et `api/lib/supabase.ts` mentionnent Supabase, mais le code réel utilise Postgres en direct — `src/lib/api.ts` est le wrapper REST qui a remplacé le client Supabase côté frontend. Schémas SQL de référence : `api/database-schema.sql`, migrations dans `api/migrations/` (à exécuter manuellement).

### Frontend

React 19 + TypeScript + Tailwind v4 + Vite. Organisation par domaine :
- `src/stores/` — un store Zustand par domaine (chatStore, emailStore, financeStore…)
- `src/hooks/` — un hook IA par agent (`useEmailAI`, `useCalendarAI`, `useFinanceAI`, `useContactAI`) + `useAuth`, `usePlans`, `useConnections` (OAuth Google)
- `src/lib/api.ts` — tous les appels REST passent par `apiCall()` ; auth par cookie JWT httpOnly (pas de token en localStorage)
- Routes protégées et layouts (utilisateur `/dashboard/*`, admin `/admin/*`) définis dans `src/App.tsx`

### Paiements

Stripe dans `api/payments.ts` + `api/stripe-webhook.ts`. Le webhook `/api/webhooks/stripe` est monté avec `raw` body **avant** le middleware JSON (`api/server.ts` ~ligne 360) — préserver cet ordre. Les webhooks Stripe déclenchent aussi les emails transactionnels (Resend, `api/lib/email.ts`).
