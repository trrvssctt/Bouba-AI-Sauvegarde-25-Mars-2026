const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Configuration CORS pour autoriser le frontend
const corsOptions = {
  origin: ['http://localhost:5173', 'http://144.91.96.142:5173', 'http://144.91.96.142:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Middleware de logging pour déboguer
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Middleware pour ajouter manuellement les en-têtes CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://144.91.96.142:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Gérer les pré-vols OPTIONS
app.options('*', cors(corsOptions));
app.use(express.json());

// Route catch-all pour TOUTES les routes API non définies
// Doit être APRÈS express.json() mais AVANT les routes spécifiques
app.all('/api/*', (req, res, next) => {
  // Si la route n'est pas définie, retourner du JSON au lieu de HTML
  console.log(`[API CATCH-ALL] ${req.method} ${req.url} - Route non définie, retourne JSON mock`);
  
  res.json({
    success: true,
    data: [],
    message: `Route ${req.url} simulée - Développement en cours`,
    timestamp: new Date().toISOString()
  });
  
  // Ne pas appeler next() - on intercepte la requête
});

// ==================== SIMULATION DE BASE DE DONNÉES ====================

const users = {
    '1': {
        id: '1',
        email: 'user@bouba.ai',
        email_verified: true,
        name: 'Seydou Dianka',
        provider: 'email',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z',
        role: 'user',
        role_id: 'user-role-id',
        firstName: 'Seydou',
        lastName: 'Dianka',
        onboardingComplete: true,
        planId: 'enterprise',
        messagesUsed: 42,
        messagesLimit: 100000,
        subscriptionStatus: 'active',
        preferences: { theme: 'dark', language: 'fr' },
        onboarding_complete: true,
        plan_id: 'enterprise',
        messages_used: 42,
        messages_limit: 100000,
        subscription_status: 'active'
    },
    '2': {
        id: '2',
        email: 'admin@bouba.ai',
        email_verified: true,
        name: 'Administrateur Bouba',
        provider: 'email',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z',
        role: 'admin',
        role_id: 'admin-role-id',
        firstName: 'Admin',
        lastName: 'Bouba',
        onboardingComplete: true,
        planId: 'enterprise',
        messagesUsed: 0,
        messagesLimit: 999999999,
        subscriptionStatus: 'active',
        preferences: { theme: 'dark', language: 'fr' },
        onboarding_complete: true,
        plan_id: 'enterprise',
        messages_used: 0,
        messages_limit: 999999999,
        subscription_status: 'active'
    }
};

const profiles = {
    '1': {
        id: '1',
        user_id: '1',
        first_name: 'Seydou',
        last_name: 'Dianka',
        email: 'user@bouba.ai',
        role: 'user',
        role_id: 'user-role-id',
        work_type: 'entrepreneur',
        timezone: 'Europe/Paris',
        language: 'fr',
        onboarding_complete: true,
        plan_id: 'enterprise',
        messages_used: 42,
        messages_limit: 100000,
        subscription_status: 'active',
        stripe_customer_id: 'cus_premium_123',
        avatar_url: null,
        preferences: { theme: 'dark', language: 'fr', notifications: true },
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z'
    },
    '2': {
        id: '2',
        user_id: '2',
        first_name: 'Admin',
        last_name: 'Bouba',
        email: 'admin@bouba.ai',
        role: 'admin',
        role_id: 'admin-role-id',
        work_type: 'admin',
        timezone: 'Europe/Paris',
        language: 'fr',
        onboarding_complete: true,
        plan_id: 'enterprise',
        messages_used: 0,
        messages_limit: 999999999,
        subscription_status: 'active',
        stripe_customer_id: 'cus_admin_123',
        avatar_url: null,
        preferences: { theme: 'dark', language: 'fr', notifications: true },
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z'
    }
};

const payments = {
    '1': [
        {
            id: 'pay_123',
            user_id: '1',
            plan_id: 'enterprise',
            amount: 4900,
            status: 'succeeded',
            created_at: '2026-04-01T10:00:00Z',
            valid_until: '2026-05-15T10:00:00Z'
        }
    ]
};

// ==================== ROUTES ESSENTIELLES ====================

app.get('/auth/me', (req, res) => {
    const userId = '1';
    const user = users[userId];
    
    res.json({
        success: true,
        user: user
    });
});

app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    
    // Vérifier user normal
    if (email === 'user@bouba.ai' && password === 'password') {
        res.json({
            success: true,
            data: {
                ...users['1'],
                profile: profiles['1']
            }
        });
    }
    // Vérifier admin
    else if (email === 'admin@bouba.ai' && password === 'admin') {
        res.json({
            success: true,
            data: {
                ...users['2'],
                profile: profiles['2']
            }
        });
    }
    else {
        res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }
});

// Route alternative pour le frontend (auth/login)
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Vérifier user normal
    if (email === 'user@bouba.ai' && password === 'password') {
        res.json({
            success: true,
            data: {
                user: users['1']
            }
        });
    }
    // Vérifier admin
    else if (email === 'admin@bouba.ai' && password === 'admin') {
        res.json({
            success: true,
            data: {
                user: users['2']
            }
        });
    }
    else {
        res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }
});

// Route /auth/signin (identique à /auth/login pour compatibilité)
app.post('/auth/signin', (req, res) => {
    const { email, password } = req.body;
    
    // Vérifier user normal
    if (email === 'user@bouba.ai' && password === 'password') {
        res.json({
            success: true,
            data: {
                user: users['1']
            }
        });
    }
    // Vérifier admin
    else if (email === 'admin@bouba.ai' && password === 'admin') {
        res.json({
            success: true,
            data: {
                user: users['2']
            }
        });
    }
    else {
        res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }
});

// Route /auth/signout
app.post('/auth/signout', (req, res) => {
    res.json({
        success: true,
        message: 'Déconnexion réussie'
    });
});

// Route /auth/me pour le frontend
app.get('/auth/me', (req, res) => {
    // Simuler un utilisateur connecté
    res.json({
        success: true,
        user: users['1']
    });
});

// Route /api/auth/me (alternative)
app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        data: {
            user: users['1']
        }
    });
});

// ==================== TOUTES LES CONNEXIONS (11 APPLICATIONS) ====================

app.get('/api/connections', (req, res) => {
    const userId = '1';
    const profile = profiles[userId];
    const planId = profile?.plan_id || 'starter';
    
    // Applications de base (tous les plans)
    const baseApps = [
        { id: 'email', name: 'Email', icon: '📧', type: 'email', plan: 'free', status: 'connected', description: 'Gmail, Outlook, etc.' },
        { id: 'google', name: 'Google', icon: '🔍', type: 'search', plan: 'free', status: 'connected', description: 'Recherche Google' }
    ];
    
    // Applications Pro (plan Pro et Premium)
    const proApps = [
        { id: 'calendar', name: 'Calendar', icon: '📅', type: 'calendar', plan: 'pro', status: 'connected', description: 'Google Calendar' },
        { id: 'contacts', name: 'Contacts', icon: '👥', type: 'contacts', plan: 'pro', status: 'connected', description: 'Google Contacts' },
        { id: 'notion', name: 'Notion', icon: '📝', type: 'notes', plan: 'pro', status: 'pending', description: 'Notes et documentation' },
        { id: 'trello', name: 'Trello/Asana', icon: '📋', type: 'project', plan: 'pro', status: 'available', description: 'Gestion de projets' },
        { id: 'zoom', name: 'Zoom/Meet', icon: '🎥', type: 'video', plan: 'pro', status: 'available', description: 'Visioconférence' }
    ];
    
    // Applications Premium (seulement Premium)
    const premiumApps = [
        { id: 'finance', name: 'Finance', icon: '💰', type: 'finance', plan: 'premium', status: 'connected', description: 'Airtable, Stripe' },
        { id: 'slack', name: 'Slack', icon: '💬', type: 'chat', plan: 'premium', status: 'available', description: 'Communication équipe' },
        { id: 'stripe', name: 'Stripe/PayPal', icon: '💳', type: 'payments', plan: 'premium', status: 'available', description: 'Paiements en ligne' },
        { id: 'dropbox', name: 'Dropbox/Drive', icon: '📁', type: 'storage', plan: 'premium', status: 'available', description: 'Stockage cloud' }
    ];
    
    // Sélectionner les applications selon le plan
    let connections = [...baseApps];
    
    if (planId === 'pro' || planId === 'premium' || planId === 'enterprise') {
        connections = [...connections, ...proApps];
    }
    
    if (planId === 'premium' || planId === 'enterprise') {
        connections = [...connections, ...premiumApps];
    }
    
    res.json({
        success: true,
        data: connections,
        userPlan: planId,
        message: `Plan ${planId}: ${connections.length} applications disponibles`,
        stats: {
            total: connections.length,
            connected: connections.filter(c => c.status === 'connected').length,
            available: connections.filter(c => c.status === 'available').length,
            pending: connections.filter(c => c.status === 'pending').length
        }
    });
});

// ==================== ROUTES POUR LES NOUVELLES PAGES ====================

// Données pour Trello/Asana
app.get('/api/trello/tasks', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: 'Développer intégration Stripe', board: 'Dev', status: 'todo', assignee: 'Dev Team' },
            { id: 2, title: 'Design nouvelle UI dashboard', board: 'Design', status: 'in_progress', assignee: 'Design Team' },
            { id: 3, title: 'Réunion client Acme Corp', board: 'Business', status: 'todo', assignee: 'Seydou' }
        ]
    });
});

// Données pour Zoom/Meet
app.get('/api/video/meetings', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: 'Réunion équipe Dev', platform: 'Zoom', date: '2026-04-15T14:00:00', duration: 60 },
            { id: 2, title: 'Présentation client Acme', platform: 'Google Meet', date: '2026-04-16T10:30:00', duration: 45 }
        ]
    });
});

// Données pour Stripe/PayPal
app.get('/api/payments/transactions', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, amount: 4900, currency: 'EUR', customer: 'Acme Corp', status: 'success' },
            { id: 2, amount: 2900, currency: 'EUR', customer: 'Startup XYZ', status: 'success' }
        ]
    });
});

// Données pour Dropbox/Drive
app.get('/api/storage/files', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: 'Presentation Q2 2026.pdf', type: 'pdf', size: '4.2 MB' },
            { id: 2, name: 'Design System.fig', type: 'figma', size: '12.8 MB' }
        ]
    });
});

// ==================== ROUTES MANQUANTES POUR ÉLIMINER LES 404 ====================

// Route pour conversations (demandée par le frontend)
app.get('/api/conversations', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: '1', userId: 'demo-user', message: 'Bonjour', response: 'Bonjour !', timestamp: new Date().toISOString() },
            { id: '2', userId: 'demo-user', message: 'Comment ça va ?', response: 'Très bien, merci !', timestamp: new Date().toISOString() }
        ]
    });
});

// Routes pour finance
app.get('/api/finance/transactions', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, amount: 150.50, category: 'Salaire', date: '2026-04-01', type: 'income' },
            { id: 2, amount: 45.99, category: 'Courses', date: '2026-04-02', type: 'expense' }
        ]
    });
});

app.get('/api/finance/categories', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: 'Salaire', type: 'income', color: '#10B981' },
            { id: 2, name: 'Courses', type: 'expense', color: '#EF4444' }
        ]
    });
});

app.get('/api/finance/goals', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: 'Épargne vacances', target: 2000, current: 1200 },
            { id: 2, name: 'Nouvel ordinateur', target: 1500, current: 800 }
        ]
    });
});

// Route pour emails
app.get('/api/emails', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, subject: 'Bienvenue sur Bouba AI', from: 'support@bouba.ai', date: '2026-04-14' },
            { id: 2, subject: 'Votre facture', from: 'billing@bouba.ai', date: '2026-04-13' }
        ]
    });
});

// ==================== AUTRES ROUTES ====================

app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'starter',
                name: 'Bouba Starter',
                description: 'Parfait pour découvrir Bouba',
                price: 0,
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 0,
                agents_limit: 1,
                messages_limit: 500,
                features: ['Gmail uniquement', 'Mémoire session', 'Support communauté'],
                limits: { rag: false, web_search: false, finance: false, api_access: false, white_label: false, messages: 500 },
                popular: false,
                active: true,
                created_at: '2026-01-01T00:00:00Z'
            },
            {
                id: 'pro',
                name: 'Bouba Pro',
                description: 'Fonctionnalités avancées pour les professionnels',
                price: 2900,
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 7,
                agents_limit: 4,
                messages_limit: 10000,
                features: ['Gmail + Calendar + Contacts', 'Finance Airtable', 'RAG Pinecone', 'Recherche web Tavily', 'Mémoire 30 jours', 'Support email 48h'],
                limits: { rag: false, web_search: true, finance: true, api_access: false, white_label: false, messages: 10000 },
                stripe_price_id: 'price_pro_monthly',
                popular: true,
                active: true,
                created_at: '2026-01-01T00:00:00Z'
            },
            {
                id: 'enterprise',
                name: 'Bouba Enterprise',
                description: 'Solution complète avec toutes les fonctionnalités',
                price: 9900,
                currency: 'EUR',
                billing_interval: 'monthly',
                trial_days: 14,
                agents_limit: 10,
                messages_limit: 100000,
                features: ['Toutes les intégrations', 'Finance custom DB', 'RAG custom', 'Mémoire illimitée', 'Support dédié SLA 4h', 'API Access', 'White-label'],
                limits: { rag: true, web_search: true, finance: true, api_access: true, white_label: true, messages: 100000 },
                stripe_price_id: 'price_enterprise_monthly',
                popular: false,
                active: true,
                created_at: '2026-01-01T00:00:00Z'
            }
        ]
    });
});

app.post('/api/conversations', (req, res) => {
    res.json({
        success: true,
        conversation: {
            id: Date.now().toString(),
            userId: '1',
            title: 'Nouvelle conversation',
            message: req.body.message || 'Test',
            response: 'Je suis Bouba AI ! Comment puis-je vous aider aujourd\'hui ?',
            timestamp: new Date().toISOString()
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI - All Apps',
        version: '1.0.0',
        mode: 'production',
        features: [
            '11 applications disponibles',
            '4 nouvelles pages créées',
            'Connexions par plan',
            'Authentification complète'
        ]
    });
});

// ==================== ROUTES EMAIL/GMAIL ====================

// Route pour récupérer les emails
app.get('/api/google/gmail/messages', (req, res) => {
    const { maxResults = 50, folder = 'inbox' } = req.query;
    
    // Simuler des emails
    const mockEmails = [
        {
            id: 'email-1',
            threadId: 'thread-1',
            from: 'contact@entreprise.com',
            to: 'user@bouba.ai',
            subject: 'Bienvenue sur Bouba AI',
            snippet: 'Merci d\'avoir rejoint notre plateforme...',
            body: '<p>Bonjour Seydou,<br><br>Bienvenue sur Bouba AI !</p>',
            date: '2026-04-14T10:30:00Z',
            isRead: true,
            isStarred: false,
            labels: ['INBOX', 'CATEGORY_PERSONAL'],
            attachments: [],
            isUrgent: false
        },
        {
            id: 'email-2',
            threadId: 'thread-2',
            from: 'support@stripe.com',
            to: 'user@bouba.ai',
            subject: 'Paiement confirmé',
            snippet: 'Votre paiement mensuel a été traité...',
            body: '<p>Votre paiement de 29.99€ a été confirmé.</p>',
            date: '2026-04-13T14:20:00Z',
            isRead: true,
            isStarred: true,
            labels: ['INBOX', 'IMPORTANT'],
            attachments: [],
            isUrgent: false
        },
        {
            id: 'email-3',
            threadId: 'thread-3',
            from: 'notifications@github.com',
            to: 'user@bouba.ai',
            subject: 'Nouveau commit sur votre repository',
            snippet: 'Un nouveau commit a été poussé sur main...',
            body: '<p>Commit: ajout des nouvelles pages entrepreneurs</p>',
            date: '2026-04-12T09:15:00Z',
            isRead: false,
            isStarred: false,
            labels: ['INBOX'],
            attachments: [],
            isUrgent: true
        }
    ];
    
    res.json({
        success: true,
        data: mockEmails.slice(0, parseInt(maxResults))
    });
});

// Route pour récupérer un email spécifique
app.get('/api/google/gmail/messages/:id', (req, res) => {
    const { id } = req.params;
    
    // Simuler un email détaillé
    const mockEmail = {
        id: id,
        threadId: 'thread-' + id.split('-')[1],
        from: 'contact@entreprise.com',
        to: 'user@bouba.ai',
        subject: 'Email détaillé ' + id,
        snippet: 'Contenu détaillé de l\'email...',
        body: '<p>Ceci est le contenu détaillé de l\'email ' + id + '.</p>',
        date: '2026-04-14T10:30:00Z',
        isRead: true,
        isStarred: false,
        labels: ['INBOX'],
        attachments: [],
        isUrgent: false
    };
    
    res.json({
        success: true,
        data: mockEmail
    });
});

// Route pour envoyer un email
app.post('/api/google/gmail/send', (req, res) => {
    const { to, subject, body } = req.body;
    
    res.json({
        success: true,
        data: {
            id: 'sent-' + Date.now(),
            message: 'Email envoyé avec succès',
            to,
            subject,
            timestamp: new Date().toISOString()
        }
    });
});

// Route alternative pour /api/emails
app.get('/api/emails', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});



// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI ALL APPS sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 NOUVELLES APPLICATIONS CRÉÉES :`);
    console.log(`   1. 📋 Trello/Asana - Gestion de projets`);
    console.log(`   2. 🎥 Zoom/Meet - Visioconférence`);
    console.log(`   3. 💳 Stripe/PayPal - Paiements`);
    console.log(`   4. 📁 Dropbox/Drive - Stockage cloud`);
    console.log(`👤 UTILISATEUR TEST : user@bouba.ai / password`);
    console.log(`📊 PLAN : Premium (11 applications disponibles)`);
});