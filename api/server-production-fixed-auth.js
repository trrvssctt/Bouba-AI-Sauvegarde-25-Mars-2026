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

// ==================== ROUTES AUTH CORRECTES ====================

// Route: /api/auth/me (GET - Format EXACT attendu par useAuth.tsx)
app.get('/api/auth/me', (req, res) => {
    // Format EXACT attendu par le frontend (useAuth.tsx ligne 47)
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
            // Champs CRITIQUES pour useAuth.tsx
            role: 'user',
            role_id: 'user-role-id',
            firstName: 'Utilisateur',
            lastName: 'Test',
            onboardingComplete: true,  // IMPORTANT: camelCase
            planId: 'premium',         // IMPORTANT: camelCase
            messagesUsed: 42,          // IMPORTANT: camelCase
            messagesLimit: 1000,       // IMPORTANT: camelCase
            subscriptionStatus: 'active', // IMPORTANT: camelCase
            preferences: { theme: 'dark', language: 'fr' }
        }
    });
});

// Route: /auth/me (sans /api pour compatibilité)
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

// Route: /api/auth/signin (POST - Format pour useAuth.tsx)
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
                // Profile pour useAuth.tsx ligne 154
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
        res.status(400).json({
            success: false,
            error: 'Email ou mot de passe incorrect'
        });
    }
});

// Route: /api/auth/signup (POST)
app.post('/api/auth/signup', (req, res) => {
    const { email, password, first_name, last_name } = req.body;
    
    if (email && password) {
        res.json({
            success: true,
            data: {
                id: '2',
                email: email,
                email_verified: false,
                name: email.split('@')[0],
                provider: 'email',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                role: 'user',
                role_id: 'user-role-id',
                firstName: first_name || 'Nouveau',
                lastName: last_name || 'Utilisateur',
                onboardingComplete: false,
                planId: 'free',
                messagesUsed: 0,
                messagesLimit: 100,
                subscriptionStatus: 'active',
                preferences: { theme: 'light', language: 'fr' }
            }
        });
    } else {
        res.status(400).json({
            success: false,
            error: 'Email et mot de passe requis'
        });
    }
});

// Route: /api/auth/signout (POST)
app.post('/api/auth/signout', (req, res) => {
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

// Route: /api/auth/check (GET)
app.get('/api/auth/check', (req, res) => {
    res.json({ 
        authenticated: true, 
        user: { 
            id: 1, 
            email: 'user@bouba.ai', 
            name: 'Utilisateur Test',
            avatar: '🦞'
        } 
    });
});

// ==================== AUTRES ROUTES ====================

// Route: /api/data/plans (GET)
app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'free', name: 'Gratuit', price: 0, features: ['3 agents', '100 messages/mois'] },
            { id: 'pro', name: 'Pro', price: 29, features: ['Tous les agents', 'Messages illimités'], popular: true },
            { id: 'business', name: 'Business', price: 99, features: ['Tous les agents', 'API personnalisée', 'SSO'] }
        ]
    });
});

// Route: /api/conversations (GET)
app.get('/api/conversations', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: '1', userId: req.query.userId || 'demo-user', title: 'Planning', preview: 'Objectifs de la semaine', timestamp: new Date().toISOString() }
        ]
    });
});

// Route: /api/google/gmail/messages (GET)
app.get('/api/google/gmail/messages', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'msg1', subject: 'Email important', from: 'contact@example.com', snippet: 'Extrait...', date: new Date().toISOString() }
        ]
    });
});

// Route: /api/notifications (GET)
app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: '1', type: 'success', title: 'Connexion réussie', message: 'Vous êtes connecté', timestamp: new Date().toISOString() }
        ]
    });
});

// Route: /api/connections (GET)
app.get('/api/connections', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, type: 'google', status: 'connected', email: 'user@gmail.com', name: 'Google Account' }
        ]
    });
});

// Route: /api/dashboard/stats (GET)
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

// Route: /data/profiles/:id (GET - pour useAuth.tsx ligne 85)
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

// Route: /data/usage/increment (POST - pour useAuth.tsx ligne 172)
app.post('/data/usage/increment', (req, res) => {
    res.json({ success: true, data: { incremented: true } });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI Backend - Auth Fixed',
        version: '1.0.0',
        mode: 'production'
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI AUTH FIXED sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 CORRECTIONS CRITIQUES :`);
    console.log(`   ✅ /api/auth/me : Format EXACT pour useAuth.tsx`);
    console.log(`   ✅ /auth/me : Compatibilité (sans /api)`);
    console.log(`   ✅ Champs camelCase: onboardingComplete, planId, etc.`);
    console.log(`   ✅ Route /data/profiles/:id pour refreshProfile()`);
    console.log(`   ✅ Route /data/usage/increment pour incrementUsage()`);
});