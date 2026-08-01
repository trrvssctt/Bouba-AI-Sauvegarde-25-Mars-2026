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

// ==================== ROUTES API ====================

// Auth routes
app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        data: { user: mockUser() }
    });
});

app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({
            success: true,
            data: { user: mockUser(email) }
        });
    } else {
        res.status(400).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }
});

app.post('/api/auth/signup', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({
            success: true,
            data: { user: mockUser(email, true) }
        });
    } else {
        res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
});

app.get('/api/auth/check', (req, res) => {
    res.json({ 
        authenticated: true, 
        user: { id: 1, email: 'user@bouba.ai', name: 'Utilisateur Test', avatar: '🦞' }
    });
});

// Connections route (CRITICAL - pour la redirection)
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

// Dashboard stats
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

// Generic data routes
app.get('/data/:table', (req, res) => {
    const { table } = req.params;
    const mockData = {
        users: [{ id: 1, email: 'user@bouba.ai', name: 'Utilisateur Test' }],
        connections: mockConnections(),
        messages: [{ id: 1, content: 'Bonjour !', sender: 'user', timestamp: new Date().toISOString() }]
    };
    res.json({ success: true, data: mockData[table] || [] });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI Backend',
        version: '1.0.0',
        mode: 'production',
        routes: ['/api/auth/*', '/api/connections', '/api/dashboard/stats', '/data/*']
    });
});

// ==================== UTILS ====================

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

function mockConnections() {
    return [
        { id: 1, type: 'google', status: 'connected', email: 'user@gmail.com' },
        { id: 2, type: 'notion', status: 'connected', workspace: 'Mon Workspace' }
    ];
}

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI FINAL sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 Route CRITIQUE ajoutée: GET /api/connections`);
    console.log(`🎯 Toutes les routes d'auth disponibles`);
});