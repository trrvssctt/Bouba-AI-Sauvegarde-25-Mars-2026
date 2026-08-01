const express = require('express');
const app = express();
const PORT = 3001;

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json());

// Données
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

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'simple-subscription' });
});

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

app.post('/api/subscription/signup', (req, res) => {
  const { email, password, firstName, lastName, planId } = req.body;
  
  console.log('Nouvelle inscription:', { email, planId });
  
  // Simuler création
  const newUser = {
    id: '100',
    email,
    password,
    firstName,
    lastName,
    planId,
    status: planId === 'free' ? 'active' : 'pending_payment'
  };
  
  res.json({
    success: true,
    data: {
      user: newUser,
      nextStep: planId === 'free' ? 'onboarding' : 'payment'
    }
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

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  const user = Object.values(users).find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
  }
  
  const profile = profiles[user.id];
  
  res.json({ 
    success: true, 
    data: { 
      ...user, 
      profile: profile 
    } 
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = users['1'];
  const profile = profiles['1'];
  
  res.json({
    success: true,
    data: {
      user: { ...user, firstName: 'Seydou', lastName: 'Dianka' },
      profile: profile
    }
  });
});

// Catch-all
app.all('/api/*', (req, res) => {
  res.json({ success: true, data: [] });
});

app.all('/data/*', (req, res) => {
  res.json({ success: true, data: [] });
});

// Démarrer
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI SIMPLE SUBSCRIPTION sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
  console.log(`💰 Test flux abonnement: http://144.91.96.142:5173/subscribe`);
});