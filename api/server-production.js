const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Configuration CORS COMPLÈTE pour tous les ports
const corsOptions = {
    origin: [
        'http://144.91.96.142:3000', 
        'http://localhost:3000',
        'http://144.91.96.142:5173',  // Vite dev server
        'http://localhost:5173',      // Vite local
        'http://144.91.96.142:5174',  // Autres ports possibles
        'http://localhost:5174'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400 // 24 heures
};

app.use(cors(corsOptions));

// Gérer les pré-vols OPTIONS
app.options('*', cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI Backend',
        version: '1.0.0',
        mode: 'production'
    });
});

// API routes for frontend
// Mock users database
const mockUsers = {
    '1': {
        id: '1',
        email: 'user@bouba.ai',
        name: 'Utilisateur Test',
        avatar: '🦞',
        plan_id: 'starter',
        messages_used: 125,
        messages_limit: 10000,
        created_at: new Date().toISOString()
    },
    '2': {
        id: '2',
        email: 'seydou.dianka@mail.dit.sn',
        name: 'Seydou Dianka',
        avatar: '👤',
        plan_id: 'free',
        messages_used: 0, // ZERO messages au début !
        messages_limit: 500,
        created_at: new Date().toISOString()
    },
    '3': {
        id: '3',
        email: 'seydou.gratuit@gmail.com',
        name: 'Seydou Gratuit',
        avatar: '🎯',
        plan_id: 'free',
        messages_used: 0,
        messages_limit: 500,
        created_at: new Date().toISOString()
    },
    '4': {
        id: '4',
        email: 'seydou.starter@gmail.com',
        name: 'Seydou Starter',
        avatar: '🚀',
        plan_id: 'starter',
        messages_used: 0,
        messages_limit: 10000,
        created_at: new Date().toISOString()
    },
    '5': {
        id: '5',
        email: 'seydou.premium@gmail.com',
        name: 'Seydou Premium',
        avatar: '👑',
        plan_id: 'business',
        messages_used: 0,
        messages_limit: -1, // Illimité
        created_at: new Date().toISOString()
    }
};

app.get('/api/auth/check', (req, res) => {
    // Pour le développement, on retourne toujours authentifié
    res.json({ 
        authenticated: true, 
        user: mockUsers['2'] // Retourne Seydou par défaut
    });
});

app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    
    console.log('🔐 Signin attempt:', email);
    
    // Vérifier l'email
    const user = Object.values(mockUsers).find(u => u.email === email);
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Email ou mot de passe incorrect' 
        });
    }
    
    // Pour le développement, accepter n'importe quel mot de passe
    // En production, il faudrait vérifier le hash
    if (!password || password.length < 6) {
        return res.status(401).json({ 
            success: false, 
            error: 'Mot de passe trop court' 
        });
    }
    
    // Retourner le VRAI plan (free pour Seydou)
    const planName = user.plan_id === 'free' ? 'Bouba Free' : 
                     user.plan_id === 'starter' ? 'Bouba Starter' : 'Bouba Business';
    const planPrice = user.plan_id === 'free' ? 0 : 
                      user.plan_id === 'starter' ? 990 : 2999;
    
    console.log(`🔍 API signin: User ${user.email} has plan ${user.plan_id} (${planName})`);
    
    // Pour les comptes Free, pas besoin de vérifier le paiement
    const isFreePlan = user.plan_id === 'free';
    const hasValidPayment = isFreePlan ? true : false; // Pour Free = toujours valide
    
    console.log(`🔍 API signin: User ${user.email} has plan ${user.plan_id}, isFree: ${isFreePlan}, paymentValid: ${hasValidPayment}`);
    
    // Créer un token JWT simulé (format: "user:{email}")
    const token = `user:${user.email}`;
    
    res.json({
        success: true,
        user: {
            ...user,
            onboardingComplete: true,
            onboarding_complete: true
        },
        profile: {
            ...user,
            onboardingComplete: true,
            onboarding_complete: true
        },
        plan: {
            id: user.plan_id,
            name: planName,
            price: planPrice
        },
        hasValidPayment: hasValidPayment,
        canConnect: true, // Les comptes Free peuvent toujours se connecter
        token: token // Token JWT simulé pour les sessions
    });
});

// GET /api/data/plans - Retourne les plans disponibles
app.get('/api/data/plans', (req, res) => {
    console.log('📋 API /api/data/plans appelée');
    
    const plans = [
        {
            id: 'free',
            name: 'Bouba Free',
            description: 'Parfait pour découvrir Bouba',
            price: 0, // Gratuit
            currency: 'EUR',
            billing_interval: 'monthly',
            trial_days: 0,
            agents_limit: 1,
            messages_limit: 500,
            features: ['Chat IA (500 messages/mois)', 'Email'],
            limits: { 
                agents: 1, 
                messages: 500,
                emails: 100,
                contacts: 0,
                calendar: false,
                finance: false
            },
            stripe_price_id: undefined,
            popular: false,
            active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'starter',
            name: 'Bouba Starter',
            description: 'Pour les freelances et petites équipes',
            price: 990, // 9.90€ en centimes
            currency: 'EUR',
            billing_interval: 'monthly',
            trial_days: 7,
            agents_limit: 2,
            messages_limit: 10000,
            features: ['Chat IA (10,000 messages/mois)', 'Email', 'Contacts', 'Calendrier'],
            limits: { 
                agents: 2, 
                messages: 10000,
                emails: 1000,
                contacts: 500,
                calendar: true,
                finance: false
            },
            stripe_price_id: 'price_starter_monthly',
            popular: true,
            active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'business',
            name: 'Bouba Business',
            description: 'Solution complète pour les entreprises',
            price: 2999, // 29.99€ en centimes
            currency: 'EUR',
            billing_interval: 'monthly',
            trial_days: 14,
            agents_limit: 5,
            messages_limit: -1,
            features: ['Chat IA (illimité)', 'Email', 'Contacts', 'Calendrier', 'Finance avec documents', 'API Access'],
            limits: { 
                agents: 5, 
                messages: -1,
                emails: 5000,
                contacts: 2000,
                calendar: true,
                finance: true,
                api_access: true
            },
            stripe_price_id: 'price_business_monthly',
            popular: false,
            active: true,
            created_at: new Date().toISOString()
        }
    ];
    
    res.json({
        success: true,
        data: plans,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/auth/signup', (req, res) => {
    const { email, password, name } = req.body;
    
    console.log('📝 Signup attempt:', email, name);
    
    if (!email || !password || !name) {
        return res.status(400).json({ 
            success: false, 
            error: 'Tous les champs sont requis' 
        });
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = Object.values(mockUsers).find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ 
            success: false, 
            error: 'Cet email est déjà utilisé' 
        });
    }
    
    // Créer un nouvel utilisateur
    const newId = (Object.keys(mockUsers).length + 1).toString();
    const newUser = {
        id: newId,
        email: email,
        name: name,
        avatar: '👤',
        plan_id: 'free',
        messages_used: 0,
        messages_limit: 500,
        created_at: new Date().toISOString()
    };
    
    mockUsers[newId] = newUser;
    
    res.json({
        success: true,
        user: newUser,
        message: 'Compte créé avec succès !'
    });
});

// GET /api/auth/me - Récupérer l'utilisateur courant
app.get('/api/auth/me', (req, res) => {
    console.log('👤 API /api/auth/me appelée');
    
    // Simuler une session : regarder le header Authorization
    const authHeader = req.headers.authorization || '';
    let userId = '2'; // Par défaut : seydou.dianka@mail.dit.sn
    
    // Extraire l'email du token JWT simulé
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Token simulé : "user:{email}"
        if (token.includes(':')) {
            const email = token.split(':')[1];
            // Trouver l'utilisateur par email
            const user = Object.values(mockUsers).find(u => u.email === email);
            if (user) {
                userId = user.id;
            }
        }
    }
    
    const user = mockUsers[userId];
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Non authentifié' 
        });
    }
    
    console.log(`👤 API /api/auth/me: User ${user.email} (${user.plan_id})`);
    
    // Pour les comptes Free, pas besoin de vérifier le paiement
    const isFreePlan = user.plan_id === 'free';
    const hasValidPayment = isFreePlan ? true : false;
    
    res.json({
        success: true,
        user: {
            ...user,
            onboardingComplete: true,
            onboarding_complete: true
        },
        profile: {
            ...user,
            onboardingComplete: true,
            onboarding_complete: true
        },
        plan: {
            id: user.plan_id,
            name: user.plan_id === 'free' ? 'Bouba Free' : 
                   user.plan_id === 'starter' ? 'Bouba Starter' : 'Bouba Business',
            price: user.plan_id === 'free' ? 0 : 
                   user.plan_id === 'starter' ? 990 : 2999
        },
        hasValidPayment: hasValidPayment,
        canConnect: true
    });
});

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI Production sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
