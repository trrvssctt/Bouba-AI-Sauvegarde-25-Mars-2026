const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET manquant en production');
  }
  return 'dev-only-secret-change-in-production';
})();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Route santé
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'auth-production',
    features: ['supabase-auth', 'jwt', 'postgresql']
  });
});

// 🔐 INSCRIPTION
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // 1. Inscription Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }
      }
    });

    if (authError) {
      return res.status(400).json({ success: false, error: authError.message });
    }

    const userId = authData.user.id;

    // 2. Création profil dans PostgreSQL
    await pool.query(
      `INSERT INTO users (id, email, name, phone, plan_id, subscription_status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, name, phone || null, 'free', 'pending', new Date()]
    );

    // 3. Génération JWT
    const token = jwt.sign(
      { 
        id: userId, 
        email, 
        name, 
        role: 'user',
        planId: 'free',
        subscriptionStatus: 'pending'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Inscription réussie ! Vérifie ton email.',
      user: {
        id: userId,
        email,
        name,
        role: 'user',
        planId: 'free',
        subscriptionStatus: 'pending',
        onboardingComplete: false
      },
      token
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🔐 CONNEXION
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Connexion Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const userId = authData.user.id;

    // 2. Récupération profil PostgreSQL
    const userResult = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Profil utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // 3. Vérification paiement pour plans payants
    if (user.plan_id !== 'free') {
      const paymentResult = await pool.query(
        `SELECT * FROM payments 
         WHERE user_id = $1 
         AND status = 'completed'
         AND created_at >= NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (paymentResult.rows.length === 0) {
        // Paiement manquant, rétrograder en free
        await pool.query(
          `UPDATE users SET plan_id = 'free', subscription_status = 'expired' WHERE id = $1`,
          [userId]
        );
        user.plan_id = 'free';
        user.subscription_status = 'expired';
      }
    }

    // 4. Génération JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role || 'user',
        planId: user.plan_id,
        subscriptionStatus: user.subscription_status
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Récupération statistiques messages
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count FROM conversations WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        planId: user.plan_id,
        subscriptionStatus: user.subscription_status,
        onboardingComplete: user.onboarding_complete || false,
        messagesUsed: parseInt(messagesResult.rows[0].count) || 0,
        messagesLimit: user.plan_id === 'free' ? 500 : 
                      user.plan_id === 'starter' ? 10000 : 999999
      },
      token
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 👤 PROFIL UTILISATEUR
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Récupération statistiques
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count FROM conversations WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        planId: user.plan_id,
        subscriptionStatus: user.subscription_status,
        onboardingComplete: user.onboarding_complete || false,
        messagesUsed: parseInt(messagesResult.rows[0].count) || 0,
        messagesLimit: user.plan_id === 'free' ? 500 : 
                      user.plan_id === 'starter' ? 10000 : 999999
      }
    });

  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 📧 VÉRIFICATION EMAIL
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Activation du compte
    await pool.query(
      `UPDATE users SET subscription_status = 'active' WHERE id = $1`,
      [data.user.id]
    );

    res.json({
      success: true,
      message: 'Email vérifié avec succès !'
    });

  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🔄 RÉINITIALISATION MOT DE PASSE
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé'
    });

  } catch (error) {
    console.error('Erreur réinitialisation:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🎯 MISE À JOUR PROFIL
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    await pool.query(
      `UPDATE users SET name = $1, phone = $2 WHERE id = $3`,
      [name, phone, userId]
    );

    // Mise à jour Supabase
    await supabase.auth.updateUser({
      data: { name, phone }
    });

    res.json({
      success: true,
      message: 'Profil mis à jour'
    });

  } catch (error) {
    console.error('Erreur mise à jour:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🚪 DÉCONNEXION
app.post('/api/auth/signout', authenticateToken, async (req, res) => {
  try {
    await supabase.auth.signOut();
    res.json({ success: true, message: 'Déconnecté' });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 📊 ADMIN: LISTE CLIENTS
app.get('/api/admin/customers', authenticateToken, async (req, res) => {
  try {
    // Vérification rôle admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    }

    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.name, u.phone,
        u.plan_id, u.subscription_status,
        u.created_at, u.last_active_at,
        u.onboarding_complete,
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
    console.error('Erreur clients admin:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur d'authentification démarré sur http://0.0.0.0:${PORT}`);
  console.log(`🔐 Supabase Auth: ${supabaseUrl ? 'Configuré' : 'MANQUANT — définir SUPABASE_URL'}`);
  console.log(`📊 PostgreSQL: ${process.env.DATABASE_URL ? 'Configuré' : 'MANQUANT — définir DATABASE_URL'}`);
});

module.exports = app;