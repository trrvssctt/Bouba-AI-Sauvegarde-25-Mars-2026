const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ==================== ROUTES AUTH AVEC SNAKE_CASE ====================

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
            // camelCase pour useAuth.tsx ligne 154
            firstName: 'Utilisateur',
            lastName: 'Test',
            onboardingComplete: true,      // camelCase pour useAuth.tsx
            planId: 'premium',             // camelCase
            messagesUsed: 42,              // camelCase
            messagesLimit: 1000,           // camelCase
            subscriptionStatus: 'active',  // camelCase
            preferences: { theme: 'dark', language: 'fr' },
            // snake_case pour profile
            onboarding_complete: true,     // snake_case pour OnboardingPage.tsx
            plan_id: 'premium',            // snake_case
            messages_used: 42,             // snake_case
            messages_limit: 1000,          // snake_case
            subscription_status: 'active'  // snake_case
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
                // Profile pour useAuth.tsx ligne 154
                profile: {
                    id: '1',
                    role: 'user',
                    role_id: 'user-role-id',
                    first_name: 'Utilisateur',
                    last_name: 'Test',
                    onboarding_complete: true,  // snake_case pour OnboardingPage.tsx
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
            plan: { id: 'premium', name: 'Premium', limits: { messages: 1000 } }
        }]
    });
});

app.get('/api/data/payments', (req, res) => {
    res.json({
        success: true,
        data: [{
            id: 'pay_123',
            user_id: req.query['user_id[eq]'] || '1',
            amount: 2900,
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

app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'free', name: 'Gratuit', price: 0, limits: { messages: 100 } },
            { id: 'pro', name: 'Pro', price: 29, limits: { messages: 1000 }, popular: true },
            { id: 'premium', name: 'Premium', price: 49, limits: { messages: 10000 } }
        ]
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
            onboarding_complete: true,  // snake_case pour OnboardingPage.tsx
            plan_id: 'premium',
            messages_used: 42,
            messages_limit: 1000,
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
        service: 'Bouba AI - Onboarding Fixed',
        version: '1.0.0',
        mode: 'production',
        fix: 'onboarding_complete en snake_case + camelCase'
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI ONBOARDING FIXED sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 CORRECTIONS APPLIQUÉES :`);
    console.log(`   ✅ onboarding_complete: true (snake_case pour OnboardingPage.tsx)`);
    console.log(`   ✅ onboardingComplete: true (camelCase pour useAuth.tsx)`);
    console.log(`   ✅ Tous les champs en double format (snake_case + camelCase)`);
    console.log(`   ✅ Profile complet avec onboarding_complete: true`);
});