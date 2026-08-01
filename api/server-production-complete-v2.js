const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// CORS pour tous les ports frontend
app.use(cors({
    origin: ['http://144.91.96.142:5173', 'http://144.91.96.142:3000', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==================== ROUTES AUTH (déjà corrigées) ====================

app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        user: {
            id: '1',
            email: 'user@bouba.ai',
            email_verified: true,
            name: 'Utilisateur Test',
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
            preferences: { theme: 'dark', language: 'fr' }
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
            name: 'Utilisateur Test',
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
            preferences: { theme: 'dark', language: 'fr' }
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

app.post('/api/auth/signup', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ success: true, data: { id: '2', email: email } });
    } else {
        res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }
});

app.post('/api/auth/signout', (req, res) => {
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

// ==================== ROUTES DATA AVEC QUERY PARAMS ====================

// Route: /api/data/subscriptions (avec query params)
app.get('/api/data/subscriptions', (req, res) => {
    // Gérer les query params: user_id[eq]=1&order=created_at:desc&limit=1
    const userId = req.query['user_id[eq]'] || '1';
    
    res.json({
        success: true,
        data: [
            {
                id: 'sub_123',
                user_id: userId,
                plan_id: 'premium',
                status: 'active',
                current_period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
                created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
                updated_at: new Date().toISOString(),
                // Données pour PlanPage.tsx ligne 435
                plan: {
                    id: 'premium',
                    name: 'Premium',
                    price: 29,
                    interval: 'month',
                    limits: {
                        messages: 1000,
                        agents: 4,
                        storage: '10GB',
                        support: 'priority'
                    },
                    features: ['Tous les agents', 'Messages illimités', 'Support prioritaire']
                }
            }
        ]
    });
});

// Route: /api/data/payments (avec query params)
app.get('/api/data/payments', (req, res) => {
    // Gérer: user_id[eq]=1&order=created_at:desc
    const userId = req.query['user_id[eq]'] || '1';
    
    res.json({
        success: true,
        data: [
            {
                id: 'pay_123',
                user_id: userId,
                amount: 2900, // 29.00 EUR
                currency: 'eur',
                status: 'succeeded',
                description: 'Abonnement Premium - Avril 2026',
                created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
                invoice_url: 'https://dashboard.stripe.com/invoices/test'
            },
            {
                id: 'pay_122',
                user_id: userId,
                amount: 2900,
                currency: 'eur',
                status: 'succeeded',
                description: 'Abonnement Premium - Mars 2026',
                created_at: new Date(Date.now() - 60 * 86400000).toISOString()
            }
        ]
    });
});

// Route: /api/upgrade-requests/status
app.get('/api/upgrade-requests/status', (req, res) => {
    res.json({
        success: true,
        data: {
            hasPendingRequest: false,
            currentPlan: 'premium',
            requestedPlan: null,
            status: 'none',
            createdAt: null
        }
    });
});

// ==================== ROUTES PLANS (avec limits) ====================

// Route: /api/data/plans (avec limits pour PlanPage.tsx)
app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'free',
                name: 'Gratuit',
                price: 0,
                interval: 'month',
                limits: {
                    messages: 100,
                    agents: 3,
                    storage: '1GB',
                    support: 'email'
                },
                features: ['3 agents', '100 messages/mois', 'Support email'],
                popular: false
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 29,
                interval: 'month',
                limits: {
                    messages: 1000,
                    agents: 4,
                    storage: '10GB',
                    support: 'priority'
                },
                features: ['Tous les agents', 'Messages illimités', 'Support prioritaire', 'Analytics avancés'],
                popular: true
            },
            {
                id: 'business',
                name: 'Business',
                price: 99,
                interval: 'month',
                limits: {
                    messages: 10000,
                    agents: 10,
                    storage: '100GB',
                    support: '24/7'
                },
                features: ['Tous les agents', 'Messages illimités', 'Support 24/7', 'API personnalisée', 'SSO'],
                popular: false
            }
        ]
    });
});

// ==================== AUTRES ROUTES EXISTANTES ====================

app.get('/api/conversations', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: '1', userId: req.query.userId || 'demo-user', title: 'Planning', preview: 'Objectifs', timestamp: new Date().toISOString() }
        ]
    });
});

app.get('/api/google/gmail/messages', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'msg1', subject: 'Email', from: 'contact@example.com', snippet: 'Extrait...', date: new Date().toISOString() }
        ]
    });
});

app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: '1', type: 'success', title: 'Connexion', message: 'Connecté', timestamp: new Date().toISOString() }
        ]
    });
});

app.get('/api/connections', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, type: 'google', status: 'connected', email: 'user@gmail.com', name: 'Google' }
        ]
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

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI Backend - Complete v2',
        version: '1.0.0',
        mode: 'production',
        routes: [
            '/api/auth/*',
            '/api/data/subscriptions',
            '/api/data/payments',
            '/api/upgrade-requests/status',
            '/api/data/plans',
            '/api/conversations',
            '/api/google/gmail/messages',
            '/api/notifications',
            '/api/connections',
            '/api/dashboard/stats'
        ]
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI COMPLETE v2 sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 NOUVELLES ROUTES AJOUTÉES :`);
    console.log(`   ✅ GET /api/data/subscriptions (avec query params)`);
    console.log(`   ✅ GET /api/data/payments (avec query params)`);
    console.log(`   ✅ GET /api/upgrade-requests/status`);
    console.log(`   ✅ /api/data/plans : avec "limits" pour PlanPage.tsx`);
    console.log(`🎯 ERREUR FIXÉE : plan.limits is undefined (PlanPage.tsx:435)`);
});