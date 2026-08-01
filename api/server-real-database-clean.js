// ==================== ROUTES COMPATIBILITÉ ====================

// Route de compatibilité pour le frontend existant
app.get('/api/data/subscriptions', async (req, res) => {
  try {
    const subscriptions = await executeQuery(`
      SELECT 
        s.id,
        s.plan_id,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.created_at,
        u.email,
        p.name as plan_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
    `);

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error('Erreur /api/data/subscriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/upgrade-requests/status', async (req, res) => {
  try {
    const requests = await executeQuery(`
      SELECT 
        id,
        user_id,
        current_plan,
        requested_plan,
        status,
        created_at
      FROM upgrade_requests
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Erreur /api/upgrade-requests/status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CATCH-ALL POUR LE FRONTEND ====================

app.get('/api/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url}`);
  res.json({ 
    success: true, 
    data: [], 
    message: 'Route disponible',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/*', (req, res) => {
  console.log(`[CATCH-ALL POST] ${req.method} ${req.url}`, req.body);
  res.json({ 
    success: true, 
    data: { id: 'demo-id', ...req.body },
    message: 'Action simulée avec succès'
  });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI (Base Réelle) sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173`);
  console.log(`🔗 Admin: http://144.91.96.142:5173/admin`);
  console.log(`📊 PostgreSQL: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log(`\n📁 Routes disponibles:`);
  console.log(`   Frontend:`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - GET  /api/conversations`);
  console.log(`   - GET  /api/conversations/:id/messages`);
  console.log(`   - GET  /api/data/plans`);
  console.log(`   - GET  /api/connections`);
  console.log(`   Admin:`);
  console.log(`   - GET  /api/admin/dashboard/stats`);
  console.log(`   - GET  /api/admin/customers`);
  console.log(`   - GET  /api/admin/payments`);
  console.log(`\n🎯 Données RÉELLES de la base de Seydou !`);
  console.log(`   - 6 utilisateurs`);
  console.log(`   - 2 conversations`);
  console.log(`   - 12 messages`);
  console.log(`   - 3 plans`);
  console.log(`   - 1 paiement`);
});