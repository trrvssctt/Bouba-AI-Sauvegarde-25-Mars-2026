# 🤖 Bouba AI — Workflows n8n Améliorés

> Version: 3.0 — Avril 2026  
> Objectif: Faire de Bouba un IA compétent avec de solides bases pour les interactions clients

---

## 📋 Table des matières

1. [Architecture globale](#architecture-globale)
2. [Agents disponibles](#agents-disponibles)
3. [System prompts renforcés](#system-prompts-renforcés)
4. [Templates de réponses clients](#templates-de-réponses-clients)
5. [Gestion des références implicites](#gestion-des-références-implicites)
6. [Implémentation dans n8n](#implémentation-dans-n8n)

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK /api/chat                            │
│                    /api/bouba/action                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE: Parse Input                            │
│  - Extract: message, userId, sessionId, context, history        │
│  - Compute: user_name, user_company, user_memories              │
│  - Compute: last_bouba_message, history_text                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              NODE: Ultimate Assistant (LLM Agent)               │
│  - Model: DeepSeek Chat (ou Claude/GPT-4)                       │
│  - System Prompt: BOUBA_FULL_IDENTITY (voir ci-dessous)         │
│  - Tools: Email Agent, Calendar Agent, Contact Agent, Finance   │
│  - Output: JSON structuré {context_type, output, ...}           │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────┐
│ context_type=   │ │ context_  │ │ context_    │
│ "email"         │ │ type=     │ │ type=       │
│ → Email Agent   │ │ "calendar"│ │ "simple"    │
│                 │ │ → Calendar│ │ → Response  │
│                 │ │   Agent   │ │   directe   │
└─────────────────┘ └───────────┘ └─────────────┘
```

---

## Agents disponibles

### 1. **GENERAL Agent** (Ultimate Assistant)
- **Rôle**: Point d'entrée unique, routage intelligent
- **Output**: JSON `{context_type, output, ...}`
- **Quand**: Toutes les requêtes passent par lui en premier

### 2. **EMAIL Agent** (Workflow externe)
- **Rôle**: Lire, rechercher, organiser les emails
- **Input**: `{query, userId, sessionId}`
- **Output**: Liste d'emails, stats, actions

### 3. **CALENDAR Agent** (Workflow interne)
- **Rôle**: Créer, modifier, supprimer événements Google Calendar
- **Tools**: Create Event, Create Event with Attendee, Get Events, Update Event, Delete Event
- **Output**: Confirmation structurée

### 4. **CONTACT Agent** (Workflow externe)
- **Rôle**: Gérer les contacts (CRUD)
- **Input**: `{query, userId}`
- **Output**: Contacts listés/créés/modifiés

### 5. **FINANCE Agent** (Workflow externe)
- **Rôle**: Transactions, rapports, documents
- **Input**: `{query, userId}`
- **Output**: Données financières structurées

---

## System Prompts Renforcés

### Prompt Principal — Ultimate Assistant

```
Tu es BOUBA, assistant IA exécutif de Bouba'ia.

# IDENTITÉ ET TON
- Professionnel, chaleureux, efficace
- Tu tutoies naturellement
- Concis mais précis — pas de blabla inutile
- Tu appelles l'utilisateur par son prénom
- Français impeccable, phrases courtes et actives
- Emojis avec parcimonie: ✅ ❌ ⚠️ 📧 📅 💰 👤

# RÈGLES D'OR
1. Si tu ne sais pas, dis-le et propose une alternative
2. Si une action échoue, explique pourquoi + solution
3. Tu ne promets jamais ce que tu ne peux pas faire
4. Tu confirmes toujours après une action importante
5. Tu restes calme et professionnel face à une demande confuse

# CONTEXTE UTILISATEUR
- Nom: {{ user_name }}
- Entreprise: {{ user_company }}
- Rôle: {{ role }} (user/admin/superadmin)
- Mémoires: {{ user_memories }}
- Historique: {{ history_text }}
- Dernier message Bouba: {{ last_bouba_message }}

# RÉSOLUTION DES RÉFÉRENCES IMPLICITES
Si l'utilisateur dit "vas-y", "fais-le", "ok", "continue", "lance", "envoie", "confirme":
→ Consulte "Dernier message Bouba" + historique
→ Exécute DIRECTEMENT l'action prévue sans redemander
→ Si plusieurs actions: exécute la principale (la première)

# FORMATS DE RÉPONSE — JSON SUR UNE LIGNE

## Simple (question, info, calcul)
{"context_type":"simple","output":"ta réponse en markdown"}

## Email (envoi/rédaction)
{"context_type":"email","output":"ok","email_to":"dest@email.com","email_subject":"Objet","email_body":"<p>Corps HTML</p>"}

## Calendrier (créer/modifier/supprimer)
{"context_type":"calendar","output":"ok","event_action":"create","event_title":"Titre","event_start":"2026-04-28T14:00:00+02:00","event_end":"2026-04-28T15:00:00+02:00","event_location":"","event_description":"","event_attendees":""}

## Transaction (dépense/revenu)
{"context_type":"simple","output":"✅ Transaction enregistrée.[TRANSACTION]{\"type\":\"expense\",\"amount\":50000,\"category\":\"Loyer\",\"description\":\"Loyer avril\",\"date\":\"2026-04-28\"}[/TRANSACTION]"}

## Document (facture/devis)
{"context_type":"simple","output":"ok","document":{"number":"FAC-202604-0001","date":"2026-04-28","clientName":"Client SAS","items":[{"description":"Prestation","qty":1,"unitPrice":10000}],"vatRate":20,"status":"draft"}}

# RÈGLES DE ROUTAGE
- role=admin → context_type="admin"
- Email → context_type="email"
- Calendrier → context_type="calendar"
- Finance/Documents → context_type="simple" avec tag
- Reste → context_type="simple"

Date: {{ now }} | Source: {{ source }}
```

---

## Templates de Réponses Clients

### ✉️ Email — Relance client

```
Bonjour [Prénom],

Je me permets de te relancer concernant [sujet]. As-tu eu l'occasion d'y réfléchir ?

Je reste disponible pour en discuter.

Bien à toi,
[Signature]
```

### ✉️ Email — Remerciement

```
Bonjour [Prénom],

Merci beaucoup pour [raison]. J'apprécie particulièrement [détail spécifique].

[Suite si nécessaire]

Cordialement,
[Signature]
```

### 📅 Calendrier — Confirmation RDV

```
✅ **Réunion confirmée**

📅 [Titre]
🕐 [Date] à [Heure]
📍 [Lieu/Visio]
👥 [Participants]

Ordre du jour: [description]
```

### 💰 Finance — Rapport mensuel

```
📊 **Rapport financier — [Mois Année]**

**Revenus:** XX XXX FCFA (+X% vs mois dernier)
**Dépenses:** XX XXX FCFA
**Bénéfice net:** XX XXX FCFA

**Top dépenses:**
1. [Catégorie]: XX XXX FCFA
2. [Catégorie]: XX XXX FCFA

💡 **Conseil:** [Recommandation actionnable]
```

### 👤 Contact — Nouveau contact

```
✅ Contact **[Nom]** enregistré !
📧 [email]
📱 [téléphone]
🏢 [entreprise] — [poste]
```

---

## Gestion des Références Implicites

### Mécanisme

1. **Stockage**: Chaque message de Bouba est sauvegardé dans `last_bouba_message`
2. **Détection**: Le LLM détecte les expressions: "vas-y", "ok", "confirme", "fais-le"
3. **Résolution**: Le LLM consulte `last_bouba_message` + historique
4. **Exécution**: L'action est exécutée sans confirmation supplémentaire

### Exemples

| Utilisateur dit | Bouba comprend | Action |
|----------------|----------------|--------|
| "Vas-y" | "Crée le RDV de demain 14h" | Create Event |
| "Envoie-le" | "Envoie l'email à Marie" | Send Email |
| "Confirme" | "Enregistre la dépense de 50000" | Add Transaction |
| "Fais-le" | "Ajoute le contact Paul" | Create Contact |

---

## Implémentation dans n8n

### Étape 1: Importer le workflow

1. Ouvrir n8n → Workflows → Import
2. Charger `Bouba-ai_n8n_v3.json`
3. Mettre à jour les credentials:
   - DeepSeek API (ou Claude/GPT-4)
   - Google Calendar OAuth
   - PostgreSQL (messages, contacts, finances)

### Étape 2: Configurer les variables d'environnement

```bash
# n8n .env
DEEPSEEK_API_KEY=sk_...
N8N_WEBHOOK_URL=https://n8n.realtechprint.com/webhook/...
GOOGLE_CALENDAR_ID=diankaseydou52@gmail.com
DATABASE_URL=postgresql://...
```

### Étape 3: Tester les agents

```bash
# Test GENERAL
curl -X POST https://n8n.realtechprint.com/webhook/... \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour Bouba","userId":"...","sessionId":"..."}'

# Test CALENDAR
curl -X POST ... \
  -d '{"message":"Crée un RDV demain à 14h avec Marie","userId":"..."}'

# Test EMAIL
curl -X POST ... \
  -d '{"message":"Envoie un email à marie@example.com pour confirmer le RDV","userId":"..."}'
```

### Étape 4: Monitoring

Dashboard n8n → Executions → Filtrer par workflow
- Taux de succès > 95%
- Temps de réponse < 5s
- Tokens utilisés par requête

---

## Checklist de déploiement

- [ ] Importer workflow v3 dans n8n
- [ ] Mettre à jour credentials API
- [ ] Tester chaque agent séparément
- [ ] Valider résolution références implicites
- [ ] Configurer logs et monitoring
- [ ] Former l'équipe aux nouveaux templates
- [ ] Documenter les cas d'erreur courants
- [ ] Planifier review dans 2 semaines

---

**Document créé le:** 28 Avril 2026  
**Dernière mise à jour:** 28 Avril 2026  
**Prochaine review:** 12 Mai 2026
