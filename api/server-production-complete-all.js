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

// ==================== ROUTES API COMPLÈTES ====================

// Helper pour user mock
function mockUser(email = 'user@bouba.ai', isNew = false) {
    return {
        id: isNew ? '2' : '1',
        email: email,
        name: email.split('@')[0],
        firstName: 'Utilisateur',
        lastName: 'Test',
        role: 'user',
        planId: isNew ? 'free' : 'premium',
        messagesUsed: isNew ? 0 : 42,
        messagesLimit: isNew ? 100 : 1000,
        subscriptionStatus: 'active',
        onboardingComplete: !isNew,
        onboardingStep: isNew ? 1 : 5,
        preferences: { theme: isNew ? 'light' : 'dark', language: 'fr' }
    };
}

// ==================== AUTH ROUTES ====================

app.get('/api/auth/me', (req, res) => {
    res.json({ success: true, data: { user: mockUser() } });
});

app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ success: true, data: { user: mockUser(email) } });
    } else {
        res.status(400).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }
});

app.post('/api/auth/signup', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ success: true, data: { user: mockUser(email, true) } });
    } else {
        res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }
});

// IMPORTANT: Frontend appelle /api/auth/signout (pas /api/auth/logout)
app.post('/api/auth/signout', (req, res) => {
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

// Compatibilité
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

app.get('/api/auth/check', (req, res) => {
    res.json({ 
        authenticated: true, 
        user: { id: 1, email: 'user@bouba.ai', name: 'Utilisateur Test', avatar: '🦞' }
    });
});

// ==================== DATA ROUTES ====================

// Route: /api/data/plans (GET - Plans de tarification)
app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'free',
                name: 'Gratuit',
                price: 0,
                features: ['3 agents', '100 messages/mois', 'Support email'],
                popular: false
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 29,
                features: ['Tous les agents', 'Messages illimités', 'Support prioritaire', 'Analytics avancés'],
                popular: true
            },
            {
                id: 'business',
                name: 'Business',
                price: 99,
                features: ['Tous les agents', 'Messages illimités', 'Support 24/7', 'API personnalisée', 'SSO'],
                popular: false
            }
        ]
    });
});

// Route: /api/conversations (GET - Conversations)
app.get('/api/conversations', (req, res) => {
    const { userId } = req.query;
    
    res.json({
        success: true,
        data: [
            {
                id: '1',
                userId: userId || 'demo-user',
                title: 'Planning de la semaine',
                preview: 'Quels sont tes objectifs pour cette semaine ?',
                timestamp: new Date().toISOString(),
                unread: false
            },
            {
                id: '2',
                userId: userId || 'demo-user',
                title: 'Analyse financière',
                preview: 'Voici ton rapport financier du mois...',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                unread: true
            },
            {
                id: '3',
                userId: userId || 'demo-user',
                title: 'Emails importants',
                preview: 'Tu as 5 emails non lus nécessitant ton attention',
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                unread: false
            }
        ]
    });
});

// ==================== GOOGLE/GMAIL ROUTES ====================

// Route: /api/google/gmail/messages (GET - Emails Gmail)
app.get('/api/google/gmail/messages', (req, res) => {
    const { maxResults = 50, folder = 'inbox' } = req.query;
    
    const messages = [];
    for (let i = 0; i < Math.min(maxResults, 10); i++) {
        messages.push({
            id: `msg${i + 1}`,
            subject: `Email important ${i + 1}`,
            from: `contact${i + 1}@example.com`,
            to: 'user@bouba.ai',
            snippet: `Ceci est un extrait de l'email ${i + 1}...`,
            date: new Date(Date.now() - i * 3600000).toISOString(),
            read: i % 3 === 0,
            important: i % 5 === 0,
            folder: folder
        });
    }
    
    res.json({ success: true, data: messages });
});

// ==================== NOTIFICATIONS ROUTES ====================

// Route: /api/notifications (GET - Notifications)
app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: '1',
                type: 'success',
                title: 'Connexion réussie',
                message: 'Vous êtes maintenant connecté à Bouba AI',
                timestamp: new Date().toISOString(),
                read: true
            },
            {
                id: '2',
                type: 'info',
                title: 'Nouveau message',
                message: 'Vous avez reçu un nouvel email important',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                read: false
            },
            {
                id: '3',
                type: 'warning',
                title: 'Synchronisation',
                message: 'La synchronisation Google est presque terminée',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                read: false
            }
        ]
    });
});

// ==================== CONNECTIONS ROUTES ====================

// Route: /api/connections (GET - Connexions)
app.get('/api/connections', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 1,
                type: 'google',
                status: 'connected',
                email: 'user@gmail.com',
                name: 'Google Account',
                avatar: 'https://logo.clearbit.com/google.com',
                lastSync: new Date().toISOString()
            },
            {
                id: 2,
                type: 'notion',
                status: 'connected',
                workspace: 'Mon Workspace',
                name: 'Notion',
                avatar: 'https://logo.clearbit.com/notion.so',
                lastSync: new Date().toISOString()
            },
            {
                id: 3,
                type: 'slack',
                status: 'pending',
                name: 'Slack',
                avatar: 'https://logo.clearbit.com/slack.com'
            }
        ]
    });
});

// ==================== DASHBOARD ROUTES ====================

// Route: /api/dashboard/stats (GET - Statistiques)
app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        emailCount: 42,
        calendarEvents: 15,
        contacts: 234,
        financeTransactions: 28,
        productivity: '+65%',
        timeSaved: '12.5h',
        agents: {
            email: { status: 'active', processed: 42 },
            calendar: { status: 'active', optimized: 12 },
            contacts: { status: 'active', synced: 198 },
            finance: { status: 'active', analyzed: 25 }
        }
    });
});

// ==================== GENERIC DATA ROUTES ====================

app.get('/data/:table', (req, res) => {
    const { table } = req.params;
    const mockData = {
        users: [{ id: 1, email: 'user@bouba.ai', name: 'Utilisateur Test' }],
        connections: [
            { id: 1, type: 'google', status: 'connected', email: 'user@gmail.com' },
            { id: 2, type: 'notion', status: 'connected', workspace: 'Mon Workspace' }
        ],
        messages: [{ id: 1, content: 'Bonjour !', sender: 'user', timestamp: new Date().toISOString() }],
        plans: [
            { id: 'free', name: 'Gratuit', price: 0 },
            { id: 'pro', name: 'Pro', price: 29 },
            { id: 'business', name: 'Business', price: 99 }
        ]
    };
    res.json({ success: true, data: mockData[table] || [] });
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI Backend',
        version: '1.0.0',
        mode: 'production',
        routes: [
            '/api/auth/*',
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
    console.log(`🚀 Backend Bouba AI COMPLETE ALL sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 TOUTES LES ROUTES AJOUTÉES :`);
    console.log(`   ✅ GET  /api/data/plans`);
    console.log(`   ✅ GET  /api/conversations`);
    console.log(`   ✅ GET  /api/google/gmail/messages`);
    console.log(`   ✅ GET  /api/notifications`);
    console.log(`   ✅ POST /api/auth/signout (important!)`);
    console.log(`   ✅ GET  /api/connections`);
    console.log(`   ✅ GET  /api/dashboard/stats`);
});