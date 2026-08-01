const express = require('express');
const app = express();
const PORT = 3001;

// ==================== CORS ULTRA-PERMISSIF ====================
app.use((req, res, next) => {
  // Autoriser toutes les origines pour le développement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Gérer les pré-vols OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// ==================== DONNÉES SIMULÉES ====================

const users = {
  '1': { id: '1', email: 'user@bouba.ai', role: 'user', planId: 'business' },
  '2': { id: '2', email: 'admin@bouba.ai', role: 'admin', planId: 'business' },
  '3': { id: '3', email: 'free@bouba.ai', role: 'user', planId: 'free' },
  '4': { id: '4', email: 'starter@bouba.ai', role: 'user', planId: 'starter' }
};

const profiles = {
  '1': { id: '1', user_id: '1', first_name: 'Seydou', last_name: 'Dianka', plan_id: 'business', subscription_status: 'active', onboarding_complete: true, messages_used: 150, messages_limit: 100000 },
  '2': { id: '2', user_id: '2', first_name: 'Admin', last_name: 'Bouba', plan_id: 'business', subscription_status: 'active', onboarding_complete: true, messages_used: 0, messages_limit: 100000 },
  '3': { id: '3', user_id: '3', first_name: 'Free', last_name: 'User', plan_id: 'free', subscription_status: 'active', onboarding_complete: true, messages_used: 50, messages_limit: 500 },
  '4': { id: '4', user_id: '4', first_name: 'Starter', last_name: 'User', plan_id: 'starter', subscription_status: 'active', onboarding_complete: true, messages_used: 100, messages_limit: 10000 }
};

// ==================== ROUTES ESSENTIELLES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'cors-fixed' });
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const user = users['1'];
  const profile = profiles['1'];
  
  res.json({
    success: true,
    data: {
      user: { ...user, firstName: 'Seydou', lastName: 'Dianka', messagesUsed: 150, messagesLimit: 100000, subscriptionStatus: 'active' },
      profile: profile
    }
  });
});

// GET /auth/me (compatibilité)
app.get('/auth/me', (req, res) => {
  res.json({ success: true, user: users['1'] });
});

// POST /api/auth/signin
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'user@bouba.ai' && password === 'password') {
    const user = users['1'];
    const profile = profiles['1'];
    res.json({ success: true, data: { ...user, profile: profile } });
  } else if (email === 'free@bouba.ai' && password === 'password') {
    const user = users['3'];
    const profile = profiles['3'];
    res.json({ success: true, data: { ...user, profile: profile } });
  } else if (email === 'starter@bouba.ai' && password === 'password') {
    const user = users['4'];
    const profile = profiles['4'];
    res.json({ success: true, data: { ...user, profile: profile } });
  } else {
    res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
  }
});

// ==================== ROUTES CONNECTIONS ====================

app.get('/api/connections', (req, res) => {
  const userPlan = req.query.plan || 'business';
  
  const allConnections = [
    { id: 'chat', name: 'Chat IA', type: 'chat', icon: 'MessageSquare', plan: 'free', connected: true, description: 'Assistant IA conversationnel' },
    { id: 'email', name: 'Email', type: 'email', icon: 'Mail', plan: 'free', connected: true, description: 'Gestion des emails' },
    { id: 'contacts', name: 'Contacts', type: 'contacts', icon: 'Users', plan: 'starter', connected: true, description: 'Gestion des contacts' },
    { id: 'calendar', name: 'Calendrier', type: 'calendar', icon: 'Calendar', plan: 'business', connected: true, description: 'Gestion du calendrier' },
    { id: 'finance', name: 'Finance', type: 'finance', icon: 'TrendingUp', plan: 'business', connected: true, description: 'Gestion financière et documents' }
  ];
  
  let filteredConnections = [];
  
  if (userPlan === 'free') {
    filteredConnections = allConnections.filter(conn => conn.plan === 'free');
  } else if (userPlan === 'starter') {
    filteredConnections = allConnections.filter(conn => conn.plan === 'free' || conn.plan === 'starter');
  } else if (userPlan === 'business') {
    filteredConnections = allConnections;
  }
  
  res.json({ success: true, data: filteredConnections, userPlan: userPlan });
});

// ==================== ROUTES PLANS ====================

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
        limits: { agents: 1, messages: 500, emails: 100, contacts: 0, calendar: false, finance: false },
        description: 'Parfait pour découvrir Bouba'
      },
      {
        id: 'starter',
        name: 'Bouba Starter',
        price: 9.99,
        currency: 'EUR',
        billing_interval: 'monthly',
        features: ['Chat IA (10,000 messages/mois)', 'Email', 'Contacts'],
        limits: { agents: 2, messages: 10000, emails: 1000, contacts: 500, calendar: false, finance: false },
        description: 'Pour les freelances et petites équipes'
      },
      {
        id: 'business',
        name: 'Bouba Business',
        price: 29.99,
        currency: 'EUR',
        billing_interval: 'monthly',
        features: ['Chat IA (illimité)', 'Email', 'Contacts', 'Calendrier', 'Finance avec documents'],
        limits: { agents: 5, messages: -1, emails: 5000, contacts: 2000, calendar: true, finance: true },
        description: 'Solution complète pour les entreprises'
      }
    ]
  });
});

// ==================== ROUTES MANQUANTES ====================

app.get('/data/subscriptions', (req, res) => {
  res.json({
    success: true,
    data: [{
      id: '1',
      user_id: req.query.user_id || '3',
      plan_id: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  });
});

app.get('/data/payments', (req, res) => {
  res.json({
    success: true,
    data: [{
      id: '1',
      user_id: req.query.user_id || '3',
      amount: 0,
      currency: 'EUR',
      status: 'succeeded',
      description: 'Abonnement Free',
      created_at: new Date().toISOString()
    }]
  });
});

app.get('/api/data/subscriptions', (req, res) => {
  res.json({
    success: true,
    data: [{
      id: '1',
      user_id: req.query.user_id || '3',
      plan_id: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  });
});

app.get('/api/data/payments', (req, res) => {
  res.json({
    success: true,
    data: [{
      id: '1',
      user_id: req.query.user_id || '3',
      amount: 0,
      currency: 'EUR',
      status: 'succeeded',
      description: 'Abonnement Free',
      created_at: new Date().toISOString()
    }]
  });
});

// ==================== ROUTES CATCH-ALL ====================

app.all('/api/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url} - retourning empty success`);
  res.json({ success: true, data: [] });
});

app.all('/data/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url} - retourning empty success`);
  res.json({ success: true, data: [] });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI CORS FIXED sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
  console.log(`👤 UTILISATEURS :`);
  console.log(`   - user@bouba.ai / password (business)`);
  console.log(`   - free@bouba.ai / password (free)`);
  console.log(`   - starter@bouba.ai / password (starter)`);
  console.log(`🌐 CORS: Autorise toutes les origines (*)`);
});