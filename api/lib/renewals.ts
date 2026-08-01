/**
 * Factures d'échéance de fin de mois — détection + envoi automatique.
 *
 * Règle : tout utilisateur (plan payant) dont l'abonnement se termine dans le
 * MOIS COURANT reçoit automatiquement sa facture de renouvellement par email
 * (PDF en pièce jointe), une seule fois par période (table renewal_invoice_log).
 * Le planificateur (server.ts) appelle processAutoRenewalInvoices() au
 * démarrage puis toutes les 12 h. Désactivable : AUTO_RENEWAL_INVOICES=false.
 */
import { query, queryOne } from './db'
import { buildInvoicePdf, type InvoiceData } from './invoice'
import { sendRenewalInvoiceEmail } from './email'

export interface MonthEndRenewal {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  planId: string
  price: number
  currency: string
  periodEnd: string
  subscriptionId: string
  /** Infos d'envoi (null si jamais envoyée pour cette période) */
  sentAt: string | null
  sentAuto: boolean | null
  emailSent: boolean | null
  invoiceNumber: string | null
}

/** Utilisateurs payants dont l'abonnement se termine dans le mois courant. */
export async function findMonthEndRenewals(): Promise<MonthEndRenewal[]> {
  return query<MonthEndRenewal>(`
    SELECT
      u.id                AS "userId",
      u.email,
      p.first_name        AS "firstName",
      p.last_name         AS "lastName",
      p.plan_id           AS "planId",
      COALESCE(pl.price, 0)::numeric AS price,
      UPPER(COALESCE(pl.currency, 'EUR')) AS currency,
      s.current_period_end AS "periodEnd",
      s.id                AS "subscriptionId",
      l.sent_at           AS "sentAt",
      l.auto              AS "sentAuto",
      l.email_sent        AS "emailSent",
      l.invoice_number    AS "invoiceNumber"
    FROM public.subscriptions s
    JOIN public.users u    ON u.id = s.user_id
    JOIN public.profiles p ON p.id = u.id
    JOIN public.plans pl   ON pl.id = p.plan_id
    LEFT JOIN public.renewal_invoice_log l
           ON l.user_id = s.user_id AND l.period_end = s.current_period_end
    WHERE s.status = 'active'
      AND pl.price > 0
      AND DATE_TRUNC('month', s.current_period_end) = DATE_TRUNC('month', NOW())
    ORDER BY s.current_period_end ASC
  `)
}

/** Construit les données de la facture de renouvellement d'un utilisateur. */
export function buildRenewalInvoiceData(r: MonthEndRenewal): InvoiceData {
  const rawPrice = Number(r.price)
  const amount = r.currency === 'EUR' && rawPrice > 200 ? rawPrice / 100 : rawPrice
  const periodStart = new Date(r.periodEnd)
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)
  const invoiceNumber = r.invoiceNumber
    || `REN-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}-${String(r.subscriptionId).replace(/-/g, '').slice(0, 6).toUpperCase()}`

  return {
    invoiceNumber,
    invoiceType: 'Renouvellement',
    date: new Date(),
    clientName: [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email,
    clientEmail: r.email,
    planId: r.planId,
    description: 'renouvellement 1 mois',
    amount,
    currency: r.currency,
    paymentMethod: null,
    monthsPaid: 1,
    periodStart,
    periodEnd,
    dueDate: periodStart,
    paid: false,
  }
}

/**
 * Envoie la facture de renouvellement à UN utilisateur (idempotent par période).
 * force = renvoyer même si déjà envoyée (envoi manuel admin).
 */
export async function sendRenewalInvoice(
  r: MonthEndRenewal,
  opts: { auto: boolean; force?: boolean }
): Promise<{ sent: boolean; reason?: string; invoiceNumber?: string }> {
  if (r.sentAt && !opts.force) {
    return { sent: false, reason: 'déjà envoyée pour cette période' }
  }

  const invoice = buildRenewalInvoiceData(r)
  const pdf = await buildInvoicePdf(invoice)
  const emailConfigured = !!process.env.RESEND_API_KEY

  await sendRenewalInvoiceEmail(r.email, r.firstName, {
    invoiceNumber: invoice.invoiceNumber,
    planId: r.planId,
    amount: invoice.amount,
    currency: invoice.currency,
    dueDate: invoice.dueDate!,
  }, { filename: `${invoice.invoiceNumber}.pdf`, content: pdf })

  // Journal d'envoi (idempotence) — upsert pour les renvois manuels
  await query(`
    INSERT INTO public.renewal_invoice_log (user_id, period_end, invoice_number, auto, email_sent)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, period_end) DO UPDATE
      SET sent_at = NOW(), auto = EXCLUDED.auto, email_sent = EXCLUDED.email_sent,
          invoice_number = EXCLUDED.invoice_number
  `, [r.userId, r.periodEnd, invoice.invoiceNumber, opts.auto, emailConfigured])

  // Notification in-app (best-effort)
  await query(`
    INSERT INTO public.notifications (user_id, type, subject, body, sender_id)
    VALUES ($1, 'email', 'Votre facture de renouvellement Bouba''ia', $2, NULL)
  `, [
    r.userId,
    `Votre abonnement arrive à échéance le ${new Date(r.periodEnd).toLocaleDateString('fr-FR')}. Votre facture de renouvellement (${invoice.invoiceNumber}) vous a été envoyée par email. Réglez via Wave ou carte bancaire pour conserver votre accès.`,
  ]).catch(() => {})

  return { sent: true, invoiceNumber: invoice.invoiceNumber }
}

/**
 * Passe planifiée : envoie les factures de renouvellement du mois courant
 * pas encore envoyées. Appelée au boot + toutes les 12 h (server.ts).
 */
export async function processAutoRenewalInvoices(): Promise<void> {
  if (process.env.AUTO_RENEWAL_INVOICES === 'false') return
  try {
    const renewals = await findMonthEndRenewals()
    // À envoyer : jamais envoyée OU journalisée sans que l'email soit parti
    // (ex. RESEND_API_KEY absente à ce moment-là) → nouvel essai
    const emailConfigured = !!process.env.RESEND_API_KEY
    const pending = renewals.filter(r => !r.sentAt || (r.emailSent === false && emailConfigured))
    if (pending.length === 0) {
      console.log('[RENEWALS] Aucune facture d\'échéance à envoyer ce mois-ci')
      return
    }
    console.log(`[RENEWALS] ${pending.length} facture(s) de renouvellement à envoyer automatiquement`)
    for (const r of pending) {
      try {
        const result = await sendRenewalInvoice(r, { auto: true, force: r.emailSent === false })
        if (result.sent) console.log(`[RENEWALS] ✓ ${r.email} — ${result.invoiceNumber}`)
      } catch (err) {
        console.error(`[RENEWALS] ✗ ${r.email}:`, (err as Error).message)
      }
    }
  } catch (err) {
    console.error('[RENEWALS] Passe automatique impossible:', (err as Error).message)
  }
}
