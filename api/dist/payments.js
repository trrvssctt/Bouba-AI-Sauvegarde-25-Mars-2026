"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./lib/db");
const router = express_1.default.Router();
/**
 * POST /api/payments
 * Créer un enregistrement de paiement
 */
router.post('/', async (req, res) => {
    try {
        const { user_id, amount, currency = 'EUR', status = 'succeeded', payment_reference, plan_id, metadata = {} } = req.body;
        if (!user_id || !amount || !payment_reference || !plan_id) {
            return res.status(400).json({
                error: 'Champs requis manquants: user_id, amount, payment_reference, plan_id'
            });
        }
        // Créer l'enregistrement de paiement
        const payment = await (0, db_1.queryOne)(`INSERT INTO public.payments 
       (user_id, amount, currency, status, metadata) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`, [user_id, amount, currency, status, {
                payment_reference,
                plan_id,
                payment_method: 'wave',
                ...metadata
            }]);
        if (!payment) {
            throw new Error('Erreur lors de la création du paiement');
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
        });
    }
    catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du paiement'
        });
    }
});
/**
 * GET /api/payments/:userId
 * Récupérer les paiements d'un utilisateur
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const payments = await (0, db_1.query)(`SELECT id, amount, currency, status, metadata, created_at, updated_at
       FROM public.payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC`, [userId]);
        res.json({
            success: true,
            payments
        });
    }
    catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des paiements'
        });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map