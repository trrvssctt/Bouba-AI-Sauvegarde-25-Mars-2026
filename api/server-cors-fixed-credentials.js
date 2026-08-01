const express = require('express');
const app = express();
const PORT = 3001;

// ==================== CORS CORRECT POUR CREDENTIALS ====================
app.use((req, res, next) => {
  // Liste des origines autorisées
  const allowedOrigins = [
    'http://localhost:5173',
    'http://144.91.96.142:5173',
    'http://144.91.96.142:3000'
  ];
  
  const origin = req.headers.origin;
  
  // Vérifier si l'origine est autorisée
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin'); // Important pour le cache CORS
  
  // Gérer les pré-vols OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// ==================== DONNÉES ====================

const users = {
  '1': { id: '1', email: 'user@bouba.ai', password: 'password', role: 'user', planId: 'business', status: 'active' },
  '2': { id: '2', email: 'admin@bouba.ai', password: 'admin', role: 'admin', planId: 'business', status: 'active' },
  '3': { id: '3', email: 'free@bouba.ai', password: 'password', role: 'user', planId: 'free', status: 'active' },
  '4': { id: '4', email: 'starter@bouba.ai', password: 'password', role: 'user', planId: 'starter', status: 'active' }
};

const profiles = {
  '1': { id: '1', user_id: '1', first_name: 'Seydou', last_name: 'Dianka', plan_id: 'business', subscription_status: 'active', onboarding_complete: true },
  '2': { id: '2', user_id: '2', first_name: 'Admin', last_name: 'Bouba', plan_id: 'business', subscription_status: 'active', onboarding_complete: true },
  '3': { id: '3', user_id: '3', first_name: 'Free', last_name: 'User', plan_id: 'free', subscription_status: 'active', onboarding_complete: true },
  '4': { id: '4', user_id: '4', first_name: 'Starter', last_name: 'User', plan_id: 'starter', subscription_status: 'active', onboarding_complete: true }
};

// ==================== ROUTES AUTH ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'cors-fixed-credentials' });
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

// POST /api/auth/signin
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Connexion attempt:', email);
  
  const user = Object.values(users).find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
  }
  
  const profile = profiles[user.id];
  
  // Set cookie de session (simulé)
  res.cookie('session_id', `session_${user.id}`, {
    httpOnly: true,
    secure: false, // true en production avec HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24h
  });
  
  res.json({ 
    success: true, 
    data: { 
      ...user, 
      profile: profile 
    } 
  });
});

// ==================== ROUTES ADMIN ====================

// GET /api/admin/dashboard - Tableau de bord admin
app.get('/api/admin/dashboard', (req, res) => {
  // Vérifier si admin (simplifié)
  const isAdmin = req.headers.authorization === 'Bearer admin-token' || 
                  req.cookies?.session_id === 'session_2';
  
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Accès admin requis' });
  }
  
  const stats = {
    totalUsers: Object.keys(users).length,
    activeUsers: Object.values(users).filter(u => u.status === 'active').length,
    pendingPayments: 3,
    revenue: {
      today: 12500,
      month: 189500,
      total: 1250000
    },
    recentActivity: [
      { id: 1, user: 'Nouveau User', action: 'Inscription', time: '10 min ago' },
      { id: 2, user: 'Test User', action: 'Paiement', time: '1h ago' },
      { id: 3, user: 'Admin', action: 'Validation', time: '2h ago' }
    ]
  };
  
  res.json({ success: true, data: stats });
});

// GET /api/admin/users - Liste des utilisateurs
app.get('/api/admin/users', (req, res) => {
  const userList = Object.values(users).map(user => ({
    ...user,
    profile: profiles[user.id],
    // Masquer le mot de passe
    password: undefined
  }));
  
  res.json({ success: true, data: userList });
});

// GET /api/admin/payments - Paiements en attente
app.get('/api/admin/payments', (req, res) => {
  const pendingPayments = [
    { id: 1, user: 'test@example.com', amount: 6500, currency: 'XOF', status: 'pending', date: '2026-04-15' },
    { id: 2, user: 'demo@example.com', amount: 19900, currency: 'XOF', status: 'pending', date: '2026-04-14' },
    { id: 3, user: 'new@example.com', amount: 6500, currency: 'XOF', status: 'pending', date: '2026-04-13' }
  ];
  
  res.json({ success: true, data: pendingPayments });
});

// POST /api/admin/approve-payment/:id - Approuver un paiement
app.post('/api/admin/approve-payment/:id', (req, res) => {
  const { id } = req.params;
  
  console.log(`✅ Paiement ${id} approuvé`);
  
  res.json({ 
    success: true, 
    data: { 
      id, 
      status: 'approved',
      message: 'Paiement approuvé avec succès'
    } 
  });
});

// ==================== ROUTES EXISTANTES ====================

app.get('/api/data/plans', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'free',
        name: 'Bouba Free',
        price: 0,
        currency: 'XOF',
        features: ['Chat IA (500 messages/mois)', 'Email'],
        description: 'Parfait pour découvrir Bouba'
      },
      {
        id: 'starter',
        name: 'Bouba Starter',
        price: 6500,
        currency: 'XOF',
        features: ['Chat IA (10,000 messages/mois)', 'Email', 'Contacts'],
        description: 'Pour les freelances et petites équipes'
      },
      {
        id: 'business',
        name: 'Bouba Business',
        price: 19900,
        currency: 'XOF',
        features: ['Chat IA (illimité)', 'Email', 'Contacts', 'Calendrier', 'Finance avec documents'],
        description: 'Solution complète pour les entreprises'
      }
    ]
  });
});

app.get('/api/connections', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'chat', name: 'Chat IA', type: 'chat', icon: 'MessageSquare', plan: 'free', connected: true },
      { id: 'email', name: 'Email', type: 'email', icon: 'Mail', plan: 'free', connected: true },
      { id: 'contacts', name: 'Contacts', type: 'contacts', icon: 'Users', plan: 'starter', connected: true },
      { id: 'calendar', name: 'Calendrier', type: 'calendar', icon: 'Calendar', plan: 'business', connected: true },
      { id: 'finance', name: 'Finance', type: 'finance', icon: 'TrendingUp', plan: 'business', connected: true }
    ],
    userPlan: 'business'
  });
});

// ==================== CATCH-ALL ====================

app.all('/api/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url}`);
  res.json({ success: true, data: [] });
});

app.all('/data/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url}`);
  res.json({ success: true, data: [] });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI CORS FIXED CREDENTIALS sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
  console.log(`🔗 Admin: http://144.91.96.142:5173/admin`);
  console.log(`👤 UTILISATEURS :`);
  console.log(`   - admin@bouba.ai / admin (admin)`);
  console.log(`   - user@bouba.ai / password (user)`);
  console.log(`   - free@bouba.ai / password (free)`);
  console.log(`🔐 CORS: Origines spécifiques avec credentials`);
});