const express = require('express');
const app = express();
const PORT = 3002;

// ==================== CORS ====================
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://144.91.96.142:5173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// ==================== ROUTES ADMIN ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'admin-simple' });
});

// Dashboard stats
app.get('/api/admin/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 156,
      activeUsers: 142,
      totalRevenue: 1250000,
      pendingPayments: 8,
      plansDistribution: { free: 64, starter: 50, business: 28 },
      recentActivity: [
        { action: 'Nouvel utilisateur', time: '10 min ago' },
        { action: 'Paiement complété', time: '1h ago' },
        { action: 'Mise à jour plan', time: '2h ago' }
      ]
    }
  });
});

// Customers
app.get('/api/admin/customers', (req, res) => {
  const customers = [
    {
      id: 1,
      first_name: 'Seydou',
      last_name: 'Dianka',
      plan_id: 'business',
      subscription_status: 'active',
      created_at: '2026-04-01T10:00:00Z',
      users: {
        email: 'seydou@bouba.ai',
        last_sign_in_at: '2026-04-15T22:30:00Z'
      }
    },
    {
      id: 2,
      first_name: 'Alpha',
      last_name: 'Entreprise',
      plan_id: 'business',
      subscription_status: 'active',
      created_at: '2026-04-05T14:20:00Z',
      users: {
        email: 'alpha@entreprise.com',
        last_sign_in_at: '2026-04-15T20:15:00Z'
      }
    },
    {
      id: 3,
      first_name: 'Beta',
      last_name: 'Startup',
      plan_id: 'starter',
      subscription_status: 'active',
      created_at: '2026-04-10T09:45:00Z',
      users: {
        email: 'beta@startup.com',
        last_sign_in_at: '2026-04-14T18:30:00Z'
      }
    }
  ];
  
  res.json({
    success: true,
    data: customers,
    pagination: {
      page: 1,
      limit: 20,
      total: customers.length,
      totalPages: 1
    }
  });
});

// Payments
app.get('/api/admin/payments', (req, res) => {
  const payments = [
    {
      id: 1,
      amount: 6500,
      currency: 'XOF',
      status: 'pending',
      created_at: '2026-04-15T10:30:00Z',
      profiles: {
        first_name: 'Test',
        last_name: 'User',
        users: { email: 'test@example.com' }
      },
      plan_id: 'starter'
    },
    {
      id: 2,
      amount: 19900,
      currency: 'XOF',
      status: 'pending',
      created_at: '2026-04-14T14:20:00Z',
      profiles: {
        first_name: 'Alpha',
        last_name: 'Entreprise',
        users: { email: 'alpha@entreprise.com' }
      },
      plan_id: 'business'
    }
  ];
  
  res.json({ 
    success: true, 
    data: payments,
    stats: {
      pending: 8,
      completed: 42,
      failed: 3,
      totalAmount: 1250000
    }
  });
});

// Approve payment
app.post('/api/admin/payments/:id/approve', (req, res) => {
  const { id } = req.params;
  
  res.json({ 
    success: true, 
    data: { 
      id, 
      status: 'approved',
      message: 'Paiement approuvé avec succès'
    } 
  });
});

// Invoices
app.get('/api/admin/invoices', (req, res) => {
  const invoices = [
    {
      id: 'INV-2026-001',
      amount: 6500,
      currency: 'XOF',
      status: 'paid',
      created_at: '2026-04-01T00:00:00Z',
      due_date: '2026-04-30T00:00:00Z',
      profiles: {
        first_name: 'Test',
        last_name: 'User',
        users: { email: 'test@example.com' }
      }
    }
  ];
  
  res.json({ success: true, data: invoices });
});

// Announcements
app.get('/api/admin/announcements', (req, res) => {
  const announcements = [
    {
      id: 1,
      title: 'Nouvelle fonctionnalité IA Finance',
      content: 'Découvrez notre nouvelle IA pour la gestion financière',
      type: 'feature',
      target: 'all',
      status: 'sent',
      sent_at: '2026-04-15T10:00:00Z',
      opened_count: 89,
      clicked_count: 42
    }
  ];
  
  res.json({ success: true, data: announcements });
});

// Settings
app.get('/api/admin/settings', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      platform_name: 'Bouba\'IA',
      currency: 'XOF',
      contact_email: 'contact@bouba.ai',
      support_phone: '+221 77 123 45 67',
      wave_api_key: '••••••••',
      stripe_api_key: '••••••••',
      email_smtp_host: 'smtp.gmail.com',
      email_smtp_port: 587,
      email_smtp_user: 'contact@bouba.ai',
      email_smtp_pass: '••••••••'
    }
  });
});

// ==================== CATCH-ALL ====================

app.all('/api/admin/*', (req, res) => {
  res.json({ success: true, data: [], message: 'Route admin disponible' });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Admin Bouba AI (Simple) sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Dashboard: http://144.91.96.142:5173/admin`);
  console.log(`📊 Routes disponibles:`);
  console.log(`   - GET  /api/admin/dashboard/stats`);
  console.log(`   - GET  /api/admin/customers`);
  console.log(`   - GET  /api/admin/payments`);
  console.log(`   - POST /api/admin/payments/:id/approve`);
  console.log(`   - GET  /api/admin/invoices`);
  console.log(`   - GET  /api/admin/announcements`);
  console.log(`   - GET  /api/admin/settings`);
});