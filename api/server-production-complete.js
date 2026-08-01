const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// CORS pour tous les ports frontend
app.use(cors({
    origin: ['http://144.91.96.142:5173', 'http://144.91.96.142:3000', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==================== ROUTES API (avec /api) ====================

// Route: /api/auth/me (GET - Compatibilité frontend)
app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: '1',
                email: 'user@bouba.ai',
                name: 'Utilisateur Test',
                firstName: 'Utilisateur',
                lastName: 'Test',
                role: 'user',
                planId: 'premium',
                messagesUsed: 42,
                messagesLimit: 1000,
                subscriptionStatus: 'active',
                onboardingComplete: true,
                onboardingStep: 5,
                preferences: { theme: 'dark', language: 'fr' }
            }
        }
    });
});

// Route: /api/auth/signin (POST - Compatibilité frontend)
app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    
    if (email && password) {
        res.json({
            success: true,
            data: {
                user: {
                    id: '1',
                    email: email,
                    name: email.split('@')[0],
                    firstName: 'Utilisateur',
                    lastName: 'Test',
                    role: 'user',
                    planId: 'premium',
                    messagesUsed: 42,
                    messagesLimit: 1000,
                    subscriptionStatus: 'active',
                    onboardingComplete: true,
                    onboardingStep: 5,
                    preferences: { theme: 'dark', language: 'fr' }
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

// Route: /api/auth/signup (POST - Compatibilité frontend)
app.post('/api/auth/signup', (req, res) => {
    const { email, password, firstName, lastName, name } = req.body;
    
    if (email && password) {
        res.json({
            success: true,
            data: {
                user: {
                    id: '2',
                    email: email,
                    name: name || email.split('@')[0],
                    firstName: firstName || 'Nouveau',
                    lastName: lastName || 'Utilisateur',
                    role: 'user',
                    planId: 'free',
                    messagesUsed: 0,
                    messagesLimit: 100,
                    subscriptionStatus: 'active',
                    onboardingComplete: false,
                    onboardingStep: 1,
                    preferences: { theme: 'light', language: 'fr' }
                }
            }
        });
    } else {
        res.status(400).json({
            success: false,
            error: 'Email et mot de passe requis'
        });
    }
});

// Route: /api/auth/logout (POST - Compatibilité frontend)
app.post('/api/auth/logout', (req, res) => {
    res.json({
        success: true,
        data: { message: 'Déconnexion réussie' }
    });
});

// Route: /api/auth/check (GET - Vérification rapide)
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

// ==================== ROUTES SANS /api (pour compatibilité) ====================

// Route: /auth/me (GET - Ancienne route)
app.get('/auth/me', (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: '1',
                email: 'user@bouba.ai',
                name: 'Utilisateur Test',
                firstName: 'Utilisateur',
                lastName: 'Test',
                role: 'user',
                planId: 'premium',
                messagesUsed: 42,
                messagesLimit: 1000,
                subscriptionStatus: 'active',
                onboardingComplete: true,
                onboardingStep: 5,
                preferences: { theme: 'dark', language: 'fr' }
            }
        }
    });
});

// Route: /auth/login (POST - Ancienne route)
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email && password) {
        res.json({
            success: true,
            data: {
                user: {
                    id: '1',
                    email: email,
                    name: email.split('@')[0],
                    firstName: 'Utilisateur',
                    lastName: 'Test',
                    role: 'user',
                    planId: 'premium',
                    messagesUsed: 42,
                    messagesLimit: 1000,
                    subscriptionStatus: 'active',
                    onboardingComplete: true,
                    onboardingStep: 5,
                    preferences: { theme: 'dark', language: 'fr' }
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

// ==================== ROUTES DONNÉES ====================

// Route: /api/dashboard/stats (GET - Statistiques dashboard)
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

// Route: /data/:table (GET - Données génériques)
app.get('/data/:table', (req, res) => {
    const { table } = req.params;
    
    const mockData = {
        users: [
            { id: 1, email: 'user@bouba.ai', name: 'Utilisateur Test' }
        ],
        connections: [
            { id: 1, type: 'google', status: 'connected', email: 'user@gmail.com' },
            { id: 2, type: 'notion', status: 'connected', workspace: 'Mon Workspace' }
        ],
        messages: [
            { id: 1, content: 'Bonjour !', sender: 'user', timestamp: new Date().toISOString() }
        ]
    };
    
    res.json({
        success: true,
        data: mockData[table] || []
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI Backend',
        version: '1.0.0',
        mode: 'production',
        routes: ['/api/auth/me', '/api/auth/signin', '/api/auth/signup', '/api/auth/logout', '/api/dashboard/stats']
    });
});

// ==================== DÉMARRAGE SERVEUR ====================

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI COMPLETE sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 Routes API (avec /api):`);
    console.log(`   GET  /api/auth/me`);
    console.log(`   POST /api/auth/signin`);
    console.log(`   POST /api/auth/signup`);
    console.log(`   POST /api/auth/logout`);
    console.log(`   GET  /api/auth/check`);
    console.log(`   GET  /api/dashboard/stats`);
});