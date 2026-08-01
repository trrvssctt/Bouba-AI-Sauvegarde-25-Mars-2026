import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : BOUBA — SOPHIA Daily Briefing
// Nodes   : 9  |  Connections: 8
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// DailySchedule                      scheduleTrigger
// GetActiveUsers                     postgres                   [creds]
// ProcessUsers                       splitInBatches
// GetTodayEvents                     googleCalendar             [creds]
// GetUnreadEmails                    gmail
// GetFinanceSummary                  postgres                   [creds]
// BriefingAgent                      agent                      [AI]
// DeepseekModel                      lmChatDeepSeek             [creds] [ai_languageModel]
// CreateNotification                 postgres                   [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DailySchedule
//    → GetActiveUsers
//      → ProcessUsers
//        → GetTodayEvents
//          → GetUnreadEmails
//            → GetFinanceSummary
//              → BriefingAgent
//                → CreateNotification
//                  → ProcessUsers (↩ loop)
//
// AI CONNECTIONS
// BriefingAgent.uses({ ai_languageModel: DeepseekModel })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'f4CTQm3e3Af979Eq',
    name: 'BOUBA — SOPHIA Daily Briefing',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class BoubaSophiaDailyBriefingWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '889a302f-6d31-4212-a948-1ddad91195ab',
        name: 'Daily Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.1,
        position: [0, 0],
    })
    DailySchedule = {
        rule: {
            interval: [
                {
                    field: 'hours',
                },
            ],
        },
    };

    @node({
        id: 'bcae52d6-3285-44c9-bdd1-257bce8f5a60',
        name: 'Get Active Users',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [208, 0],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    GetActiveUsers = {
        operation: 'select',
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            mode: 'list',
            value: 'profiles',
        },
        where: {
            values: [
                {
                    column: 'subscription_status',
                    value: 'active',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '8dd0271d-c596-48a0-8cca-ea67db95eea3',
        name: 'Process Users',
        type: 'n8n-nodes-base.splitInBatches',
        version: 1,
        position: [400, 0],
    })
    ProcessUsers = {
        batchSize: 1,
        options: {},
    };

    @node({
        id: 'b0d78524-ecd8-46be-a28f-f695cff91365',
        name: 'Get Today Events',
        type: 'n8n-nodes-base.googleCalendar',
        version: 1,
        position: [608, -96],
        credentials: { googleCalendarOAuth2Api: { id: 'KD3vou6hVtmfhP31', name: 'Google Calendar 09 Mars 2026' } },
    })
    GetTodayEvents = {
        operation: 'getAll',
        calendar: {
            __rl: true,
            value: 'primary',
            mode: 'list',
        },
        options: {},
    };

    @node({
        id: '48442cd4-b752-4fb7-92bc-9785d26aacc4',
        webhookId: 'd4868eaf-0e90-4948-84e7-6632eb0f5a03',
        name: 'Get Unread Emails',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [816, -224],
    })
    GetUnreadEmails = {
        resource: 'message',
        operation: 'getAll',
        limit: 10,
        filters: {
            q: 'is:unread after:{{ $now.minus({ days: 1 }).toISODate() }}',
        },
        simple: true,
    };

    @node({
        id: '81a59119-8f36-4ef1-a042-d2bbe715c23d',
        name: 'Get Finance Summary',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1008, -96],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    GetFinanceSummary = {
        operation: 'executeQuery',
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            mode: 'list',
            value: 'transactions',
        },
        query: `SELECT COALESCE(SUM(amount), 0) as total, type 
            FROM public.transactions 
            WHERE user_id = '={{ $node["Process Users"].json.user_id }}' 
              AND date >= DATE_TRUNC('month', CURRENT_DATE) 
            GROUP BY type`,
        options: {},
    };

    @node({
        id: '66d3e116-c9e4-49fb-9eca-2821074bf5f4',
        name: 'Briefing Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.7,
        position: [1296, -144],
    })
    BriefingAgent = {
        promptType: 'define',
        text: '={{ "Génère un briefing matinal pour " + $node["Process Users"].json.first_name + ". Voici ses données du jour." }}',
        options: {
            systemMessage: `Tu es BOUBA (SOPHIA), l'assistant exécutif d'élite de Bouba'ia. Ton rôle est de fournir une intelligence stratégique matinale pour dominer la journée, gérer les relations clients avec excellence et optimiser chaque opportunité.

# DONNÉES CRITIQUES DU JOUR
- Agenda & RDV : {{ JSON.stringify($node["Get Today Events"].json) }}
- Communications Clients (Emails non lus) : {{ JSON.stringify($node["Get Unread Emails"].json) }}
- Flux Financiers (Mois en cours) : {{ JSON.stringify($node["Get Finance Summary"].json) }}

# CONSIGNES STRATÉGIQUES
1. Salutation Executive : Courte, impactante, utilisant le prénom.
2. Panorama Client & Opportunités : Analyse les emails. Si un client ou prospect a écrit, souligne-le comme priorité n°1. Suggère une action concrète (ex: "Répondre au devis de X avant 10h").
3. Maîtrise de l'Agenda : Ne te contente pas de lister, analyse les transitions. S'il y a un RDV client, suggère de préparer un document ou de vérifier l'historique.
4. Santé Financière : Résume la position par rapport aux objectifs.
5. Conseil Proactif : Un conseil de haute performance basé sur le contexte actuel (ex: "Ton après-midi est libre, idéal pour finaliser le projet Y").

# TON & RÈGLES
- Ton : Ultra-premium, visionnaire, précis, et hautement proactif. Tu es un partenaire de succès, pas un simple assistant.
- Langue : Français uniquement.
- Format : Texte structuré avec emojis, max 200 mots. Priorise l'intelligence sur la liste exhaustive.`,
        },
    };

    @node({
        id: 'f54199e8-5ddb-4532-bca0-132acb373cc0',
        name: 'DeepSeek Model',
        type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
        version: 1,
        position: [1184, 224],
        credentials: { deepSeekApi: { id: '7xifHFmlSOW7XjwP', name: 'DeepSeek 5 Mars 2026' } },
    })
    DeepseekModel = {
        model: 'deepseek-v4-pro-flash',
        options: {
            maxTokens: 500,
            temperature: 0.7,
        },
    };

    @node({
        id: '0533289f-d28a-4889-89e9-43037b8f4b98',
        name: 'Create Notification',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1680, 208],
        credentials: { postgres: { id: 'lEH8r4EIJRyVruLI', name: "Bouba'db" } },
    })
    CreateNotification = {
        schema: {
            __rl: true,
            mode: 'list',
            value: 'public',
        },
        table: {
            __rl: true,
            mode: 'list',
            value: 'notifications',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                user_id: '={{ $node["Process Users"].json.user_id }}',
                type: 'broadcast_app',
                subject: '☕ Ton briefing SOPHIA du matin',
                body: '={{ $json.output }}',
                sent_at: '={{ $now.toString() }}',
            },
        },
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.DailySchedule.out(0).to(this.GetActiveUsers.in(0));
        this.GetActiveUsers.out(0).to(this.ProcessUsers.in(0));
        this.ProcessUsers.out(0).to(this.GetTodayEvents.in(0));
        this.GetTodayEvents.out(0).to(this.GetUnreadEmails.in(0));
        this.GetUnreadEmails.out(0).to(this.GetFinanceSummary.in(0));
        this.GetFinanceSummary.out(0).to(this.BriefingAgent.in(0));
        this.BriefingAgent.out(0).to(this.CreateNotification.in(0));
        this.CreateNotification.out(0).to(this.ProcessUsers.in(0));

        this.BriefingAgent.uses({
            ai_languageModel: this.DeepseekModel.output,
        });
    }
}
