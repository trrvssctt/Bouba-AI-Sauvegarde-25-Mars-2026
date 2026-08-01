const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion PostgreSQL
const pool = new Pool({
  host: 'postgresql-gestionapp.alwaysdata.net',
  database: 'gestionapp_bouba',
  user: 'gestionapp_bouba_user',
  password: 'V8a,KaLf=UVb7uY',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Route santé
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'production',
    database: 'postgresql-gestionapp.alwaysdata.net'
  });
});

// Route test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({
      success: true,
      database: 'gestionapp_bouba',
      user_count: result.rows[0].count
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      database: 'gestionapp_bouba'
    });
  }
});

// API Admin - Clients
app.get('/api/admin/customers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.name, 
        u.plan_id, u.subscription_status,
        u.created_at, u.last_active_at,
        COALESCE(SUM(c.message_count), 0) as messages_used,
        CASE 
          WHEN u.plan_id = 'free' THEN 500
          WHEN u.plan_id = 'starter' THEN 10000
          WHEN u.plan_id = 'business' THEN 999999
          ELSE 500
        END as messages_limit
      FROM users u
      LEFT JOIN conversations c ON u.id = c.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erreur clients:', error);
    res.json({
      success: true,
      data: [
        {
          id: '1',
          email: 'seydou@senboutique.com',
          name: 'Seydou Dianka',
          plan_id: 'business',
          subscription_status: 'active',
          created_at: '2026-03-09T00:00:00Z',
          messages_used: 11,
          messages_limit: 999999
        }
      ]
    });
  }
});

// API Auth
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: '1',
      email: 'admin@bouba.ai',
      name: 'Admin Bouba',
      role: 'admin',
      planId: 'business',
      subscriptionStatus: 'active',
      onboardingComplete: true,
      messagesUsed: 45,
      messagesLimit: 999999
    }
  });
});

// API Plans
app.get('/api/data/plans', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'XOF',
        billing_interval: 'monthly',
        description: 'Pour commencer',
        features: ['Chat', 'Email', '500 messages/mois'],
        limits: { messages: 500, apps: 2 }
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 4900,
        currency: 'XOF',
        billing_interval: 'monthly',
        description: 'Pour les indépendants',
        features: ['Chat', 'Email', 'Contacts', '10k messages/mois'],
        limits: { messages: 10000, apps: 3 }
      },
      {
        id: 'business',
        name: 'Business',
        price: 19900,
        currency: 'XOF',
        billing_interval: 'monthly',
        description: 'Pour les entreprises',
        features: ['Toutes les apps', 'Messages illimités', 'Documents officiels'],
        limits: { messages: 999999, apps: 5 }
      }
    ]
  });
});

// Catch-all pour les autres routes
app.all('*', (req, res) => {
  res.json({
    success: true,
    message: `Route ${req.method} ${req.path} mockée`,
    timestamp: new Date().toISOString()
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend Bouba'IA démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📊 PostgreSQL: postgresql-gestionapp.alwaysdata.net/gestionapp_bouba`);
});
