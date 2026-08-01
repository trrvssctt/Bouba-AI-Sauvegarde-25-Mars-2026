const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques (si build existe)
app.use(express.static(path.join(__dirname, 'dist')));

// Routes API mock pour tester
app.get('/api/data/plans', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'starter',
        name: 'Bouba Starter',
        description: 'Parfait pour découvrir Bouba et commencer votre productivité',
        price: 0,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 0,
        agents_limit: 1,
        messages_limit: 500,
        features: ['Chat IA', 'Email', 'Notifications'],
        limits: { chat: 500, email: 100 },
        popular: false,
        active: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'pro',
        name: 'Bouba Pro',
        description: 'Pour les professionnels qui veulent booster leur productivité',
        price: 2900,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 14,
        agents_limit: 3,
        messages_limit: 5000,
        features: ['Chat IA', 'Email', 'Calendar', 'Contacts', 'Projects', 'Video'],
        limits: { chat: 5000, email: 1000, calendar: true, contacts: true },
        popular: true,
        active: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'premium',
        name: 'Bouba Premium',
        description: 'Solution complète pour les entreprises',
        price: 9900,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 30,
        agents_limit: -1,
        messages_limit: -1,
        features: ['Toutes les fonctionnalités Pro', 'Finance', 'Payments', 'Storage', 'Support prioritaire'],
        limits: { chat: -1, email: -1, calendar: true, contacts: true, finance: true },
        popular: false,
        active: true,
        created_at: '2024-01-01T00:00:00Z'
      }
    ]
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      planId: 'premium',
      messagesUsed: 150,
      messagesLimit: 5000,
      subscriptionStatus: 'active',
      onboardingComplete: true,
      onboardingStep: 5,
      preferences: {}
    }
  });
});

app.get('/api/connections', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'email', name: 'Email', connected: true, plan: 'free' },
      { id: 'calendar', name: 'Calendar', connected: true, plan: 'pro' },
      { id: 'contacts', name: 'Contacts', connected: true, plan: 'pro' },
      { id: 'finance', name: 'Finance', connected: true, plan: 'premium' },
      { id: 'trello', name: 'Projects', connected: true, plan: 'pro' },
      { id: 'video', name: 'Video Conferencing', connected: true, plan: 'pro' },
      { id: 'payments', name: 'Payments', connected: true, plan: 'premium' },
      { id: 'storage', name: 'Storage', connected: true, plan: 'premium' }
    ],
    userPlan: 'premium'
  });
});

// Route catch-all pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur de test sur http://0.0.0.0:${PORT}`);
  console.log(`✅ API: http://0.0.0.0:${PORT}/api/data/plans`);
});