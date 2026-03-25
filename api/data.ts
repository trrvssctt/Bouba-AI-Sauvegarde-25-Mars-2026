import express from 'express'
import { query, queryOne } from './lib/db'
import { authenticate } from './auth'

const router = express.Router()

/**
 * GET /api/data/plans
 * Récupérer tous les plans (route publique)
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await query(`
      SELECT id, name, description, price, currency, billing_interval, 
             trial_days, agents_limit, messages_limit, features, limits,
             stripe_price_id, popular, active, created_at
      FROM public.plans 
      WHERE active = true 
      ORDER BY price ASC
    `);

    res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    
    // Retourner des plans par défaut en cas d'erreur de base de données
    const defaultPlans = [
      {
        id: 'starter',
        name: 'Bouba Starter',
        description: 'Parfait pour découvrir Bouba et commencer votre productivité',
        price: 0,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 0,
        agents_limit: 1,
        messages_limit: 500,
        features: ['Gmail uniquement', 'Mémoire session', 'Support communauté'],
        limits: {
          rag: false,
          web_search: false,
          finance: false,
          api_access: false,
          white_label: false
        },
        popular: false,
        active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'pro',
        name: 'Bouba Pro',
        description: 'Fonctionnalités avancées pour les professionnels et équipes',
        price: 2900,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 7,
        agents_limit: 4,
        messages_limit: 10000,
        features: ['Gmail + Calendar + Contacts', 'Finance Airtable', 'RAG Pinecone', 'Recherche web Tavily', 'Mémoire 30 jours', 'Support email 48h'],
        limits: {
          rag: true,
          web_search: true,
          finance: true,
          api_access: false,
          white_label: false
        },
        stripe_price_id: 'price_pro_monthly',
        popular: true,
        active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'enterprise',
        name: 'Bouba Enterprise',
        description: 'Solution complète pour les grandes équipes et entreprises',
        price: 9900,
        currency: 'EUR',
        billing_interval: 'monthly',
        trial_days: 14,
        agents_limit: -1,
        messages_limit: -1,
        features: ['Toutes les intégrations', 'Finance custom DB', 'RAG custom', 'Mémoire illimitée', 'Support dédié SLA 4h', 'API Access', 'White-label'],
        limits: {
          rag: true,
          web_search: true,
          finance: true,
          api_access: true,
          white_label: true
        },
        stripe_price_id: 'price_enterprise_monthly',
        popular: false,
        active: true,
        created_at: new Date().toISOString()
      }
    ];
    
    res.json({
      success: true,
      data: defaultPlans
    });
  }
});

/**
 * POST /api/data/payments
 * Créer un enregistrement de paiement (authentification requise)
 */
router.post('/payments', authenticate, async (req: any, res) => {
  try {
    // Override user_id from body with authenticated user's ID to prevent IDOR
    const authenticatedUserId = (req as any).user?.id
    const {
      user_id,
      amount,
      currency = 'EUR',
      status = 'succeeded',
      payment_reference,
      plan_id,
      metadata = {}
    } = req.body;

    // Use authenticated user's ID, not the one from body (prevents IDOR)
    const verified_user_id = authenticatedUserId || user_id;
    if (!verified_user_id || !amount || !payment_reference) {
      return res.status(400).json({
        error: 'amount et payment_reference sont requis'
      });
    }

    // Insérer le paiement
    const payment = await queryOne(`
      INSERT INTO public.payments
      (user_id, amount, currency, status, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [verified_user_id, amount, currency, status, {
      ...metadata,
      payment_reference,
      plan_id,
      payment_method: metadata.payment_method || 'wave'
    }]);

    // Si le paiement est réussi, créer/mettre à jour l'abonnement
    if (status === 'succeeded' && plan_id) {
      try {
        await query(`
          INSERT INTO public.subscriptions
          (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
          VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month', NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            plan_id = EXCLUDED.plan_id,
            status = 'active',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '1 month',
            updated_at = NOW()
        `, [verified_user_id, plan_id]);
      } catch (subscriptionError) {
        console.warn('Erreur création abonnement:', subscriptionError);
        // Continue même si l'abonnement échoue
      }
    }

    res.status(201).json({
      success: true,
      data: payment
    });

  } catch (error: any) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement du paiement' });
  }
});

// Middleware d'authentification pour toutes les autres routes de données
router.use(authenticate)

/**
 * GET /api/data/:table
 * Récupérer des données d'une table avec filtres et pagination
 */
router.get('/:table', async (req, res) => {
  try {
    const { table } = req.params
    const userId = (req as any).user.id

    // Validation de sécurité : listes des tables autorisées
    const allowedTables = [
      'plans', 'profiles', 'subscriptions', 'payments', 
      'user_connections', 'conversations', 'messages',
      'user_emails', 'user_calendar_events', 'contacts', 
      'finance_categories', 'transactions', 'finance_goals',
      'usage_tracking', 'sync_logs', 'user_activities'
    ]

    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Table non autorisée' })
    }

    // Construire la requête SQL basée sur les paramètres
    let sql = `SELECT * FROM public.${table}`
    let params: any[] = []
    let paramIndex = 1

    // Toujours filtrer par user_id sauf pour les tables qui n'ont pas cette colonne
    const tablesWithoutUserId = ['plans']
    const tablesWithProfileId = ['profiles'] // table qui utilise id au lieu de user_id

    if (!tablesWithoutUserId.includes(table)) {
      if (tablesWithProfileId.includes(table)) {
        sql += ` WHERE id = $${paramIndex++}`
        params.push(userId)
      } else {
        sql += ` WHERE user_id = $${paramIndex++}`
        params.push(userId)
      }
    }

    // Ajouter les filtres depuis les query params
    for (const [key, value] of Object.entries(req.query)) {
      if (key.includes('[') && key.includes(']')) {
        // Format: field[operator]=value
        const field = key.substring(0, key.indexOf('['))
        const operator = key.substring(key.indexOf('[') + 1, key.indexOf(']'))

        // Validate field name to prevent SQL injection (only allow valid identifiers)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
          continue; // Skip invalid field names silently
        }

        const connector = sql.includes('WHERE') ? ' AND' : ' WHERE'

        switch (operator) {
          case 'eq':
            sql += `${connector} ${field} = $${paramIndex++}`
            params.push(value)
            break
          case 'neq':
            sql += `${connector} ${field} != $${paramIndex++}`
            params.push(value)
            break
          case 'like':
            sql += `${connector} ${field} ILIKE $${paramIndex++}`
            params.push(`%${value}%`)
            break
          case 'gt':
            sql += `${connector} ${field} > $${paramIndex++}`
            params.push(value)
            break
          case 'gte':
            sql += `${connector} ${field} >= $${paramIndex++}`
            params.push(value)
            break
          case 'lt':
            sql += `${connector} ${field} < $${paramIndex++}`
            params.push(value)
            break
          case 'lte':
            sql += `${connector} ${field} <= $${paramIndex++}`
            params.push(value)
            break
        }
      }
    }

    // Ordre — validate field name against allowlist to prevent SQL injection
    if (req.query.order) {
      const orderStr = req.query.order as string
      const [field, direction] = orderStr.split(':')
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
        sql += ` ORDER BY ${field} ${direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`
      }
    }

    // Limite
    if (req.query.limit) {
      sql += ` LIMIT $${paramIndex++}`
      params.push(parseInt(req.query.limit as string))
    }

    // Exécuter la requête
    const results = await query(sql, params)

    res.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error(`Database query error for table ${req.params.table}:`, error)
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des données' })
  }
})

/**
 * POST /api/data/:table
 * Insérer des nouvelles données dans une table
 */
router.post('/:table', async (req, res) => {
  try {
    const { table } = req.params
    const { data } = req.body
    const userId = (req as any).user.id

    // Validation de sécurité
    const allowedTables = [
      'user_connections', 'conversations', 'messages',
      'contacts', 'finance_categories', 'transactions', 
      'finance_goals', 'user_activities'
    ]

    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Insertion non autorisée pour cette table' })
    }

    // Ajouter user_id automatiquement si pas présent
    const insertData = Array.isArray(data) ? data : [data]
    const dataWithUserId = insertData.map(item => ({
      ...item,
      user_id: item.user_id || userId
    }))

    // Construire la requête d'insertion
    if (dataWithUserId.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à insérer' })
    }

    const fields = Object.keys(dataWithUserId[0])
    const placeholders = dataWithUserId.map((_, rowIndex) => 
      `(${fields.map((_, fieldIndex) => `$${rowIndex * fields.length + fieldIndex + 1}`).join(', ')})`
    ).join(', ')

    const sql = `
      INSERT INTO public.${table} (${fields.join(', ')})
      VALUES ${placeholders}
      RETURNING *
    `

    const params = dataWithUserId.flatMap(item => fields.map(field => item[field]))

    const results = await query(sql, params)

    res.status(201).json({
      success: true,
      data: Array.isArray(data) ? results : results[0]
    })

  } catch (error) {
    console.error(`Insert error for table ${req.params.table}:`, error)
    res.status(500).json({ error: 'Erreur serveur lors de l\'insertion' })
  }
})

/**
 * PUT /api/data/:table/:id
 * Mettre à jour un enregistrement
 */
router.put('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const { data } = req.body
    const userId = (req as any).user.id

    // Validation de sécurité
    const allowedTables = [
      'profiles', 'user_connections', 'conversations', 
      'contacts', 'finance_categories', 'transactions', 
      'finance_goals'
    ]

    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Mise à jour non autorisée pour cette table' })
    }

    // Construire la requête de mise à jour — validate field names
    const fields = Object.keys(data).filter(f => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f))
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide à mettre à jour' })
    }
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ')
    const params = fields.map(field => data[field])

    // Ajouter les paramètres pour WHERE
    params.push(id, userId)

    const sql = `
      UPDATE public.${table} 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $${params.length - 1} AND ${table === 'profiles' ? 'id' : 'user_id'} = $${params.length}
      RETURNING *
    `

    const results = await query(sql, params)

    if (results.length === 0) {
      return res.status(404).json({ error: 'Enregistrement non trouvé ou non autorisé' })
    }

    res.json({
      success: true,
      data: results[0]
    })

  } catch (error) {
    console.error(`Update error for table ${req.params.table}:`, error)
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' })
  }
})

/**
 * DELETE /api/data/:table
 * Supprimer des enregistrements
 */
router.delete('/:table', async (req, res) => {
  try {
    const { table } = req.params
    const { where } = req.body
    const userId = (req as any).user.id

    // Validation de sécurité
    const allowedTables = [
      'user_connections', 'conversations', 'messages', 
      'contacts', 'finance_categories', 'transactions', 
      'finance_goals'
    ]

    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Suppression non autorisée pour cette table' })
    }

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Conditions WHERE requises pour la suppression' })
    }

    // Construire la requête de suppression
    const conditions = Object.keys(where)
    const whereClause = conditions.map((field, index) => `${field} = $${index + 1}`).join(' AND ')
    const params = conditions.map(field => where[field])

    // Ajouter user_id pour sécurité
    params.push(userId)

    const sql = `
      DELETE FROM public.${table} 
      WHERE ${whereClause} AND user_id = $${params.length}
      RETURNING *
    `

    const results = await query(sql, params)

    res.json({
      success: true,
      data: results,
      deleted: results.length
    })

  } catch (error) {
    console.error(`Delete error for table ${req.params.table}:`, error)
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' })
  }
})

/**
 * POST /api/data/:table/upsert
 * Insérer ou mettre à jour (upsert)
 */
router.post('/:table/upsert', async (req, res) => {
  try {
    const { table } = req.params
    const { data } = req.body
    const userId = (req as any).user.id

    // Cette opération est complexe et dépend de chaque table
    // Pour l'instant, on retourne une erreur et on implémente selon les besoins
    res.status(501).json({ 
      error: 'Upsert non implémenté - utiliser INSERT ou UPDATE selon le cas' 
    })

  } catch (error) {
    console.error(`Upsert error for table ${req.params.table}:`, error)
    res.status(500).json({ error: 'Erreur serveur lors de l\'upsert' })
  }
})

/**
 * GET /api/plans
 * Endpoint spécial pour récupérer les plans (pas de filtrage par user_id)
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await query('SELECT * FROM public.plans WHERE active = true ORDER BY price ASC')

    res.json({
      success: true,
      data: plans
    })

  } catch (error) {
    console.error('Plans query error:', error)
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des plans' })
  }
})

export default router