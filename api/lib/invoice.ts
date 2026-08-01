/**
 * Générateur de factures PDF Bouba'ia (pdfkit).
 * Mise en page inspirée du modèle de référence (assets/Facture_SN69992.pdf) :
 *   - encadré référence / type / date d'émission à gauche, bloc client à droite
 *   - bandeau récapitulatif « Facture n°X du … » avec Total HT / TVA / Total
 *   - encadré « Information de paiement »
 *   - rubrique détaillée (abonnement, période, quantité, prix) + sous-total
 *   - bloc de totaux à droite, pied de page société
 * Un paiement réglé produit un REÇU avec tampon vert « PAYÉE ».
 */
import PDFDocument from 'pdfkit'

export interface InvoiceData {
  invoiceNumber: string
  /** Abonnement | Renouvellement | Upgrade */
  invoiceType?: string
  date: Date
  clientName: string
  clientEmail: string
  planId: string
  description?: string
  /** Montant TTC dans la devise indiquée (pas de centimes) */
  amount: number
  currency: string
  paymentMethod?: string | null
  monthsPaid?: number | null
  /** Début/fin de la période couverte par l'abonnement */
  periodStart?: Date | null
  periodEnd?: Date | null
  /** Date limite de règlement (factures non payées) */
  dueDate?: Date | null
  paid: boolean
}

const VIOLET = '#6C3EF4'
const VIOLET_DARK = '#4C1D95'
const INK = '#1a1a2e'
const MUTED = '#6b7280'
const BOX_BG = '#eef1f7'      // encadrés gris-bleu du modèle
const BAND_BG = '#dbe3f0'     // bandeaux de titres de tableaux
const GREEN = '#16a34a'
const AMBER = '#d97706'

// TVA sénégalaise par défaut (modèle de référence) — surchargée via INVOICE_VAT_RATE
const VAT_RATE = Number(process.env.INVOICE_VAT_RATE ?? 18)

const PLAN_LABELS: Record<string, string> = {
  free: 'Bouba Free',
  starter: 'Bouba Starter',
  pro: 'Bouba Pro',
  business: 'Bouba Business',
  enterprise: 'Bouba Enterprise',
}

const METHOD_LABELS: Record<string, string> = {
  wave: 'Wave',
  card: 'Carte bancaire',
  stripe: 'Carte bancaire (Stripe)',
  bank: 'Virement bancaire',
  manual: 'Enregistré par l\'équipe',
}

function fmt(amount: number, currency: string): string {
  const cur = (currency || 'EUR').toUpperCase()
  const symbol = cur === 'EUR' ? '€' : cur === 'XOF' ? 'FCFA' : cur
  // Formatage manuel : Helvetica n'a pas le glyphe de l'espace fine insécable
  const rounded = Math.round(amount * 100) / 100
  const [intPart, decPart] = rounded.toFixed(2).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped}.${decPart} ${symbol}`
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('fr-FR')
}

export function buildInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 595.28
    const M = 46

    const total = data.amount
    const ht = VAT_RATE > 0 ? total / (1 + VAT_RATE / 100) : total
    const tva = total - ht
    const cur = data.currency
    const invoiceType = data.invoiceType || 'Abonnement'
    const planLabel = PLAN_LABELS[data.planId] || `Plan ${data.planId}`
    const months = data.monthsPaid && data.monthsPaid > 0 ? data.monthsPaid : 1
    const unit = total / months

    // ── Logo ────────────────────────────────────────────────────────
    doc.circle(M + 14, 46, 14).fill(VIOLET)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('B', M + 9, 39)
    doc.font('Helvetica-Bold').fontSize(24).fillColor(VIOLET_DARK).text("Bouba'ia", M + 38, 32)
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('Votre assistant IA personnel', M + 38, 60)

    // ── Encadré référence (gauche) + client (droite) ────────────────
    const infoY = 96
    doc.rect(M, infoY, 290, 84).fill(BOX_BG)
    doc.font('Helvetica').fontSize(9.5).fillColor(INK)
    const label = (t: string, v: string, y: number) => {
      doc.font('Helvetica').fillColor(INK).text(`${t} : `, M + 12, y, { continued: true })
      doc.font('Helvetica-Bold').text(v)
    }
    label('Référence de la facture', data.invoiceNumber, infoY + 12)
    label('Type de facture', invoiceType, infoY + 28)
    label("Date d'émission", fmtDateShort(data.date), infoY + 44)
    label('Client', data.clientEmail, infoY + 60)

    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK)
      .text(data.clientName || data.clientEmail, 360, infoY + 8, { width: W - 360 - M })
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
    if (data.clientName && data.clientName !== data.clientEmail) {
      doc.text(data.clientEmail, 360, infoY + 24, { width: W - 360 - M })
    }
    doc.text(`Plan ${planLabel}`, 360, infoY + 38, { width: W - 360 - M })

    // ── Bandeau récapitulatif + encadré information de paiement ─────
    const sumY = 210
    const sumW = 320
    doc.rect(M, sumY, sumW, 24).fill(BAND_BG)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
      .text(`Facture n°${data.invoiceNumber} du ${fmtDateLong(data.date)}`, M + 10, sumY + 7, { width: sumW - 20 })

    const sumRow = (t: string, v: string, y: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(INK)
      doc.text(t, M + 10, y)
      doc.text(v, M, y, { width: sumW - 10, align: 'right' })
      doc.moveTo(M, y + 15).lineTo(M + sumW, y + 15).lineWidth(0.5).stroke('#c9d2e3')
    }
    sumRow('Total de la facture HT', fmt(ht, cur), sumY + 34)
    sumRow(`TVA (${VAT_RATE}%)`, fmt(tva, cur), sumY + 56)
    sumRow('Total de la facture', fmt(total, cur), sumY + 78, true)

    // Encadré information de paiement (droite)
    const payX = M + sumW + 16
    const payW = W - payX - M
    doc.rect(payX, sumY, payW, 100).fill(BOX_BG)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
      .text('Information de paiement :', payX + 10, sumY + 10)
    doc.font('Helvetica').fontSize(8.5).fillColor(INK)
    if (data.paid) {
      doc.text(`Le montant de ${fmt(total, cur)} a bien été réglé${data.paymentMethod ? ` via ${METHOD_LABELS[(data.paymentMethod || '').toLowerCase()] || data.paymentMethod}` : ''}.`, payX + 10, sumY + 26, { width: payW - 20 })
      doc.text('Merci pour votre confiance !', payX + 10, sumY + 64, { width: payW - 20 })
    } else {
      doc.text(`Le montant de ${fmt(total, cur)} est à régler${data.dueDate ? ` avant le ${fmtDateShort(data.dueDate)}` : ''} via Wave (QR code) ou carte bancaire.`, payX + 10, sumY + 26, { width: payW - 20 })
      doc.text('Facture payable dès réception.', payX + 10, sumY + 72, { width: payW - 20 })
    }

    // ── Tampon PAYÉE (reçus uniquement) ─────────────────────────────
    if (data.paid) {
      doc.save()
      doc.rotate(-8, { origin: [500, 150] })
      doc.roundedRect(452, 132, 96, 34, 6).lineWidth(2.5).stroke(GREEN)
      doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN)
        .text('PAYÉE', 452, 141, { width: 96, align: 'center' })
      doc.restore()
    }

    // ── Rubrique Abonnement ─────────────────────────────────────────
    const rubY = 340
    doc.font('Helvetica-Bold').fontSize(12).fillColor(VIOLET_DARK)
      .text('Rubrique Abonnement Bouba\'ia', M, rubY)

    const tabY = rubY + 24
    doc.rect(M, tabY, W - M * 2, 22).fill(BAND_BG)
    // Colonnes : la dernière se termine exactement au bord droit du bandeau
    const COL_REF = M + 240
    const COL_QTY = M + 305
    const COL_UNIT = M + 350
    const COL_TTC = M + 425
    const COL_TTC_W = W - M - COL_TTC - 8
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(INK)
    doc.text('Abonnement', M + 10, tabY + 7)
    doc.text('Référence', COL_REF, tabY + 7, { width: 60 })
    doc.text('Quantité', COL_QTY, tabY + 7, { width: 45, align: 'center' })
    doc.text('Prix unitaire', COL_UNIT, tabY + 7, { width: 70, align: 'right' })
    doc.text('Prix TTC', COL_TTC, tabY + 7, { width: COL_TTC_W, align: 'right' })

    const rowY = tabY + 30
    const periodLine = data.periodStart && data.periodEnd
      ? `Du ${fmtDateShort(data.periodStart)} au ${fmtDateShort(data.periodEnd)}`
      : null
    doc.font('Helvetica').fontSize(9).fillColor(VIOLET)
      .text(`${planLabel} — ${data.description || `abonnement ${months} mois`}`, M + 10, rowY, { width: 230 })
    if (periodLine) {
      doc.fillColor(MUTED).fontSize(8.5).text(periodLine, M + 10, doc.y + 2, { width: 230 })
      doc.text('Sans engagement', M + 10, doc.y + 1, { width: 230 })
    }
    doc.font('Helvetica').fontSize(9).fillColor(INK)
    doc.text(data.planId, COL_REF, rowY, { width: 60 })
    doc.text(String(months), COL_QTY, rowY, { width: 45, align: 'center' })
    doc.text(fmt(unit, cur), COL_UNIT, rowY, { width: 70, align: 'right' })
    doc.text(fmt(total, cur), COL_TTC, rowY, { width: COL_TTC_W, align: 'right' })

    const subY = rowY + 48
    doc.rect(M, subY, W - M * 2, 22).fill(BOX_BG)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
    doc.text('SOUS TOTAL', COL_QTY, subY + 7, { width: 100 })
    doc.text(fmt(total, cur), COL_TTC, subY + 7, { width: COL_TTC_W, align: 'right' })

    // ── Bloc de totaux (droite) ─────────────────────────────────────
    const totY = subY + 50
    const totX = 320
    const totW = W - M - totX
    const totRow = (t: string, v: string, y: number, bold = false, colored = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5)
        .fillColor(colored ? VIOLET : INK)
      doc.text(t, totX, y)
      doc.text(v, totX, y, { width: totW, align: 'right' })
      doc.moveTo(totX, y + 15).lineTo(totX + totW, y + 15).lineWidth(bold ? 1.2 : 0.5).stroke(bold ? INK : '#c9d2e3')
    }
    totRow('Abonnement', fmt(ht, cur), totY, true)
    totRow('Prix HT', fmt(ht, cur), totY + 28)
    totRow(`TVA (${VAT_RATE}%)`, fmt(tva, cur), totY + 50)
    totRow('Total TTC', fmt(total, cur), totY + 72, true, true)

    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
      .text('Service fourni par voie électronique', M, totY + 30)
      .text('Moyens de paiement acceptés :', M, totY + 48)
    doc.text('•  Wave (QR code marchand)', M + 6, totY + 62)
    doc.text('•  Carte bancaire (Stripe)', M + 6, totY + 76)

    // ── Pied de page ────────────────────────────────────────────────
    const footY = 780
    doc.moveTo(M, footY - 10).lineTo(W - M, footY - 10).lineWidth(0.5).stroke('#c9d2e3')
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
    doc.text(`Facture ${data.invoiceNumber}`, M, footY - 2)
    doc.text('Page 1/1', M, footY - 2, { width: W - M * 2, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
      .text("Bouba'ia — Assistant IA multi-agents pour entrepreneurs, freelances et TPE", 0, footY + 12, { width: W, align: 'center' })
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text('Support : contact.boubaia@realtechprint.com  ·  Web : boubaia.com', 0, footY + 26, { width: W, align: 'center' })

    doc.end()
  })
}
