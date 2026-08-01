const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

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
        // camelCase pour useAuth.tsx
        firstName: 'Seydou',
        lastName: 'Dianka',
        onboardingComplete: true,
        planId: 'premium',
        messagesUsed: 42,
        messagesLimit: 100000,
        subscriptionStatus: 'active',
        preferences: { theme: 'dark', language: 'fr' },
        // snake_case pour OnboardingPage.tsx
        onboarding_complete: true,
        plan_id: 'premium',
        messages_used: 42,
        messages_limit: 100000,
        subscription_status: 'active'
    },
    '2': {
        id: '2',
        email: 'free@bouba.ai',
        email_verified: true,
        name: 'Utilisateur Gratuit',
        provider: 'email',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z',
        role: 'user',
        role_id: 'user-role-id',
        firstName: 'Free',
        lastName: 'User',
        onboardingComplete: true,
        planId: 'starter',
        messagesUsed: 85,
        messagesLimit: 500,
        subscriptionStatus: 'active',
        preferences: { theme: 'light', language: 'fr' },
        onboarding_complete: true,
        plan_id: 'starter',
        messages_used: 85,
        messages_limit: 500,
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
        plan_id: 'premium',
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
        first_name: 'Free',
        last_name: 'User',
        email: 'free@bouba.ai',
        role: 'user',
        role_id: 'user-role-id',
        work_type: 'student',
        timezone: 'Europe/Paris',
        language: 'fr',
        onboarding_complete: true,
        plan_id: 'starter',
        messages_used: 85,
        messages_limit: 500,
        subscription_status: 'active',
        stripe_customer_id: null,
        avatar_url: null,
        preferences: { theme: 'light', language: 'fr', notifications: true },
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z'
    }
};

const payments = {
    '1': [
        {
            id: 'pay_123',
            user_id: '1',
            plan_id: 'premium',
            amount: 4900, // 49€ en centimes
            status: 'succeeded',
            created_at: '2026-04-01T10:00:00Z',
            valid_until: '2026-05-15T10:00:00Z' // Valide jusqu'au 15 mai (dans le futur)
        }
    ],
    '2': [] // Utilisateur gratuit, pas de paiement
};

const plans = {
    'starter': {
        id: 'starter',
        name: 'Bouba Starter',
        description: 'Parfait pour découvrir Bouba et commencer votre productivité',
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
    'premium': {
        id: 'premium',
        name: 'Bouba Premium',
        description: 'Solution complète avec toutes les fonctionnalités',
        price: 4900,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 14,
        agents_limit: 10,
        messages_limit: 100000,
        features: ['Toutes les intégrations', 'Finance custom DB', 'RAG custom', 'Mémoire illimitée', 'Support dédié SLA 4h', 'API Access', 'White-label'],
        limits: { rag: true, web_search: true, finance: true, api_access: true, white_label: true, messages: 100000 },
        stripe_price_id: 'price_premium_monthly',
        popular: false,
        active: true,
        created_at: '2026-01-01T00:00:00Z'
    }
};

// ==================== UTILITAIRES ====================

function checkPaymentValidThisMonth(userId) {
    const userPayments = payments[userId] || [];
    if (userPayments.length === 0) return false;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Vérifier si un paiement est valide pour le mois en cours
    return userPayments.some(payment => {
        const validUntil = new Date(payment.valid_until);
        return validUntil >= now && 
               payment.status === 'succeeded' &&
               validUntil.getMonth() === currentMonth &&
               validUntil.getFullYear() === currentYear;
    });
}

function getUserPlan(userId) {
    const profile = profiles[userId];
    return profile ? plans[profile.plan_id] : plans['starter'];
}

function isPlanFree(planId) {
    return planId === 'starter' || plans[planId]?.price === 0;
}

// ==================== ROUTES AUTH COMPLÈTES ====================

// GET /api/auth/me - Récupère l'utilisateur connecté avec toutes les données
app.get('/api/auth/me', (req, res) => {
    const userId = '1'; // Simuler l'utilisateur connecté (Seydou Premium)
    const user = users[userId];
    const profile = profiles[userId];
    const plan = getUserPlan(userId);
    const hasValidPayment = checkPaymentValidThisMonth(userId);
    
    if (!user) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }
    
    // Vérifier si l'utilisateur peut se connecter
    if (!isPlanFree(profile.plan_id) && !hasValidPayment) {
        return res.status(403).json({ 
            success: false, 
            error: 'Paiement requis',
            message: 'Votre paiement pour ce mois a expiré. Veuillez régulariser votre situation.'
        });
    }
    
    res.json({
        success: true,
        user: {
            ...user,
            // Ajouter le profil dans user.profile pour useAuth.tsx
            profile: profile
        },
        profile: profile,
        plan: plan,
        hasValidPayment: hasValidPayment,
        canConnect: isPlanFree(profile.plan_id) || hasValidPayment
    });
});

// GET /auth/me - Compatibilité avec l'ancienne route
app.get('/auth/me', (req, res) => {
    const userId = '1';
    const user = users[userId];
    
    if (!user) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }
    
    res.json({
        success: true,
        user: user
    });
});

// POST /api/auth/signin - Connexion avec vérification de paiement
app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    
    // Simuler la vérification d'email/password
    let userId = null;
    if (email === 'user@bouba.ai' && password === 'password') {
        userId = '1'; // Seydou Premium
    } else if (email === 'free@bouba.ai' && password === 'password') {
        userId = '2'; // Utilisateur gratuit
    }
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Email ou mot de passe incorrect' 
        });
    }
    
    const user = users[userId];
    const profile = profiles[userId];
    const plan = getUserPlan(userId);
    const hasValidPayment = checkPaymentValidThisMonth(userId);
    
    // VÉRIFICATION CRITIQUE : Plan payant sans paiement valide
    if (!isPlanFree(profile.plan_id) && !hasValidPayment) {
        return res.status(403).json({ 
            success: false, 
            error: 'Paiement requis',
            message: `Votre plan ${plan.name} nécessite un paiement valide pour ce mois.`,
            redirectTo: '/settings/plan'
        });
    }
    
    // Vérifier le statut d'abonnement
    if (profile.subscription_status !== 'active') {
        return res.status(403).json({ 
            success: false, 
            error: 'Abonnement inactif',
            message: 'Votre abonnement n\'est pas actif. Veuillez régulariser votre situation.',
            redirectTo: '/settings/plan'
        });
    }
    
    // Connexion réussie
    res.json({
        success: true,
        data: {
            ...user,
            profile: profile,
            plan: plan,
            hasValidPayment: hasValidPayment
        },
        message: 'Connexion réussie !'
    });
});

// ==================== ROUTES PROFIL ET NAVBAR ====================

// GET /data/profiles/:id - Pour refreshProfile() dans useAuth.tsx
app.get('/data/profiles/:id', (req, res) => {
    const profileId = req.params.id;
    const profile = profiles[profileId];
    
    if (!profile) {
        return res.status(404).json({ success: false, error: 'Profil non trouvé' });
    }
    
    res.json({
        success: true,
        data: profile
    });
});

// POST /data/usage/increment - Pour incrementUsage()
app.post('/data/usage/increment', (req, res) => {
    const userId = '1';
    const profile = profiles[userId];
    
    if (profile) {
        // Incrémenter l'usage localement
        profile.messages_used += 1;
        if (users[userId]) {
            users[userId].messagesUsed += 1;
            users[userId].messages_used += 1;
        }
    }
    
    res.json({ 
        success: true, 
        data: { 
            incremented: true,
            newCount: profile?.messages_used || 0
        } 
    });
});

// ==================== ROUTES PLANS ====================

app.get('/api/data/plans', (req, res) => {
    res.json({
        success: true,
        data: Object.values(plans)
    });
});

// ==================== AUTRES ROUTES ESSENTIELLES ====================

app.post('/api/conversations', (req, res) => {
    res.json({
        success: true,
        data: {
            id: Date.now().toString(),
            userId: '1',
            message: req.body.message || 'Test',
            response: 'Je suis Bouba AI ! Comment puis-je vous aider aujourd\'hui ?',
            timestamp: new Date().toISOString()
        }
    });
});

app.get('/api/connections', (req, res) => {
    const userId = '1';
    const profile = profiles[userId];
    const plan = getUserPlan(userId);
    
    let connections = [];
    
    if (plan.id === 'starter') {
        connections = [
            { id: 1, type: 'email', name: 'Email', icon: '📧', plan: 'free', status: 'connected' },
            { id: 7, type: 'google', name: 'Google', icon: '🔍', plan: 'free', status: 'connected' }
        ];
    } else if (plan.id === 'premium') {
        connections = [
            { id: 1, type: 'email', name: 'Email', icon: '📧', plan: 'free', status: 'connected' },
            { id: 2, type: 'calendar', name: 'Calendar', icon: '📅', plan: 'pro', status: 'connected' },
            { id: 3, type: 'contacts', name: 'Contacts', icon: '👥', plan: 'pro', status: 'connected' },
            { id: 4, type: 'finance', name: 'Finance', icon: '💰', plan: 'premium', status: 'connected' },
            { id: 5, type: 'notion', name: 'Notion', icon: '📝', plan: 'pro', status: 'pending' },
            { id: 6, type: 'slack', name: 'Slack', icon: '💬', plan: 'premium', status: 'available' },
            { id: 7, type: 'google', name: 'Google', icon: '🔍', plan: 'free', status: 'connected' }
        ];
    }
    
    res.json({
        success: true,
        data: connections,
        userPlan: plan.id,
        message: `Plan ${plan.name}: ${connections.length} connexions disponibles`
    });
});

app.get('/api/data/subscriptions', (req, res) => {
    const userId = req.query['user_id[eq]'] || '1';
    const profile = profiles[userId];
    
    res.json({
        success: true,
        data: [{
            id: 'sub_123',
            user_id: userId,
            plan_id: profile?.plan_id || 'starter',
            status: profile?.subscription_status || 'active',
            plan: plans[profile?.plan_id || 'starter']
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

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI - Auth Complete',
        version: '1.0.0',
        mode: 'production',
        features: [
            'Vérification paiement mensuel',
            'Authentification complète',
            'Profil et navbar personnalisés',
            'Accès selon plan'
        ]
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI AUTH COMPLETE sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 FONCTIONNALITÉS IMPLÉMENTÉES :`);
    console.log(`   ✅ Vérification paiement mensuel pour plans payants`);
    console.log(`   ✅ Connexion refusée si paiement expiré (plan payant)`);
    console.log(`   ✅ Connexion autorisée pour plan gratuit`);
    console.log(`   ✅ Profil complet : Seydou Dianka (user@bouba.ai)`);
    console.log(`   ✅ Navbar personnalisée avec nom/prénom`);
    console.log(`   ✅ Accès aux pages selon plan (Premium = toutes)`);
    console.log(`   ✅ Messages selon plan (Premium = 100 000)`);
    console.log(`👤 UTILISATEURS DE TEST :`);
    console.log(`   🔹 Seydou Premium : user@bouba.ai / password`);
    console.log(`   🔹 Utilisateur Gratuit : free@bouba.ai / password`);
});