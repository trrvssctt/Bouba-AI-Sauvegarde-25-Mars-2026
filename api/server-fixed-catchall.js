_id: user_id || '1',
                plan_id: 'enterprise',
                amount: 4900,
                status: 'succeeded',
                created_at: '2026-04-01T10:00:00Z',
                valid_until: '2026-05-15T10:00:00Z'
            }
        ]
    });
});

app.get('/data/profiles/:id', (req, res) => {
    const profileId = req.params.id;
    const profile = profiles[profileId];
    
    if (profile) {
        res.json({
            success: true,
            data: profile
        });
    } else {
        res.status(404).json({ success: false, error: 'Profil non trouvé' });
    }
});

app.post('/data/usage/increment', (req, res) => {
    res.json({
        success: true,
        data: {
            messages_used: 43,
            messages_limit: 100000
        }
    });
});

// ==================== ROUTES DES NOUVELLES APPLICATIONS ====================

app.get('/api/trello/tasks', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'task_1',
                title: 'Créer les maquettes Figma',
                description: 'Design des écrans mobiles',
                status: 'in_progress',
                priority: 'high',
                due_date: '2026-04-20',
                assignee: 'Seydou Dianka',
                project: 'Bouba IA'
            },
            {
                id: 'task_2',
                title: 'Développer l\'API backend',
                description: 'Créer les endpoints REST',
                status: 'todo',
                priority: 'medium',
                due_date: '2026-04-25',
                assignee: 'Équipe Dev',
                project: 'Bouba IA'
            }
        ]
    });
});

app.get('/api/video/meetings', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'meet_1',
                title: 'Révision hebdomadaire',
                date: '2026-04-16T14:00:00Z',
                duration: 60,
                participants: 5,
                platform: 'Zoom',
                recording_url: null
            },
            {
                id: 'meet_2',
                title: 'Présentation client',
                date: '2026-04-18T10:00:00Z',
                duration: 90,
                participants: 12,
                platform: 'Google Meet',
                recording_url: 'https://meet.google.com/recording/123'
            }
        ]
    });
});

app.get('/api/payments/transactions', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'tx_1',
                amount: 2999,
                currency: 'EUR',
                status: 'succeeded',
                description: 'Abonnement Pro - Avril 2026',
                date: '2026-04-01T10:00:00Z',
                customer: 'Seydou Dianka'
            },
            {
                id: 'tx_2',
                amount: 4999,
                currency: 'EUR',
                status: 'pending',
                description: 'Mise à niveau Enterprise',
                date: '2026-04-15T09:00:00Z',
                customer: 'Seydou Dianka'
            }
        ]
    });
});

app.get('/api/storage/files', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'file_1',
                name: 'Rapport financier Q1 2026.pdf',
                size: '2.4 MB',
                type: 'pdf',
                last_modified: '2026-04-10T14:30:00Z',
                shared_with: ['team@bouba.ai']
            },
            {
                id: 'file_2',
                name: 'Maquettes UI Figma',
                size: '15.7 MB',
                type: 'figma',
                last_modified: '2026-04-12T11:20:00Z',
                shared_with: ['design@bouba.ai', 'dev@bouba.ai']
            }
        ]
    });
});

app.get('/api/finance/transactions', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

app.get('/api/finance/categories', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

app.get('/api/finance/goals', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

app.get('/api/emails', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Bouba AI - Fixed Catchall',
        version: '1.0.0',
        mode: 'production',
        features: ['auth', 'conversations', 'connections', 'plans', 'trello', 'video', 'payments', 'storage']
    });
});

// ==================== CATCH-ALL POUR ROUTES API NON DÉFINIES ====================
// DOIT ÊTRE À LA FIN, APRÈS TOUTES LES ROUTES DÉFINIES
app.all('/api/*', (req, res) => {
    console.log(`[API CATCH-ALL] ${req.method} ${req.url} - Route non définie, retourne JSON mock`);
    
    res.json({
        success: true,
        data: [],
        message: `Route ${req.url} simulée - Développement en cours`,
        timestamp: new Date().toISOString()
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Bouba AI FIXED CATCHALL sur http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://144.91.96.142:5173/`);
    console.log(`🎯 NOUVELLES APPLICATIONS CRÉÉES :`);
    console.log(`   1. 📋 Trello/Asana - Gestion de projets`);
    console.log(`   2. 🎥 Zoom/Meet - Visioconférence`);
    console.log(`   3. 💳 Stripe/PayPal - Paiements`);
    console.log(`   4. 📁 Dropbox/Drive - Stockage cloud`);
    console.log(`👤 UTILISATEURS :`);
    console.log(`   - user@bouba.ai / password (user)`);
    console.log(`   - admin@bouba.ai / admin (admin)`);
    console.log(`📊 PLAN : Premium (11 applications disponibles)`);
});