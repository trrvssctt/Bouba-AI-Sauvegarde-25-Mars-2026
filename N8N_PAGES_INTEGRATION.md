# Bouba'ia × n8n — Comment chaque page utilise l'IA

> Document de référence : trace le chemin complet **Page → Hook → Endpoint backend → Webhook n8n → Workflow (DeepSeek) → Réponse** pour chaque module de Bouba'ia.
> Basé sur le code réel (`api/server.ts`, `src/hooks/*`, workflow SOPHIA v2.0). Mis à jour : juillet 2026.

---

## 1. Vue d'ensemble — les 3 canaux IA

Toutes les interactions IA du frontend passent par le backend (`api/server.ts`, port 3001). **Aucune page n'appelle n8n directement** — le backend fait proxy, vérifie l'authentification (cookie JWT) et les quotas du plan. Il existe 3 canaux distincts :

| Canal | Endpoint backend | Destination | Usage |
|---|---|---|---|
| **Chat complet** | `POST /api/chat` (~ligne 738) | Webhook n8n (par agent ou principal) | Conversation avec session, historique, mémoire |
| **Action de page** | `POST /api/bouba/action` (~ligne 1423) | Webhook n8n principal | Commande IA ponctuelle depuis une page (pas de session chat) |
| **Micro-génération** | `POST /api/ai/generate` (~ligne 2959) | **Gemini direct** (`gemini-1.5-flash`) — *ne passe PAS par n8n* | Petites tâches instantanées : résumé d'email, réponses suggérées |

```
┌──────────── Frontend ────────────┐      ┌────── Backend :3001 ──────┐      ┌───────── n8n ─────────┐
│ ChatInterface ──── useBouba ─────┼──►   │ POST /api/chat            │──►   │ Webhook agent détecté  │
│ BoubaWidget  ───── useBouba ─────┼──►   │  (détection d'agent,      │      │ ou webhook principal   │
│                                  │      │   quota, user_context)    │      │        │               │
│ EmailPage ──── useEmailAI ───┐   │      │                           │      │  SOPHIA AI v2.0        │
│ CalendarPage ─ useCalendarAI ┼───┼──►   │ POST /api/bouba/action    │──►   │  (DeepSeek + outils    │
│ ContactsPage ─ useContactAI  ┤   │      │  (via useBoubaAction)     │      │   Gmail/Calendar/…)    │
│ FinancePage ── useFinanceAI ─┘   │      │                           │      │        │               │
│                                  │      │ POST /api/ai/generate ────┼──► Gemini (hors n8n)          │
└──────────────────────────────────┘      └───────────────────────────┘      └── écrit en Postgres ───┘
```

---

## 2. Le canal principal : `POST /api/chat`

Utilisé par le **hook `useBouba`** (`src/hooks/useBouba.ts`). Étapes côté backend :

1. **Auth + quota** : identité prise du JWT (jamais du body). Vérification `messages_used` vs `messages_limit` du plan → `429 QUOTA_EXCEEDED` si dépassé (les admins sont exemptés).
2. **Session** : crée ou récupère la session (`createOrGetChatSession`), sauvegarde le message utilisateur dans `public.messages`, met à jour le titre au premier message.
3. **Anti prompt-injection** : `sanitizeForPromptInjection()` préfixe un avertissement si le message est suspect.
4. **Détection d'agent par mots-clés** (~ligne 799) :
   - `email/mail/inbox/boîte` → `email`
   - `calendrier/agenda/rendez-vous/rdv/réunion` → `calendar`
   - `contact/personne/client` → `contacts`
   - `finance/dépense/budget/transaction/argent/facture` → `finance`
5. **Sélection du webhook n8n** : `N8N_<AGENT>_WEBHOOK_URL` si défini, sinon repli sur `N8N_WEBHOOK_URL` (défaut : `https://n8n.realtechprint.com/webhook/7f338448-...`). En pratique actuelle, **tout part vers le webhook principal** (workflow SOPHIA) tant que les webhooks par agent ne sont pas renseignés dans `api/.env`.
6. **Contexte enrichi** envoyé à n8n dans `user_context` : nom/société/métier du profil, langue et ton préférés, **dernier message de Bouba** (pour résoudre « vas-y », « fais-le »), **mémoires persistantes** (`user_memory`), **passages pertinents de la base de connaissance** (documents uploadés, `searchKnowledge`).
7. **Payload envoyé au webhook** (format attendu par le workflow) — plafonné pour la latence : `history` max 6 messages tronqués à 600 caractères, `memories` max 15 × 300 caractères, base de connaissance max 3 passages × 800 caractères :
   ```json
   { "body": { "message", "userId", "sessionId", "conversation_id",
               "history", "user_context", "agent", "source", "role",
               "timestamp", "tokens_used" } }
   ```
8. **Appel n8n** : via `callN8nWebhook()` (`api/lib/n8n.ts`) — timeout **50 s** (AbortController), latence loggée `[n8n] <agent> <ms>` (warn si > 15 s). La réponse passe par le **parseur unique `parseN8nResponse()`** : tolère tableau/string JSON/string brute, honore le `success: false` renvoyé par n8n, ne lève jamais d'exception.
9. **Repli mode démo** : uniquement si le webhook est injoignable (404/réseau) — `generateSimulatedResponse()` renvoie le même format que le parseur, préfixé `🧪 (Mode démo — n8n indisponible)`. Un timeout renvoie une erreur propre, pas une simulation.
10. **Réponse au client d'abord** (format plat `{ success, output, agent, suggestions, actions, sessionId, mode }`), **puis** écritures asynchrones : sauvegarde du message assistant (`agent_used` normalisé par `normalizeAgent()`, contrainte CHECK `VALID_AGENTS`, compteur d'échecs loggé), quota et `usage_tracking` — consommés uniquement si `success === true`.

### Côté frontend (`useBouba`)

- Timeout de **60 s** (AbortController) avec message d'erreur dédié (le backend coupe à 50 s).
- Lit la réponse **déjà normalisée** via `parseBoubaApiResponse()` (`src/lib/boubaResponse.ts`) : `success` + `output`, point. `success === false` → bulle d'erreur rouge distincte (`isError`), jamais affichée comme une réponse normale de Bouba.
- Bloc `---SUGGESTIONS---` et balises `[ACTION:...]` : parsing tolérant (regex souples, try/catch — jamais de crash, une action qui échoue n'empêche pas l'affichage du texte).
- **Exécute les actions** renvoyées par l'IA :
  - Balises `[ACTION:CREATE_CONTACT name="…" email="…"]` → création dans `contactStore` ; `[ACTION:SEND_EMAIL to="…"]` → envoi via `emailStore`.
  - Actions structurées backend : `RELOAD_CONTACTS`, `NAVIGATE`, `OPEN_COMPOSE` (événement `bouba:compose` écouté par EmailPage).
- Notification in-app si l'utilisateur n'est pas sur l'onglet chat.

---

## 3. Le canal « action de page » : `POST /api/bouba/action`

Utilisé par le **hook partagé `useBoubaAction`** (`src/hooks/useBoubaAction.ts`) — c'est lui que les 4 hooks d'agents utilisent. Différences avec `/api/chat` :

- **Ne crée pas de session chat** : le résultat reste local à la page, rien n'est persisté dans `messages` (choix documenté dans le code). Envoie quand même `conversation_id` de la session courante pour la continuité mémoire côté n8n.
- Le paramètre `context` (données de page, balises `[EMAIL_TO]`…) est envoyé comme **champ séparé** du payload (contrat v3.0), tronqué à **4000 caractères** (backend + frontend).
- Route toujours vers le **webhook n8n principal** avec `source: 'page_action'` (ou `'admin'`).
- Même parseur unique, timeout 50 s backend / 60 s client, quota (429) — consommé uniquement si `success === true`.
- Le hook expose `isLoading`, `error`, `lastAgent` pour que chaque page affiche spinner et erreur propre.

---

## 4. Page par page

### 💬 Chat — `/dashboard/chat` (`ChatInterface.tsx`)

**Le cœur du produit.** Utilise `useBouba()` → `POST /api/chat` → n8n SOPHIA. Gère l'historique (10 derniers messages envoyés à n8n), les sessions persistées (`/api/conversations`), les suggestions cliquables, l'affichage de l'agent actif (badge EMAIL/CALENDAR/CONTACT/FINANCE), et l'exécution des actions IA (création de contact, envoi de mail directement depuis le chat).

### 🤖 BoubaWidget — global (`src/components/BoubaWidget.tsx`)

Widget flottant monté dans `App.tsx` (~ligne 305) sur toutes les pages du dashboard **sauf le chat** (`showWidget`), et dans `AdminLayout` avec `source="admin"`. Utilise `useBouba(source)` → même pipeline complet que le chat (`/api/chat` → n8n). C'est le même Bouba, accessible partout.

### 📧 Email — `/dashboard/email` (`EmailPage.tsx` + `useEmailAI`)

Double canal selon la tâche :

| Fonction | Canal | Détail |
|---|---|---|
| `generateSummary(email)` | `/api/ai/generate` → **Gemini** | Résumé instantané d'un email ouvert |
| `generateSmartReplies(email)` | `/api/ai/generate` → **Gemini** | 3 réponses rapides suggérées |
| `draftEmailFromPrompt(prompt)` | `callBouba` → **n8n** | Rédaction complète d'un brouillon (to/subject/body) |
| `sendEmailViaBouba(instruction)` | `callBouba` → **n8n** | Bouba envoie le mail via l'outil Gmail du workflow |

La synchronisation Gmail elle-même (lecture/envoi) ne passe pas par l'IA : endpoints `/api/google/gmail/*` (API Google directe avec les tokens OAuth stockés en base).

### 📅 Calendrier — `/dashboard/calendar` (`CalendarPage.tsx` + `useCalendarAI`)

- `processNaturalLanguageCommand(commande)` → `callBouba` avec en `context` la liste des événements existants (détection de conflits incluse) → n8n crée/modifie/supprime l'événement via les outils **Google Calendar** du workflow (CreateEvent, UpdateEvent, DeleteEvent, GetEvents).
- `generateDailyBriefing()` → `callBouba` → briefing du jour généré par l'IA.
- `syncGoogleCalendar()` → `/api/google/calendar/events` (API Google directe, pas d'IA) puis import en masse `/api/calendar/events/bulk`.

### 👥 Contacts — `/dashboard/contacts` (`ContactsPage.tsx` + `useContactAI`)

- `processContactCommand(commande)` → mix : parsing d'intention via `/api/ai/generate` (**Gemini**) puis exécution via `callBouba` (**n8n**) pour les actions.
- `addContactViaBouba` / `deleteContactViaBouba` → `callBouba` → n8n (sous-workflow Contact Agent 2.0).
- `syncGoogleContacts()` → `/api/google/contacts` (API Google directe) + `/api/contacts/bulk`.

### 💰 Finance — `/dashboard/finance` (`FinancePage.tsx` + `useFinanceAI`)

Tout passe par `callBouba` → **n8n** (sous-workflow Finance Agent 2.0) :

- `processFinanceCommand("j'ai reçu 500€")` → n8n renvoie une balise structurée `[TRANSACTION]{...}[/TRANSACTION]` que le hook parse pour créer la transaction dans le store.
- `generateMonthlyReport()` → rapport mensuel généré avec les transactions du mois passées en `context`.
- `generateDocument(type, détails)` → génération de devis/factures (brouillon structuré).
- `analyzeFinances(question)` → conseils, détection d'anomalies, projections.

### 🛠 Admin — `/admin/*` (`AdminLayout.tsx`)

`BoubaWidget source="admin"` → `/api/chat` → n8n route vers l'**AdminAgentInternal** du workflow (statistiques, gestion). Les admins ne consomment pas de quota.

---

## 5. Côté n8n : le workflow SOPHIA v3.0 (un seul agent)

> ⚠️ Refonte v3.0 (juillet 2026) : **un seul agent** avec tous les outils, plus de
> routeur JSON (Switch), plus d'inserts Postgres côté n8n. Le contrat webhook
> (URL, payload) est inchangé. Le fichier versionné dans `workflows/` peut
> encore refléter la v2.0 — faire un `n8nac pull` pour resynchroniser
> (voir `AGENTS.MD`, ne jamais reconstruire les chemins à la main).

```
Webhook (réception du payload backend)
  → Parse Input
    → Bouba Agent  ← agent unique (DeepSeek + mémoire 6 messages/session)
    │     outils : Gmail (lire/envoyer/répondre/brouillon/labels),
    │              Google Calendar (create/update/delete/get),
    │              Contacts, Finance, Tavily (recherche web), Calculator
    → Respond Success  /  Respond Error
```

Points clés :

- **Modèles** : DeepSeek (préférer `deepseek-chat`/`v4` à `deepseek-reasoner` — contrainte `reasoning_content`, voir `deepseek-reasoning-fix.md`).
- **Réponse UNIQUE** (succès comme erreur) : `{ success, output, message, agent, sessionId, tokens_used, type: "chat" }`. Les variantes par agent (`type: "email"`, `type: "calendar"`) **n'existent plus**. `success: false` = l'agent a planté, le message d'erreur utilisateur est dans `output`.
- **Persistance** : n8n n'écrit **plus rien** dans Postgres — c'est le backend qui sauvegarde le message utilisateur (avant l'appel) et le message assistant (après la réponse, en asynchrone). Migration de nettoyage des anciens doublons : `api/migrations/dedupe_messages.sql` (manuelle).
- **Envoi d'email depuis une page** : le workflow lit les balises exactes `[EMAIL_TO]…[/EMAIL_TO]`, `[EMAIL_SUBJECT]…[/EMAIL_SUBJECT]`, `[EMAIL_BODY_HTML]…[/EMAIL_BODY_HTML]` passées dans le champ `context` (composées par `sendEmailViaBouba` dans `useEmailAI`).
- **Outils admin** : non connectés en v3.0 — Bouba le dit lui-même (chantier futur).

---

## 6. Callbacks n8n → backend

Le workflow peut rappeler l'API (protégé par le header `x-n8n-secret` = `N8N_INTERNAL_SECRET`) :

| Endpoint | Rôle |
|---|---|
| `POST /api/chat/save-message` | Sauvegarder un message depuis n8n (alternative à l'insertion Postgres directe) |
| `POST /api/user-memory/n8n-save` | Enregistrer des faits mémorisés (`{ userId, memories: [{key, value}] }`) — réinjectés ensuite dans `user_context.memories` |
| `POST /api/n8n/user-activated` | Notification d'activation de compte après validation de paiement |

---

## 7. Variables d'environnement (api/.env)

```bash
N8N_WEBHOOK_URL=            # Webhook principal (SOPHIA) — repli pour tout
N8N_EMAIL_WEBHOOK_URL=      # Optionnel : webhook dédié agent email
N8N_CALENDAR_WEBHOOK_URL=   # Optionnel : webhook dédié agent calendrier
N8N_CONTACTS_WEBHOOK_URL=   # Optionnel : webhook dédié agent contacts
N8N_FINANCE_WEBHOOK_URL=    # Optionnel : webhook dédié agent finance
N8N_INTERNAL_SECRET=        # Secret partagé pour les callbacks n8n → API
GEMINI_API_KEY=             # Pour /api/ai/generate (résumés/smart replies email)
```

Sans `GEMINI_API_KEY`, `/api/ai/generate` renvoie des réponses par défaut codées en dur. Sans webhook n8n actif (404), `/api/chat` bascule en réponses simulées.

---

## 8. À retenir / pièges

- **Deux transports IA distincts** : n8n (DeepSeek, actions réelles) pour tout ce qui *agit*, Gemini direct pour les micro-générations *instantanées* de l'EmailPage/ContactsPage. Ne pas les confondre en débuggant.
- Le **routing par agent** dans `/api/chat` n'a d'effet que si les `N8N_*_WEBHOOK_URL` sont renseignés — sinon tout passe par SOPHIA qui fait son propre routage interne (Switch + sous-agents).
- Le serveur racine `server.ts` (port 8000) a aussi un mini-proxy chat n8n (`VITE_N8N_WEBHOOK_URL`) — usage secondaire, ne pas le confondre avec `api/server.ts`.
- Toute nouvelle valeur d'agent renvoyée par n8n doit être mappée dans `normalizeAgent()` (**`api/lib/n8n.ts`** — déplacé depuis server.ts), sinon l'INSERT dans `messages` échoue (contrainte CHECK).
- Timeouts en cascade : backend → n8n **50 s**, frontend → backend **60 s**. Les workflows n8n doivent répondre avant 50 s ; latence loggée côté backend (`[n8n] <agent> <ms>`, warn > 15 s).
- Ne jamais afficher une confirmation d'action si `success !== true` (règle « zéro faux succès »).
