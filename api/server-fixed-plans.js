const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ==================== ROUTES AUTH ====================

app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        user: {
            id: '1',
            email: 'user@bouba.ai',
            email_verified: true,
            name: 'Utilisateur Premium',
            provider: 'email',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: 'user',
            role_id: 'user-role-id',
            // camelCase pour useAuth.tsx
            firstName: 'Utilisateur',
            lastName: 'Test',
            onboardingComplete: true,
            planId: 'premium',
            messagesUsed: 42,
            messagesLimit: 1000,
            subscriptionStatus: 'active',
            preferences: { theme: 'dark', language: 'fr' },
            // snake_case pour OnboardingPage.tsx
            onboarding_complete: true,
            plan_id: 'premium',
            messages_used: 42,
            messages_limit: 1000,
            subscription_status: 'active'
        }
    });
});

app.get('/auth/me', (req, res) => {
    res.json({
        success: true,
        user: {
            id: '1',
            email: 'user@bouba.ai',
            email_verified: true,
            name: 'Utilisateur Premium',
            provider: 'email',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: 'user',
            role_id: 'user-role-id',
            firstName: 'Utilisateur',
            lastName: 'Test',
            onboardingComplete: true,
            planId: 'premium',
            messagesUsed: 42,
            messagesLimit: 1000,
            subscriptionStatus: 'active',
            preferences: { theme: 'dark', language: 'fr' },
            onboarding_complete: true,
            plan_id: 'premium',
            messages_used: 42,
            messages_limit: 1000,
            subscription_status: 'active'
        }
    });
});

app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({
            success: true,
            data: {
                id: '1',
                email: email,
                email_verified: true,
                name: email.split('@')[0],
                provider: 'email',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                role: 'user',
                role_id: 'user-role-id',
                firstName: 'Utilisateur',
                lastName: 'Test',
                onboardingComplete: true,
                planId: 'premium',
                messagesUsed: 42,
                messagesLimit: 1000,
                subscriptionStatus: 'active',
                preferences: { theme: 'dark', language: 'fr' },
                onboarding_complete: true,
                plan_id: 'premium',
                messages_used: 42,
                messages_limit: 1000,
                subscription_status: 'active',
                // Profile pour useAuth.tsx
                profile: {
                    id: '1',
                    role: 'user',
                    role_id: 'user-role-id',
                    first_name: 'Utilisateur',
                    last_name: 'Test',
                    onboarding_complete: true,
                    plan_id: 'premium',
                    messages_used: 42,
                    messages_limit: 1000,
                    subscription_status: 'active',
                    preferences: { theme: 'dark', language: 'fr' },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            }
        });
    } else {
        res.status(400).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }
});

// ==================== ROUTES PLANS (format complet pour usePlans.ts) ====================

app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'starter',
                name: 'Bouba Starter',
                description: 'Parfait pour découvrir Bouba et commencer votre productivité',
                price: 0, // en centimes
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 0,
                agents_limit: 1,
                messages_limit: 500, // -1 pour illimité
                features: [
                    'Gmail uniquement',
                    'Mémoire session',
                    'Support communauté'
                ],
                limits: {
                    rag: false,
                    web_search: false,
                    finance: false,
                    api_access: false,
                    white_label: false,
                    messages: 500
                },
                stripe_price_id: undefined,
                popular: false,
                active: true,
                created_at: new Date().toISOString()
            },
            {
                id: 'pro',
                name: 'Bouba Pro',
                description: 'Fonctionnalités avancées pour les professionnels et équipes',
                price: 2900, // 29.00€ en centimes
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 7,
                agents_limit: 4,
                messages_limit: 10000,
                features: [
                    'Gmail + Calendar + Contacts',
                    'Finance Airtable',
                    'RAG Pinecone',
                    'Recherche web Tavily',
                    'Mémoire 30 jours',
                    'Support email 48h'
                ],
                limits: {
                    rag: false,
                    web_search: true,
                    finance: true,
                    api_access: false,
                    white_label: false,
                    messages: 10000
                },
                stripe_price_id: 'price_pro_monthly',
                popular: true,
                active: true,
                created_at: new Date().toISOString()
            },
            {
                id: 'premium',
                name: 'Bouba Premium',
                description: 'Solution complète avec toutes les fonctionnalités',
                price: 4900, // 49.00€ en centimes
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 14,
                agents_limit: 10,
                messages_limit: 100000,
                features: [
                    'Toutes les intégrations',
                    'Finance custom DB',
                    'RAG custom',
                    'Mémoire illimitée',
                    'Support dédié SLA 4h',
                    'API Access',
                    'White-label'
                ],
                limits: {
                    rag: true,
                    web_search: true,
                    finance: true,
                    api_access: true,
                    white_label: true,
                    messages: 100000
                },
                stripe_price_id: 'price_premium_monthly',
                popular: false,
                active: true,
                created_at: new Date().toISOString()
            },
            {
                id: 'enterprise',
                name: 'Bouba Enterprise',
                description: 'Solution complète pour les grandes équipes et entreprises',
                price: 9900, // 99.00€ en centimes
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 14,
                agents_limit: -1, // illimité
                messages_limit: -1, // illimité
                features: [
                    'Toutes les intégrations',
                    'Finance custom DB',
                    'RAG custom',
                    'Mémoire illimitée',
                    'Support dédié SLA 4h',
                    'API Access',
                    'White-label',
                    'SSO',
                    'Audit logs'
                ],
                limits: {
                    rag: true,
                    web_search: true,
                    finance: true,
                    api_access: true,
                    white_label: true,
                    messages: -1
                },
                stripe_price_id: 'price_enterprise_monthly',
                popular: false,
                active: true,
                created_at: new Date().toISOString()
            }
        ]
    });
});

// ==================== AUTRES ROUTES ====================

app.post('/api/conversations', (req, res) => {
    res.json({
        success: true,
        data: {
            id: Date.now().toString(),
            userId: '1',
            message: req.body.message || 'Test',
            response: 'Je suis Bouba AI !',
            timestamp: new Date().toISOString()
        }
    });
});

app.get('/api/connections', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, type: 'email', name: 'Email', icon: '📧', plan: 'free', status: 'connected' },
            { id: 2, type: 'calendar', name: 'Calendar', icon: '📅', plan: 'pro', status: 'connected' },
            { id: 3, type: 'contacts', name: 'Contacts', icon: '👥', plan: 'pro', status: 'connected' },
            { id: 4, type: 'finance', name: 'Finance', icon: '💰', plan: 'premium', status: 'connected' },
            { id: 5, type: 'notion', name: 'Notion', icon: '📝', plan: 'pro', status: 'pending' },
            { id: 6, type: 'slack', name: 'Slack', icon: '💬', plan: 'premium', status: 'available' },
            { id: 7, type: 'google', name: 'Google', icon: '🔍', plan: 'free', status: 'connected' }
        ],
        userPlan: 'premium',
        message: 'Plan premium: 7 connexions disponibles'
    });
});

app.get('/api/data/subscriptions', (req, res) => {
    res.json({
        success: true,
        data: [{
            id: 'sub_123',
            user_id: req.query['user_id[eq]'] || '1',
            plan_id: 'premium',
            status: 'active',
            plan: { id: 'premium', name: 'Premium', limits: { messages: 100000 } }
        }]
    });
});

app.get('/api/data/payments', (req, res) => {
    res.json({
        success: true,
        data: [{
            id: 'pay_123',
            user_id: req.query['user_id[eq]'] || '1',
            amount: 4900,
            status: 'succeeded'
        }]
    });
});

app.get('/api/upgrade-requests/status', (req, res) => {
    res.json({
        success: true,
        data: { hasPendingRequest: false, currentPlan: 'premium' }
    });
});

app.post('/api/upgrade-requests', (req, res) => {
    res.json({
        success: true,
        data: {
            id: 'upgrade_' + Date.now(),
            userId: '1',
            fromPlan: req.body.fromPlan || 'starter',
            toPlan: req.body.toPlan || 'premium',
            status: 'pending',
            createdAt: new Date().toISOString(),
            message: 'Demande de mise à niveau enregistrée. Notre équipe va la traiter sous 24h.'
        }
    });
});

app.get('/api/conversations', (req, res) => {
    res.json({
        success: true,
        data: [{ id: '1', title: 'Conversation', timestamp: new Date().toISOString() }]
    });
});

app.get('/api/google/gmail/messages', (req, res) => {
    res.json({
        success: true,
        data: [{ id: 'msg1', subject: 'Email', from: 'test@example.com' }]
    });
});

app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        data: [{ id: '1', type: 'success', title: 'Notification' }]
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        emailCount: 42,
        calendarEvents: 15,
        contacts: 234,
        financeTransactions: 28,
        productivity: '+65%',
        timeSaved: '12.5h'
    });
});

app.get('/data/profiles/:id', (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.params.id,
            role: 'user',
            role_id: 'user-role-id',
            first_name: 'Utilisateur',
            last_name: 'Test',
            onboarding_complete: true,
            plan_id: 'premium',
            messages_used: 42,
            messages_limit: 100000, // Correspond au plan premium
            subscription_status: 'active',
            preferences: { theme: 'dark', language: 'fr' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    });
});

app.post('/data/usage/increment', (req, res) => {
    res.json({ success: true, data: { incremented: true } });
});

app.post('/api/auth/signup', (req, res) => {
    res.json({ success: true, data: { id: '2', email: req.body.email } });
});

app.post('/api/auth/signout', (req, res) => {
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI - Plans Fixed',
        version: '1.0.0',
        mode: 'production',
        fix: 'Plans au format complet pour usePlans.ts'
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI PLANS FIXED sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 CORRECTIONS APPLIQUÉES :`);
    console.log(`   ✅ /api/data/plans : Format complet pour usePlans.ts`);
    console.log(`   ✅ Plan premium : 100000 messages, agents_limit: 10`);
    console.log(`   ✅ Profile : messages_limit: 100000 (match plan premium)`);
    console.log(`   ✅ Toutes les fonctionnalités pour chaque plan`);
});