        $1, $2, $3, $4, 'XOF',
        'pending', $5, NOW()
      )
    `, [paymentId, userId, planId, amount, waveTransactionId]);

    res.json({
      success: true,
      data: {
        id: paymentId,
        wave_transaction_id: waveTransactionId,
        qr_code_url: `https://api.wave.com/qr/${waveTransactionId}`,
        status: 'pending',
        message: 'Paiement créé, en attente de validation Wave'
      }
    });

  } catch (error) {
    console.error('Erreur création paiement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/user/:id/check-payment - Vérifier paiement valide pour le mois
app.get('/api/admin/user/:id/check-payment', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(`
      SELECT 
        p.plan_id,
        CASE 
          WHEN p.plan_id = 'free' THEN true
          ELSE EXISTS (
            SELECT 1 FROM payments pm
            JOIN subscriptions s ON pm.id = s.payment_id
            WHERE pm.user_id = $1
            AND pm.status = 'completed'
            AND s.status = 'active'
            AND s.current_period_start <= NOW()
            AND s.current_period_end >= NOW()
          )
        END as has_valid_payment
      FROM profiles p
      WHERE p.user_id = $1
    `, [id]);

    if (result.length === 0) {
      return res.json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const { plan_id, has_valid_payment } = result[0];

    res.json({
      success: true,
      data: {
        user_id: id,
        plan_id,
        has_valid_payment,
        access_granted: has_valid_payment,
        message: has_valid_payment 
          ? 'Accès autorisé - Paiement valide pour le mois courant'
          : 'Accès refusé - Paiement requis ou expiré'
      }
    });

  } catch (error) {
    console.error('Erreur vérification paiement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CATCH-ALL ====================

app.all('/api/admin/*', (req, res) => {
  console.log(`[ADMIN CATCH-ALL] ${req.method} ${req.url}`);
  res.json({ success: true, data: [], message: 'Route admin disponible' });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Admin Bouba AI (PostgreSQL) sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Dashboard: http://144.91.96.142:5173/admin`);
  console.log(`📊 PostgreSQL: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log(`📁 Routes disponibles:`);
  console.log(`   - GET  /api/admin/dashboard/stats`);
  console.log(`   - GET  /api/admin/customers`);
  console.log(`   - GET  /api/admin/payments`);
  console.log(`   - POST /api/admin/payments/:id/approve`);
  console.log(`   - GET  /api/admin/invoices`);
  console.log(`   - GET  /api/admin/announcements`);
  console.log(`   - GET  /api/admin/settings`);
  console.log(`   - POST /api/admin/payments/create (Wave simulation)`);
  console.log(`   - GET  /api/admin/user/:id/check-payment`);
  console.log(`\n⚠️  MODIFIE LES CREDENTIALS POSTGRESQL DANS LE FICHIER !`);
});