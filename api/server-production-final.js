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

// ==================== ROUTES CONNECTIONS ====================

// Route: /api/connections (GET - Liste des connexions)
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
                avatar: 'https://lh3.googleusercontent.com/a/ACg8ocJwXvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZvZ