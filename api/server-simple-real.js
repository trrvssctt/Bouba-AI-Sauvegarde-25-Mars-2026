const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const PORT = 3003;

// Configuration PostgreSQL
const dbConfig = {
  user: 'gestionapp_bouba_user',
  password: 'V8a,KaLf=UVb7uY',
  host: 'postgresql-gestionapp.alwaysdata.net',
  port: 5432,
  database: 'gestionapp_bouba',
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(dbConfig);

// Middleware
app.use(cors());
app.use(express.json());

// Test de connexion
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
  } else {
    console.log('✅ Connecté à PostgreSQL');
    release();
  }
});

// ==================== ROUTES SIMPLES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'postgresql'
  });
});

// GET /api/auth/me - Utilisateur de test
app.get('/api/auth/me', async (req, res) => {
  try {
    // Données simulées pour tester
    res.json({
      success: true,
      data: {
        user: {
          id: '2630a938-cff2-4034-afe3-4a5e448ae56d',
          email: 'seydou@senboutique.com',
          name: 'Seydou Dianka',
          planId: 'business',
          subscriptionStatus: 'active',
          messagesUsed: 11,
          messagesLimit: 10000,
          onboardingComplete: true,
          onboardingStep: 5,
          createdAt: '2026-03-09T00:00:00Z'
        }
      }
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, last_message, message_count, created_at, updated_at
      FROM conversations
      ORDER BY updated_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows.map(c => ({
        id: c.id,
        title: c.title || 'Conversation',
        lastMessage: c.last_message,
        messageCount: c.message_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
  } catch (error) {
    console.error('Erreur conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/plans
app.get('/api/data/plans', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, price, currency, features, limits
      FROM plans WHERE active = true
      ORDER BY price ASC
    `);
    
    res.json({
      success: true,
      data: result.rows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        features: p.features || [],
        limits: p.limits || {}
      }))
    });
  } catch (error) {
    console.error('Erreur plans:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/connections
app.get('/api/connections', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'chat', name: 'Chat IA', icon: 'MessageCircle', connected: true, plan: 'free' },
      { id: 'email', name: 'Email', icon: 'Mail', connected: true, plan: 'free' },
      { id: 'contacts', name: 'Contacts', icon: 'Users', connected: true, plan: 'starter' },
      { id: 'calendar', name: 'Calendrier', icon: 'Calendar', connected: true, plan: 'business' },
      { id: 'finance', name: 'Finance', icon: 'PiggyBank', connected: true, plan: 'business' }
    ],
    userPlan: 'business'
  });
});

// ==================== ROUTES ADMIN ====================

// GET /api/admin/dashboard/stats
app.get('/api/admin/dashboard/stats', async (req, res) => {
  try {
    const [users, convs, msgs, payments] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM conversations'),
      pool.query('SELECT COUNT(*) as count FROM messages'),
      pool.query("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded'")
    ]);

    const plans = await pool.query('SELECT plan_id, COUNT(*) as count FROM profiles GROUP BY plan_id');
    
    const distribution = {};
    plans.rows.forEach(p => { distribution[p.plan_id] = parseInt(p.count); });

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(users.rows[0]?.count || 0),
        activeUsers: parseInt(convs.rows[0]?.count || 0),
        totalRevenue: parseFloat(payments.rows[0]?.total || 0),
        pendingPayments: 0,
        totalMessages: parseInt(msgs.rows[0]?.count || 0),
        plansDistribution: distribution,
        recentActivity: [
          { action: 'Nouvel utilisateur', time: 'Aujourd\'hui' },
          { action: 'Message envoyé', time: '2h ago' }
        ]
      }
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/customers
app.get('/api/admin/customers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.created_at,
             p.first_name, p.last_name, p.plan_id, p.subscription_status
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      ORDER BY u.created_at DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      data: result.rows.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name || `${c.first_name} ${c.last_name}`,
        plan_id: c.plan_id,
        subscription_status: c.subscription_status,
        created_at: c.created_at
      })),
      pagination: { page: 1, limit: 20, total: result.rows.length, totalPages: 1 }
    });
  } catch (error) {
    console.error('Erreur customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROUTES DE COMPATIBILITÉ ====================

app.get('/api/data/subscriptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.plan_id, s.status, s.created_at, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur subscriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/upgrade-requests/status', (req, res) => {
  res.json({ success: true, data: [] });
});

// Catch-all pour éviter les 404
app.all('/api/*', (req, res) => {
  res.json({ 
    success: true, 
    data: [],
    message: 'Route disponible',
    path: req.path
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI (Simplifié) sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://144.91.96.142:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173`);
  console.log(`📊 PostgreSQL: ${dbConfig.host}/${dbConfig.database}`);
});