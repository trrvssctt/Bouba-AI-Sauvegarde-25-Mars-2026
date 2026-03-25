import express from 'express'
import { query, queryOne } from './lib/db'

const router = express.Router()

/**
 * POST /api/payments
 * Créer un enregistrement de paiement
 */
router.post('/', async (req, res) => {
  try {
    const { 
      user_id, 
      amount, 
      currency = 'EUR', 
      status = 'succeeded',
      payment_reference,
      plan_id,
      metadata = {}
    } = req.body

    if (!user_id || !amount || !payment_reference || !plan_id) {
      return res.status(400).json({ 
        error: 'Champs requis manquants: user_id, amount, payment_reference, plan_id' 
      })
    }

    // Créer l'enregistrement de paiement
    const payment = await queryOne(
      `INSERT INTO public.payments 
       (user_id, amount, currency, status, metadata) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [user_id, amount, currency, status, {
        payment_reference,
        plan_id,
        payment_method: 'wave',
        ...metadata
      }]
    )

    if (!payment) {
      throw new Error('Erreur lors de la création du paiement')
    }

    res.status(201).json({
      success: true,
      payment: {
        id: payment.id,
        amount,
        currency,
        status,
        payment_reference,
        created_at: payment.created_at
      }
    })

  } catch (error: any) {
    console.error('Payment creation error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la création du paiement' 
    })
  }
})

/**
 * GET /api/payments/:userId
 * Récupérer les paiements d'un utilisateur
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const payments = await query(
      `SELECT id, amount, currency, status, metadata, created_at, updated_at
       FROM public.payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json({
      success: true,
      payments
    })

  } catch (error: any) {
    console.error('Get payments error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des paiements' 
    })
  }
})

export default router