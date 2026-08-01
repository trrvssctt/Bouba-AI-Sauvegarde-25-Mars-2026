      profile: profile 
    } 
  });
});

app.get('/api/connections', (req, res) => {
  const userPlan = req.query.plan || 'business';
  
  const allConnections = [
    { id: 'chat', name: 'Chat IA', type: 'chat', icon: 'MessageSquare', plan: 'free', connected: true, description: 'Assistant IA conversationnel' },
    { id: 'email', name: 'Email', type: 'email', icon: 'Mail', plan: 'free', connected: true, description: 'Gestion des emails' },
    { id: 'contacts', name: 'Contacts', type: 'contacts', icon: 'Users', plan: 'starter', connected: true, description: 'Gestion des contacts' },
    { id: 'calendar', name: 'Calendrier', type: 'calendar', icon: 'Calendar', plan: 'business', connected: true, description: 'Gestion du calendrier' },
    { id: 'finance', name: 'Finance', type: 'finance', icon: 'TrendingUp', plan: 'business', connected: true, description: 'Gestion financière et documents' }
  ];
  
  let filteredConnections = [];
  
  if (userPlan === 'free') {
    filteredConnections = allConnections.filter(conn => conn.plan === 'free');
  } else if (userPlan === 'starter') {
    filteredConnections = allConnections.filter(conn => conn.plan === 'free' || conn.plan === 'starter');
  } else if (userPlan === 'business') {
    filteredConnections = allConnections;
  }
  
  res.json({ success: true, data: filteredConnections, userPlan: userPlan });
});

// ==================== ROUTES CATCH-ALL ====================

app.all('/api/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url} - retourning empty success`);
  res.json({ success: true, data: [] });
});

app.all('/data/*', (req, res) => {
  console.log(`[CATCH-ALL] ${req.method} ${req.url} - retourning empty success`);
  res.json({ success: true, data: [] });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Bouba AI SUBSCRIPTION FLOW sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
  console.log(`👤 UTILISATEURS PRÉ-EXISTANTS :`);
  console.log(`   - user@bouba.ai / password (business - actif)`);
  console.log(`   - free@bouba.ai / password (free - actif)`);
  console.log(`   - starter@bouba.ai / password (starter - actif)`);
  console.log(`   - admin@bouba.ai / admin (admin - actif)`);
  console.log(`💰 FLUX D'ABONNEMENT :`);
  console.log(`   POST /api/subscription/signup - Création compte avec plan`);
  console.log(`   POST /api/subscription/confirm-payment - Confirmer paiement`);
  console.log(`   GET /api/subscription/status/:userId - Vérifier statut`);
  console.log(`   GET /api/admin/pending-payments - Liste attente admin`);
  console.log(`   POST /api/admin/approve-payment - Approuver paiement`);
  console.log(`🌐 CORS: Autorise toutes les origines (*)`);
});