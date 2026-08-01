import express from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Stripe from 'stripe'
import multer from 'multer'
import { query, queryOne } from './lib/db'
import { authenticate } from './auth'
import { sendAdminInviteEmail, sendTempPasswordEmail, sendInvoiceEmail, sendAdminMessageEmail, sendPaymentReminderEmail } from './lib/email'
import { buildInvoicePdf } from './lib/invoice'
import { findMonthEndRenewals, buildRenewalInvoiceData, sendRenewalInvoice } from './lib/renewals'

const router = express.Router()

// Preuve de paiement (image ou PDF, max 5 Mo) — stockée en base64 dans payments.metadata
const PROOF_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (PROOF_MIME_TYPES.has(file.mimetype)) cb(null, true)
    else cb(new Error('Format de preuve non supporté (JPEG, PNG, WebP ou PDF uniquement)'))
  },
})

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

router.post('/users/invite', proofUpload.single('proofFile'), async (req: any, res) => {
  try {
    const { email, firstName, lastName, plan, paymentReference, paymentNote } = req.body
    if (!email?.trim()) {
      return res.status(400).json({ success: false, error: 'Email requis' })
    }

    // Preuve de paiement (référence OU fichier) obligatoire pour les plans payants uniquement
    const planId = plan || 'free'
    const planRow = await queryOne<{ price: number; messages_limit: number }>(
      `SELECT price, messages_limit FROM public.plans WHERE id = $1`, [planId]
    ).catch(() => null)
    const isPaidPlan = (planRow?.price ?? 0) > 0
    const proofFile = req.file as Express.Multer.File | undefined
    if (isPaidPlan && !paymentReference?.trim() && !proofFile) {
      return res.status(400).json({
        success: false,
        error: 'Plan payant : une preuve de paiement est obligatoire (référence Stripe/virement ou fichier justificatif).'
      })
    }

    // Vérification Stripe si la référence est un ID Stripe reconnu
    const ref = (paymentReference || '').trim()
    if (ref.startsWith('pi_') || ref.startsWith('ch_') || ref.startsWith('cs_')) {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any })
          if (ref.startsWith('pi_')) {
            const pi = await stripe.paymentIntents.retrieve(ref)
            if (pi.status !== 'succeeded') {
              return res.status(400).json({ success: false, error: `Paiement Stripe non validé (statut : ${pi.status}). Le compte ne peut pas être créé.` })
            }
          } else if (ref.startsWith('ch_')) {
            const ch = await stripe.charges.retrieve(ref)
            if (ch.status !== 'succeeded') {
              return res.status(400).json({ success: false, error: `Charge Stripe non validée (statut : ${ch.status}). Le compte ne peut pas être créé.` })
            }
          } else if (ref.startsWith('cs_')) {
            const cs = await stripe.checkout.sessions.retrieve(ref)
            if (cs.payment_status !== 'paid') {
              return res.status(400).json({ success: false, error: `Session Stripe non payée (statut : ${cs.payment_status}). Le compte ne peut pas être créé.` })
            }
          }
        } catch (stripeErr: any) {
          return res.status(400).json({ success: false, error: `Référence Stripe invalide ou introuvable : ${stripeErr.message}` })
        }
      }
    }

    const existing = await queryOne(`SELECT id FROM public.users WHERE email = $1`, [email.trim().toLowerCase()])
    if (existing) {
      return res.status(409).json({ success: false, error: 'Un compte avec cet email existe déjà' })
    }

    const defaultRole = await queryOne(`SELECT id FROM public.roles WHERE name = 'user'`).catch(() => null)
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)
    const displayName = `${firstName || ''} ${lastName || ''}`.trim() || email.trim()

    const newUser = await queryOne<any>(`
      INSERT INTO public.users (email, name, provider, password_hash, email_verified, role_id)
      VALUES ($1, $2, 'email', $3, true, $4)
      RETURNING id, email, created_at
    `, [email.trim().toLowerCase(), displayName, hashedPassword, defaultRole?.id || null])

    if (!newUser) throw new Error('Erreur création utilisateur')

    // Profil avec la limite de messages du plan choisi
    await query(`
      INSERT INTO public.profiles (id, first_name, last_name, plan_id, subscription_status, work_type, messages_limit)
      VALUES ($1, $2, $3, $4, 'active', 'entrepreneur', $5)
      ON CONFLICT (id) DO NOTHING
    `, [newUser.id, firstName?.trim() || '', lastName?.trim() || '', planId, planRow?.messages_limit ?? 500])

    // Enregistrer la preuve de paiement (référence + fichier éventuel en base64)
    if (isPaidPlan || ref || proofFile) {
      const metadata: Record<string, any> = { source: 'admin_manual' }
      if (proofFile) {
        metadata.proof = {
          name: proofFile.originalname,
          mime: proofFile.mimetype,
          size: proofFile.size,
          data: proofFile.buffer.toString('base64'),
        }
      }
      // status 'succeeded' (contrainte CHECK) + metadata.source = 'admin_manual'
      await query(`
        INSERT INTO public.payments (user_id, amount, status, stripe_payment_intent_id, plan_id, description, metadata)
        VALUES ($1, 0, 'succeeded', $2, $3, $4, $5::jsonb)
      `, [
        newUser.id,
        ref.startsWith('pi_') || ref.startsWith('ch_') || ref.startsWith('cs_') ? ref : null,
        planId,
        `Compte créé manuellement par admin${ref ? ' — ref: ' + ref : ''}${proofFile ? ' — justificatif: ' + proofFile.originalname : ''}${paymentNote ? ' — ' + paymentNote : ''}`,
        JSON.stringify(metadata)
      ]).catch(err => console.warn('[admin/invite payment record]', err))
    }

    // Email de bienvenue via Resend avec mot de passe temporaire
    sendAdminInviteEmail(email.trim().toLowerCase(), firstName, planId, tempPassword)
      .catch(err => console.warn('[admin/invite email Resend]', err))

    res.status(201).json({
      success: true,
      data: { id: newUser.id, email: newUser.email, plan: planId }
    })
  } catch (err: any) {
    console.error('[admin/users/invite]', err)
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Un compte avec cet email existe déjà' })
    }
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
        COALESCE(r.name, 'user') AS role,
        s.current_period_end AS "nextPayment"
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.roles r    ON r.id = u.role_id
      LEFT JOIN public.subscriptions s
             ON s.user_id = u.id AND s.status = 'active'
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
        COALESCE(description, CONCAT('Abonnement — ', TO_CHAR(created_at, 'TMMonth YYYY'))) AS description,
        (metadata->'proof'->>'name') AS "proofName"
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
    const { plan, status, suspensionReason, firstName, lastName, role } = req.body

    // Garde-fous : on ne modifie pas un admin/superadmin sauf si on est superadmin
    const target = await queryOne<{ role: string }>(`
      SELECT COALESCE(r.name, 'user') AS role
      FROM public.users u LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = $1
    `, [id])
    if (!target) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })
    const targetIsAdmin = target.role === 'admin' || target.role === 'superadmin'
    if (targetIsAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Seul un superadmin peut modifier un compte administrateur' })
    }

    // Changement de rôle : superadmin uniquement, jamais sur soi-même
    if (role !== undefined) {
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Seul un superadmin peut modifier les rôles' })
      }
      if (id === req.user.id) {
        return res.status(400).json({ success: false, error: 'Impossible de modifier son propre rôle' })
      }
      const roleRow = await queryOne<{ id: string }>(`SELECT id FROM public.roles WHERE name = $1`, [role])
      if (!roleRow) return res.status(400).json({ success: false, error: `Rôle inconnu : ${role}` })
      await query(`UPDATE public.users SET role_id = $1 WHERE id = $2`, [roleRow.id, id])
      await query(`UPDATE public.profiles SET role = $1, updated_at = NOW() WHERE id = $2`, [role, id])
        .catch(() => { /* colonne role absente du profil : non bloquant */ })
    }

    // Changement de plan → synchroniser la limite de messages du plan
    const planLimit = plan
      ? (await queryOne<{ messages_limit: number }>(`SELECT messages_limit FROM public.plans WHERE id = $1`, [plan]).catch(() => null))?.messages_limit ?? null
      : null

    await query(`
      UPDATE public.profiles
      SET plan_id             = COALESCE($1, plan_id),
          subscription_status = COALESCE($2, subscription_status),
          first_name          = COALESCE($5, first_name),
          last_name           = COALESCE($6, last_name),
          messages_limit      = COALESCE($7, messages_limit),
          preferences         = CASE
            WHEN $2 = 'suspended' THEN preferences || jsonb_build_object('suspension_reason', $3::text)
            WHEN $2 = 'active'    THEN preferences - 'suspension_reason'
            ELSE preferences
          END,
          updated_at          = NOW()
      WHERE id = $4
    `, [plan || null, status || null, suspensionReason || null, id, firstName ?? null, lastName ?? null, planLimit])

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

router.post('/users/:id/reset-password', async (req: any, res) => {
  try {
    const { id } = req.params
    const targetUser = await queryOne<any>(`
      SELECT u.email, p.first_name AS "firstName"
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = $1
    `, [id])

    if (!targetUser) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })

    const tempPassword = crypto.randomBytes(8).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    await query(`UPDATE public.users SET password_hash = $1 WHERE id = $2`, [hashedPassword, id])

    // Envoyer le mot de passe temporaire par email
    await sendTempPasswordEmail(targetUser.email, targetUser.firstName, tempPassword)
      .catch(err => console.warn('[admin/reset-password email]', err))

    res.json({ success: true, message: `Mot de passe réinitialisé. Un email a été envoyé à ${targetUser.email}.` })
  } catch (err) {
    console.error('[admin/users/:id/reset-password]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// Suppression définitive d'un compte (données incluses)
router.delete('/users/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer son propre compte' })
    }
    const target = await queryOne<{ role: string; email: string }>(`
      SELECT COALESCE(r.name, 'user') AS role, u.email
      FROM public.users u LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = $1
    `, [id])
    if (!target) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })
    if ((target.role === 'admin' || target.role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Seul un superadmin peut supprimer un compte administrateur' })
    }

    // Supprimer toutes les données liées : toutes les tables publiques ayant
    // une colonne user_id, puis le profil, puis le compte.
    const tables = await query<{ table_name: string }>(`
      SELECT DISTINCT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'user_id'
    `)
    for (const t of tables) {
      await query(`DELETE FROM public."${t.table_name}" WHERE user_id = $1`, [id])
        .catch(err => console.warn(`[admin/delete-user] ${t.table_name}:`, err.message))
    }
    await query(`DELETE FROM public.profiles WHERE id = $1`, [id]).catch(() => {})
    await query(`DELETE FROM public.users WHERE id = $1`, [id])

    console.log(`[admin] Utilisateur ${target.email} (${id}) supprimé par ${req.user.email}`)
    res.json({ success: true, message: `Compte ${target.email} supprimé définitivement.` })
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err)
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression du compte' })
  }
})

// Télécharger la preuve de paiement d'un paiement (stockée en base64 dans metadata)
router.get('/users/:id/payment-proof/:paymentId', async (req, res) => {
  try {
    const { id, paymentId } = req.params
    const payment = await queryOne<{ metadata: any }>(
      `SELECT metadata FROM public.payments WHERE id = $1 AND user_id = $2`,
      [paymentId, id]
    )
    const proof = payment?.metadata?.proof
    if (!proof?.data) return res.status(404).json({ success: false, error: 'Aucun justificatif pour ce paiement' })
    res.setHeader('Content-Type', proof.mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${(proof.name || 'preuve').replace(/"/g, '')}"`)
    res.send(Buffer.from(proof.data, 'base64'))
  } catch (err) {
    console.error('[admin/payment-proof]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// Envoyer un vrai email (Resend) + notification in-app au client
router.post('/users/:id/send-email', async (req: any, res) => {
  try {
    const { id } = req.params
    const { subject, body } = req.body
    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ success: false, error: 'Objet et message requis' })
    }
    const targetUser = await queryOne<{ email: string; firstName: string }>(`
      SELECT u.email, p.first_name AS "firstName"
      FROM public.users u LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = $1
    `, [id])
    if (!targetUser) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })

    await sendAdminMessageEmail(targetUser.email, targetUser.firstName, subject.trim(), body.trim())

    // Notification in-app en plus de l'email (best-effort)
    await query(`
      INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
      VALUES ($1, 'email', $2, $3, $4)
    `, [id, subject.trim(), body.trim(), req.user?.id || null]).catch(() => {})

    const emailSent = !!process.env.RESEND_API_KEY
    res.json({
      success: true,
      emailSent,
      message: emailSent
        ? `Email envoyé à ${targetUser.email}.`
        : `RESEND_API_KEY non configurée : notification in-app créée, mais l'email n'a pas pu partir.`,
    })
  } catch (err) {
    console.error('[admin/users/:id/send-email]', err)
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi de l\'email' })
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

/**
 * Revenus réellement encaissés via le SaaS, par source :
 * - subscription : premier paiement réussi d'un utilisateur (nouvel abonnement)
 * - renewal      : paiements réussis suivants (réabonnements)
 * - upgrade      : demandes d'upgrade approuvées (montants en XOF le plus souvent)
 * Montants agrégés par devise (EUR/XOF non additionnables entre eux).
 */
router.get('/billing/revenue', async (_req, res) => {
  try {
    // Paiements réussis, classés nouvel abonnement vs renouvellement
    const paymentRows = await query<any>(`
      WITH ranked AS (
        SELECT amount, COALESCE(currency, 'EUR') AS currency, created_at,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
        FROM public.payments
        WHERE status IN ('succeeded', 'completed', 'paid') AND amount > 0
      )
      SELECT
        CASE WHEN rn = 1 THEN 'subscription' ELSE 'renewal' END AS source,
        UPPER(currency) AS currency,
        COALESCE(SUM(amount), 0)::numeric AS total,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())), 0)::numeric AS this_month,
        COUNT(*) AS count
      FROM ranked
      GROUP BY 1, 2
    `).catch(() => [])

    // Upgrades approuvés
    const upgradeRows = await query<any>(`
      SELECT 'upgrade' AS source, 'XOF' AS currency,
             COALESCE(SUM(amount), 0)::numeric AS total,
             COALESCE(SUM(amount) FILTER (WHERE decided_at >= DATE_TRUNC('month', NOW())), 0)::numeric AS this_month,
             COUNT(*) AS count
      FROM public.upgrade_requests
      WHERE status = 'approved' AND amount > 0
    `).catch(() => [])

    // Série mensuelle (12 derniers mois) tous encaissements confondus, par devise
    const monthly = await query<any>(`
      SELECT TO_CHAR(month, 'YYYY-MM') AS month, currency, total FROM (
        SELECT DATE_TRUNC('month', created_at) AS month, UPPER(COALESCE(currency, 'EUR')) AS currency,
               SUM(amount)::numeric AS total
        FROM public.payments
        WHERE status IN ('succeeded', 'completed', 'paid') AND amount > 0
          AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1, 2
        UNION ALL
        SELECT DATE_TRUNC('month', decided_at), 'XOF', SUM(amount)::numeric
        FROM public.upgrade_requests
        WHERE status = 'approved' AND amount > 0
          AND decided_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1, 2
      ) t ORDER BY month
    `).catch(() => [])

    res.json({
      success: true,
      data: {
        sources: [...paymentRows, ...upgradeRows].map((r: any) => ({
          source: r.source,
          currency: r.currency,
          total: parseFloat(r.total),
          thisMonth: parseFloat(r.this_month),
          count: parseInt(r.count),
        })),
        monthly: monthly.map((m: any) => ({ month: m.month, currency: m.currency, total: parseFloat(m.total) })),
      },
    })
  } catch (err) {
    console.error('[admin/billing/revenue]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/billing/transactions', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        pay.id,
        pay.user_id   AS "userId",
        pay.amount,
        pay.currency,
        pay.status,
        pay.payment_method AS "paymentMethod",
        pay.plan_id   AS plan,
        pay.created_at AS date,
        u.email,
        p.first_name  AS "firstName",
        p.last_name   AS "lastName"
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

/**
 * Charge les données de facture d'un paiement ou d'un upgrade approuvé.
 * Un paiement réussi/approuvé produit un REÇU (tampon PAYÉE), sinon une FACTURE.
 */
async function loadInvoiceData(userId: string, opts: { paymentId?: string; upgradeRequestId?: string }) {
  const user = await queryOne<{ email: string; first_name: string; last_name: string }>(
    `SELECT u.email, p.first_name, p.last_name FROM public.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = $1`,
    [userId]
  )
  if (!user) return null

  let payment: any = null
  if (opts.upgradeRequestId) {
    payment = await queryOne(
      `SELECT id, to_plan AS plan_id, amount, 'XOF' AS currency, payment_method, status,
              COALESCE(decided_at, created_at) AS payment_date, months_paid
       FROM public.upgrade_requests WHERE id = $1 AND user_id = $2`,
      [opts.upgradeRequestId, userId]
    )
  } else if (opts.paymentId) {
    payment = await queryOne(
      `SELECT id, plan_id, amount, currency, payment_method, status, description,
              COALESCE(approved_at, created_at) AS payment_date
       FROM public.payments WHERE id = $1 AND user_id = $2`,
      [opts.paymentId, userId]
    )
  } else {
    payment = await queryOne(
      `SELECT id, plan_id, amount, currency, payment_method, status, description,
              COALESCE(approved_at, created_at) AS payment_date
       FROM public.payments WHERE user_id = $1 AND status IN ('succeeded','completed','paid')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )
  }
  if (!payment) return null

  const paid = ['succeeded', 'completed', 'paid', 'approved'].includes(payment.status)
  const invoiceNumber = `INV-${new Date(payment.payment_date).getFullYear()}-${String(payment.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`
  // Les paiements Stripe EUR sont stockés en centimes → conversion en euros
  const rawAmount = Number(payment.amount)
  const currency = (payment.currency || 'XOF').toUpperCase()
  const displayAmount = currency === 'EUR' && rawAmount > 200 ? rawAmount / 100 : rawAmount
  return {
    user,
    payment,
    invoice: {
      invoiceNumber,
      date: new Date(payment.payment_date),
      clientName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
      clientEmail: user.email,
      planId: payment.plan_id || 'starter',
      description: payment.description || undefined,
      amount: displayAmount,
      currency,
      paymentMethod: payment.payment_method,
      monthsPaid: payment.months_paid || 1,
      paid,
    },
  }
}

// Télécharger la facture (PDF) d'un paiement, d'un upgrade ou d'un renouvellement
router.get('/billing/invoice-pdf', async (req: any, res) => {
  try {
    const { userId, paymentId, upgradeRequestId, type } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId requis' })

    // Mode renouvellement : facture d'échéance construite depuis l'abonnement actif
    if (type === 'renewal') {
      const renewals = await findMonthEndRenewals()
      const renewal = renewals.find(r => r.userId === String(userId))
      if (!renewal) return res.status(404).json({ success: false, error: 'Aucune échéance ce mois-ci pour cet utilisateur' })
      const invoice = buildRenewalInvoiceData(renewal)
      const pdf = await buildInvoicePdf(invoice)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`)
      return res.send(pdf)
    }

    const data = await loadInvoiceData(String(userId), {
      paymentId: paymentId ? String(paymentId) : undefined,
      upgradeRequestId: upgradeRequestId ? String(upgradeRequestId) : undefined,
    })
    if (!data) return res.status(404).json({ success: false, error: 'Paiement introuvable' })

    const pdf = await buildInvoicePdf(data.invoice)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${data.invoice.invoiceNumber}.pdf"`)
    res.send(pdf)
  } catch (err) {
    console.error('[admin/billing/invoice-pdf]', err)
    res.status(500).json({ success: false, error: 'Erreur génération facture' })
  }
})

// ─────────────────────────────────────────────
// PAIEMENTS — historique unifié + validation Wave
// ─────────────────────────────────────────────

/**
 * Historique complet des transactions, typé :
 * - kind : subscription (1er paiement), renewal (suivants), upgrade, manual (créé par admin)
 * - method : wave (validation manuelle) | stripe (validation automatique) | manual
 * Union des tables payments et upgrade_requests.
 */
router.get('/payments/all', async (_req, res) => {
  try {
    const paymentRows = await query<any>(`
      WITH ranked AS (
        SELECT pay.*,
               ROW_NUMBER() OVER (PARTITION BY pay.user_id ORDER BY pay.created_at) AS rn
        FROM public.payments pay
      )
      SELECT
        r.id,
        'payment'             AS origin,
        r.user_id             AS "userId",
        r.amount,
        UPPER(COALESCE(r.currency, 'EUR')) AS currency,
        r.status,
        COALESCE(r.payment_method, r.metadata->>'payment_method',
                 CASE WHEN r.stripe_payment_intent_id IS NOT NULL THEN 'stripe' END,
                 'manual') AS method,
        COALESCE(r.plan_id, r.metadata->>'plan_id') AS plan,
        COALESCE(r.stripe_payment_intent_id, r.metadata->>'payment_reference') AS reference,
        (r.metadata->'proof'->>'name') AS "proofName",
        CASE
          WHEN r.metadata->>'source' = 'admin_manual' THEN 'manual'
          WHEN r.rn = 1 THEN 'subscription'
          ELSE 'renewal'
        END AS kind,
        r.created_at AS date,
        u.email,
        p.first_name AS "firstName",
        p.last_name  AS "lastName"
      FROM ranked r
      LEFT JOIN public.users u    ON u.id = r.user_id
      LEFT JOIN public.profiles p ON p.id = r.user_id
      ORDER BY r.created_at DESC
      LIMIT 300
    `).catch(() => [])

    const upgradeRows = await query<any>(`
      SELECT
        ur.id,
        'upgrade_request' AS origin,
        ur.user_id  AS "userId",
        ur.amount,
        'XOF'       AS currency,
        CASE ur.status WHEN 'approved' THEN 'succeeded' WHEN 'rejected' THEN 'failed' ELSE 'pending' END AS status,
        COALESCE(ur.payment_method, 'wave') AS method,
        ur.to_plan  AS plan,
        ur.payment_reference AS reference,
        NULL        AS "proofName",
        'upgrade'   AS kind,
        ur.created_at AS date,
        u.email,
        p.first_name AS "firstName",
        p.last_name  AS "lastName"
      FROM public.upgrade_requests ur
      LEFT JOIN public.users u    ON u.id = ur.user_id
      LEFT JOIN public.profiles p ON p.id = ur.user_id
      ORDER BY ur.created_at DESC
      LIMIT 100
    `).catch(() => [])

    const all = [...paymentRows, ...upgradeRows]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    res.json({ success: true, data: all })
  } catch (err) {
    console.error('[admin/payments/all]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Validation manuelle d'un paiement Wave en attente.
 * body: { action: 'approve' | 'reject', reason? }
 * approve → paiement succeeded + abonnement prolongé + reçu PDF envoyé par email
 * reject  → paiement failed + email/notification avec motif
 * (Les paiements Stripe sont validés automatiquement par le webhook — jamais ici.)
 */
router.post('/payments/:id/validate', async (req: any, res) => {
  try {
    const { id } = req.params
    const { action, reason } = req.body
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action invalide (approve | reject)' })
    }

    const payment = await queryOne<any>(`
      SELECT pay.*, u.email, p.first_name AS "firstName"
      FROM public.payments pay
      LEFT JOIN public.users u    ON u.id = pay.user_id
      LEFT JOIN public.profiles p ON p.id = pay.user_id
      WHERE pay.id = $1
    `, [id])
    if (!payment) return res.status(404).json({ success: false, error: 'Paiement introuvable' })
    if (payment.status !== 'pending') {
      return res.status(409).json({ success: false, error: `Ce paiement n'est pas en attente (statut : ${payment.status})` })
    }
    const method = payment.payment_method || payment.metadata?.payment_method || (payment.stripe_payment_intent_id ? 'stripe' : 'manual')
    if (method === 'stripe') {
      return res.status(400).json({ success: false, error: 'Les paiements Stripe sont validés automatiquement par le webhook' })
    }

    if (action === 'reject') {
      await query(`UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE id = $1`, [id])
      const motif = reason || 'non précisé'
      await query(`
        INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
        VALUES ($1, 'app', 'Paiement Wave refusé', $2, $3)
      `, [payment.user_id, `Votre paiement Wave n'a pas pu être validé. Motif : ${motif}. Contactez le support si vous pensez qu'il s'agit d'une erreur.`, req.user?.id || null]).catch(() => {})
      sendAdminMessageEmail(payment.email, payment.firstName, 'Votre paiement Wave n\'a pas pu être validé',
        `Nous n'avons pas pu valider votre paiement Wave.\n\nMotif : ${motif}.\n\nSi vous avez bien effectué le paiement, répondez à cet email avec votre reçu Wave et nous corrigerons cela rapidement.`)
        .catch(err => console.warn('[admin/payments reject email]', err))
      return res.json({ success: true, status: 'failed', message: 'Paiement rejeté, le client a été notifié.' })
    }

    // ── Approbation ──────────────────────────────────────────────────
    const planId = payment.plan_id || payment.metadata?.plan_id || null
    const months = Number(payment.metadata?.months_paid) || 1
    await query(`UPDATE public.payments SET status = 'succeeded', approved_at = NOW(), updated_at = NOW() WHERE id = $1`, [id])

    // Activer/prolonger l'abonnement
    if (planId) {
      const planRow = await queryOne<{ messages_limit: number }>(`SELECT messages_limit FROM public.plans WHERE id = $1`, [planId]).catch(() => null)
      await query(`
        UPDATE public.profiles
        SET plan_id = $1, subscription_status = 'active',
            messages_limit = COALESCE($2, messages_limit), updated_at = NOW()
        WHERE id = $3
      `, [planId, planRow?.messages_limit ?? null, payment.user_id])
    } else {
      await query(`UPDATE public.profiles SET subscription_status = 'active', updated_at = NOW() WHERE id = $1`, [payment.user_id])
    }
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + months)
    await query(`
      INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_method)
      VALUES ($1, COALESCE($2, 'starter'), 'active', NOW(), $3, 'wave')
      ON CONFLICT (user_id) DO UPDATE
        SET plan_id = COALESCE($2, subscriptions.plan_id), status = 'active',
            current_period_start = NOW(), current_period_end = $3,
            payment_method = 'wave', updated_at = NOW()
    `, [payment.user_id, planId, periodEnd.toISOString()]).catch(err => console.warn('[admin/payments approve subscription]', err))

    // Reçu PDF (tampon PAYÉE) envoyé par email + notification
    try {
      const data = await loadInvoiceData(payment.user_id, { paymentId: id })
      if (data) {
        const pdf = await buildInvoicePdf(data.invoice)
        await sendInvoiceEmail(data.user.email, data.user.first_name, {
          invoiceNumber: data.invoice.invoiceNumber,
          planId: data.invoice.planId,
          amount: data.invoice.amount,
          currency: data.invoice.currency,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'wave',
          monthsPaid: months,
        }, { filename: `${data.invoice.invoiceNumber}.pdf`, content: pdf })
      }
    } catch (err) {
      console.warn('[admin/payments approve receipt]', err)
    }
    await query(`
      INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
      VALUES ($1, 'app', 'Paiement Wave validé ✓', $2, $3)
    `, [payment.user_id, `Votre paiement Wave a été validé. Votre abonnement est actif jusqu'au ${periodEnd.toLocaleDateString('fr-FR')}. Votre reçu vous a été envoyé par email.`, req.user?.id || null]).catch(() => {})

    res.json({
      success: true,
      status: 'succeeded',
      message: `Paiement validé — abonnement actif jusqu'au ${periodEnd.toLocaleDateString('fr-FR')}, reçu envoyé par email.`,
    })
  } catch (err) {
    console.error('[admin/payments/:id/validate]', err)
    res.status(500).json({ success: false, error: 'Erreur lors de la validation' })
  }
})

// ─────────────────────────────────────────────
// BILLING — ÉCHÉANCES DE FIN DE MOIS (factures de renouvellement)
// ─────────────────────────────────────────────

// Liste des utilisateurs dont le plan se termine le mois courant + statut d'envoi
router.get('/billing/month-end-invoices', async (_req, res) => {
  try {
    const renewals = await findMonthEndRenewals()
    res.json({
      success: true,
      autoEnabled: process.env.AUTO_RENEWAL_INVOICES !== 'false',
      data: renewals.map(r => ({
        ...r,
        // Montant affichable (centimes EUR → euros)
        displayAmount: r.currency === 'EUR' && Number(r.price) > 200 ? Number(r.price) / 100 : Number(r.price),
      })),
    })
  } catch (err) {
    console.error('[admin/billing/month-end-invoices]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// Envoi manuel (ou renvoi) de la facture de renouvellement d'un utilisateur
router.post('/billing/month-end-invoices/send', async (req: any, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: 'userId requis' })
    const renewals = await findMonthEndRenewals()
    const renewal = renewals.find(r => r.userId === userId)
    if (!renewal) return res.status(404).json({ success: false, error: 'Aucune échéance ce mois-ci pour cet utilisateur' })

    const result = await sendRenewalInvoice(renewal, { auto: false, force: true })
    const emailConfigured = !!process.env.RESEND_API_KEY
    res.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      emailSent: emailConfigured,
      message: emailConfigured
        ? `Facture ${result.invoiceNumber} envoyée à ${renewal.email} (PDF en pièce jointe).`
        : `RESEND_API_KEY non configurée : envoi journalisé mais l'email n'a pas pu partir.`,
    })
  } catch (err) {
    console.error('[admin/billing/month-end-invoices/send]', err)
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi' })
  }
})

router.post('/billing/send-invoice', async (req: any, res) => {
  try {
    const { userId, paymentId, upgradeRequestId } = req.body
    if (!userId) return res.status(400).json({ success: false, error: 'userId requis' })

    const data = await loadInvoiceData(userId, { paymentId, upgradeRequestId })
    if (!data) return res.status(404).json({ success: false, error: 'Paiement introuvable ou non validé' })

    // Facture PDF en pièce jointe de l'email
    const pdf = await buildInvoicePdf(data.invoice)
    await sendInvoiceEmail(data.user.email, data.user.first_name, {
      invoiceNumber: data.invoice.invoiceNumber,
      planId: data.invoice.planId,
      amount: data.invoice.amount,
      currency: data.invoice.currency,
      paymentDate: data.payment.payment_date,
      paymentMethod: data.invoice.paymentMethod || undefined,
      monthsPaid: data.invoice.monthsPaid || undefined,
    }, { filename: `${data.invoice.invoiceNumber}.pdf`, content: pdf })

    const emailSent = !!process.env.RESEND_API_KEY
    res.json({
      success: true,
      emailSent,
      message: emailSent
        ? `Facture ${data.invoice.invoiceNumber} envoyée à ${data.user.email} (PDF en pièce jointe).`
        : 'RESEND_API_KEY non configurée : l\'email n\'a pas pu partir.',
    })
  } catch (err) {
    console.error('[admin/billing/send-invoice]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Relances de paiement par email (individuelle ou groupée).
 * body: { userIds: string[] } — envoie un vrai email Resend + notification in-app.
 */
router.post('/billing/send-reminders', async (req: any, res) => {
  try {
    const { userIds } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds[] requis' })
    }
    if (userIds.length > 100) {
      return res.status(400).json({ success: false, error: 'Maximum 100 relances à la fois' })
    }

    let sent = 0
    const errors: string[] = []
    for (const uid of userIds) {
      try {
        const target = await queryOne<any>(`
          SELECT u.email, p.first_name AS "firstName", p.plan_id AS "planId",
                 COALESCE(pl.price, 0)::numeric AS price, COALESCE(pl.currency, 'EUR') AS currency,
                 s.current_period_end AS "dueDate",
                 GREATEST(0, EXTRACT(DAY FROM NOW() - s.current_period_end))::int AS "daysOverdue"
          FROM public.users u
          JOIN public.profiles p ON p.id = u.id
          LEFT JOIN public.plans pl ON pl.id = p.plan_id
          LEFT JOIN public.subscriptions s ON s.user_id = u.id AND s.status = 'active'
          WHERE u.id = $1
        `, [uid])
        if (!target) { errors.push(uid); continue }

        // Prix en centimes → devise entière pour l'affichage
        const amount = target.price > 200 ? Math.round(target.price) / 100 : Number(target.price)

        await sendPaymentReminderEmail(target.email, target.firstName, {
          planId: target.planId || 'starter',
          amount,
          currency: target.currency,
          dueDate: target.dueDate,
          daysOverdue: target.daysOverdue,
        })

        // Notification in-app (best-effort)
        await query(`
          INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
          VALUES ($1, 'email', 'Rappel de paiement — Bouba''ia', $2, $3)
        `, [
          uid,
          `Votre abonnement Bouba'ia nécessite un règlement. Rendez-vous sur la page Renouvellement pour payer via Wave, ou contactez le support si vous avez déjà réglé.`,
          req.user?.id || null,
        ]).catch(() => {})

        sent++
      } catch (err) {
        console.warn('[admin/send-reminders]', uid, err)
        errors.push(uid)
      }
    }

    const emailConfigured = !!process.env.RESEND_API_KEY
    res.json({
      success: true,
      sent,
      failed: errors.length,
      emailSent: emailConfigured,
      message: emailConfigured
        ? `${sent} relance(s) envoyée(s) par email${errors.length ? `, ${errors.length} échec(s)` : ''}.`
        : `RESEND_API_KEY non configurée : ${sent} notification(s) in-app créée(s), aucun email parti.`,
    })
  } catch (err) {
    console.error('[admin/billing/send-reminders]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.get('/billing/failed-payments', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        pay.id,
        pay.user_id AS "userId",
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

router.get('/billing/upcoming-payments', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        u.id,
        u.email,
        p.first_name        AS "firstName",
        p.last_name         AS "lastName",
        p.plan_id           AS plan,
        p.subscription_status AS status,
        COALESCE(pl.price, 0)::numeric AS amount,
        pl.currency,
        s.current_period_end AS "nextPayment",
        CASE
          WHEN s.current_period_end < NOW()                        THEN 'overdue'
          WHEN s.current_period_end < NOW() + INTERVAL '5 days'   THEN 'critical'
          WHEN s.current_period_end < NOW() + INTERVAL '10 days'  THEN 'warning'
          ELSE 'upcoming'
        END AS urgency
      FROM public.users u
      JOIN public.profiles p ON p.id = u.id
      JOIN public.subscriptions s ON s.user_id = u.id AND s.status = 'active'
      JOIN public.plans pl ON pl.id = p.plan_id
      WHERE pl.price > 0
        AND s.current_period_end < NOW() + INTERVAL '30 days'
      ORDER BY s.current_period_end ASC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[admin/billing/upcoming-payments]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.post('/users/:id/toggle-status', async (req: any, res) => {
  try {
    const { id } = req.params
    const current = await queryOne<{ subscription_status: string }>(
      'SELECT subscription_status FROM public.profiles WHERE id = $1', [id]
    )
    if (!current) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })

    const newStatus = current.subscription_status === 'active' ? 'suspended' : 'active'
    await query(
      'UPDATE public.profiles SET subscription_status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    )

    if (newStatus === 'suspended') {
      const targetUser = await queryOne<{ email: string; name: string }>(`
        SELECT u.email, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS name
        FROM public.users u JOIN public.profiles p ON p.id = u.id WHERE u.id = $1
      `, [id])
      if (targetUser) {
        await query(`
          INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
          VALUES ($1, 'app', 'Compte suspendu', 'Votre compte Bouba a été suspendu. Contactez le support pour régulariser.', $2)
        `, [id, req.user?.id || null])
      }
    }

    res.json({ success: true, newStatus })
  } catch (err) {
    console.error('[admin/users/:id/toggle-status]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

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
        ur.months_paid,
        ur.next_payment_date,
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

// Télécharger la preuve de paiement uploadée avec une demande d'upgrade
router.get('/billing/upgrade-proof/:id', async (req, res) => {
  try {
    const row = await queryOne<{ proof: any }>(
      `SELECT proof FROM public.upgrade_requests WHERE id = $1`, [req.params.id]
    )
    const proof = row?.proof
    if (!proof?.data) return res.status(404).json({ success: false, error: 'Aucune preuve pour cette demande' })
    res.setHeader('Content-Type', proof.mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${(proof.name || 'preuve').replace(/"/g, '')}"`)
    res.send(Buffer.from(proof.data, 'base64'))
  } catch (err) {
    console.error('[admin/billing/upgrade-proof]', err)
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

    // Si approbation → mettre à jour le profil + subscription
    if (action === 'approve') {
      await query(`
        UPDATE public.profiles
        SET plan_id             = $1,
            subscription_status = 'active',
            updated_at          = NOW()
        WHERE id = $2
      `, [existing.to_plan, existing.user_id])

      // Calculer la fin de période selon le nombre de mois payés
      const monthsPaid = existing.months_paid || 1
      const periodEnd = existing.next_payment_date
        ? new Date(existing.next_payment_date)
        : new Date(new Date().setMonth(new Date().getMonth() + monthsPaid))

      await query(`
        INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_method)
        VALUES ($1, $2, 'active', NOW(), $3, $4)
        ON CONFLICT (user_id) DO UPDATE
          SET plan_id              = EXCLUDED.plan_id,
              status               = 'active',
              current_period_start = NOW(),
              current_period_end   = EXCLUDED.current_period_end,
              payment_method       = EXCLUDED.payment_method,
              updated_at           = NOW()
      `, [existing.user_id, existing.to_plan, periodEnd.toISOString(), existing.payment_method || 'wave'])
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

/** Quotas restants / utilisés de chaque utilisateur. */
router.get('/monitoring/quotas', async (_req, res) => {
  try {
    const rows = await query<any>(`
      SELECT
        u.id, u.email,
        p.first_name AS "firstName",
        p.last_name  AS "lastName",
        p.plan_id    AS plan,
        p.messages_used  AS used,
        p.messages_limit AS "limit",
        p.quota_reset_at AS "quotaResetAt",
        COALESCE((
          SELECT COUNT(*) FROM public.messages m
          WHERE m.user_id = u.id AND m.role = 'user' AND m.created_at >= CURRENT_DATE
        ), 0)::int AS "usedToday"
      FROM public.users u
      JOIN public.profiles p ON p.id = u.id
      ORDER BY
        CASE WHEN p.messages_limit > 0 THEN p.messages_used::float / p.messages_limit ELSE 0 END DESC
    `)
    res.json({
      success: true,
      data: rows.map((r: any) => {
        const limit = r.limit === null ? null : Number(r.limit)
        const used = Number(r.used || 0)
        const unlimited = limit === -1
        return {
          ...r,
          used,
          limit,
          unlimited,
          remaining: unlimited || limit === null ? null : Math.max(0, limit - used),
          pct: unlimited || !limit || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100)),
        }
      }),
    })
  } catch (err) {
    console.error('[admin/monitoring/quotas]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/** Performances IA : temps de réponse n8n, taux d'erreur, dernières erreurs. */
router.get('/monitoring/performance', async (_req, res) => {
  try {
    const overall = await queryOne<any>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last24h,
        COUNT(*) FILTER (WHERE success = false)::int AS errors,
        ROUND(AVG(duration_ms))::int AS avg_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms,
        MAX(duration_ms)::int AS max_ms
      FROM public.ai_request_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `).catch(() => null)

    const byAgent = await query<any>(`
      SELECT COALESCE(agent, 'general') AS agent,
        COUNT(*)::int AS requests,
        ROUND(AVG(duration_ms))::int AS avg_ms,
        COUNT(*) FILTER (WHERE success = false)::int AS errors
      FROM public.ai_request_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1 ORDER BY requests DESC
    `).catch(() => [])

    const recentErrors = await query<any>(`
      SELECT l.id, l.agent, l.source, l.duration_ms AS "durationMs",
             l.error_excerpt AS error, l.created_at AS "createdAt",
             u.email
      FROM public.ai_request_logs l
      LEFT JOIN public.users u ON u.id = l.user_id
      WHERE l.success = false
      ORDER BY l.created_at DESC
      LIMIT 15
    `).catch(() => [])

    const total = overall?.total || 0
    res.json({
      success: true,
      data: {
        total7d: total,
        last24h: overall?.last24h || 0,
        errors7d: overall?.errors || 0,
        errorRate: total ? Math.round(((overall?.errors || 0) / total) * 100) : 0,
        avgMs: overall?.avg_ms || 0,
        p95Ms: overall?.p95_ms || 0,
        maxMs: overall?.max_ms || 0,
        byAgent: byAgent.map((a: any) => ({
          agent: a.agent,
          requests: a.requests,
          avgMs: a.avg_ms || 0,
          errors: a.errors,
          errorRate: a.requests ? Math.round((a.errors / a.requests) * 100) : 0,
        })),
        recentErrors,
      },
    })
  } catch (err) {
    console.error('[admin/monitoring/performance]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/** Logs n8n : chaque requête vers le moteur IA (durée, statut, erreur). */
router.get('/monitoring/n8n-logs', async (req, res) => {
  try {
    const { agent, status } = req.query as { agent?: string; status?: string }
    const params: any[] = []
    const where: string[] = []
    if (agent && agent !== 'all') { params.push(agent); where.push(`l.agent = $${params.length}`) }
    if (status === 'error') where.push('l.success = false')
    if (status === 'success') where.push('l.success = true')

    const logs = await query<any>(`
      SELECT l.id, l.agent, l.source, l.duration_ms AS "durationMs",
             l.success, l.error_excerpt AS error, l.created_at AS "createdAt",
             u.email
      FROM public.ai_request_logs l
      LEFT JOIN public.users u ON u.id = l.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY l.created_at DESC
      LIMIT 150
    `, params).catch(() => [])

    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('[admin/monitoring/n8n-logs]', err)
    res.json({ success: true, data: [] })
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

router.put('/support/tickets/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { status, note } = req.body
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' })
    }
    const ticket = await queryOne<any>(`
      SELECT st.user_id, st.subject, u.email, p.first_name AS "firstName"
      FROM public.support_tickets st
      LEFT JOIN public.users u    ON u.id = st.user_id
      LEFT JOIN public.profiles p ON p.id = st.user_id
      WHERE st.id = $1
    `, [id])
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket introuvable' })

    await query(`
      UPDATE public.support_tickets
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, id])

    // Notifier l'utilisateur du sort de sa demande : réglée ou non (mission support)
    let notified = false
    if (status === 'resolved' || status === 'closed') {
      const resolved = status === 'resolved'
      const subject = resolved
        ? `✓ Votre demande « ${ticket.subject} » est résolue`
        : `Votre demande « ${ticket.subject} » a été clôturée`
      const body = resolved
        ? `Bonne nouvelle : votre problème « ${ticket.subject} » est réglé.${note ? `\n\nNote de l'équipe : ${note}` : ''}\n\nSi le souci persiste, répondez-nous depuis la page Support.`
        : `Votre demande « ${ticket.subject} » a été clôturée sans résolution.${note ? `\n\nMotif : ${note}` : ''}\n\nSi vous souhaitez rouvrir le sujet, recontactez-nous depuis la page Support.`

      await query(`
        INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
        VALUES ($1, 'app', $2, $3, $4)
      `, [ticket.user_id, subject, body, req.user?.id || null]).catch(() => {})
      if (ticket.email) {
        sendAdminMessageEmail(ticket.email, ticket.firstName, subject, body)
          .catch(err => console.warn('[admin/support ticket status email]', err))
      }
      notified = true
    }

    res.json({ success: true, notified })
  } catch (err) {
    console.error('[admin/support/tickets PUT]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// Réponse de l'admin à un ticket : enregistrée + envoyée à l'utilisateur
// (email + notification in-app). Cette route manquait — l'envoi échouait en 404.
router.post('/support/tickets/:id/reply', async (req: any, res) => {
  try {
    const { id } = req.params
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message requis' })

    const ticket = await queryOne<any>(`
      SELECT st.user_id, st.subject, u.email, p.first_name AS "firstName"
      FROM public.support_tickets st
      LEFT JOIN public.users u    ON u.id = st.user_id
      LEFT JOIN public.profiles p ON p.id = st.user_id
      WHERE st.id = $1
    `, [id])
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket introuvable' })

    await query(`
      UPDATE public.support_tickets
      SET admin_reply = $1, status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END, updated_at = NOW()
      WHERE id = $2
    `, [message.trim(), id])

    await query(`
      INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
      VALUES ($1, 'app', $2, $3, $4)
    `, [ticket.user_id, `Réponse du support — ${ticket.subject}`, message.trim(), req.user?.id || null]).catch(() => {})

    if (ticket.email) {
      await sendAdminMessageEmail(ticket.email, ticket.firstName, `Re: ${ticket.subject} — Support Bouba'ia`, message.trim())
        .catch(err => console.warn('[admin/support reply email]', err))
    }

    const emailSent = !!process.env.RESEND_API_KEY
    res.json({
      success: true,
      emailSent,
      message: emailSent
        ? `Réponse envoyée à ${ticket.email} (email + notification).`
        : 'Réponse enregistrée et notification créée — RESEND_API_KEY manquante, email non parti.',
    })
  } catch (err) {
    console.error('[admin/support/tickets reply]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Retours & satisfaction : agrégation des 👍/👎 laissés sur les réponses de
 * Bouba (table user_feedback) — vision « les clients aiment ou pas ».
 */
router.get('/support/satisfaction', async (_req, res) => {
  try {
    const totals = await queryOne<any>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE rating = 'up')::int   AS ups,
        COUNT(*) FILTER (WHERE rating = 'down')::int AS downs,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last30
      FROM public.user_feedback
    `).catch(() => null)

    const byAgent = await query<any>(`
      SELECT COALESCE(agent, 'general') AS agent,
             COUNT(*) FILTER (WHERE rating = 'up')::int   AS ups,
             COUNT(*) FILTER (WHERE rating = 'down')::int AS downs
      FROM public.user_feedback
      GROUP BY 1 ORDER BY (COUNT(*)) DESC
    `).catch(() => [])

    const recent = await query<any>(`
      SELECT uf.id, uf.rating, uf.agent, uf.message_excerpt AS excerpt, uf.created_at AS "createdAt",
             u.email, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS "userName"
      FROM public.user_feedback uf
      LEFT JOIN public.users u    ON u.id = uf.user_id
      LEFT JOIN public.profiles p ON p.id = uf.user_id
      ORDER BY uf.created_at DESC
      LIMIT 30
    `).catch(() => [])

    const total = totals?.total || 0
    const ups = totals?.ups || 0
    res.json({
      success: true,
      data: {
        total,
        ups,
        downs: totals?.downs || 0,
        last30: totals?.last30 || 0,
        satisfactionRate: total ? Math.round((ups / total) * 100) : null,
        byAgent: byAgent.map((a: any) => ({
          agent: a.agent,
          ups: a.ups,
          downs: a.downs,
          rate: (a.ups + a.downs) ? Math.round((a.ups / (a.ups + a.downs)) * 100) : null,
        })),
        recent,
      },
    })
  } catch (err) {
    console.error('[admin/support/satisfaction]', err)
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

router.get('/support/nps', async (_req, res) => {
  try {
    const data = await queryOne(`
      SELECT
        COUNT(*)::int                                       AS total,
        COUNT(*) FILTER (WHERE rating = 5)::int            AS promoteurs_count,
        COUNT(*) FILTER (WHERE rating = 4)::int            AS passifs_count,
        COUNT(*) FILTER (WHERE rating <= 3)::int           AS detracteurs_count
      FROM public.notification_feedback
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)

    const total = data?.total || 0
    const promoteurs  = total > 0 ? Math.round((data!.promoteurs_count  / total) * 100) : 0
    const passifs     = total > 0 ? Math.round((data!.passifs_count     / total) * 100) : 0
    const detracteurs = total > 0 ? Math.round((data!.detracteurs_count / total) * 100) : 0
    const score = promoteurs - detracteurs

    res.json({ success: true, data: { score, promoteurs, passifs, detracteurs, total } })
  } catch (err) {
    console.error('[admin/support/nps]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
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

router.get('/settings/quotas', async (_req, res) => {
  try {
    const plans = await query(`
      SELECT id, messages_limit FROM public.plans
      WHERE id IN ('free', 'starter', 'pro', 'business', 'enterprise')
    `)

    const sysRow = await queryOne(`
      SELECT value FROM public.app_settings WHERE key = 'system_quotas'
    `).catch(() => null)

    const sys = (sysRow?.value as any) || {}
    const quotas: Record<string, number> = {
      n8n_timeout_s: sys.n8n_timeout_s ?? 30,
      rag_max_mb:    sys.rag_max_mb    ?? 10,
    }
    for (const p of plans as any[]) {
      quotas[`${p.id}_messages`] = p.messages_limit
    }

    res.json({ success: true, data: quotas })
  } catch (err) {
    console.error('[admin/settings/quotas GET]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/settings/quotas', async (req: any, res) => {
  try {
    const { n8n_timeout_s, rag_max_mb } = req.body

    // Quotas par plan : clés `<planId>_messages` (free/starter/pro/business/enterprise)
    const PLAN_IDS = ['free', 'starter', 'pro', 'business', 'enterprise']
    const updates: Array<{ planId: string; limit: number }> = []
    for (const planId of PLAN_IDS) {
      const v = req.body[`${planId}_messages`]
      if (v != null && Number.isFinite(Number(v))) updates.push({ planId, limit: Number(v) })
    }

    let notified = 0
    const changedPlans: string[] = []
    for (const { planId, limit } of updates) {
      const current = await queryOne<{ messages_limit: number; name: string }>(
        `SELECT messages_limit, name FROM public.plans WHERE id = $1`, [planId]
      )
      if (!current || Number(current.messages_limit) === limit) continue

      await query(`UPDATE public.plans SET messages_limit = $1 WHERE id = $2`, [limit, planId])
      // Application AUTOMATIQUE à tous les utilisateurs du plan
      await query(`UPDATE public.profiles SET messages_limit = $1, updated_at = NOW() WHERE plan_id = $2`, [limit, planId])
      changedPlans.push(planId)

      // Notifier chaque utilisateur concerné (email + in-app)
      const affected = await query<{ id: string; email: string; first_name: string }>(`
        SELECT u.id, u.email, p.first_name
        FROM public.users u JOIN public.profiles p ON p.id = u.id
        WHERE p.plan_id = $1
      `, [planId]).catch(() => [])

      const limitLabel = limit === -1 ? 'illimité' : `${limit.toLocaleString('fr-FR')} messages / mois`
      const subject = `Mise à jour de votre quota — plan ${current.name || planId}`
      const body = `Le quota de messages de votre plan ${current.name || planId} évolue : il passe à ${limitLabel}. Ce changement est appliqué immédiatement à votre compte.`

      for (const u of affected) {
        query(`INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
               VALUES ($1, 'email', $2, $3, $4)`,
          [u.id, subject, body, req.user?.id || null]).catch(() => {})
        sendAdminMessageEmail(u.email, u.first_name, subject, body)
          .catch(err => console.warn('[admin/quotas email]', u.email, err))
        notified++
      }
    }

    await query(`
      INSERT INTO public.app_settings (key, value, updated_at)
      VALUES ('system_quotas', $1::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [JSON.stringify({ n8n_timeout_s: n8n_timeout_s ?? 30, rag_max_mb: rag_max_mb ?? 10 })])

    const emailConfigured = !!process.env.RESEND_API_KEY
    res.json({
      success: true,
      changedPlans,
      notified,
      message: changedPlans.length === 0
        ? 'Aucun quota modifié.'
        : `Quotas ${changedPlans.join(', ')} appliqués à tous les utilisateurs — ${notified} client(s) notifié(s)${emailConfigured ? ' par email' : ' (in-app uniquement, RESEND_API_KEY manquante)'}.`,
    })
  } catch (err) {
    console.error('[admin/settings/quotas PUT]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// SETTINGS — GESTION DES PLANS
// ─────────────────────────────────────────────

router.get('/settings/plans', async (_req, res) => {
  try {
    const plans = await query<any>(`
      SELECT pl.*,
        (SELECT COUNT(*) FROM public.profiles p WHERE p.plan_id = pl.id)::int AS subscribers
      FROM public.plans pl
      ORDER BY pl.price ASC
    `)
    res.json({ success: true, data: plans })
  } catch (err) {
    console.error('[admin/settings/plans GET]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/settings/plans/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { name, description, price, features, messages_limit, popular, active } = req.body
    const existing = await queryOne<any>(`SELECT * FROM public.plans WHERE id = $1`, [id])
    if (!existing) return res.status(404).json({ success: false, error: 'Plan introuvable' })

    const cleanFeatures = Array.isArray(features)
      ? features.filter((f: unknown) => typeof f === 'string' && (f as string).trim()).map((f: string) => f.trim())
      : null

    await query(`
      UPDATE public.plans SET
        name           = COALESCE($1, name),
        description    = COALESCE($2, description),
        price          = COALESCE($3, price),
        features       = COALESCE($4::jsonb, features),
        messages_limit = COALESCE($5, messages_limit),
        popular        = COALESCE($6, popular),
        active         = COALESCE($7, active)
      WHERE id = $8
    `, [
      name ?? null, description ?? null,
      price != null ? Math.round(Number(price)) : null,
      cleanFeatures ? JSON.stringify(cleanFeatures) : null,
      messages_limit != null ? Number(messages_limit) : null,
      typeof popular === 'boolean' ? popular : null,
      typeof active === 'boolean' ? active : null,
      id,
    ])

    // Un seul plan « populaire » à la fois
    if (popular === true) {
      await query(`UPDATE public.plans SET popular = false WHERE id <> $1`, [id])
    }
    // Nouvelle limite → appliquée aux abonnés du plan
    if (messages_limit != null && Number(messages_limit) !== Number(existing.messages_limit)) {
      await query(`UPDATE public.profiles SET messages_limit = $1, updated_at = NOW() WHERE plan_id = $2`,
        [Number(messages_limit), id])
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[admin/settings/plans PUT]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Suppression d'un plan. Refusée si des utilisateurs y sont abonnés,
 * sauf migration forcée : body { migrateTo } → les abonnés basculent vers le
 * plan choisi par l'admin (profil + abonnement + limite) et sont notifiés.
 */
router.delete('/settings/plans/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { migrateTo } = req.body || {}
    const plan = await queryOne<any>(`SELECT id, name FROM public.plans WHERE id = $1`, [id])
    if (!plan) return res.status(404).json({ success: false, error: 'Plan introuvable' })

    const subscribers = await query<{ id: string; email: string; first_name: string }>(`
      SELECT u.id, u.email, p.first_name
      FROM public.profiles p JOIN public.users u ON u.id = p.id
      WHERE p.plan_id = $1
    `, [id])

    if (subscribers.length > 0) {
      if (!migrateTo) {
        return res.status(409).json({
          success: false,
          code: 'HAS_SUBSCRIBERS',
          subscribers: subscribers.length,
          error: `${subscribers.length} utilisateur(s) sont abonnés à ce plan. Choisissez un plan de migration pour forcer la suppression.`,
        })
      }
      const target = await queryOne<any>(
        `SELECT id, name, messages_limit FROM public.plans WHERE id = $1 AND active = true AND id <> $2`,
        [migrateTo, id]
      )
      if (!target) {
        return res.status(400).json({ success: false, error: 'Plan de migration invalide (doit être actif et différent)' })
      }

      // Basculer les abonnés vers le plan cible
      await query(`UPDATE public.profiles SET plan_id = $1, messages_limit = $2, updated_at = NOW() WHERE plan_id = $3`,
        [target.id, target.messages_limit, id])
      await query(`UPDATE public.subscriptions SET plan_id = $1, updated_at = NOW() WHERE plan_id = $2`,
        [target.id, id]).catch(() => {})

      // Notifier chaque utilisateur migré
      const subject = `Votre plan évolue : ${plan.name || id} → ${target.name || target.id}`
      const body = `Le plan ${plan.name || id} n'est plus proposé. Votre compte a été basculé automatiquement vers le plan ${target.name || target.id}, sans interruption de service. Contactez le support pour toute question.`
      for (const u of subscribers) {
        query(`INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
               VALUES ($1, 'email', $2, $3, $4)`,
          [u.id, subject, body, req.user?.id || null]).catch(() => {})
        sendAdminMessageEmail(u.email, u.first_name, subject, body)
          .catch(err => console.warn('[admin/plans delete email]', u.email, err))
      }
    }

    await query(`DELETE FROM public.plans WHERE id = $1`, [id])
    res.json({
      success: true,
      migrated: subscribers.length,
      message: subscribers.length > 0
        ? `Plan supprimé — ${subscribers.length} abonné(s) migré(s) vers ${migrateTo} et notifié(s).`
        : 'Plan supprimé.',
    })
  } catch (err) {
    console.error('[admin/settings/plans DELETE]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// SETTINGS — APPLICATIONS (intégrations agents)
// ─────────────────────────────────────────────

router.get('/settings/apps', async (_req, res) => {
  try {
    const totalUsersRow = await queryOne<{ cnt: string }>(`SELECT COUNT(*) AS cnt FROM public.users`)
    const totalUsers = parseInt(totalUsersRow?.cnt || '0')
    const apps = await query<any>(`
      SELECT a.*,
        (SELECT COUNT(DISTINCT uc.user_id) FROM public.user_connections uc
          WHERE uc.connection_id = a.id)::int AS "connectedUsers"
      FROM public.app_integrations a
      ORDER BY "connectedUsers" DESC, a.name ASC
    `)
    res.json({
      success: true,
      data: apps.map((a: any) => ({
        ...a,
        totalUsers,
        connectionRate: totalUsers ? Math.round((a.connectedUsers / totalUsers) * 100) : 0,
      })),
    })
  } catch (err) {
    console.error('[admin/settings/apps GET]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.put('/settings/apps/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { active, name, description, category } = req.body
    const app = await queryOne<any>(`SELECT id FROM public.app_integrations WHERE id = $1`, [id])
    if (!app) return res.status(404).json({ success: false, error: 'Application introuvable' })
    await query(`
      UPDATE public.app_integrations SET
        active      = COALESCE($1, active),
        name        = COALESCE($2, name),
        description = COALESCE($3, description),
        category    = COALESCE($4, category),
        updated_at  = NOW()
      WHERE id = $5
    `, [typeof active === 'boolean' ? active : null, name ?? null, description ?? null, category ?? null, id])
    res.json({ success: true })
  } catch (err) {
    console.error('[admin/settings/apps PUT]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Suppression d'une application. Si des utilisateurs y sont connectés :
 * refusée sauf force=true → leurs connexions sont supprimées et chacun
 * reçoit un email informatif.
 */
router.delete('/settings/apps/:id', async (req: any, res) => {
  try {
    const { id } = req.params
    const { force } = req.body || {}
    const app = await queryOne<any>(`SELECT id, name FROM public.app_integrations WHERE id = $1`, [id])
    if (!app) return res.status(404).json({ success: false, error: 'Application introuvable' })

    const connected = await query<{ id: string; email: string; first_name: string }>(`
      SELECT DISTINCT u.id, u.email, p.first_name
      FROM public.user_connections uc
      JOIN public.users u    ON u.id = uc.user_id
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE uc.connection_id = $1
    `, [id])

    if (connected.length > 0 && !force) {
      return res.status(409).json({
        success: false,
        code: 'HAS_CONNECTIONS',
        connected: connected.length,
        error: `${connected.length} utilisateur(s) sont connectés à ${app.name}. Forcez la suppression pour retirer leurs connexions (ils seront prévenus par email).`,
      })
    }

    if (connected.length > 0) {
      await query(`DELETE FROM public.user_connections WHERE connection_id = $1`, [id])
      const subject = `L'intégration ${app.name} n'est plus disponible`
      const body = `L'application ${app.name} a été retirée de Bouba'ia. Votre connexion a été déconnectée et vos données d'accès supprimées de nos serveurs. Les autres intégrations restent disponibles depuis Paramètres → Connexions.`
      for (const u of connected) {
        query(`INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
               VALUES ($1, 'email', $2, $3, $4)`,
          [u.id, subject, body, req.user?.id || null]).catch(() => {})
        sendAdminMessageEmail(u.email, u.first_name, subject, body)
          .catch(err => console.warn('[admin/apps delete email]', u.email, err))
      }
    }

    await query(`DELETE FROM public.app_integrations WHERE id = $1`, [id])
    res.json({
      success: true,
      disconnected: connected.length,
      message: connected.length > 0
        ? `Application supprimée — ${connected.length} utilisateur(s) déconnecté(s) et informé(s) par email.`
        : 'Application supprimée.',
    })
  } catch (err) {
    console.error('[admin/settings/apps DELETE]', err)
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

/**
 * Les différents funnels du SaaS (temps réel) :
 * - conversion : inscription → onboarding → 1er message → abonné actif → plan payant
 * - upgrade    : actifs → demandes d'upgrade → approuvées
 * - paiements  : initiés → validés (Wave + Stripe)
 */
router.get('/analytics/funnels', async (_req, res) => {
  try {
    const base = await queryOne<any>(`
      SELECT
        (SELECT COUNT(*) FROM public.users) AS total,
        COUNT(*) FILTER (WHERE onboarding_complete = true) AS onboarded,
        COUNT(*) FILTER (WHERE subscription_status = 'active') AS active,
        COUNT(*) FILTER (WHERE subscription_status = 'active' AND plan_id NOT IN ('free')) AS paid
      FROM public.profiles
    `)
    const firstMsg = await queryOne<any>(`
      SELECT COUNT(DISTINCT user_id) AS cnt FROM public.messages WHERE role = 'user'
    `).catch(() => ({ cnt: 0 }))
    const upgrades = await queryOne<any>(`
      SELECT COUNT(DISTINCT user_id) AS requested,
             COUNT(DISTINCT user_id) FILTER (WHERE status = 'approved') AS approved
      FROM public.upgrade_requests
    `).catch(() => ({ requested: 0, approved: 0 }))
    const pays = await queryOne<any>(`
      SELECT COUNT(*) AS initiated,
             COUNT(*) FILTER (WHERE status IN ('succeeded','completed','paid')) AS validated
      FROM public.payments
    `).catch(() => ({ initiated: 0, validated: 0 }))

    const n = (v: any) => parseInt(v || '0')
    const total = n(base?.total)
    const pct = (v: number, of: number) => (of ? Math.round((v / of) * 100) : 0)

    const mk = (steps: Array<[string, number, number]>) =>
      steps.map(([step, value, of]) => ({ step, value, pct: pct(value, of) }))

    res.json({
      success: true,
      data: {
        conversion: mk([
          ['Inscriptions', total, total],
          ['Onboarding complété', n(base?.onboarded), total],
          ['1er message envoyé', n(firstMsg?.cnt), total],
          ['Abonné actif', n(base?.active), total],
          ['Plan payant', n(base?.paid), total],
        ]),
        upgrade: mk([
          ['Abonnés actifs', n(base?.active), n(base?.active)],
          ["Demande d'upgrade", n(upgrades?.requested), n(base?.active)],
          ['Upgrade approuvé', n(upgrades?.approved), n(base?.active)],
        ]),
        paiement: mk([
          ['Paiements initiés', n(pays?.initiated), n(pays?.initiated)],
          ['Paiements validés', n(pays?.validated), n(pays?.initiated)],
        ]),
      },
    })
  } catch (err) {
    console.error('[admin/analytics/funnels]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Rétention réelle (temps réel) :
 * - taux globaux : abonnés actifs, actifs 7 j / 30 j (≥ 1 message utilisateur)
 * - cohortes hebdomadaires (10 semaines) : % de la cohorte encore active
 *   à J+7 / J+30 / J+90 (au moins un message après ce délai)
 */
router.get('/analytics/retention', async (_req, res) => {
  try {
    const globalRates = await queryOne<any>(`
      SELECT
        (SELECT COUNT(*) FROM public.users) AS total,
        (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'active') AS active,
        (SELECT COUNT(DISTINCT user_id) FROM public.messages
          WHERE role = 'user' AND created_at >= NOW() - INTERVAL '7 days') AS active7d,
        (SELECT COUNT(DISTINCT user_id) FROM public.messages
          WHERE role = 'user' AND created_at >= NOW() - INTERVAL '30 days') AS active30d
    `)

    // Cohortes mensuelles (6 derniers mois) — adaptées au volume actuel
    const cohorts = await query<any>(`
      SELECT
        DATE_TRUNC('month', u.created_at) AS week,
        COUNT(DISTINCT u.id) AS size,
        COUNT(DISTINCT u.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM public.messages m WHERE m.user_id = u.id AND m.role = 'user'
            AND m.created_at >= u.created_at + INTERVAL '7 days')) AS j7,
        COUNT(DISTINCT u.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM public.messages m WHERE m.user_id = u.id AND m.role = 'user'
            AND m.created_at >= u.created_at + INTERVAL '30 days')) AS j30,
        COUNT(DISTINCT u.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM public.messages m WHERE m.user_id = u.id AND m.role = 'user'
            AND m.created_at >= u.created_at + INTERVAL '90 days')) AS j90
      FROM public.users u
      WHERE u.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1
    `).catch(() => [])

    const n = (v: any) => parseInt(v || '0')
    const total = n(globalRates?.total)
    const now = Date.now()
    res.json({
      success: true,
      data: {
        total,
        activeSubscribers: n(globalRates?.active),
        retentionRate: total ? Math.round((n(globalRates?.active) / total) * 100) : 0,
        active7d: n(globalRates?.active7d),
        active30d: n(globalRates?.active30d),
        cohorts: cohorts.map((c: any) => {
          const weekStart = new Date(c.week).getTime()
          const ageDays = (now - weekStart) / 86400000
          const size = n(c.size)
          const rate = (v: any, minAge: number) =>
            ageDays >= minAge && size > 0 ? Math.round((n(v) / size) * 100) : null
          return {
            week: c.week,
            size,
            j7: rate(c.j7, 7),
            j30: rate(c.j30, 30),
            j90: rate(c.j90, 90),
          }
        }),
      },
    })
  } catch (err) {
    console.error('[admin/analytics/retention]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * Usage et état des agents IA (temps réel) :
 * appels aujourd'hui / 7 j / 30 j, tendance vs 30 j précédents, dernière
 * activité, état (opérationnel si activité < 48 h), santé de l'instance n8n.
 */
router.get('/analytics/agents', async (_req, res) => {
  try {
    const rows = await query<any>(`
      SELECT
        COALESCE(agent_used, 'general') AS agent,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS calls30,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS calls7,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)               AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days'
                           AND created_at <  NOW() - INTERVAL '30 days') AS prev30,
        MAX(created_at) AS "lastUsed"
      FROM public.messages
      WHERE role = 'assistant'
      GROUP BY 1
      ORDER BY calls30 DESC
    `).catch(() => [])

    // Santé de l'instance n8n : joignable = up (même un 404 prouve que
    // l'instance répond), erreur réseau/timeout = down
    let n8nStatus: 'up' | 'down' = 'down'
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 3000)
      const url = process.env.N8N_WEBHOOK_URL || 'https://n8n.realtechprint.com/webhook/7f338448-11b5-458c-ada3-f009feccc184'
      await fetch(new URL(url).origin, { method: 'GET', signal: controller.signal })
      clearTimeout(t)
      n8nStatus = 'up'
    } catch { /* down */ }

    const n = (v: any) => parseInt(v || '0')
    const total30 = rows.reduce((s: number, r: any) => s + n(r.calls30), 0)
    res.json({
      success: true,
      data: {
        n8nStatus,
        totalCalls30d: total30,
        agents: rows.map((r: any) => {
          const calls30 = n(r.calls30)
          const prev30 = n(r.prev30)
          const lastUsed = r.lastUsed ? new Date(r.lastUsed) : null
          const hoursSince = lastUsed ? (Date.now() - lastUsed.getTime()) / 3600000 : null
          return {
            agent: r.agent,
            callsToday: n(r.today),
            calls7d: n(r.calls7),
            calls30d: calls30,
            pct: total30 ? Math.round((calls30 / total30) * 100) : 0,
            trend: prev30 > 0 ? Math.round(((calls30 - prev30) / prev30) * 100) : (calls30 > 0 ? 100 : 0),
            lastUsed: r.lastUsed,
            status: hoursSince !== null && hoursSince < 48 ? 'operational' : 'idle',
          }
        }),
      },
    })
  } catch (err) {
    console.error('[admin/analytics/agents]', err)
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

    const emailConfigured = !!process.env.RESEND_API_KEY

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
      const recipients = parseInt(countRow?.cnt || '0')

      // broadcast_email = VRAIS emails Resend à chaque destinataire (asynchrone)
      if (type === 'broadcast_email') {
        query<{ email: string; first_name: string }>(`
          SELECT u.email, p.first_name
          FROM public.users u INNER JOIN public.profiles p ON p.id = u.id
          WHERE p.subscription_status = 'active'
        `).then(users => {
          for (const u of users) {
            sendAdminMessageEmail(u.email, u.first_name, subject || 'Message de l\'équipe Bouba\'ia', msgBody.trim())
              .catch(err => console.warn('[admin/notifications broadcast email]', u.email, err))
          }
        }).catch(() => {})
      }

      res.status(201).json({
        success: true,
        emailSent: type === 'broadcast_email' ? emailConfigured : undefined,
        data: { campaignId, recipients },
        message: type === 'broadcast_email'
          ? (emailConfigured
              ? `Email envoyé à ${recipients} utilisateur(s) actif(s).`
              : `${recipients} notification(s) créée(s) — RESEND_API_KEY manquante, aucun email parti.`)
          : `Notification envoyée à ${recipients} utilisateur(s) actif(s).`,
      })
    } else {
      // Individuel
      if (!userId) return res.status(400).json({ success: false, error: 'userId requis pour envoi individuel' })
      const notif = await queryOne(`
        INSERT INTO public.notifications (user_id, type, campaign_id, sender_id, subject, body)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, type, subject, body, is_read, sent_at AS "sentAt"
      `, [userId, type, campaignId, senderId, subject || null, msgBody.trim()])

      // type 'email' = VRAI email Resend au destinataire
      let emailDelivered = false
      if (type === 'email') {
        const target = await queryOne<{ email: string; first_name: string }>(`
          SELECT u.email, p.first_name FROM public.users u
          LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = $1
        `, [userId])
        if (target?.email) {
          await sendAdminMessageEmail(target.email, target.first_name, subject || 'Message de l\'équipe Bouba\'ia', msgBody.trim())
            .catch(err => console.warn('[admin/notifications email]', err))
          emailDelivered = emailConfigured
        }
      }

      res.status(201).json({
        success: true,
        emailSent: type === 'email' ? emailDelivered : undefined,
        data: notif,
        message: type === 'email'
          ? (emailDelivered ? 'Email envoyé au destinataire.' : 'Notification créée — RESEND_API_KEY manquante, email non parti.')
          : 'Notification envoyée.',
      })
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
// CUSTOMERS (alias for /users — CustomersPage)
// ─────────────────────────────────────────────

router.get('/customers', async (_req, res) => {
  try {
    const customers = await query(`
      SELECT
        u.id,
        u.email,
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS name,
        COALESCE(r.name, 'user')  AS role,
        p.plan_id                 AS plan_id,
        p.subscription_status     AS subscription_status,
        u.created_at,
        p.last_active_at          AS last_active_at,
        COALESCE(p.messages_used, 0)   AS messages_used,
        COALESCE(p.messages_limit, 0)  AS messages_limit
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE COALESCE(r.name, 'user') NOT IN ('admin', 'superadmin')
      ORDER BY u.created_at DESC
      LIMIT 500
    `)
    res.json({ success: true, data: customers })
  } catch (err) {
    console.error('[admin/customers]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// INVOICES (from payments table)
// ─────────────────────────────────────────────

router.get('/invoices', async (req, res) => {
  try {
    const { status, month } = req.query
    const params: any[] = []
    const conditions: string[] = []

    if (status && status !== 'all') {
      params.push(status)
      conditions.push(`pay.status = $${params.length}`)
    }
    if (month) {
      params.push(`${month}%`)
      conditions.push(`pay.created_at::text LIKE $${params.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await query(`
      SELECT
        CONCAT('INV-', TO_CHAR(pay.created_at, 'YYYY-MM'), '-', LPAD(pay.id::text, 4, '0')) AS id,
        pay.id                                        AS payment_id,
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS customer,
        u.email,
        pay.amount,
        pay.created_at::date::text                   AS date,
        (pay.created_at + INTERVAL '30 days')::date::text AS due_date,
        pay.status,
        COALESCE(p.plan_id, 'free')                  AS plan
      FROM public.payments pay
      LEFT JOIN public.users u    ON u.id = pay.user_id
      LEFT JOIN public.profiles p ON p.id = pay.user_id
      ${where}
      ORDER BY pay.created_at DESC
      LIMIT 200
    `, params)

    // Summary stats
    const stats = await queryOne(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)::numeric AS paid_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'),   0)::numeric AS pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'failed'),    0)::numeric AS overdue_amount,
        COUNT(*)::int                                                           AS total
      FROM public.payments
    `)

    res.json({ success: true, data: rows, stats })
  } catch (err) {
    console.error('[admin/invoices]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// ANNOUNCEMENTS (broadcast campaigns from notifications)
// ─────────────────────────────────────────────

router.get('/announcements', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        n.campaign_id                                   AS id,
        MIN(n.subject)                                  AS title,
        MIN(n.body)                                     AS content,
        COALESCE(MIN(n.metadata->>'announcementType'), 'info') AS type,
        COALESCE(MIN(n.metadata->>'target'), 'all')     AS target,
        MIN(n.sent_at)                                  AS sent_date,
        COUNT(*)::int                                   AS recipients,
        COUNT(*) FILTER (WHERE n.is_read = true)::int   AS opened,
        'sent'                                          AS status
      FROM public.notifications n
      WHERE n.campaign_id IS NOT NULL
        AND n.type IN ('broadcast_app', 'broadcast_email')
      GROUP BY n.campaign_id
      ORDER BY MIN(n.sent_at) DESC
      LIMIT 100
    `)

    // Also fetch stats
    const stats = await queryOne(`
      SELECT
        COUNT(DISTINCT campaign_id)::int                                AS total,
        COUNT(DISTINCT campaign_id) FILTER (
          WHERE type IN ('broadcast_app','broadcast_email'))::int        AS sent,
        SUM(CASE WHEN is_read THEN 1 ELSE 0 END)::int                  AS opened,
        0::int                                                           AS clicked
      FROM public.notifications
      WHERE campaign_id IS NOT NULL
    `)

    res.json({ success: true, data: rows, stats })
  } catch (err) {
    console.error('[admin/announcements]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.post('/announcements', async (req: any, res) => {
  try {
    const { title, content, type, target, userId } = req.body
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, error: 'Titre et contenu requis' })
    }

    const campaignId = require('crypto').randomUUID()
    const senderId = req.user?.id || null

    // metadata : type visuel de la bannière (feature/promotion/maintenance/info) + cible
    const announcementType = ['feature', 'promotion', 'maintenance', 'info'].includes(type) ? type : 'info'
    const metadata = JSON.stringify({ announcementType, target: target || 'all' })

    // Cible : un utilisateur spécifique, un plan, ou tout le monde
    if (target === 'user') {
      if (!userId) return res.status(400).json({ success: false, error: 'userId requis pour cibler un utilisateur' })
      const exists = await queryOne(`SELECT id FROM public.users WHERE id = $1`, [userId])
      if (!exists) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' })
      await query(`
        INSERT INTO public.notifications (user_id, type, campaign_id, sender_id, subject, body, metadata)
        VALUES ($1, 'broadcast_app', $2, $3, $4, $5, $6::jsonb)
      `, [userId, campaignId, senderId, title.trim(), content.trim(), metadata])
    } else {
      let whereClause = ''
      const params: any[] = [campaignId, senderId, title.trim(), content.trim(), metadata]
      if (target && target !== 'all') {
        const planMap: Record<string, string> = {
          free_users: 'free',
          starter_users: 'starter',
          business_users: 'business',
          enterprise_users: 'enterprise',
        }
        const planId = planMap[target]
        if (planId) { whereClause = `AND p.plan_id = $6`; params.push(planId) }
      }
      await query(`
        INSERT INTO public.notifications (user_id, type, campaign_id, sender_id, subject, body, metadata)
        SELECT u.id, 'broadcast_app', $1, $2, $3, $4, $5::jsonb
        FROM public.users u
        INNER JOIN public.profiles p ON p.id = u.id
        WHERE u.id IS NOT NULL
          ${whereClause}
      `, params)
    }

    const countRow = await queryOne(`
      SELECT COUNT(*) AS cnt FROM public.notifications WHERE campaign_id = $1
    `, [campaignId])

    res.status(201).json({
      success: true,
      data: {
        id: campaignId,
        title: title.trim(),
        content: content.trim(),
        type: type || 'feature',
        status: 'sent',
        recipients: parseInt(countRow?.cnt || '0'),
        opened: 0,
        sent_date: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error('[admin/announcements POST]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

router.delete('/announcements/:campaignId', async (req, res) => {
  try {
    await query(`
      DELETE FROM public.notifications WHERE campaign_id = $1
    `, [req.params.campaignId])
    res.json({ success: true })
  } catch (err) {
    console.error('[admin/announcements DELETE]', err)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// ─────────────────────────────────────────────
// DASHBOARD — données consolidées
// ─────────────────────────────────────────────

router.get('/dashboard/stats', async (_req, res) => {
  try {
    // Totaux utilisateurs et statuts
    const userStats = await queryOne(`
      SELECT
        COUNT(*)::int                                                         AS total_users,
        COUNT(*) FILTER (WHERE p.subscription_status = 'active')::int        AS active_users,
        COUNT(*) FILTER (WHERE p.subscription_status IN ('cancelled','inactive'))::int AS churned_users
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE COALESCE(r.name, 'user') NOT IN ('admin', 'superadmin')
    `)

    // Paiements en attente
    const pendingPayments = await queryOne(`
      SELECT COUNT(*)::int AS cnt FROM public.payments WHERE status = 'pending'
    `).catch(() => ({ cnt: 0 }))

    // MRR depuis les plans actifs
    const mrrRow = await queryOne(`
      SELECT
        COALESCE(SUM(pl.price), 0)::numeric AS mrr
      FROM public.profiles p
      LEFT JOIN public.plans pl ON pl.id = p.plan_id
      WHERE p.subscription_status = 'active' AND pl.price > 0
    `).catch(() => ({ mrr: 0 }))

    const mrr = parseFloat(mrrRow?.mrr || '0')
    const totalUsers = userStats?.total_users || 0
    const activeUsers = userStats?.active_users || 0
    const churnedUsers = userStats?.churned_users || 0

    // Distribution des plans
    const planDist = await query(`
      SELECT
        COALESCE(p.plan_id, 'free')   AS plan,
        COUNT(*)::int                  AS count,
        COALESCE(SUM(pl.price), 0)::numeric AS revenue
      FROM public.profiles p
      LEFT JOIN public.plans pl ON pl.id = p.plan_id
      LEFT JOIN public.users u ON u.id = p.id
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE COALESCE(r.name, 'user') NOT IN ('admin', 'superadmin')
      GROUP BY p.plan_id
      ORDER BY revenue DESC
    `).catch(() => [])

    // Revenu mensuel des 6 derniers mois
    const revenueByMonth = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount), 0)::numeric AS revenue
      FROM public.payments
      WHERE status = 'succeeded'
        AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `).catch(() => [])

    // Clients récents (5 derniers)
    const recentUsers = await query(`
      SELECT
        u.id,
        TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS name,
        u.email,
        COALESCE(p.plan_id, 'free')      AS plan,
        u.created_at::date::text         AS joined,
        COALESCE(p.subscription_status, 'inactive') AS status
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE COALESCE(r.name, 'user') NOT IN ('admin', 'superadmin')
      ORDER BY u.created_at DESC
      LIMIT 5
    `).catch(() => [])

    // Taux conversion et churn
    const conversionRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100 * 10) / 10 : 0
    const churnRate = totalUsers > 0 ? Math.round((churnedUsers / totalUsers) * 100 * 10) / 10 : 0

    // Actions en attente sur les autres pages (liens rapides du dashboard)
    const pendingActions = await queryOne<any>(`
      SELECT
        (SELECT COUNT(*) FROM public.upgrade_requests WHERE status = 'pending')::int AS upgrades,
        (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress'))::int AS tickets,
        (SELECT COUNT(*) FROM public.payments WHERE status = 'pending')::int AS wave,
        (SELECT COUNT(*) FROM public.ai_request_logs
          WHERE success = false AND created_at >= NOW() - INTERVAL '24 hours')::int AS ai_errors_24h,
        (SELECT COUNT(*) FROM public.profiles
          WHERE messages_limit > 0 AND messages_used >= messages_limit)::int AS quota_exhausted,
        (SELECT COUNT(*) FROM public.subscriptions s
          JOIN public.plans pl ON pl.id = s.plan_id
          WHERE s.status = 'active' AND pl.price > 0
            AND DATE_TRUNC('month', s.current_period_end) = DATE_TRUNC('month', NOW())
            AND NOT EXISTS (SELECT 1 FROM public.renewal_invoice_log l
                            WHERE l.user_id = s.user_id AND l.period_end = s.current_period_end
                              AND l.email_sent = true))::int AS renewals_pending
    `).catch(() => ({}))

    // Abonnements payants actifs par plan
    const subsByPlan = await query<any>(`
      SELECT s.plan_id AS plan, COUNT(*)::int AS count
      FROM public.subscriptions s
      JOIN public.plans pl ON pl.id = s.plan_id
      WHERE s.status = 'active' AND pl.price > 0
      GROUP BY s.plan_id ORDER BY count DESC
    `).catch(() => [])

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: mrr,
          totalUsers,
          activeCustomers: activeUsers,
          pendingPayments: pendingPayments?.cnt ?? 0,
          conversionRate,
          churnRate,
        },
        mrr,
        arr: mrr * 12,
        pendingActions: {
          upgrades: pendingActions?.upgrades ?? 0,
          tickets: pendingActions?.tickets ?? 0,
          wave: pendingActions?.wave ?? 0,
          aiErrors24h: pendingActions?.ai_errors_24h ?? 0,
          quotaExhausted: pendingActions?.quota_exhausted ?? 0,
          renewalsPending: pendingActions?.renewals_pending ?? 0,
        },
        subsByPlan,
        plansDistribution: (planDist as any[]).map((p: any) => ({
          plan: p.plan || 'free',
          count: p.count,
          revenue: parseFloat(p.revenue || '0'),
          // Répartition sur l'ensemble des utilisateurs (pas seulement actifs)
          percentage: totalUsers > 0 ? Math.round((p.count / totalUsers) * 100) : 0,
        })),
        revenueByMonth: (revenueByMonth as any[]).map((r: any) => ({
          month: r.month,
          monthKey: r.month_key,
          revenue: parseFloat(r.revenue || '0'),
        })),
        recentCustomers: recentUsers,
      }
    })
  } catch (err) {
    console.error('[admin/dashboard/stats]', err)
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
      SELECT id, subject, body, status, category,
             admin_reply AS "adminReply",
             created_at AS "createdAt", updated_at AS "updatedAt"
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
