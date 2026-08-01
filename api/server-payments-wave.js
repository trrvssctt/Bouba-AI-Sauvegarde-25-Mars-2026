const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = 3005;

// Middleware
app.use(cors({
  origin: 'http://144.91.96.142:5173',
  credentials: true
}));
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

// Configuration Wave (à mettre dans .env en production)
const WAVE_API_KEY = 'wvc_live_...'; // À remplacer avec ta clé
const WAVE_BUSINESS_NAME = 'Bouba\'IA';
const WAVE_WEBHOOK_SECRET = 'bouba-wave-secret-2026';

// Route santé
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'payments-wave',
    features: ['wave-qr', 'mobile-money', 'webhooks']
  });
});

// 💳 CRÉATION PAIEMENT WAVE
app.post('/api/payments/create', async (req, res) => {
  try {
    const { userId, planId, amount, currency, phone } = req.body;

    // Validation
    if (!userId || !planId || !amount) {
      return res.status(400).json({ success: false, error: 'Données manquantes' });
    }

    // Génération ID unique
    const paymentId = `wave_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Plans disponibles
    const plans = {
      'starter': { price: 4900, name: 'Starter' },
      'business': { price: 19900, name: 'Business' }
    };

    const plan = plans[planId];
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan invalide' });
    }

    // Création paiement dans la base
    await pool.query(
      `INSERT INTO payments (id, user_id, plan_id, amount, currency, status, provider, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [paymentId, userId, planId, amount, currency || 'XOF', 'pending', 'wave', new Date()]
    );

    // Simulation QR Code Wave
    const waveData = {
      success: true,
      payment: {
        id: paymentId,
        amount: amount,
        currency: currency || 'XOF',
        business_name: WAVE_BUSINESS_NAME,
        qr_code_url: `https://api.wave.com/qr/${paymentId}`,
        qr_code_data: `wave://pay?amount=${amount}&currency=${currency || 'XOF'}&business=${encodeURIComponent(WAVE_BUSINESS_NAME)}&reference=${paymentId}`,
        payment_url: `https://wave.com/pay/${paymentId}`,
        instructions: [
          '1. Ouvrez l\'application Wave sur votre téléphone',
          '2. Scannez le QR code ou cliquez sur le lien',
          '3. Confirmez le paiement de ' + amount + ' ' + (currency || 'XOF'),
          '4. Votre compte sera activé sous 24h après validation'
        ],
        supported_methods: ['wave_mobile_money', 'orange_money', 'free_money', 'mtn_mobile_money']
      }
    };

    res.json(waveData);

  } catch (error) {
    console.error('Erreur création paiement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🔍 VÉRIFICATION STATUT PAIEMENT
app.get('/api/payments/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paiement non trouvé' });
    }

    const payment = result.rows[0];

    // Simulation statut Wave
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const simulatedStatus = statuses[Math.floor(Math.random() * 3)]; // Pas 'failed' pour la démo

    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: simulatedStatus,
        created_at: payment.created_at,
        updated_at: new Date().toISOString(),
        provider: payment.provider
      }
    });

  } catch (error) {
    console.error('Erreur statut paiement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 📨 WEBHOOK WAVE (pour les notifications de paiement)
app.post('/api/webhooks/wave', async (req, res) => {
  try {
    const signature = req.headers['wave-signature'];
    const payload = req.body;

    // Vérification signature (simplifiée)
    if (!signature) {
      console.warn('Webhook Wave sans signature');
    }

    const event = payload.event;
    const paymentId = payload.data?.payment_id;

    console.log(`Webhook Wave: ${event} pour ${paymentId}`);

    if (event === 'payment.completed') {
      // Mise à jour statut paiement
      await pool.query(
        `UPDATE payments SET status = 'completed', updated_at = $1 WHERE id = $2`,
        [new Date(), paymentId]
      );

      // Récupération user_id
      const paymentResult = await pool.query(
        `SELECT user_id, plan_id FROM payments WHERE id = $1`,
        [paymentId]
      );

      if (paymentResult.rows.length > 0) {
        const { user_id, plan_id } = paymentResult.rows[0];

        // Mise à jour plan utilisateur
        await pool.query(
          `UPDATE users SET plan_id = $1, subscription_status = 'active' WHERE id = $2`,
          [plan_id, user_id]
        );

        // Création facture
        const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await pool.query(
          `INSERT INTO invoices (id, user_id, payment_id, amount, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, user_id, paymentId, payload.data?.amount || 0, 'paid', new Date()]
        );

        console.log(`✅ Paiement ${paymentId} complété, utilisateur ${user_id} mis à jour vers plan ${plan_id}`);
      }
    }

    res.json({ success: true, received: true });

  } catch (error) {
    console.error('Erreur webhook Wave:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 📋 HISTORIQUE PAIEMENTS UTILISATEUR
app.get('/api/payments/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT * FROM payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Erreur historique paiements:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🧾 CRÉATION FACTURE
app.post('/api/invoices/create', async (req, res) => {
  try {
    const { userId, paymentId, amount, description } = req.body;

    const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    await pool.query(
      `INSERT INTO invoices (id, user_id, payment_id, amount, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [invoiceId, userId, paymentId, amount, description || 'Abonnement Bouba\'IA', 'pending', new Date()]
    );

    res.json({
      success: true,
      invoice: {
        id: invoiceId,
        amount,
        description: description || 'Abonnement Bouba\'IA',
        status: 'pending',
        created_at: new Date().toISOString(),
        download_url: `/api/invoices/${invoiceId}/download`
      }
    });

  } catch (error) {
    console.error('Erreur création facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 📄 TÉLÉCHARGEMENT FACTURE
app.get('/api/invoices/:invoiceId/download', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const result = await pool.query(
      `SELECT i.*, u.name, u.email FROM invoices i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    const invoice = result.rows[0];

    // Génération PDF facture (simulée)
    const pdfContent = `
      FACTURE ${invoice.id}
      Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}
      
      Client: ${invoice.name}
      Email: ${invoice.email}
      
      Description: ${invoice.description}
      Montant: ${invoice.amount} XOF
      Statut: ${invoice.status}
      
      Bouba'IA
      contact@bouba.ai
      +221 77 123 45 67
      
      Merci pour votre confiance !
    `;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${invoiceId}.pdf"`);
    res.send(Buffer.from(pdfContent));

  } catch (error) {
    console.error('Erreur téléchargement facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 📊 STATISTIQUES PAIEMENTS (Admin)
app.get('/api/admin/payments/stats', async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

    // Total revenus
    const totalResult = await pool.query(
      `SELECT SUM(amount) as total FROM payments WHERE status = 'completed'`
    );

    // Revenus ce mois
    const monthlyResult = await pool.query(
      `SELECT SUM(amount) as monthly FROM payments 
       WHERE status = 'completed' AND created_at >= $1`,
      [firstDayOfMonth]
    );

    // Nombre de paiements
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM payments WHERE status = 'completed'`
    );

    // Répartition par plan
    const planResult = await pool.query(`
      SELECT p.plan_id, COUNT(*) as count, SUM(p.amount) as revenue
      FROM payments p
      WHERE p.status = 'completed'
      GROUP BY p.plan_id
      ORDER BY revenue DESC
    `);

    res.json({
      success: true,
      stats: {
        total_revenue: parseInt(totalResult.rows[0].total) || 0,
        monthly_revenue: parseInt(monthlyResult.rows[0].monthly) || 0,
        total_payments: parseInt(countResult.rows[0].count) || 0,
        by_plan: planResult.rows
      }
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur paiements Wave démarré sur http://0.0.0.0:${PORT}`);
  console.log(`💳 Wave API: ${WAVE_API_KEY ? 'Configuré' : 'À configurer'}`);
  console.log(`📊 PostgreSQL: postgresql-gestionapp.alwaysdata.net/gestionapp_bouba`);
});

module.exports = app;