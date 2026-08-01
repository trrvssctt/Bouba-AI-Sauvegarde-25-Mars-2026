    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    
    res.json({ 
      success: true, 
      data: settings || {
        platform_name: 'Bouba\'IA',
        currency: 'XOF',
        contact_email: 'contact@bouba.ai',
        support_phone: '+221 77 123 45 67',
        wave_api_key: '',
        stripe_api_key: '',
        email_smtp_host: '',
        email_smtp_port: 587,
        email_smtp_user: '',
        email_smtp_pass: ''
      }
    });
    
  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /api/admin/settings - Mettre à jour les paramètres
app.put('/api/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    const { data: existing, error: fetchError } = await supabase
      .from('admin_settings')
      .select('id')
      .single();
    
    let result;
    if (fetchError && fetchError.code === 'PGRST116') {
      // Créer les paramètres
      const { data, error } = await supabase
        .from('admin_settings')
        .insert(settings)
        .select()
        .single();
      
      result = data;
      if (error) throw error;
    } else {
      // Mettre à jour les paramètres
      const { data, error } = await supabase
        .from('admin_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      
      result = data;
      if (error) throw error;
    }
    
    res.json({ 
      success: true, 
      data: result,
      message: 'Paramètres mis à jour avec succès'
    });
    
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ==================== CATCH-ALL ====================

app.all('/api/admin/*', (req, res) => {
  console.log(`[ADMIN CATCH-ALL] ${req.method} ${req.url}`);
  res.json({ success: true, data: [], message: 'Route admin non implémentée' });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Admin Bouba AI (Données Réelles) sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Dashboard: http://144.91.96.142:5173/admin`);
  console.log(`📊 Connecté à Supabase: ${supabaseUrl ? 'OUI' : 'NON (simulation)'}`);
  console.log(`🔐 Authentification admin requise`);
  console.log(`📁 Routes disponibles:`);
  console.log(`   - GET  /api/admin/dashboard/stats`);
  console.log(`   - GET  /api/admin/customers`);
  console.log(`   - GET  /api/admin/payments`);
  console.log(`   - POST /api/admin/payments/:id/approve`);
  console.log(`   - GET  /api/admin/invoices`);
  console.log(`   - GET  /api/admin/announcements`);
  console.log(`   - GET  /api/admin/settings`);
});