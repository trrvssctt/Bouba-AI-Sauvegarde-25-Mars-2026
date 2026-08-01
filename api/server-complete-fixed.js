const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Configuration CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://144.91.96.142:5173', 'http://144.91.96.142:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP (Content Security Policy) - version basique
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://144.91.96.142:3001 http://144.91.96.142:5173;"
  );
  
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==================== MIDDLEWARES DE VALIDATION ====================

// Validation des emails
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation des mots de passe (minimum 8 caractères)
const validatePassword = (password) => {
  return password && password.length >= 8;
};

// Middleware de validation pour /api/auth/signin
const validateSignIn = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email et mot de passe requis' 
    });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Format d\'email invalide' 
    });
  }
  
  if (!validatePassword(password)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Le mot de passe doit contenir au moins 8 caractères' 
    });
  }
  
  next();
};

// Middleware de validation pour /api/auth/signup
const validateSignUp = (req, res, next) => {
  const { email, password, first_name, last_name } = req.body;
  
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ 
      success: false, 
      error: 'Tous les champs sont requis' 
    });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Format d\'email invalide' 
    });
  }
  
  if (!validatePassword(password)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Le mot de passe doit contenir au moins 8 caractères' 
    });
  }
  
  if (first_name.length < 2 || last_name.length < 2) {
    return res.status(400).json({ 
      success: false, 
      error: 'Le prénom et le nom doivent contenir au moins 2 caractères' 
    });
  }
  
  next();
};

// ==================== DONNÉES SIMULÉES ====================

const users = {
  '1': { 
    id: '1', 
    email: 'user@bouba.ai', 
    role: 'user', 
    planId: 'business', 
    onboardingComplete: true,
    onboarding_complete: true
  },
  '2': { 
    id: '2', 
    email: 'admin@bouba.ai', 
    role: 'admin', 
    planId: 'business', 
    onboardingComplete: true,
    onboarding_complete: true
  },
  '3': { 
    id: '3', 
    email: 'free@bouba.ai', 
    role: 'user', 
    planId: 'free', 
    onboardingComplete: true,
    onboarding_complete: true
  },
  '4': { 
    id: '4', 
    email: 'starter@bouba.ai', 
    role: 'user', 
    planId: 'starter', 
    onboardingComplete: true,
    onboarding_complete: true
  }
};

const profiles = {
  '1': { 
    id: '1', 
    user_id: '1', 
    first_name: 'Seydou', 
    last_name: 'Dianka', 
    plan_id: 'business', 
    subscription_status: 'active',
    onboarding_complete: true,
    messages_used: 150,
    messages_limit: 100000,  // Business: illimité
    preferences: { theme: 'light', notifications: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  '2': { 
    id: '2', 
    user_id: '2', 
    first_name: 'Admin', 
    last_name: 'Bouba', 
    plan_id: 'business', 
    subscription_status: 'active',
    onboarding_complete: true,
    messages_used: 0,
    messages_limit: 100000,  // Business: illimité
    preferences: { theme: 'dark', notifications: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  '3': { 
    id: '3', 
    user_id: '3', 
    first_name: 'Free', 
    last_name: 'User', 
    plan_id: 'free', 
    subscription_status: 'active',
    onboarding_complete: true,
    messages_used: 50,
    messages_limit: 500,  // Free: 500 messages
    preferences: { theme: 'light', notifications: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  '4': { 
    id: '4', 
    user_id: '4', 
    first_name: 'Starter', 
    last_name: 'User', 
    plan_id: 'starter', 
    subscription_status: 'active',
    onboarding_complete: true,
    messages_used: 100,
    messages_limit: 10000,  // Starter: 10,000 messages
    preferences: { theme: 'light', notifications: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

// ==================== ROUTES AUTH ====================

// GET /api/auth/me - Récupérer l'utilisateur courant
app.get('/api/auth/me', (req, res) => {
  const user = users['1'];
  const profile = profiles['1'];
  
  res.json({
    success: true,
    data: {
      user: {
        ...user,
        firstName: 'Seydou',
        lastName: 'Dianka',
        messagesUsed: 150,
        messagesLimit: 5000,
        subscriptionStatus: 'active',
        preferences: { theme: 'light', notifications: true }
      },
      profile: profile
    }
  });
});

// GET /auth/me - Compatibilité
app.get('/auth/me', (req, res) => {
  res.json({ success: true, user: users['1'] });
});

app.post('/api/auth/signin', validateSignIn, (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'user@bouba.ai' && password === 'password') {
    const userData = {
      ...users['1'],
      firstName: 'Seydou',
      lastName: 'Dianka',
      onboardingComplete: true,
      planId: 'business',
      messagesUsed: 150,
      messagesLimit: 100000,
      subscriptionStatus: 'active',
      preferences: { theme: 'light', notifications: true }
    };
    res.json({ success: true, data: { ...userData, profile: profiles['1'] } });
  } else if (email === 'admin@bouba.ai' && password === 'admin') {
    const userData = {
      ...users['2'],
      firstName: 'Admin',
      lastName: 'Bouba',
      onboardingComplete: true,
      planId: 'business',
      messagesUsed: 0,
      messagesLimit: 100000,
      subscriptionStatus: 'active',
      preferences: { theme: 'dark', notifications: true }
    };
    res.json({ success: true, data: { ...userData, profile: profiles['2'] } });
  } else if (email === 'free@bouba.ai' && password === 'password') {
    const userData = {
      ...users['3'],
      firstName: 'Free',
      lastName: 'User',
      onboardingComplete: true,
      planId: 'free',
      messagesUsed: 50,
      messagesLimit: 500,
      subscriptionStatus: 'active',
      preferences: { theme: 'light', notifications: true }
    };
    res.json({ success: true, data: { ...userData, profile: profiles['3'] } });
  } else if (email === 'starter@bouba.ai' && password === 'password') {
    const userData = {
      ...users['4'],
      firstName: 'Starter',
      lastName: 'User',
      onboardingComplete: true,
      planId: 'starter',
      messagesUsed: 100,
      messagesLimit: 10000,
      subscriptionStatus: 'active',
      preferences: { theme: 'light', notifications: true }
    };
    res.json({ success: true, data: { ...userData, profile: profiles['4'] } });
  } else {
    res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
  }
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'user@bouba.ai' && password === 'password') {
    res.json({ success: true, data: { user: users['1'] } });
  } else if (email === 'admin@bouba.ai' && password === 'admin') {
    res.json({ success: true, data: { user: users['2'] } });
  } else {
    res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
  }
});

app.post('/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'user@bouba.ai' && password === 'password') {
    const userData = {
      ...users['1'],
      firstName: 'Seydou',
      lastName: 'Dianka',
      onboardingComplete: true,
      planId: 'enterprise',
      messagesUsed: 150,
      messagesLimit: 5000,
      subscriptionStatus: 'active',
      preferences: { theme: 'light', notifications: true }
    };
    res.json({ success: true, data: { user: userData } });
  } else if (email === 'admin@bouba.ai' && password === 'admin') {
    const userData = {
      ...users['2'],
      firstName: 'Admin',
      lastName: 'Bouba',
      onboardingComplete: true,
      planId: 'enterprise',
      messagesUsed: 0,
      messagesLimit: 999999999,
      subscriptionStatus: 'active',
      preferences: { theme: 'dark', notifications: true }
    };
    res.json({ success: true, data: { user: userData } });
  } else {
    res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
  }
});

app.post('/api/auth/signout', (req, res) => {
  res.json({ success: true });
});

app.post('/auth/signout', (req, res) => {
  res.json({ success: true });
});

// POST /api/auth/signup - Créer un compte
app.post('/api/auth/signup', validateSignUp, (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  
  // Vérifier si l'email existe déjà
  const existingUser = Object.values(users).find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ 
      success: false, 
      error: 'Un compte avec cet email existe déjà' 
    });
  }
  
  // Créer un nouvel utilisateur
  const newId = (Object.keys(users).length + 1).toString();
  const newUser = {
    id: newId,
    email,
    firstName: first_name,
    lastName: last_name,
    role: 'user',
    planId: 'starter',
    onboardingComplete: false,
    messagesUsed: 0,
    messagesLimit: 500,
    subscriptionStatus: 'active',
    preferences: {}
  };
  
  users[newId] = newUser;
  
  res.json({ 
    success: true, 
    data: { 
      user: newUser,
      profile: {
        id: newId,
        first_name,
        last_name,
        email,
        role: 'user',
        onboarding_complete: false,
        plan_id: 'starter',
        messages_used: 0,
        messages_limit: 500,
        subscription_status: 'active',
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } 
  });
});

// ==================== ROUTES ESSENTIELLES ====================

app.get('/api/connections', (req, res) => {
  // Déterminer le plan de l'utilisateur (par défaut: business pour tests)
  const userPlan = req.query.plan || 'business';
  
  // Toutes les connexions disponibles
  const allConnections = [
    { id: 'chat', name: 'Chat IA', type: 'chat', icon: 'MessageSquare', plan: 'free', connected: true, description: 'Assistant IA conversationnel' },
    { id: 'email', name: 'Email', type: 'email', icon: 'Mail', plan: 'free', connected: true, description: 'Gestion des emails' },
    { id: 'contacts', name: 'Contacts', type: 'contacts', icon: 'Users', plan: 'starter', connected: true, description: 'Gestion des contacts' },
    { id: 'calendar', name: 'Calendrier', type: 'calendar', icon: 'Calendar', plan: 'business', connected: true, description: 'Gestion du calendrier' },
    { id: 'finance', name: 'Finance', type: 'finance', icon: 'TrendingUp', plan: 'business', connected: true, description: 'Gestion financière et documents' }
  ];
  
  // Filtrer selon le plan
  let filteredConnections = [];
  
  if (userPlan === 'free') {
    // Free: seulement chat et email
    filteredConnections = allConnections.filter(conn => 
      conn.plan === 'free'
    );
  } else if (userPlan === 'starter') {
    // Starter: chat, email, contacts
    filteredConnections = allConnections.filter(conn => 
      conn.plan === 'free' || conn.plan === 'starter'
    );
  } else if (userPlan === 'business') {
    // Business: toutes les fonctionnalités
    filteredConnections = allConnections;
  }
  
  res.json({
    success: true,
    data: filteredConnections,
    userPlan: userPlan
  });
});

app.get('/api/data/plans', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'free',
        name: 'Bouba Free',
        price: 0,
        currency: 'EUR',
        billing_interval: 'monthly',
        features: ['Chat IA (500 messages/mois)', 'Email'],
        limits: { 
          agents: 1, 
          messages: 500,
          emails: 100,
          contacts: 0,
          calendar: false,
          finance: false
        },
        description: 'Parfait pour découvrir Bouba'
      },
      {
        id: 'starter',
        name: 'Bouba Starter',
        price: 9.99,
        currency: 'EUR',
        billing_interval: 'monthly',
        features: ['Chat IA (10,000 messages/mois)', 'Email', 'Contacts'],
        limits: { 
          agents: 2, 
          messages: 10000,
          emails: 1000,
          contacts: 500,
          calendar: false,
          finance: false
        },
        description: 'Pour les freelances et petites équipes'
      },
      {
        id: 'business',
        name: 'Bouba Business',
        price: 29.99,
        currency: 'EUR',
        billing_interval: 'monthly',
        features: ['Chat IA (illimité)', 'Email', 'Contacts', 'Calendrier', 'Finance avec documents'],
        limits: { 
          agents: 5, 
          messages: -1,  // illimité
          emails: 5000,
          contacts: 2000,
          calendar: true,
          finance: true
        },
        description: 'Solution complète pour les entreprises'
      }
    ]
  });
});

// Route pour /data/subscriptions (compatibilité)
app.get('/data/subscriptions', (req, res) => {
  const { user_id } = req.query;
  
  res.json({
    success: true,
    data: [
      {
        id: '1',
        user_id: user_id || '3',
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  });
});

// Route pour /data/payments (compatibilité)
app.get('/data/payments', (req, res) => {
  const { user_id } = req.query;
  
  res.json({
    success: true,
    data: [
      {
        id: '1',
        user_id: user_id || '3',
        amount: 0,
        currency: 'EUR',
        status: 'succeeded',
        description: 'Abonnement Free',
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Route pour /api/data/subscriptions
app.get('/api/data/subscriptions', (req, res) => {
  const { user_id } = req.query;
  
  res.json({
    success: true,
    data: [
      {
        id: '1',
        user_id: user_id || '3',
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  });
});

// Route pour /api/data/payments
app.get('/api/data/payments', (req, res) => {
  const { user_id } = req.query;
  
  res.json({
    success: true,
    data: [
      {
        id: '1',
        user_id: user_id || '3',
        amount: 0,
        currency: 'EUR',
        status: 'succeeded',
        description: 'Abonnement Free',
        created_at: new Date().toISOString()
      }
    ]
  });
});

// ==================== ROUTES CONVERSATIONS (CRITIQUE) ====================

app.get('/api/conversations', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.post('/api/conversations', (req, res) => {
  console.log('📝 POST /api/conversations appelé avec:', req.body);
  
  res.json({
    success: true,
    conversation: {
      id: Date.now().toString(),
      userId: req.body.userId || '1',
      title: 'Nouvelle conversation',
      message: req.body.message || 'Bonjour',
      response: 'Je suis Bouba AI ! Comment puis-je vous aider ?',
      timestamp: new Date().toISOString()
    }
  });
});

// ==================== AUTRES ROUTES ====================

app.get('/api/google/gmail/messages', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/notifications', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: { totalMessages: 42, activeConnections: 7, storageUsed: '2.1 GB' }
  });
});

app.get('/api/data/subscriptions', (req, res) => {
  res.json({
    success: true,
    data: [{ id: 'sub_123', user_id: '1', plan_id: 'enterprise', status: 'active' }]
  });
});

app.get('/api/upgrade-requests/status', (req, res) => {
  res.json({
    success: true,
    data: { hasPendingRequest: false, currentPlan: 'enterprise' }
  });
});

app.post('/api/upgrade-requests', (req, res) => {
  res.json({
    success: true,
    data: { id: 'req_' + Date.now(), user_id: '1', status: 'pending' }
  });
});

app.get('/api/data/payments', (req, res) => {
  res.json({
    success: true,
    data: [{ id: 'pay_123', user_id: '1', amount: 4900, status: 'succeeded' }]
  });
});

app.get('/data/profiles/:id', (req, res) => {
  res.json({ success: true, data: profiles[req.params.id] || profiles['1'] });
});

app.post('/data/usage/increment', (req, res) => {
  res.json({ success: true, data: { messages_used: 43, messages_limit: 100000 } });
});

// ==================== ROUTES DES APPLICATIONS ====================

app.get('/api/trello/tasks', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'task_1', title: 'Créer maquettes Figma', status: 'in_progress' },
      { id: 'task_2', title: 'Développer API', status: 'todo' }
    ]
  });
});

app.get('/api/video/meetings', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'meet_1', title: 'Révision hebdomadaire', date: '2026-04-16T14:00:00Z' },
      { id: 'meet_2', title: 'Présentation client', date: '2026-04-18T10:00:00Z' }
    ]
  });
});

app.get('/api/payments/transactions', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'tx_1', amount: 2999, description: 'Abonnement Pro' },
      { id: 'tx_2', amount: 4999, description: 'Mise à niveau Enterprise' }
    ]
  });
});

app.get('/api/storage/files', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'file_1', name: 'Rapport financier.pdf', size: '2.4 MB' },
      { id: 'file_2', name: 'Maquettes UI Figma', size: '15.7 MB' }
    ]
  });
});

app.get('/api/finance/transactions', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/finance/categories', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/finance/goals', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/emails', (req, res) => {
  res.json({ success: true, data: [] });
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Bouba AI - Complete Fixed',
    version: '1.0.0'
  });
});

// ==================== CATCH-ALL ====================

app.all('/api/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url} - Route non définie`);
  
  res.json({
    success: true,
    data: [],
    message: `Route ${req.url} simulée`,
    timestamp: new Date().toISOString()
  });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI COMPLETE FIXED sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
  console.log(`👤 UTILISATEURS :`);
  console.log(`   - user@bouba.ai / password (user)`);
  console.log(`   - admin@bouba.ai / admin (admin)`);
  console.log(`📊 ROUTES FIXÉES : /api/conversations (POST) avec format conversation.id`);
});