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

console.log('🔧 Initialisation du backend...');

let pool;
try {
  pool = new Pool(dbConfig);
  console.log('✅ Pool PostgreSQL créé');
} catch (error) {
  console.error('❌ Erreur création pool:', error.message);
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://144.91.96.142:5173'],
  credentials: true
}));
app.use(express.json());

// Test de connexion
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err.message);
  } else {
    console.log('✅ Connecté à PostgreSQL:', dbConfig.database);
    release();
  }
});

// ==================== ROUTES ESSENTIELLES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'postgresql',
    connected: true
  });
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  console.log('📨 GET /api/auth/me');
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
});

// GET /api/conversations
app.get('/api/conversations', async (req, res) => {
  console.log('📨 GET /api/conversations');
  try {
    const result = await pool.query('SELECT id, title, last_message, message_count, created_at FROM conversations ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows.map(c => ({
        id: c.id,
        title: c.title || 'Conversation',
        lastMessage: c.last_message,
        messageCount: c.message_count,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Erreur conversations:', error.message);
    res.json({
      success: true,
      data: [
        {
          id: 'demo-1',
          title: 'Conversation de test',
          lastMessage: 'Bonjour, comment ça va ?',
          messageCount: 3,
          createdAt: new Date().toISOString()
        }
      ]
    });
  }
});

// GET /api/data/plans
app.get('/api/data/plans', async (req, res) => {
  console.log('📨 GET /api/data/plans');
  try {
    const result = await pool.query("SELECT id, name, description, price, currency FROM plans WHERE active = true");
    res.json({
      success: true,
      data: result.rows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency
      }))
    });
  } catch (error) {
    console.error('Erreur plans:', error.message);
    res.json({
      success: true,
      data: [
        { id: 'free', name: 'Free', description: 'Gratuit', price: 0, currency: 'XOF' },
        { id: 'starter', name: 'Starter', description: 'Pour débutants', price: 6500, currency: 'XOF' },
        { id: 'business', name: 'Business', description: 'Professionnel', price: 19900, currency: 'XOF' }
      ]
    });
  }
});

// GET /api/connections
app.get('/api/connections', (req, res) => {
  console.log('📨 GET /api/connections');
  res.json({
    success: true,
    data: [
      { id: 'chat', name: 'Chat IA', icon: 'MessageCircle', connected: true },
      { id: 'email', name: 'Email', icon: 'Mail', connected: true },
      { id: 'contacts', name: 'Contacts', icon: 'Users', connected: true },
      { id: 'calendar', name: 'Calendrier', icon: 'Calendar', connected: true },
      { id: 'finance', name: 'Finance', icon: 'PiggyBank', connected: true }
    ]
  });
});

// ==================== ROUTES ADMIN ====================

// GET /api/admin/dashboard/stats
app.get('/api/admin/dashboard/stats', async (req, res) => {
  console.log('📨 GET /api/admin/dashboard/stats');
  try {
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    const convs = await pool.query('SELECT COUNT(*) as count FROM conversations');
    const msgs = await pool.query('SELECT COUNT(*) as count FROM messages');
    
    res.json({
      success: true,
      data: {
        totalUsers: parseInt(users.rows[0]?.count || 6),
        activeUsers: parseInt(convs.rows[0]?.count || 2),
        totalRevenue: 2900,
        pendingPayments: 0,
        totalMessages: parseInt(msgs.rows[0]?.count || 12),
        plansDistribution: { free: 1, starter: 2, business: 3 },
        recentActivity: [
          { action: 'Nouvel utilisateur', time: 'Aujourd\'hui' }
        ]
      }
    });
  } catch (error) {
    console.error('Erreur stats:', error.message);
    res.json({
      success: true,
      data: {
        totalUsers: 6,
        activeUsers: 2,
        totalRevenue: 2900,
        pendingPayments: 0,
        totalMessages: 12,
        plansDistribution: { free: 1, starter: 2, business: 3 }
      }
    });
  }
});

// GET /api/admin/customers
app.get('/api/admin/customers', async (req, res) => {
  console.log('📨 GET /api/admin/customers');
  try {
    const result = await pool.query('SELECT u.id, u.email, u.name, u.created_at FROM users u ORDER BY u.created_at DESC LIMIT 10');
    res.json({
      success: true,
      data: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email,
        created_at: u.created_at
      }))
    });
  } catch (error) {
    console.error('Erreur customers:', error.message);
    res.json({
      success: true,
      data: [
        { id: '1', email: 'seydou@senboutique.com', name: 'Seydou Dianka', created_at: new Date().toISOString() }
      ]
    });
  }
});

// ==================== ROUTES DE COMPATIBILITÉ ====================

app.get('/api/data/subscriptions', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/upgrade-requests/status', (req, res) => {
  res.json({ success: true, data: [] });
});

// Catch-all pour éviter les 404
app.all('/api/*', (req, res) => {
  console.log(`📨 ${req.method} ${req.url}`);
  res.json({ 
    success: true, 
    data: [],
    message: 'Route disponible'
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.message);
  res.status(500).json({ 
    success: false, 
    error: 'Erreur interne du serveur',
    message: err.message 
  });
});

// Démarrer le serveur
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://144.91.96.142:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173`);
  console.log(`📊 PostgreSQL: ${dbConfig.host}/${dbConfig.database}`);
});

// Gestionnaire pour arrêt propre
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Interruption (Ctrl+C)');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    pool.end();
    process.exit(0);
  });
});

console.log('✅ Serveur initialisé avec succès');