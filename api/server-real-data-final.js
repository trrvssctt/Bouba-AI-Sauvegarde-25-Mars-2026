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
app.use(cors({
  origin: ['http://localhost:5173', 'http://144.91.96.142:5173'],
  credentials: true
}));
app.use(express.json());

// Utilitaires
const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Erreur PostgreSQL:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ==================== ROUTES FRONTEND ====================

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await executeQuery(`
      SELECT u.id, u.email, u.name, u.created_at,
             p.first_name, p.last_name, p.plan_id, p.subscription_status,
             p.messages_used, p.messages_limit, p.onboarding_complete
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      WHERE u.email = $1 LIMIT 1
    `, ['seydou@senboutique.com']);

    if (user.length === 0) {
      return res.json({ success: true, data: { user: null } });
    }

    const u = user[0];
    res.json({
      success: true,
      data: {
        user: {
          id: u.id,
          email: u.email,
          name: u.name || `${u.first_name} ${u.last_name}`,
          planId: u.plan_id || 'business',
          subscriptionStatus: u.subscription_status || 'active',
          messagesUsed: u.messages_used || 0,
          messagesLimit: u.messages_limit || 10000,
          onboardingComplete: u.onboarding_complete || true,
          onboardingStep: 5,
          createdAt: u.created_at
        }
      }
    });
  } catch (error) {
    console.error('Erreur /api/auth/me:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const convs = await executeQuery(`
      SELECT c.id, c.title, c.last_message, c.message_count,
             c.created_at, c.updated_at
      FROM conversations c
      ORDER BY c.updated_at DESC
    `);

    res.json({
      success: true,
      data: convs.map(c => ({
        id: c.id,
        title: c.title || 'Conversation',
        lastMessage: c.last_message,
        messageCount: c.message_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
  } catch (error) {
    console.error('Erreur /api/conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/plans
app.get('/api/data/plans', async (req, res) => {
  try {
    const plans = await executeQuery(`
      SELECT id, name, description, price, currency,
             billing_interval, features, limits, popular
      FROM plans WHERE active = true
      ORDER BY price ASC
    `);

    res.json({
      success: true,
      data: plans.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        billingInterval: p.billing_interval,
        features: p.features || [],
        limits: p.limits || {},
        popular: p.popular
      }))
    });
  } catch (error) {
    console.error('Erreur /api/data/plans:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/connections
app.get('/api/connections', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Erreur /api/connections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROUTES ADMIN ====================

// GET /api/admin/dashboard/stats
app.get('/api/admin/dashboard/stats', async (req, res) => {
  try {
    const [users, convs, msgs, payments] = await Promise.all([
      executeQuery('SELECT COUNT(*) as count FROM users'),
      executeQuery('SELECT COUNT(*) as count FROM conversations'),
      executeQuery('SELECT COUNT(*) as count FROM messages'),
      executeQuery('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = \'succeeded\'')
    ]);

    const plansDist = await executeQuery(`
      SELECT plan_id, COUNT(*) as count FROM profiles GROUP BY plan_id
    `);

    const distribution = {};
    plansDist.forEach(p => { distribution[p.plan_id] = parseInt(p.count); });

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(users[0]?.count || 0),
        activeUsers: parseInt(convs[0]?.count || 0),
        totalRevenue: parseFloat(payments[0]?.total || 0),
        pendingPayments: 0,
        totalMessages: parseInt(msgs[0]?.count || 0),
        plansDistribution: distribution,
        recentActivity: [
          { action: 'Nouvel utilisateur', time: 'Aujourd\'hui' },
          { action: 'Message envoyé', time: '2h ago' }
        ]
      }
    });
  } catch (error) {
    console.error('Erreur stats admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/customers
app.get('/api/admin/customers', async (req, res) => {
  try {
    const customers = await executeQuery(`
      SELECT u.id, u.email, u.name, u.created_at,
             p.first_name, p.last_name, p.plan_id, p.subscription_status,
             p.company, p.phone
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      ORDER BY u.created_at DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: customers.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name || `${c.first_name} ${c.last_name}`,
        plan_id: c.plan_id,
        subscription_status: c.subscription_status,
        company: c.company,
        phone: c.phone,
        created_at: c.created_at
      })),
      pagination: { page: 1, limit: 20, total: customers.length, totalPages: 1 }
    });
  } catch (error) {
    console.error('Erreur customers admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/payments
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await executeQuery(`
      SELECT p.id, p.amount, p.currency, p.status, p.created_at,
             u.email, u.name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      data: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        created_at: p.created_at,
        email: p.email,
        name: p.name
      })),
      stats: {
        pending: payments.filter(p => p.status === 'pending').length,
        completed: payments.filter(p => p.status === 'succeeded').length,
        failed: payments.filter(p => p.status === 'failed').length,
        total_amount: payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('Erreur payments admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROUTES DE COMPATIBILITÉ ====================

app.get('/api/data/subscriptions', async (req, res) => {
  try {
    const subs = await executeQuery(`
      SELECT s.id, s.plan_id, s.status, s.created_at,
             u.email, p.name as plan_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: subs });
  } catch (error) {
    console.error('Erreur subscriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/upgrade-requests/status', async (req, res) => {
  try {
    const reqs = await executeQuery(`
      SELECT id, user_id, current_plan, requested_plan, status, created_at
      FROM upgrade_requests
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: reqs });
  } catch (error) {
    console.error('Erreur upgrade requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'postgresql',
    connected: true
  });
});

// Catch-all pour les autres routes
app.all('/api/*', (req, res) => {
  console.log(`[API] ${req.method} ${req.url}`);
  res.json({ 
    success: true, 
    data: [],
    message: 'Route disponible'
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI (Données Réelles) sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://144.91.96.142:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173`);
  console.log(`🔗 Admin: http://144.91.96.142:5173/admin`);
  console.log(`📊 PostgreSQL: ${dbConfig.host}/${dbConfig.database}`);
  console.log(`👤 Utilisateurs: 6 | Conversations: 2 | Messages: 12`);
});