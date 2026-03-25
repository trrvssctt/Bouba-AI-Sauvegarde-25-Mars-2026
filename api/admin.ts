import express from 'express'
import { query, queryOne } from './lib/db'
import { authenticate } from './auth'

const router = express.Router()

// Middleware : admin ou superadmin uniquement
const adminOnly = async (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' })
  }
  next()
}

router.use(authenticate, adminOnly)

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

router.get('/users', async (_req, res) => {
  try {
    const users = await query(`
      SELECT
        u.id,
        u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName",
        p.plan_id     AS plan,
        p.subscription_status AS status,
        p.messages_used   AS "messagesUsed",
        p.messages_limit  AS "messagesLimit",
        p.last_active_at  AS "lastLogin",
        p.stripe_customer_id AS "stripeCustomerId",
        u.created_at  AS "createdAt",
        COALESCE(r.name, 'user') AS role,
        s.current_period_end AS "nextPayment",
        COALESCE(ut.tokens_used, 0)     AS "tokensUsed",
        COALESCE(ut.estimated_cost, 0)  AS "estimatedCost"
      FROM public.users u
      LEFT JOIN public.profiles p    ON p.id = u.id
      LEFT JOIN public.roles r       ON r.id = u.role_id
      LEFT JOIN public.subscriptions s
             ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN LATERAL (
        SELECT
          SUM(messages_used)        AS tokens_used,
          ROUND(SUM(messages_used) * 0.002, 4) AS estimated_cost
        FROM public.usage_tracking
        WHERE user_id = u.id
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
      ) ut ON true
      ORDER BY u.created_at DESC
      LIMIT 500
    `)
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('[admin/users]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await queryOne(`
      SELECT
        u.id, u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName",
        p.plan_id     AS plan,
        p.subscription_status AS status,
        p.messages_used   AS "messagesUsed",
        p.messages_limit  AS "messagesLimit",
        p.last_active_at  AS "lastLogin",
        p.stripe_customer_id AS "stripeCustomerId",
        u.created_at  AS "createdAt",
        COALESCE(r.name, 'user') AS role
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.roles r    ON r.id = u.role_id
      WHERE u.id = $1
    `, [id])

    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' })

    // Subqueries are optional — tables may not exist yet
    const messages = await query(`
      SELECT m.id, m.content, m.created_at AS date,
             COALESCE(m.agent_used, 'general') AS agent
      FROM public.messages m
      WHERE m.user_id = $1 AND m.role = 'user'
      ORDER BY m.created_at DESC
      LIMIT 10
    `, [id]).catch(() => [])

    const billing = await query(`
      SELECT
        id,
        created_at AS date,
        amount,
        status,
        CONCAT('Abonnement — ', TO_CHAR(created_at, 'TMMonth YYYY')) AS description
      FROM public.payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]).catch(() => [])

    const connections = await query(`
      SELECT COALESCE(provider, service, 'OAuth') AS provider_name
      FROM public.user_connections
      WHERE user_id = $1
    `, [id]).catch(() => [])

    res.json({
      success: true,
      data: {
        ...user,
        recentMessages: messages,
        billing,
        connections: connections.map((c: any) => c.provider_name)
      }
    })
  } catch (err) {
    console.error('[admin/users/:id]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/users/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { plan, status, suspensionReason } = req.body

    await query(`
      UPDATE public.profiles
      SET plan_id             = COALESCE($1, plan_id),
          subscription_status = COALESCE($2, subscription_status),
          preferences         = CASE
            WHEN $2 = 'suspended' THEN preferences || jsonb_build_object('suspension_reason', $3::text)
            WHEN $2 = 'active'    THEN preferences - 'suspension_reason'
            ELSE preferences
          END,
          updated_at          = NOW()
      WHERE id = $4
    `, [plan || null, status || null, suspensionReason || null, id])

    // If suspending, send an in-app notification + trigger email via n8n
    if (status === 'suspended') {
      const targetUser = await queryOne(`
        SELECT u.email, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS name
        FROM public.users u
        JOIN public.profiles p ON p.id = u.id
        WHERE u.id = $1
      `, [id])

      const reasonLabel = suspensionReason || 'non précisé'
      const notifBody = `Votre compte Bouba a été suspendu. Motif : ${reasonLabel}. Pour toute question, contactez notre support.`

      // In-app notification
      await query(`
        INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
        VALUES ($1, 'app', 'Compte suspendu', $2, $3)
      `, [id, notifBody, req.user?.id || null])

      // Send email via n8n (best-effort, non-blocking)
      if (targetUser) {
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.realtechprint.com/webhook/7f338448-11b5-458c-ada3-f009feccc184'
        const emailPrompt = `Envoie un email professionnel en français à ${targetUser.email} (${targetUser.name || 'Utilisateur'}) pour l'informer que son compte Bouba a été suspendu. Motif de suspension : "${reasonLabel}". Explique-lui qu'il peut contacter le support pour régulariser sa situation. Signe l'email au nom de l'équipe Bouba.`
        fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: {
              message: emailPrompt,
              userId: req.user?.id || 'admin',
              sessionId: req.user?.id || id,
              conversation_id: req.user?.id || id,
              source: 'admin',
              timestamp: new Date().toISOString(),
            }
          }),
        }).catch(err => console.warn('[admin/suspend email]', err))
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[admin/users/:id PUT]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.post('/users/:id/reset-quota', async (req, res) => {
  try {
    const { id } = req.params
    await query(`UPDATE public.profiles SET messages_used = 0, updated_at = NOW() WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// BILLING
// ─────────────────────────────────────────────

router.get('/billing/stats', async (_req, res) => {
  try {
    const mrr = await queryOne(`
      SELECT
        COALESCE(SUM(pl.price), 0)::numeric AS mrr,
        COUNT(*) AS active_users
      FROM public.profiles p
      LEFT JOIN public.plans pl ON pl.id = p.plan_id
      WHERE p.subscription_status = 'active' AND pl.price > 0
    `)

    const newMrr = await queryOne(`
      SELECT
        COALESCE(SUM(pl.price), 0)::numeric AS new_mrr,
        COUNT(*) AS new_count
      FROM public.profiles p
      LEFT JOIN public.plans pl ON pl.id = p.plan_id
      WHERE p.subscription_status = 'active'
        AND p.created_at >= DATE_TRUNC('month', NOW())
    `)

    const churnMrr = await queryOne(`
      SELECT COALESCE(SUM(pl.price), 0)::numeric AS churn_mrr, COUNT(*) AS churned
      FROM public.profiles p
      LEFT JOIN public.plans pl ON pl.id = p.plan_id
      WHERE p.subscription_status IN ('cancelled', 'inactive')
        AND p.updated_at >= DATE_TRUNC('month', NOW())
    `)

    const mrrVal = parseFloat(mrr?.mrr || '0')
    res.json({
      success: true,
      data: {
        mrr: mrrVal,
        arr: mrrVal * 12,
        newMrr: parseFloat(newMrr?.new_mrr || '0'),
        newCount: parseInt(newMrr?.new_count || '0'),
        churnMrr: parseFloat(churnMrr?.churn_mrr || '0'),
        churnCount: parseInt(churnMrr?.churned || '0'),
      }
    })
  } catch (err) {
    console.error('[admin/billing/stats]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/billing/transactions', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        pay.id,
        pay.amount,
        pay.status,
        pay.created_at AS date,
        u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName",
        p.plan_id     AS plan
      FROM public.payments pay
      LEFT JOIN public.users u  ON u.id = pay.user_id
      LEFT JOIN public.profiles p ON p.id = pay.user_id
      ORDER BY pay.created_at DESC
      LIMIT 200
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/billing/failed-payments', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        pay.id,
        pay.amount,
        pay.created_at AS "failedAt",
        EXTRACT(DAY FROM NOW() - pay.created_at)::int AS "daysOverdue",
        u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName",
        p.plan_id     AS plan
      FROM public.payments pay
      LEFT JOIN public.users u  ON u.id = pay.user_id
      LEFT JOIN public.profiles p ON p.id = pay.user_id
      WHERE pay.status = 'failed'
      ORDER BY pay.created_at DESC
      LIMIT 100
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/billing/upgrade-queue', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        p.id         AS "userId",
        p.first_name AS "firstName",
        p.last_name  AS "lastName",
        p.plan_id    AS "currentPlan",
        p.messages_used   AS "messagesUsed",
        p.messages_limit  AS "messagesLimit",
        u.email,
        p.updated_at AS "requestDate"
      FROM public.profiles p
      LEFT JOIN public.users u ON u.id = p.id
      WHERE p.subscription_status = 'active'
        AND p.messages_limit > 0
        AND (p.messages_used::float / p.messages_limit) > 0.85
      ORDER BY (p.messages_used::float / p.messages_limit) DESC
      LIMIT 30
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// BILLING — UPGRADE REQUESTS (admin)
// ─────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  pro: [
    'Messages IA illimités',
    'Agents Email, Agenda, Contacts et Finance',
    'Mémoire longue durée (30 jours)',
    'Support prioritaire',
    'Accès aux agents IA avancés',
  ],
  enterprise: [
    'Messages IA illimités',
    'Tous les agents IA disponibles',
    'Mémoire illimitée',
    'Accès API Bouba',
    'Marque blanche (white-label)',
    'Support dédié 24h/24',
  ],
}

router.get('/billing/upgrade-requests', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        ur.id,
        ur.user_id         AS "userId",
        ur.from_plan       AS "fromPlan",
        ur.to_plan         AS "toPlan",
        ur.payment_method  AS "paymentMethod",
        ur.payment_reference AS "paymentReference",
        ur.stripe_session_id AS "stripeSessionId",
        ur.amount,
        ur.status,
        ur.rejection_reason AS "rejectionReason",
        ur.admin_note       AS "adminNote",
        ur.decided_at       AS "decidedAt",
        ur.created_at       AS "createdAt",
        u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName",
        p.plan_id     AS "currentPlan"
      FROM public.upgrade_requests ur
      LEFT JOIN public.users u    ON u.id = ur.user_id
      LEFT JOIN public.profiles p ON p.id = ur.user_id
      ORDER BY
        CASE WHEN ur.status = 'pending' THEN 0 ELSE 1 END,
        ur.created_at DESC
      LIMIT 200
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[admin/billing/upgrade-requests]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/billing/upgrade-requests/:id', async (req, res) => {
  try {
    const { id } = req.params
    const row = await queryOne(`
      SELECT
        ur.*,
        u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName",
        p.plan_id     AS "currentPlan",
        p.messages_used   AS "messagesUsed",
        p.messages_limit  AS "messagesLimit"
      FROM public.upgrade_requests ur
      LEFT JOIN public.users u    ON u.id = ur.user_id
      LEFT JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.id = $1
    `, [id])

    if (!row) return res.status(404).json({ success: false, error: 'Demande introuvable' })
    res.json({ success: true, data: row })
  } catch (err) {
    console.error('[admin/billing/upgrade-requests/:id]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/billing/upgrade-requests/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { action, rejectionReason, adminNote } = req.body

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action invalide (approve | reject)' })
    }

    // Vérifier que la demande est encore en attente (irréversible)
    const existing = await queryOne<any>(`
      SELECT ur.*, u.email, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS name, p.plan_id AS current_plan
      FROM public.upgrade_requests ur
      LEFT JOIN public.users u    ON u.id = ur.user_id
      LEFT JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.id = $1
    `, [id])

    if (!existing) return res.status(404).json({ success: false, error: 'Demande introuvable' })
    if (existing.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'Cette demande a déjà été traitée (irréversible)' })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Mettre à jour la demande
    await query(`
      UPDATE public.upgrade_requests
      SET status           = $1,
          rejection_reason = $2,
          admin_note       = $3,
          admin_id         = $4,
          decided_at       = NOW(),
          updated_at       = NOW()
      WHERE id = $5
    `, [newStatus, rejectionReason || null, adminNote || null, req.user?.id || null, id])

    // Si approbation → mettre à jour le profil utilisateur
    if (action === 'approve') {
      await query(`
        UPDATE public.profiles
        SET plan_id             = $1,
            subscription_status = 'active',
            updated_at          = NOW()
        WHERE id = $2
      `, [existing.to_plan, existing.user_id])
    }

    // Préparer le message de notification
    const features = PLAN_FEATURES[existing.to_plan] || []
    const featuresText = features.map((f: string) => `• ${f}`).join('\n')

    const notifSubject = action === 'approve'
      ? `Upgrade vers ${existing.to_plan} approuvé !`
      : `Demande d'upgrade refusée`

    const notifBody = action === 'approve'
      ? `Bonne nouvelle ! Votre demande de passage au plan ${existing.to_plan} a été approuvée.\n\nVous avez maintenant accès à :\n${featuresText}\n\nBienvenue dans votre nouvelle expérience Bouba !`
      : `Votre demande de passage au plan ${existing.to_plan} a été refusée.\n\nMotif : ${rejectionReason || 'non précisé'}.\n\nSi vous pensez qu'il s'agit d'une erreur, contactez notre support.`

    // Notification in-app
    await query(`
      INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
      VALUES ($1, 'app', $2, $3, $4)
    `, [existing.user_id, notifSubject, notifBody, req.user?.id || null])

    // Email via Bouba / n8n (non-bloquant)
    if (existing.email) {
      const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.realtechprint.com/webhook/7f338448-11b5-458c-ada3-f009feccc184'
      const emailPrompt = action === 'approve'
        ? `Envoie un email professionnel en français à ${existing.email} (${existing.name || 'Utilisateur'}) pour lui annoncer que sa demande d'upgrade vers le plan "${existing.to_plan}" a été approuvée. Mentionne les fonctionnalités désormais disponibles : ${features.join(', ')}. Signe au nom de l'équipe Bouba.`
        : `Envoie un email professionnel en français à ${existing.email} (${existing.name || 'Utilisateur'}) pour l'informer que sa demande d'upgrade vers le plan "${existing.to_plan}" a été refusée. Motif : "${rejectionReason || 'non précisé'}". Invite-le à contacter le support s'il a des questions. Signe au nom de l'équipe Bouba.`

      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: {
            message: emailPrompt,
            userId: req.user?.id || 'admin',
            sessionId: req.user?.id || existing.user_id,
            conversation_id: req.user?.id || existing.user_id,
            source: 'admin',
          }
        }),
      }).catch(err => console.warn('[admin/upgrade-request email]', err))
    }

    res.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[admin/billing/upgrade-requests/:id PUT]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// MONITORING
// ─────────────────────────────────────────────

router.get('/monitoring/top-users', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        p.id,
        p.first_name AS "firstName",
        p.last_name  AS "lastName",
        p.plan_id    AS plan,
        p.messages_used   AS "messagesUsed",
        p.messages_limit  AS "messagesLimit",
        u.email
      FROM public.profiles p
      LEFT JOIN public.users u ON u.id = p.id
      ORDER BY p.messages_used DESC
      LIMIT 10
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/monitoring/agent-stats', async (_req, res) => {
  try {
    // Aggregate agent calls from usage_tracking (guaranteed to exist)
    const raw = await query(`
      SELECT
        agent_key                AS agent,
        SUM(agent_val::int)::int AS calls
      FROM public.usage_tracking ut,
           jsonb_each_text(ut.agent_calls) AS t(agent_key, agent_val)
      WHERE ut.date > CURRENT_DATE - INTERVAL '30 days'
      GROUP BY agent_key
      ORDER BY calls DESC
    `).catch(() => [])

    // Also count total messages as a fallback summary
    const totals = await queryOne(`
      SELECT
        SUM(messages_used)::int AS total,
        AVG(messages_used)::float AS avg_per_user
      FROM public.usage_tracking
      WHERE date = CURRENT_DATE
    `).catch(() => null)

    const COLORS: Record<string, string> = {
      email: 'bg-blue-500', calendar: 'bg-violet-500', finance: 'bg-emerald-500',
      contacts: 'bg-orange-500', general: 'bg-gray-400', admin: 'bg-red-400',
      bouba_action: 'bg-indigo-400', general_agent: 'bg-gray-400',
    }
    const total = (raw as any[]).reduce((s: number, r: any) => s + (r.calls || 0), 0)
    const result = (raw as any[]).map((r: any) => ({
      agent: (r.agent || 'general').charAt(0).toUpperCase() + (r.agent || 'general').slice(1),
      calls: r.calls || 0,
      pct: total > 0 ? Math.round(((r.calls || 0) / total) * 100) : 0,
      color: COLORS[r.agent] || 'bg-gray-400',
    }))
    res.json({
      success: true,
      data: result,
      summary: {
        total_messages_today: totals?.total ?? 0,
        avg_messages_per_user: Math.round((totals?.avg_per_user ?? 0) * 10) / 10,
      }
    })
  } catch (err) {
    console.error('[admin/monitoring/agent-stats]', err)
    res.json({ success: true, data: [], summary: { total_messages_today: 0, avg_messages_per_user: 0 } })
  }
})

router.get('/monitoring/logs', async (req, res) => {
  try {
    const { agent } = req.query

    // Use usage_tracking per day/user as a reliable log source
    const params: any[] = []
    let agentFilter = ''
    if (agent && agent !== 'all') {
      params.push(`%"${agent}"%`)
      agentFilter = `AND ut.agent_calls::text ILIKE $${params.length}`
    }

    const logs = await query(`
      SELECT
        ut.id,
        u.email                 AS "userId",
        ut.date::text           AS "createdAt",
        ut.messages_used        AS "messagesUsed",
        ut.agent_calls          AS "agentCalls",
        'success'               AS status
      FROM public.usage_tracking ut
      LEFT JOIN public.users u ON u.id = ut.user_id
      WHERE ut.date > CURRENT_DATE - INTERVAL '7 days'
        ${agentFilter}
      ORDER BY ut.date DESC, ut.messages_used DESC
      LIMIT 200
    `, params).catch(() => [])

    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('[admin/monitoring/logs]', err)
    res.json({ success: true, data: [] })
  }
})

// ─────────────────────────────────────────────
// SUPPORT
// ─────────────────────────────────────────────

router.get('/support/tickets', async (_req, res) => {
  try {
    const tickets = await query(`
      SELECT
        st.id, st.subject, st.body, st.status,
        st.created_at AS "createdAt",
        u.email       AS "userEmail",
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS "userName"
      FROM public.support_tickets st
      LEFT JOIN public.users u    ON u.id = st.user_id
      LEFT JOIN public.profiles p ON p.id = st.user_id
      ORDER BY
        CASE st.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        st.created_at DESC
    `)
    res.json({ success: true, data: tickets })
  } catch (err) {
    console.error('[admin/support/tickets]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/support/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    await query(`
      UPDATE public.support_tickets
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/support/feedbacks', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        nf.id,
        n.body             AS "originalMessage",
        nf.note,
        nf.rating,
        nf.created_at      AS "createdAt",
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS "userName"
      FROM public.notification_feedback nf
      LEFT JOIN public.notifications n  ON n.id = nf.notification_id
      LEFT JOIN public.profiles p       ON p.id = nf.user_id
      WHERE nf.rating <= 2
      ORDER BY nf.created_at DESC
      LIMIT 50
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[admin/support/feedbacks]', err)
    // Return empty array so UI doesn't crash
    res.json({ success: true, data: [] })
  }
})

// ─────────────────────────────────────────────
// SETTINGS — Feature flags
// ─────────────────────────────────────────────

router.get('/settings/flags', async (_req, res) => {
  try {
    const flags = await query(`
      SELECT id, key, name, description, enabled, plans, created_at AS "createdAt"
      FROM public.feature_flags
      ORDER BY created_at ASC
    `)
    res.json({ success: true, data: flags })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/settings/flags/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { enabled, plans } = req.body
    await query(`
      UPDATE public.feature_flags
      SET enabled = $1, plans = $2, updated_at = NOW()
      WHERE id = $3
    `, [enabled, JSON.stringify(plans), id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.post('/settings/flags', async (req, res) => {
  try {
    const { key, name, description, enabled, plans } = req.body
    const row = await queryOne(`
      INSERT INTO public.feature_flags (key, name, description, enabled, plans)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, key, name, description, enabled, plans, created_at AS "createdAt"
    `, [key, name, description, enabled ?? false, JSON.stringify(plans ?? [])])
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.delete('/settings/flags/:id', async (req, res) => {
  try {
    await query(`DELETE FROM public.feature_flags WHERE id = $1`, [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

router.get('/analytics/overview', async (_req, res) => {
  try {
    const regs = await queryOne(`
      SELECT
        COUNT(*)                                                               AS total,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))      AS this_month,
        COUNT(*) FILTER (
          WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
            AND created_at  < DATE_TRUNC('month', NOW())
        )                                                                      AS last_month
      FROM public.users
    `)

    const stats = await queryOne(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE subscription_status = 'active')  AS active,
        COUNT(*) FILTER (WHERE onboarding_complete = true)       AS onboarded,
        COUNT(*) FILTER (WHERE plan_id != 'starter' AND plan_id IS NOT NULL) AS upgraded
      FROM public.profiles
    `)

    const firstMsg = await queryOne(`
      SELECT COUNT(DISTINCT c.user_id) AS cnt
      FROM public.conversations c
      WHERE EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.conversation_id = c.id AND m.role = 'user'
      )
    `).catch(() => null)

    const total = parseInt(regs?.total || '0')
    const onboarded = parseInt(stats?.onboarded || '0')
    const active = parseInt(stats?.active || '0')
    const upgraded = parseInt(stats?.upgraded || '0')
    const firstMsgCount = parseInt(firstMsg?.cnt || '0')

    const funnel = [
      { step: 'Inscriptions',          value: total,         pct: 100,  color: 'bg-primary' },
      { step: 'Onboarding complété',   value: onboarded,     pct: total ? Math.round(onboarded / total * 100) : 0,     color: 'bg-blue-400' },
      { step: '1er message envoyé',    value: firstMsgCount, pct: total ? Math.round(firstMsgCount / total * 100) : 0, color: 'bg-indigo-500' },
      { step: 'Actif (abonnement)',    value: active,        pct: total ? Math.round(active / total * 100) : 0,        color: 'bg-success' },
      { step: 'Upgrade Pro+',          value: upgraded,      pct: total ? Math.round(upgraded / total * 100) : 0,      color: 'bg-warning' },
    ]

    const thisMonth = parseInt(regs?.this_month || '0')
    const lastMonth = parseInt(regs?.last_month || '0')
    const trend = lastMonth > 0 ? `+${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%` : '+∞'

    res.json({
      success: true,
      data: {
        registrations: { thisMonth, lastMonth, total, trend },
        funnel,
        retentionRate: active && total ? Math.round(active / total * 100) : 0,
        conversionRate: upgraded && total ? Math.round(upgraded / total * 100) : 0,
      }
    })
  } catch (err) {
    console.error('[admin/analytics/overview]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// NOTIFICATIONS (admin sending)
// ─────────────────────────────────────────────

/**
 * POST /api/admin/notifications
 * Envoie une notification individuelle ou broadcast.
 * body: { type: 'app'|'email'|'broadcast_app'|'broadcast_email', userId?, subject?, body }
 */
router.post('/notifications', async (req: any, res) => {
  try {
    const { type, userId, subject, body: msgBody } = req.body
    if (!msgBody?.trim()) {
      return res.status(400).json({ success: false, error: 'Corps du message requis' })
    }

    const campaignId = require('crypto').randomUUID()
    const senderId = req.user?.id || null

    if (type === 'broadcast_app' || type === 'broadcast_email') {
      // Fan-out : une ligne par utilisateur actif
      await query(`
        INSERT INTO public.notifications (user_id, type, campaign_id, sender_id, subject, body)
        SELECT u.id, $1, $2, $3, $4, $5
        FROM public.users u
        INNER JOIN public.profiles p ON p.id = u.id
        WHERE p.subscription_status = 'active'
      `, [type, campaignId, senderId, subject || null, msgBody.trim()])

      const countRow = await queryOne(`
        SELECT COUNT(*) AS cnt FROM public.notifications WHERE campaign_id = $1
      `, [campaignId])

      res.status(201).json({
        success: true,
        data: { campaignId, recipients: parseInt(countRow?.cnt || '0') }
      })
    } else {
      // Individuel
      if (!userId) return res.status(400).json({ success: false, error: 'userId requis pour envoi individuel' })
      const notif = await queryOne(`
        INSERT INTO public.notifications (user_id, type, campaign_id, sender_id, subject, body)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, type, subject, body, is_read, sent_at AS "sentAt"
      `, [userId, type, campaignId, senderId, subject || null, msgBody.trim()])
      res.status(201).json({ success: true, data: notif })
    }
  } catch (err) {
    console.error('[admin/notifications POST]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/** GET /api/admin/notifications — historique de toutes les notifications */
router.get('/notifications', async (req, res) => {
  try {
    const { campaign } = req.query
    let where = ''
    const params: any[] = []
    if (campaign) {
      params.push(campaign)
      where = `WHERE n.campaign_id = $1`
    }

    const rows = await query(`
      SELECT
        n.id, n.type, n.campaign_id AS "campaignId",
        n.subject, n.body,
        n.is_read AS "isRead", n.read_at AS "readAt",
        n.sent_at AS "sentAt",
        u.email   AS "userEmail",
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS "userName"
      FROM public.notifications n
      LEFT JOIN public.users u    ON u.id = n.user_id
      LEFT JOIN public.profiles p ON p.id = n.user_id
      ${where}
      ORDER BY n.sent_at DESC
      LIMIT 500
    `, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/** GET /api/admin/notifications/stats — chiffres globaux */
router.get('/notifications/stats', async (_req, res) => {
  try {
    const stats = await queryOne(`
      SELECT
        COUNT(*)::int                                       AS total_sent,
        COUNT(*) FILTER (WHERE is_read = true)::int        AS total_read,
        COUNT(*) FILTER (WHERE is_read = false)::int       AS total_unread,
        COUNT(DISTINCT campaign_id)::int                   AS campaigns,
        COUNT(*) FILTER (WHERE type LIKE '%email%')::int   AS emails_sent,
        COUNT(*) FILTER (WHERE type LIKE '%app%')::int     AS app_sent
      FROM public.notifications
    `)
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// USER-FACING SUPPORT (no adminOnly)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// USER-FACING NOTIFICATIONS
// ─────────────────────────────────────────────

export const notificationsRouter = express.Router()
notificationsRouter.use(authenticate)

/** GET /api/notifications — notifications de l'utilisateur connecté */
notificationsRouter.get('/', async (req: any, res) => {
  try {
    const notifs = await query(`
      SELECT id, type, subject, body, is_read AS "isRead", sent_at AS "sentAt"
      FROM public.notifications
      WHERE user_id = $1
      ORDER BY sent_at DESC
      LIMIT 50
    `, [req.user.id])
    res.json({ success: true, data: notifs })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/** POST /api/notifications/:id/read — marquer une notification comme lue */
notificationsRouter.post('/:id/read', async (req: any, res) => {
  try {
    await query(`
      UPDATE public.notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/** POST /api/notifications/read-all — marquer toutes comme lues */
notificationsRouter.post('/read-all', async (req: any, res) => {
  try {
    await query(`
      UPDATE public.notifications
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `, [req.user.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// USER-FACING SUPPORT (no adminOnly)
// ─────────────────────────────────────────────

export const supportRouter = express.Router()
supportRouter.use(authenticate)

supportRouter.post('/tickets', async (req: any, res) => {
  try {
    const { subject, body, category } = req.body
    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ success: false, error: 'Sujet et description requis' })
    }
    const ticket = await queryOne(`
      INSERT INTO public.support_tickets (user_id, subject, body, category, status)
      VALUES ($1, $2, $3, $4, 'open')
      RETURNING id, subject, body, status, created_at AS "createdAt"
    `, [req.user.id, subject.trim(), body.trim(), category || 'general'])
    res.status(201).json({ success: true, data: ticket })
  } catch (err) {
    console.error('[support/tickets POST]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

supportRouter.get('/tickets', async (req: any, res) => {
  try {
    const tickets = await query(`
      SELECT id, subject, body, status, category, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM public.support_tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id])
    res.json({ success: true, data: tickets })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

export default router
