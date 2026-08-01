import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : BOUBA — SOPHIA AI Ultimate Assistant v2.0
// Nodes   : 45  |  Connections: 24
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ParseInput                         set
// Tavilysearch                       toolHttpRequest            [ai_tool]
// Calculator                         toolCalculator             [ai_tool]
// DeepseekUltimateAssistant          lmChatDeepSeek             [creds] [ai_languageModel]
// Memory6Messages                    memoryBufferWindow         [ai_memory]
// PrepareResponse                    set
// CalendarAgentInternal              agent                      [AI] [onError→out(1)]
// DeepseekCalendar                   lmChatDeepSeek             [creds] [ai_languageModel]
// CalendarSuccess                    set
// CalendarError                      set
// UltimateAssistant1                 agent                      [AI]
// RespondToWebhook1                  respondToWebhook
// EmailAgent2                        toolWorkflow
// ContactAgent2                      toolWorkflow               [ai_tool]
// FinanceAgent2                      toolWorkflow               [ai_tool]
// CreateEventWithAttendee1           googleCalendarTool         [creds] [ai_tool]
// CreateEvent1                       googleCalendarTool         [creds] [ai_tool]
// GetEvents1                         googleCalendarTool         [creds] [ai_tool] [ai_tool]
// DeleteEvent1                       googleCalendarTool         [creds] [ai_tool]
// UpdateEvent1                       googleCalendarTool         [creds] [ai_tool]
// InsertRowsInATable                 postgres                   [creds]
// InsertRowsInATable1                postgres                   [creds]
// WebhookDeDebut                     webhook
// Switch_                            switch
// MarkUnread1                        gmailTool                  [creds] [ai_tool]
// LabelEmails1                       gmailTool                  [creds] [ai_tool]
// GetLabels1                         gmailTool                  [creds] [ai_tool]
// EmailReply1                        gmailTool                  [creds] [ai_tool]
// CreateDraft1                       gmailTool                  [creds] [ai_tool]
// GetEmails1                         gmailTool                  [creds] [ai_tool] [ai_tool]
// DeleteEmail1                       gmailTool                  [creds] [ai_tool]
// SendEmail1                         gmailTool                  [creds] [ai_tool]
// EmailError                         set
// EmailSuccess                       set
// DeepseekEmail                      lmChatDeepSeek             [creds] [ai_languageModel]
// EmailAgentInternal                 agent                      [AI] [onError→out(1)]
// InsertRowsInATable2                postgres                   [creds]
// InsertRowsInATable3                postgres                   [creds]
// RespondToWebhookMail               respondToWebhook
// RespondToWebhookCalendrier         respondToWebhook
// AdminAgentInternal                 agent                      [AI] [onError→out(1)]
// DeepseekAdmin                      lmChatDeepSeek             [creds] [ai_languageModel]
// AdminSuccess                       set
// AdminError                         set
// RespondToWebhookAdmin              respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookDeDebut
//    → ParseInput
//      → UltimateAssistant1
//        → PrepareResponse
//          → Switch_
//            → InsertRowsInATable1
//              → RespondToWebhook1
//           .out(1) → CalendarAgentInternal
//              → CalendarSuccess
//                → InsertRowsInATable3
//                  → RespondToWebhookCalendrier
//             .out(1) → CalendarError
//                → RespondToWebhookCalendrier (↩ loop)
//           .out(2) → EmailAgentInternal
//              → EmailSuccess
//                → InsertRowsInATable2
//                  → RespondToWebhookMail
//             .out(1) → EmailError
//                → RespondToWebhookMail (↩ loop)
//           .out(3) → AdminAgentInternal
//              → AdminSuccess
//                → RespondToWebhookAdmin
//             .out(1) → AdminError
//                → RespondToWebhookAdmin (↩ loop)
//    → InsertRowsInATable
//
// AI CONNECTIONS
// CalendarAgentInternal.uses({ ai_languageModel: DeepseekCalendar, ai_tool: [CreateEventWithAttendee1, CreateEvent1, GetEvents1, DeleteEvent1, UpdateEvent1] })
// UltimateAssistant1.uses({ ai_tool: [GetEvents1, Tavilysearch, Calculator, ContactAgent2, FinanceAgent2, GetEmails1], ai_languageModel: DeepseekUltimateAssistant, ai_memory: Memory6Messages })
// EmailAgentInternal.uses({ ai_tool: [GetEmails1, MarkUnread1, LabelEmails1, GetLabels1, EmailReply1, CreateDraft1, SendEmail1, DeleteEmail1], ai_languageModel: DeepseekEmail })
// AdminAgentInternal.uses({ ai_languageModel: DeepseekAdmin })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'vunsANcNZDPe5ytB',
    name: 'BOUBA — SOPHIA AI Ultimate Assistant v2.0',
    active: true,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        binaryMode: 'separate',
        availableInMCP: false,
        callerPolicy: 'workflowsFromSameOwner',
    },
})
export class BoubaSophiaAiUltimateAssistantV20Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '7d0afc0a-e031-4ab5-9a02-6c5a585bf13a',
        name: 'Parse Input',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-5872, -336],
    })
    ParseInput = {
        assignments: {
            assignments: [
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000001',
                    name: 'message',
                    value: '={{ $json.body.body?.message || $json.body.message || $json.body.body?.chatInput || $json.body.chatInput || "" }}',
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000002',
                    name: 'userId',
                    value: '={{ $json.body.body?.userId || $json.body.userId || "" }}',
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000003',
                    name: 'sessionId',
                    value: '={{ $json.body.body?.sessionId || $json.body.sessionId || "" }}',
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000004',
                    name: 'source',
                    value: '={{ $json.body.source || $json.body.body?.source || "direct" }}',
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000005',
                    name: 'conversation_id',
                    value: '={{ $json.body.body?.conversation_id || $json.body.conversation_id || $json.body.body?.sessionId || $json.body.sessionId || "" }}',
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000009',
                    name: 'role',
                    value: "={{ $json.body.body.role || 'user' }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000010',
                    name: 'role_id',
                    value: "={{ $json.body.body.role_id || '' }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000006',
                    name: 'direct_email_to',
                    value: "={{ (() => { const ctx = $json.body.body.context || ''; const m = ctx.match(/\\[EMAIL_TO\\]([\\s\\S]*?)\\[\\/EMAIL_TO\\]/); return m ? m[1].trim() : ''; })() }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000007',
                    name: 'direct_email_subject',
                    value: "={{ (() => { const ctx = $json.body.body.context || ''; const m = ctx.match(/\\[EMAIL_SUBJECT\\]([\\s\\S]*?)\\[\\/EMAIL_SUBJECT\\]/); return m ? m[1].trim() : ''; })() }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000008',
                    name: 'direct_email_body',
                    value: "={{ (() => { const ctx = $json.body.body.context || ''; const m = ctx.match(/\\[EMAIL_BODY_HTML\\]([\\s\\S]*?)\\[\\/EMAIL_BODY_HTML\\]/); return m ? m[1].trim() : ''; })() }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000011',
                    name: 'user_name',
                    value: "={{ $json.body.body.user_context?.name || '' }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000012',
                    name: 'user_company',
                    value: "={{ $json.body.body.user_context?.company || '' }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000013',
                    name: 'last_bouba_message',
                    value: "={{ $json.body.body.user_context?.last_bouba_message || '' }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000014',
                    name: 'user_memories',
                    value: "={{ (() => { try { const mems = $json.body.body.user_context?.memories || []; return mems.map(m => m.key + ': ' + (typeof m.value === 'object' ? JSON.stringify(m.value) : m.value)).join('\\n'); } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'a1b2c3d4-0001-0001-0001-000000000015',
                    name: 'history_text',
                    value: "={{ (() => { try { const h = $json.body.body.history || []; return h.map(m => (m.role === 'user' ? 'Utilisateur' : 'Bouba') + ': ' + m.content).join('\\n'); } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '824a5b3a-39e0-4600-a8c4-28df190c4408',
        name: 'tavilySearch',
        type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
        version: 1.1,
        position: [-4864, 384],
    })
    Tavilysearch = {
        toolDescription: 'Use this tool to search the internet for current, factual, or recent information.',
        method: 'POST',
        url: 'https://api.tavily.com/search',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `{
    "api_key": "{{ $env.TAVILY_API_KEY }}",
    "query": "{searchTerm}",
    "search_depth": "basic",
    "include_answer": true,
    "topic": "general",
    "include_raw_content": false,
    "max_results": 5
}`,
        placeholderDefinitions: {
            values: [
                {
                    name: 'searchTerm',
                    description: 'The search query based on what the user needs to find on the internet',
                    type: 'string',
                },
            ],
        },
    };

    @node({
        id: '1ac36f92-9778-4b75-b6ca-bd890208484e',
        name: 'calculator',
        type: '@n8n/n8n-nodes-langchain.toolCalculator',
        version: 1,
        position: [-4688, 64],
    })
    Calculator = {};

    @node({
        id: 'c2e508f7-ca9f-4a68-9561-421c437a57bd',
        name: 'DeepSeek — Ultimate Assistant',
        type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
        version: 1,
        position: [-5792, 112],
        credentials: { deepSeekApi: { id: '7xifHFmlSOW7XjwP', name: 'DeepSeek 5 Mars 2026' } },
    })
    DeepseekUltimateAssistant = {
        model: 'deepseek-v4-pro-flash',
        options: {
            maxTokens: 512,
            temperature: 0,
        },
    };

    @node({
        id: '7c76ff89-efb9-4d30-a146-95fb3393f9d0',
        name: 'Memory — 6 messages',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [-5632, 352],
    })
    Memory6Messages = {
        sessionIdType: 'customKey',
        sessionKey: "={{ $('Parse Input').item.json.sessionId }}",
        contextWindowLength: 6,
    };

    @node({
        id: '1ebec820-5717-4f18-8a29-27883d28f4c6',
        name: 'Prepare Response',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-5136, -912],
    })
    PrepareResponse = {
        assignments: {
            assignments: [
                {
                    id: 'pr-001',
                    name: 'userId',
                    value: "={{ $('Parse Input').item.json.userId }}",
                    type: 'string',
                },
                {
                    id: 'pr-002',
                    name: 'sessionId',
                    value: "={{ $('Parse Input').item.json.sessionId }}",
                    type: 'string',
                },
                {
                    id: 'pr-003',
                    name: 'conversation_id',
                    value: "={{ $('Parse Input').item.json.conversation_id }}",
                    type: 'string',
                },
                {
                    id: 'pr-004',
                    name: 'context_type',
                    value: "={{ (() => { if ($('Parse Input').item.json.direct_email_to) return 'email'; try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); const d = JSON.parse(clean); return d.context_type||'simple'; } catch(e) { return 'simple'; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-005',
                    name: 'output',
                    value: "={{ (() => { const raw = $('Ultimate Assistant1').item.json.output; try { const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); const d = JSON.parse(clean); return d.output || raw; } catch(e) { return raw; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-006',
                    name: 'email_to',
                    value: "={{ (() => { const direct = $('Parse Input').item.json.direct_email_to; if (direct) return direct; try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).email_to||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-007',
                    name: 'email_subject',
                    value: "={{ (() => { const direct = $('Parse Input').item.json.direct_email_subject; if (direct) return direct; try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).email_subject||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-008',
                    name: 'email_body',
                    value: "={{ (() => { const direct = $('Parse Input').item.json.direct_email_body; if (direct) return direct; try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).email_body||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-009',
                    name: 'email_query',
                    value: "={{ (() => { const to = $json.email_to; if (to) return 'Envoie cet email. À: '+to+'. Sujet: '+($json.email_subject||'')+'. Corps HTML: '+($json.email_body||''); return $json.output || $('Parse Input').item.json.message; })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-010',
                    name: 'event_action',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_action||'create'; } catch(e) { return 'create'; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-011',
                    name: 'event_title',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_title||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-012',
                    name: 'event_start',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_start||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-013',
                    name: 'event_end',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_end||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-014',
                    name: 'event_location',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_location||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-015',
                    name: 'event_description',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_description||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-016',
                    name: 'event_attendees',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_attendees||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-016b',
                    name: 'event_recurrence',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).event_recurrence||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-017',
                    name: 'calendar_query',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); const d = JSON.parse(clean); const a = d.event_action||'create'; let q = a+' cet événement. Titre: '+(d.event_title||'')+'. Début: '+(d.event_start||'')+'. Fin: '+(d.event_end||'')+'. Lieu: '+(d.event_location||'non spécifié')+'. Description: '+(d.event_description||'aucune')+'. Participants: '+(d.event_attendees||'aucun'); if(d.event_recurrence) q+='. Récurrence: '+d.event_recurrence; return q; } catch(e) { return $('Parse Input').item.json.message; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-018',
                    name: 'agent_used',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); const ct = JSON.parse(clean).context_type; if(ct==='email') return 'email'; if(ct==='calendar') return 'calendar'; return 'general'; } catch(e) { return 'general'; } })() }}",
                    type: 'string',
                },
                {
                    id: 'pr-019',
                    name: 'tokens_used',
                    value: 0,
                    type: 'number',
                },
                {
                    id: 'pr-020',
                    name: 'suggestion',
                    value: "={{ (() => { try { const raw = $('Ultimate Assistant1').item.json.output; const clean = raw.includes('```json') ? raw.split('```json')[1].split('```')[0].trim() : raw.trim(); return JSON.parse(clean).suggestion||''; } catch(e) { return ''; } })() }}",
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '205918bc-c70d-4564-894a-2c145c118fe7',
        name: 'Calendar Agent — Internal',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [-1856, -96],
        onError: 'continueErrorOutput',
    })
    CalendarAgentInternal = {
        promptType: 'define',
        text: '={{ $json.calendar_query }}',
        options: {
            systemMessage: `=# Overview
You are BOUBA Calendar Assistant.
Your role is to create, read, update, and delete events in the user's Google Calendar.

# Utilisateur
- Nom: {{ $('Parse Input').item.json.user_name || 'inconnu' }}
- Entreprise: {{ $('Parse Input').item.json.user_company || '' }}

# Mémoire contextuelle
{{ $('Parse Input').item.json.user_memories || '' }}

Historique récent:
{{ $('Parse Input').item.json.history_text || '' }}

Dernier message de Bouba:
{{ $('Parse Input').item.json.last_bouba_message || '' }}

# Résolution des références implicites
Si l'utilisateur dit "vas-y", "fais-le", "confirme", "crée-le", "ok" ou similaire :
→ Regarde "Dernier message de Bouba" et l'historique pour savoir quel événement créer/modifier/supprimer
→ Exécute DIRECTEMENT sans redemander confirmation

# Tools Available
- **Create Event with Attendee** — use when the event has participants
- **Create Event** — use for solo events (no attendees)
- **Get Events** — fetch events for a given date range
- **Update Event** — modify an existing event (must call Get Events first to get the event ID)
- **Delete Event** — remove an event (must call Get Events first to get the event ID)

# Rules
- Current date/time: {{ $now }}
- If no duration specified, assume 1 hour
- Always confirm the action performed with event title, date, and time
- For update/delete: always use Get Events first to find the correct event ID
- For events with participants: always use Create Event with Attendee
- Appelle l'utilisateur par son prénom quand c'est naturel

# Optimisation du planning
Si l'utilisateur demande "quand suis-je disponible ?", "trouve-moi un créneau", "réorganise ma journée" ou similaire :
1. Appelle Get Events sur la plage de dates demandée (ou aujourd'hui + 7 jours par défaut)
2. Analyse les créneaux occupés et identifie les plages libres (min. 30 minutes)
3. Propose 2-3 créneaux optimaux en tenant compte des horaires de travail (9h-18h)
4. Si des conflits existent, signale-les clairement et propose une solution
5. Réponds toujours avec un récapitulatif visuel du planning (heure par heure si demandé)

# Événements récurrents
Si la requête contient une récurrence (chaque lundi, tous les mardis, chaque semaine, etc.) :
→ Utilise Create Event ou Create Event with Attendee
→ Passe la règle RRULE dans le champ recurrenceRule :
  - Chaque lundi : RRULE:FREQ=WEEKLY;BYDAY=MO
  - Chaque jour : RRULE:FREQ=DAILY
  - Chaque semaine : RRULE:FREQ=WEEKLY
  - Chaque mois : RRULE:FREQ=MONTHLY
  - Chaque lundi et mercredi : RRULE:FREQ=WEEKLY;BYDAY=MO,WE
→ Si l'utilisateur précise une fin (ex: "jusqu'en juin"), ajoute UNTIL=YYYYMMDD à la RRULE

# Output
Return a clear confirmation in French:
- What was done (created/updated/deleted/retrieved)
- Event title
- Date and time
- Participants (if any)
- Mention la récurrence si applicable`,
        },
    };

    @node({
        id: '01493a96-495a-4139-a0e8-89cfe3f286b0',
        name: 'DeepSeek — Calendar',
        type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
        version: 1,
        position: [-2208, 304],
        credentials: { deepSeekApi: { id: '7xifHFmlSOW7XjwP', name: 'DeepSeek 5 Mars 2026' } },
    })
    DeepseekCalendar = {
        model: 'deepseek-v4-pro-flash',
        options: {
            maxTokens: 500,
            temperature: 0,
        },
    };

    @node({
        id: '56e2d337-c846-4c18-baf8-9305a4ff53aa',
        name: 'Calendar — Success',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-1168, -192],
    })
    CalendarSuccess = {
        assignments: {
            assignments: [
                {
                    id: 'cs-001',
                    name: 'response',
                    value: "={{ '✅ Tâche accomplie sur le calendrier : ' + $json.output }}",
                    type: 'string',
                },
                {
                    id: 'cs-002',
                    name: 'success',
                    value: true,
                    type: 'boolean',
                },
                {
                    id: 'cs-003',
                    name: 'agent',
                    value: 'calendar',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '2c4fc6c1-dafe-42a8-b383-5a4086362c82',
        name: 'Calendar — Error',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-1168, 16],
    })
    CalendarError = {
        assignments: {
            assignments: [
                {
                    id: 'cer-001',
                    name: 'response',
                    value: "❌ Erreur lors du traitement de l'agenda. Vérifiez la connexion Google Calendar.",
                    type: 'string',
                },
                {
                    id: 'cer-002',
                    name: 'success',
                    value: false,
                    type: 'boolean',
                },
                {
                    id: 'cer-003',
                    name: 'agent',
                    value: 'calendar',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '3a783447-709a-46e8-ac1d-767eefae264f',
        name: 'Ultimate Assistant1',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [-5584, -608],
    })
    UltimateAssistant1 = {
        promptType: 'define',
        text: '={{ $json.message }}',
        options: {
            systemMessage: `Tu es BOUBA, l'assistant d'intelligence proactive et le partenaire stratégique de l'utilisateur. Ton but ultime est la satisfaction client, l'excellence opérationnelle et la croissance de l'utilisateur.
Réponds TOUJOURS avec un JSON valide sur UNE SEULE LIGNE.
Date: {{ $now }} | User: {{ $json.userId }} | Source: {{ $('Parse Input').item.json.source }} | Role: {{ $('Parse Input').item.json.role }}

# TON D'EXCELLENCE
- Premium, élégant, visionnaire et extrêmement compétent. Tu es un partenaire de succès, pas un simple assistant.
- Proactivité radicale : Ne te contente pas de répondre, suggère toujours l'étape suivante logique.
- Si un utilisateur parle d'un client, prospect ou d'une opportunité, traite cela avec la plus haute importance.

# IDENTITÉ DE L'UTILISATEUR
- Nom: {{ $('Parse Input').item.json.user_name || 'inconnu' }}
- Entreprise: {{ $('Parse Input').item.json.user_company || 'non renseignée' }}

# MÉMOIRE CONTEXTUELLE
Voici ce que tu sais déjà sur cet utilisateur :
{{ $('Parse Input').item.json.user_memories || '(aucune mémoire enregistrée)' }}

Historique récent :
{{ $('Parse Input').item.json.history_text || '(début de conversation)' }}

Dernier message de Bouba :
{{ $('Parse Input').item.json.last_bouba_message || '(aucun message précédent)' }}

# RÈGLES DE COMPÉTENCE
1. Relation Client : Pour toute demande concernant un client (email, RDV, finance), propose systématiquement une action de suivi ("Voulez-vous que je prépare un compte-rendu ?", "Dois-je programmer une relance ?").
2. Onboarding : Si un nouveau client est mentionné, suggère de créer un dossier ou d'envoyer un email de bienvenue.
3. Résolution des références implicites : Si l'utilisateur dit "vas-y", "fais-le", "ok" → Réfère-toi à "Dernier message de Bouba" et exécute DIRECTEMENT.

# FORMATS DE RÉPONSE (JSON UNE SEULE LIGNE)
- Simple (question, recherche, calcul, contact, finance) : {"context_type":"simple","output":"ta réponse complète"}
- Transaction : {"context_type":"simple","output":"✅ Transaction enregistrée.[TRANSACTION]{"type":"expense/income","amount":0,"category":"...","description":"...","date":"YYYY-MM-DD","status":"completed"}[/TRANSACTION]"}
- Email : {"context_type":"email","output":"ok","email_to":"dest@email.com","email_subject":"Objet","email_body":"<p>Corps HTML</p>"} (Laisse email_to vide pour LIRE/CHERCHER)
- Calendrier : {"context_type":"calendar","output":"ok","event_action":"create","event_title":"Titre","event_start":"ISO","event_end":"ISO",...}
- Document [BTP/Facture/Devis] : {"context_type":"simple","output":"JSON du document sur une ligne"}

# RÈGLES CRITIQUES
- email (envoi) → objet français, HTML propre, écrit au nom de l'utilisateur.
- suggestion → ajoute TOUJOURS le champ "suggestion" avec une action de suivi pertinente.
- NE JAMAIS sortir autre chose que le JSON sur une ligne unique.`,
        },
    };

    @node({
        id: '66fe54be-77b5-4b92-bc58-6fe4f1391c39',
        name: 'Respond to Webhook1',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.4,
        position: [-2672, 160],
    })
    RespondToWebhook1 = {
        respondWith: 'json',
        responseBody:
            "={{ (() => { const p = $('Prepare Response').item.json; const r = { success: true, output: p.output, message: p.output, agent: p.agent_used, sessionId: p.sessionId, tokens_used: 0, type: 'chat' }; if(p.suggestion) r.suggestion = p.suggestion; return r; })() }}",
        options: {},
    };

    @node({
        id: '23ed318b-87e0-4f52-badc-bc973e74f8d9',
        name: 'Email Agent2',
        type: '@n8n/n8n-nodes-langchain.toolWorkflow',
        version: 2,
        position: [-5424, 528],
    })
    EmailAgent2 = {
        name: 'emailAgent',
        description:
            'Call this tool ONLY to read, search, get, label, mark, or list emails. NEVER use this tool to send, draft, or reply to emails — use context_type=email in your JSON response for those actions.',
        workflowId: {
            __rl: true,
            value: 'V53Zbm0BiM2o2KJ6',
            mode: 'list',
            cachedResultUrl: '/workflow/V53Zbm0BiM2o2KJ6',
            cachedResultName: 'Email Agent 2.0',
        },
        workflowInputs: {
            mappingMode: 'defineBelow',
            value: {
                query: '={{ $json.message }}',
                userId: "={{ $('Parse Input').item.json.userId }}",
                sessionId: "={{ $('Parse Input').item.json.sessionId }}",
                conversation_id: "={{ $('Parse Input').item.json.conversation_id }}",
            },
            matchingColumns: [],
            schema: [
                {
                    id: 'query',
                    displayName: 'query',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'userId',
                    displayName: 'userId',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'sessionId',
                    displayName: 'sessionId',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
    };

    @node({
        id: '6200d250-dada-4a7d-bd8a-26f2fd04f8b2',
        name: 'Contact Agent2',
        type: '@n8n/n8n-nodes-langchain.toolWorkflow',
        version: 2,
        position: [-5248, 352],
    })
    ContactAgent2 = {
        name: 'contactAgent',
        description:
            "Call this tool for any contact-related action: get, search, add, update contacts. Also call this FIRST when you need a person's email address before sending an email or creating a calendar event.",
        workflowId: {
            __rl: true,
            value: '4FJzc3QycgblrNf5',
            mode: 'list',
            cachedResultUrl: '/workflow/4FJzc3QycgblrNf5',
            cachedResultName: 'Contact Agent 2.0',
        },
        workflowInputs: {
            mappingMode: 'defineBelow',
            value: {
                query: '={{ $json.message }}',
                userId: "={{ $('Parse Input').item.json.userId }}",
                sessionId: "={{ $('Parse Input').item.json.sessionId }}",
                conversation_id: "={{ $('Parse Input').item.json.conversation_id }}",
            },
            matchingColumns: [],
            schema: [
                {
                    id: 'query',
                    displayName: 'query',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'userId',
                    displayName: 'userId',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'sessionId',
                    displayName: 'sessionId',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
    };

    @node({
        id: 'e11641a3-bb41-4caa-8ea6-ecd8fabe0f3a',
        name: 'Finance Agent2',
        type: '@n8n/n8n-nodes-langchain.toolWorkflow',
        version: 2.2,
        position: [-5104, 160],
    })
    FinanceAgent2 = {
        description:
            'Call this tool for ANY finance-related request: view revenues, view expenses, add a revenue entry, add an expense entry, generate a financial report, questions about profit, costs, margins, budget, or financial performance. Also call this tool for: financial advice ("est-ce que je dépense trop ?"), anomaly detection ("mes dépenses ont-elles augmenté ?"), financial projections ("prévois mes revenus du mois prochain"), spending recommendations, or any question about financial trends and performance.',
        workflowId: {
            __rl: true,
            value: 'KVL1jlMLhGHuAQ7N',
            mode: 'list',
            cachedResultUrl: '/workflow/KVL1jlMLhGHuAQ7N',
            cachedResultName: 'Finance Agent',
        },
        workflowInputs: {
            mappingMode: 'defineBelow',
            value: {
                query: '={{ $json.message }}',
                userId: "={{ $('Parse Input').item.json.userId }}",
                sessionId: "={{ $('Parse Input').item.json.sessionId }}",
                conversation_id: "={{ $('Parse Input').item.json.conversation_id }}",
            },
            matchingColumns: [],
            schema: [
                {
                    id: 'query',
                    displayName: 'query',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'userId',
                    displayName: 'userId',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'sessionId',
                    displayName: 'sessionId',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    readOnly: false,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
    };

    @node({
        id: 'f4d95be5-9d98-461c-b1ff-9a9a425d5a80',
        name: 'Create Event with Attendee1',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [-912, 480],
        credentials: { googleCalendarOAuth2Api: { id: 'KD3vou6hVtmfhP31', name: 'Google Calendar 09 Mars 2026' } },
    })
    CreateEventWithAttendee1 = {
        calendar: {
            __rl: true,
            value: 'diankaseydou52@gmail.com',
            mode: 'list',
            cachedResultName: 'diankaseydou52@gmail.com',
        },
        start: '={{ $fromAI("eventStart", "ISO 8601 start datetime") }}',
        end: '={{ $fromAI("eventEnd", "ISO 8601 end datetime") }}',
        additionalFields: {
            attendees: ['={{ $fromAI("eventAttendeeEmail", "attendee email address") }}'],
            summary: '={{ $fromAI("eventTitle", "event title") }}',
            description: '={{ $fromAI("eventDescription", "event description, leave empty if none") }}',
            location: '={{ $fromAI("eventLocation", "event location, leave empty if none") }}',
        },
    };

    @node({
        id: 'eaabd3f6-dda7-45d7-9079-62c2b37f50aa',
        name: 'Create Event1',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [-1328, 464],
        credentials: { googleCalendarOAuth2Api: { id: 'KD3vou6hVtmfhP31', name: 'Google Calendar 09 Mars 2026' } },
    })
    CreateEvent1 = {
        calendar: {
            __rl: true,
            value: 'diankaseydou52@gmail.com',
            mode: 'list',
            cachedResultName: 'diankaseydou52@gmail.com',
        },
        start: '={{ $fromAI("eventStart", "ISO 8601 start datetime") }}',
        end: '={{ $fromAI("eventEnd", "ISO 8601 end datetime") }}',
        additionalFields: {
            summary: '={{ $fromAI("eventTitle", "event title") }}',
            description: '={{ $fromAI("eventDescription", "event description, leave empty if none") }}',
            location: '={{ $fromAI("eventLocation", "event location, leave empty if none") }}',
        },
    };

    @node({
        id: 'fd3d48eb-2281-4c1a-a0a7-738550bb8c67',
        name: 'Get Events1',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [-1584, 560],
        credentials: { googleCalendarOAuth2Api: { id: 'KD3vou6hVtmfhP31', name: 'Google Calendar 09 Mars 2026' } },
    })
    GetEvents1 = {
        operation: 'getAll',
        calendar: {
            __rl: true,
            value: 'diankaseydou52@gmail.com',
            mode: 'list',
            cachedResultName: 'diankaseydou52@gmail.com',
        },
        timeMin: '={{ $fromAI("dayBefore", "start of the date range to search (day before requested date)") }}',
        timeMax: '={{ $fromAI("dayAfter", "end of the date range to search (day after requested date)") }}',
        options: {},
    };

    @node({
        id: '699da916-37c1-401a-9019-abbd4b152920',
        name: 'Delete Event1',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [-1792, 576],
        credentials: { googleCalendarOAuth2Api: { id: 'KD3vou6hVtmfhP31', name: 'Google Calendar 09 Mars 2026' } },
    })
    DeleteEvent1 = {
        operation: 'delete',
        calendar: {
            __rl: true,
            value: 'diankaseydou52@gmail.com',
            mode: 'list',
            cachedResultName: 'diankaseydou52@gmail.com',
        },
        eventId: '={{ $fromAI("eventId", "the Google Calendar event ID") }}',
        options: {},
    };

    @node({
        id: '7fd31f07-a2a1-4d21-869c-16f1bfede6b4',
        name: 'Update Event1',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [-2096, 496],
        credentials: { googleCalendarOAuth2Api: { id: 'KD3vou6hVtmfhP31', name: 'Google Calendar 09 Mars 2026' } },
    })
    UpdateEvent1 = {
        operation: 'update',
        calendar: {
            __rl: true,
            value: 'diankaseydou52@gmail.com',
            mode: 'list',
            cachedResultName: 'diankaseydou52@gmail.com',
        },
        eventId: '={{ $fromAI("eventId", "the Google Calendar event ID") }}',
        updateFields: {
            end: '={{ $fromAI("endTime", "new ISO 8601 end datetime, leave empty if not changing") }}',
            start: '={{ $fromAI("startTime", "new ISO 8601 start datetime, leave empty if not changing") }}',
            summary: '={{ $fromAI("eventTitle", "new event title, leave empty if not changing") }}',
            description: '={{ $fromAI("eventDescription", "new event description, leave empty if not changing") }}',
        },
    };

    @node({
        id: 'dc01dfbe-d2a1-4ce6-8a90-09e9eaffb82d',
        name: 'Insert rows in a table',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [-5680, -1280],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    InsertRowsInATable = {
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            value: 'messages',
            mode: 'list',
            cachedResultName: 'messages',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                tokens_used: '={{ $json.body.body.tokens_used }}',
                feedback: 0,
                user_id: "={{ (() => { const uid = $json.body.body.userId || ''; if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) return uid; return '00000000-0000-0000-0000-000000000000'; })() }}",
                content: '={{ $json.body.body.message }}',
                role: 'user',
                conversation_id: '={{ $json.body.body.conversation_id }}',
            },
            matchingColumns: ['id'],
            schema: [
                {
                    id: 'id',
                    displayName: 'id',
                    required: false,
                    defaultMatch: true,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                    removed: true,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'user_id',
                    displayName: 'user_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'role',
                    displayName: 'role',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'content',
                    displayName: 'content',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'agent_used',
                    displayName: 'agent_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'tokens_used',
                    displayName: 'tokens_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'feedback',
                    displayName: 'feedback',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'created_at',
                    displayName: 'created_at',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'dateTime',
                    canBeUsedToMatch: true,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        options: {
            continueOnFail: true,
        },
    };

    @node({
        id: '3a1214e9-10fe-4a16-a5c9-bda428847530',
        name: 'Insert rows in a table1',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [-3264, -128],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    InsertRowsInATable1 = {
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            value: 'messages',
            mode: 'list',
            cachedResultName: 'messages',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                tokens_used: 0,
                feedback: 0,
                conversation_id: "={{ $('Parse Input').item.json.conversation_id }}",
                user_id: "={{ (() => { const uid = $('Parse Input').item.json.userId || ''; if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) return uid; return '00000000-0000-0000-0000-000000000000'; })() }}",
                content: "={{ $('Prepare Response').item.json.output }}",
                role: 'assistant',
                agent_used: 'general',
            },
            matchingColumns: ['id'],
            schema: [
                {
                    id: 'id',
                    displayName: 'id',
                    required: false,
                    defaultMatch: true,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                    removed: true,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'user_id',
                    displayName: 'user_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'role',
                    displayName: 'role',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'content',
                    displayName: 'content',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'agent_used',
                    displayName: 'agent_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'tokens_used',
                    displayName: 'tokens_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'feedback',
                    displayName: 'feedback',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'created_at',
                    displayName: 'created_at',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'dateTime',
                    canBeUsedToMatch: true,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        options: {
            continueOnFail: true,
        },
    };

    @node({
        id: 'fc12cf6e-f058-440d-938d-14797334ecc2',
        webhookId: '7f338448-11b5-458c-ada3-f009feccc184',
        name: 'Webhook de début',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [-6304, -640],
    })
    WebhookDeDebut = {
        httpMethod: 'POST',
        path: '7f338448-11b5-458c-ada3-f009feccc184',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'b38b55c5-57cd-4670-8c87-bb988e8ab377',
        name: 'Switch',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [-4160, -752],
    })
    Switch_ = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.context_type }}',
                                rightValue: 'simple',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: 'sw-r0',
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Simple',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.context_type }}',
                                rightValue: 'calendar',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: 'sw-r1',
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Calendrier',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.context_type }}',
                                rightValue: 'email',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: 'sw-r2',
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Email',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.context_type }}',
                                rightValue: 'admin',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: 'sw-r3',
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Admin',
                },
            ],
        },
        options: {
            fallbackOutput: 0,
        },
    };

    @node({
        id: '94db0d3a-5281-4903-9ff6-75f27a064440',
        webhookId: '6f80d0a2-ecfa-4f0e-a7e5-92c6b9086eb8',
        name: 'Mark Unread1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-1296, -944],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    MarkUnread1 = {
        operation: 'markAsUnread',
        messageId: '={{ $fromAI("messageId", "the Gmail message ID to mark as unread") }}',
    };

    @node({
        id: 'f8c86bf6-1eea-4085-9dde-5adbdf4bce42',
        webhookId: '856f4bdb-b403-42c6-be3c-8fcbe3420eaa',
        name: 'Label Emails1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-1872, -832],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    LabelEmails1 = {
        operation: 'addLabels',
        messageId: '={{ $fromAI("messageId", "the Gmail message ID") }}',
        labelIds: '={{ $fromAI("labelId", "the Gmail label ID to apply") }}',
    };

    @node({
        id: '1ad6f8a6-a706-4102-ad16-85193c4169db',
        webhookId: '42bd2baa-cfc8-40d2-92d0-2e25565d1ab8',
        name: 'Get Labels1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-1424, -896],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    GetLabels1 = {
        resource: 'label',
        returnAll: true,
    };

    @node({
        id: '83f6320c-33ac-48d0-a62d-2c54b7a93697',
        webhookId: '673aa0aa-924d-449a-a931-2defb3d40338',
        name: 'Email Reply1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-2032, -864],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    EmailReply1 = {
        operation: 'reply',
        messageId: '={{ $fromAI("messageId", "the Gmail message ID to reply to") }}',
        message: '={{ $fromAI("emailBody", "complete HTML email body using the mandatory template") }}',
        options: {
            appendAttribution: false,
        },
    };

    @node({
        id: 'e68d8f8a-1882-469b-aa22-18fb208e694f',
        webhookId: 'b391ab0f-4207-421f-adc2-3a530d843f07',
        name: 'Create Draft1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-1712, -816],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    CreateDraft1 = {
        resource: 'draft',
        subject: '={{ $fromAI("subject", "email subject line") }}',
        emailType: 'html',
        message: '={{ $fromAI("emailBody", "complete HTML email body using the mandatory template") }}',
        options: {
            sendTo: '={{ $fromAI("emailAddress", "recipient email address") }}',
        },
    };

    @node({
        id: 'eed14c7e-7a8a-445c-bf7d-bf9b5d5f0ee4',
        webhookId: '090ad581-00f5-4379-8346-35ff4dd012ad',
        name: 'Get Emails1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-1552, -832],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    GetEmails1 = {
        operation: 'getAll',
        limit: '={{ $fromAI("limit", "number of emails to retrieve, default 10") }}',
        simple: false,
        filters: {
            sender: '={{ $fromAI("sender", "filter by sender email, leave empty for all") }}',
        },
        options: {},
    };

    @node({
        id: 'ed72f021-573c-49a4-86a3-50cf77866ce6',
        name: 'Delete Email1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-1400, -832],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    DeleteEmail1 = {
        operation: 'delete',
        messageId: '={{ $fromAI("messageId", "the Gmail message ID to delete") }}',
    };

    @node({
        id: 'ed72f021-573c-49a4-86a3-50cf77866ce5',
        webhookId: '335cbb41-b838-4f8d-918f-cb698feeda25',
        name: 'Send Email1',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.1,
        position: [-2192, -928],
        credentials: { gmailOAuth2: { id: 'zB8OzHLGuenMSZEo', name: 'Gmail 09 Mars 2026' } },
    })
    SendEmail1 = {
        sendTo: '={{ $fromAI("emailAddress", "recipient email address") }}',
        subject: '={{ $fromAI("subject", "email subject line") }}',
        message: '={{ $fromAI("emailBody", "complete HTML email body using the mandatory template") }}',
        options: {
            appendAttribution: false,
        },
    };

    @node({
        id: '6c893c28-9fa8-4444-bc28-1bad4df612db',
        name: 'Email — Error',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-176, -976],
    })
    EmailError = {
        assignments: {
            assignments: [
                {
                    id: 'ee-001',
                    name: 'response',
                    value: "❌ Erreur lors de l'envoi du mail. Vérifiez la connexion Gmail.",
                    type: 'string',
                },
                {
                    id: 'ee-002',
                    name: 'success',
                    value: false,
                    type: 'boolean',
                },
                {
                    id: 'ee-003',
                    name: 'agent',
                    value: 'email',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '7e6d3bb8-ba90-4018-a65e-e142e6577ec4',
        name: 'Email — Success',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-1120, -1088],
    })
    EmailSuccess = {
        assignments: {
            assignments: [
                {
                    id: 'es-001',
                    name: 'response',
                    value: '={{ $json.output }}',
                    type: 'string',
                },
                {
                    id: 'es-002',
                    name: 'success',
                    value: true,
                    type: 'boolean',
                },
                {
                    id: 'es-003',
                    name: 'agent',
                    value: 'email',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '32d91fd7-464f-4662-b7a6-b90727663909',
        name: 'DeepSeek — Email',
        type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
        version: 1,
        position: [-2448, -880],
        credentials: { deepSeekApi: { id: '7xifHFmlSOW7XjwP', name: 'DeepSeek 5 Mars 2026' } },
    })
    DeepseekEmail = {
        model: 'deepseek-v4-pro-flash',
        options: {
            maxTokens: 1500,
            temperature: 0.1,
        },
    };

    @node({
        id: '5934372d-206f-4d47-bca1-01c4fbaae82b',
        name: 'Email Agent — Internal',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [-1888, -1520],
        onError: 'continueErrorOutput',
    })
    EmailAgentInternal = {
        promptType: 'define',
        text: '={{ $json.email_query }}',
        options: {
            systemMessage: `Tu es l'assistant email de Bouba'ia. Tu rédiges et envoies des emails professionnels en HTML.

# Utilisateur
- Nom: {{ $('Parse Input').item.json.user_name || 'inconnu' }}
- Entreprise: {{ $('Parse Input').item.json.user_company || '' }}

# Mémoire contextuelle
{{ $('Parse Input').item.json.user_memories || '' }}

Historique récent:
{{ $('Parse Input').item.json.history_text || '' }}

Dernier message de Bouba:
{{ $('Parse Input').item.json.last_bouba_message || '' }}

# Résolution des références implicites
Si l'utilisateur dit "vas-y", "envoie", "fais-le", "ok", "confirme" ou similaire :
→ Regarde "Dernier message de Bouba" et l'historique pour identifier à qui envoyer, le sujet et le contenu
→ Envoie DIRECTEMENT l'email sans redemander confirmation

# OUTILS DISPONIBLES
- Send Email — envoyer un email
- Create Draft — sauvegarder un brouillon
- Get Emails — lire la boîte mail (TOUJOURS appeler en premier pour les analyses)
- Email Reply — répondre à un email (appeler Get Emails d'abord pour l'ID)
- Get Labels / Label Emails / Mark Unread — gestion des labels et statuts

# DÉTECTION EMAILS SANS RÉPONSE
Si l'utilisateur demande "quels mails n'ont pas de réponse ?" ou "relance non-réponses" ou similaire :
1. Appelle Get Emails avec limit=20 pour récupérer les emails récents
2. Identifie les fils de discussion où le dernier message est ENTRANT (de quelqu'un d'autre)
   → Ce sont des emails qui ATTENDENT une réponse
3. Identifie aussi les emails SORTANTS anciens (>3 jours) sans réponse reçue
   → Ce sont des relances potentielles
4. Présente la liste avec : expéditeur, sujet, date, urgence estimée
5. Propose de rédiger les relances automatiquement

# RÉSUMÉ ET PRIORISATION
Si l'utilisateur demande "résume mes emails" ou "emails importants" :
1. Appelle Get Emails avec limit=15
2. Filtre et classe par priorité : urgent (deadline/client/paiement) > important > info
3. Résume chaque email en 1 ligne max
4. Propose des actions concrètes pour chaque email prioritaire

# TEMPLATE HTML OBLIGATOIRE
Remplacer uniquement {{contenu_html}}. Ne jamais modifier la structure.

<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;font-size:15px;line-height:1.7;"><div style="padding:8px 0 24px;">{{contenu_html}}</div><div style="border-top:1px solid #e5e7eb;padding:12px 0;margin-top:8px;font-size:11px;color:#9ca3af;text-align:center;">Bouba\\'ia — Votre assistant exécutif IA | Ce message a été rédigé et envoyé automatiquement.</div></div>

# RÈGLES
- Langue : français uniquement
- L'email doit être écrit AU NOM DE L'UTILISATEUR — aucune mention de Bouba dans le corps
- Signature neutre (ex: "Cordialement") sans nom de marque
- Seul le footer du template est autorisé comme mention Bouba'ia
- Balises HTML autorisées dans contenu_html : <p> <br> <ul> <li> <strong>
- Date/heure actuelle : {{ $now }}
- Appelle l'utilisateur par son prénom quand c'est naturel`,
        },
    };

    @node({
        id: 'f844f67f-e81b-4b29-915e-679b13b497b1',
        name: 'Insert rows in a table2',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [-368, -1648],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    InsertRowsInATable2 = {
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            value: 'messages',
            mode: 'list',
            cachedResultName: 'messages',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                tokens_used: 0,
                feedback: 0,
                conversation_id: "={{ $('Parse Input').item.json.conversation_id }}",
                user_id: "={{ (() => { const uid = $('Parse Input').item.json.userId || ''; if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) return uid; return '00000000-0000-0000-0000-000000000000'; })() }}",
                content: '={{ $json.response }}',
                role: 'assistant',
                agent_used: 'email',
            },
            matchingColumns: ['id'],
            schema: [
                {
                    id: 'id',
                    displayName: 'id',
                    required: false,
                    defaultMatch: true,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                    removed: true,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'user_id',
                    displayName: 'user_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'role',
                    displayName: 'role',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'content',
                    displayName: 'content',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'agent_used',
                    displayName: 'agent_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'tokens_used',
                    displayName: 'tokens_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'feedback',
                    displayName: 'feedback',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'created_at',
                    displayName: 'created_at',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'dateTime',
                    canBeUsedToMatch: true,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        options: {
            continueOnFail: true,
        },
    };

    @node({
        id: '2bb8ee1d-c57d-4328-a639-fa336e7fe436',
        name: 'Insert rows in a table3',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [-704, -208],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    InsertRowsInATable3 = {
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            value: 'messages',
            mode: 'list',
            cachedResultName: 'messages',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                tokens_used: 0,
                feedback: 0,
                conversation_id: "={{ $('Parse Input').item.json.conversation_id }}",
                user_id: "={{ (() => { const uid = $('Parse Input').item.json.userId || ''; if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) return uid; return '00000000-0000-0000-0000-000000000000'; })() }}",
                content: '={{ $json.response }}',
                role: 'assistant',
                agent_used: 'calendar',
            },
            matchingColumns: ['id'],
            schema: [
                {
                    id: 'id',
                    displayName: 'id',
                    required: false,
                    defaultMatch: true,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                    removed: true,
                },
                {
                    id: 'conversation_id',
                    displayName: 'conversation_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'user_id',
                    displayName: 'user_id',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'role',
                    displayName: 'role',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'content',
                    displayName: 'content',
                    required: true,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'agent_used',
                    displayName: 'agent_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'string',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'tokens_used',
                    displayName: 'tokens_used',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'feedback',
                    displayName: 'feedback',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'number',
                    canBeUsedToMatch: true,
                },
                {
                    id: 'created_at',
                    displayName: 'created_at',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    type: 'dateTime',
                    canBeUsedToMatch: true,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        options: {
            continueOnFail: true,
        },
    };

    @node({
        id: '4b1bf6db-068f-4885-baa6-21795b5e7fb0',
        name: 'Respond to Webhook Mail',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.4,
        position: [768, -1296],
    })
    RespondToWebhookMail = {
        respondWith: 'json',
        responseBody:
            "={{ (() => { try { const r = $('Email — Success').item.json.response; return { success: true, output: r, message: r, agent: 'email', sessionId: $('Parse Input').item.json.sessionId, type: 'email', tokens_used: 0 }; } catch(e) { const r = ($('Email — Error').item.json.response) || 'Erreur lors de l\\'envoi du mail'; return { success: false, output: r, message: r, agent: 'email', sessionId: $('Parse Input').item.json.sessionId, type: 'email', tokens_used: 0 }; } })() }}",
        options: {},
    };

    @node({
        id: '327eafea-1842-44ac-87a2-058446f45fc0',
        name: 'Respond to Webhook Calendrier',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.4,
        position: [-448, 192],
    })
    RespondToWebhookCalendrier = {
        respondWith: 'json',
        responseBody:
            "={{ (() => { try { const r = $('Calendar — Success').item.json.response; return { success: true, output: r, message: r, agent: 'calendar', sessionId: $('Parse Input').item.json.sessionId, type: 'calendar', tokens_used: 0 }; } catch(e) { const r = ($('Calendar — Error').item.json.response) || 'Erreur traitement calendrier'; return { success: false, output: r, message: r, agent: 'calendar', sessionId: $('Parse Input').item.json.sessionId, type: 'calendar', tokens_used: 0 }; } })() }}",
        options: {},
    };

    @node({
        id: 'df96f533-1cbb-45d9-b1c6-4b706261ae8e',
        name: 'Admin Agent — Internal',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [384, -624],
        onError: 'continueErrorOutput',
    })
    AdminAgentInternal = {
        promptType: 'define',
        text: "={{ $('Prepare Response').item.json.output }}",
        options: {
            systemMessage: `=# Overview
Tu es BOUBA Admin Assistant. Tu aides les administrateurs et super-administrateurs de la plateforme BOUBA à gérer les utilisateurs, la facturation, les logs et à produire des rapports.

# Contexte de l'appelant
- Date: {{ $now }}
- Admin ID: {{ $('Parse Input').item.json.userId }}
- Rôle: {{ $('Parse Input').item.json.role }} (admin ou superadmin)
- Source: {{ $('Parse Input').item.json.source }}
- Nom: {{ $('Parse Input').item.json.user_name || 'inconnu' }}

# Mémoire contextuelle
{{ $('Parse Input').item.json.user_memories || '' }}

Historique récent:
{{ $('Parse Input').item.json.history_text || '' }}

Dernier message de Bouba:
{{ $('Parse Input').item.json.last_bouba_message || '' }}

# Résolution des références implicites
Si l'admin dit "vas-y", "fais-le", "confirme", "lance" ou similaire :
→ Regarde "Dernier message de Bouba" et l'historique pour identifier l'action à effectuer
→ Exécute DIRECTEMENT sans redemander confirmation

⚠️ Seuls les utilisateurs avec role=admin ou role=superadmin ont accès à ce module. Ne jamais traiter une demande de gestion de plateforme si le rôle n'est pas admin/superadmin.

# Outils disponibles
- **adminGetUsers** — récupère la liste des utilisateurs avec leur plan, statut, role_id et usage
- **adminGetUserById** — récupère les détails d'un utilisateur spécifique par son ID ou email
- **adminUpdateUser** — met à jour le plan ou le statut d'un utilisateur (suspend, réactive, change de plan)
- **adminGetBillingStats** — récupère les stats de facturation (MRR, impayés, transactions)
- **adminGetUsageLogs** — récupère les logs d'exécution n8n avec statut et erreurs

# Capacités
- Analyser les logs d'erreurs et identifier les patterns
- Rédiger des emails de relance personnalisés pour les utilisateurs en impayé (via Gmail de l'admin)
- Produire des rapports narratifs de croissance (MRR, rétention, utilisation par agent)
- Suggérer des actions correctives basées sur les données
- Rédiger des messages de support ou d'annonce broadcast
- Identifier les utilisateurs avec rôle spécifique (admin vs user) et adapter les réponses

# Comportement selon le rôle
- role=admin : accès complet aux outils, peut lire et modifier les données utilisateurs
- role=superadmin : mêmes droits + peut modifier les rôles des autres utilisateurs

# Règles
- Réponds TOUJOURS en français
- Si tu envoies un email via Gmail, confirme l'action avec le destinataire et le sujet
- Pour les actions sensibles (suspension, changement de rôle), récapitule ce que tu vas faire avant d'agir
- Sois concis et orienté action dans tes réponses`,
        },
    };

    @node({
        id: '9e3a3204-e7ad-4d71-84b6-cf94f5e82f80',
        name: 'DeepSeek — Admin',
        type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
        version: 1,
        position: [384, -224],
        credentials: { deepSeekApi: { id: '7xifHFmlSOW7XjwP', name: 'DeepSeek 5 Mars 2026' } },
    })
    DeepseekAdmin = {
        model: 'deepseek-v4-pro-flash',
        options: {
            maxTokens: 1024,
            temperature: 0,
        },
    };

    @node({
        id: 'ad2832b5-c830-4382-af45-719caaaf6be5',
        name: 'Admin — Success',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [1584, -720],
    })
    AdminSuccess = {
        assignments: {
            assignments: [
                {
                    id: 'adm-s-001',
                    name: 'response',
                    value: '={{ $json.output }}',
                    type: 'string',
                },
                {
                    id: 'adm-s-002',
                    name: 'success',
                    value: true,
                    type: 'boolean',
                },
                {
                    id: 'adm-s-003',
                    name: 'agent',
                    value: 'admin',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'fa94e13d-4c4f-4ebd-97c3-bdfe987013a6',
        name: 'Admin — Error',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [1584, -512],
    })
    AdminError = {
        assignments: {
            assignments: [
                {
                    id: 'adm-e-001',
                    name: 'response',
                    value: '❌ Erreur lors du traitement de la requête admin. Réessayez dans quelques instants.',
                    type: 'string',
                },
                {
                    id: 'adm-e-002',
                    name: 'success',
                    value: false,
                    type: 'boolean',
                },
                {
                    id: 'adm-e-003',
                    name: 'agent',
                    value: 'admin',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '2b086c16-be8b-4a0d-b941-d0777ed9ffd9',
        name: 'Respond to Webhook Admin',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.4,
        position: [1984, -624],
    })
    RespondToWebhookAdmin = {
        respondWith: 'json',
        responseBody:
            "={{ { success: $json.success, output: $json.response, message: $json.response, agent: 'admin', sessionId: $('Prepare Response').item.json.sessionId, tokens_used: 0, type: 'chat' } }}",
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ParseInput.out(0).to(this.UltimateAssistant1.in(0));
        this.PrepareResponse.out(0).to(this.Switch_.in(0));
        this.CalendarAgentInternal.out(0).to(this.CalendarSuccess.in(0));
        this.CalendarAgentInternal.out(1).to(this.CalendarError.in(0));
        this.CalendarSuccess.out(0).to(this.InsertRowsInATable3.in(0));
        this.CalendarError.out(0).to(this.RespondToWebhookCalendrier.in(0));
        this.UltimateAssistant1.out(0).to(this.PrepareResponse.in(0));
        this.InsertRowsInATable1.out(0).to(this.RespondToWebhook1.in(0));
        this.WebhookDeDebut.out(0).to(this.ParseInput.in(0));
        this.WebhookDeDebut.out(0).to(this.InsertRowsInATable.in(0));
        this.Switch_.out(0).to(this.InsertRowsInATable1.in(0));
        this.Switch_.out(1).to(this.CalendarAgentInternal.in(0));
        this.Switch_.out(2).to(this.EmailAgentInternal.in(0));
        this.Switch_.out(3).to(this.AdminAgentInternal.in(0));
        this.EmailError.out(0).to(this.RespondToWebhookMail.in(0));
        this.EmailSuccess.out(0).to(this.InsertRowsInATable2.in(0));
        this.EmailAgentInternal.out(0).to(this.EmailSuccess.in(0));
        this.EmailAgentInternal.out(1).to(this.EmailError.in(0));
        this.InsertRowsInATable2.out(0).to(this.RespondToWebhookMail.in(0));
        this.InsertRowsInATable3.out(0).to(this.RespondToWebhookCalendrier.in(0));
        this.AdminAgentInternal.out(0).to(this.AdminSuccess.in(0));
        this.AdminAgentInternal.out(1).to(this.AdminError.in(0));
        this.AdminSuccess.out(0).to(this.RespondToWebhookAdmin.in(0));
        this.AdminError.out(0).to(this.RespondToWebhookAdmin.in(0));

        this.CalendarAgentInternal.uses({
            ai_languageModel: this.DeepseekCalendar.output,
            ai_tool: [
                this.CreateEventWithAttendee1.output,
                this.CreateEvent1.output,
                this.GetEvents1.output,
                this.DeleteEvent1.output,
                this.UpdateEvent1.output,
            ],
        });
        this.UltimateAssistant1.uses({
            ai_languageModel: this.DeepseekUltimateAssistant.output,
            ai_memory: this.Memory6Messages.output,
            ai_tool: [
                this.GetEvents1.output,
                this.Tavilysearch.output,
                this.Calculator.output,
                this.ContactAgent2.output,
                this.FinanceAgent2.output,
                this.GetEmails1.output,
            ],
        });
        this.EmailAgentInternal.uses({
            ai_languageModel: this.DeepseekEmail.output,
            ai_tool: [
                this.GetEmails1.output,
                this.MarkUnread1.output,
                this.LabelEmails1.output,
                this.GetLabels1.output,
                this.EmailReply1.output,
                this.CreateDraft1.output,
                this.SendEmail1.output,
                this.DeleteEmail1.output,
            ],
        });
        this.AdminAgentInternal.uses({
            ai_languageModel: this.DeepseekAdmin.output,
        });
    }
}
