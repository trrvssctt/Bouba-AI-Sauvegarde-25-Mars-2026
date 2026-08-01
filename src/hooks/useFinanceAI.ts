import { useState } from 'react'
import { useFinanceStore, Transaction } from '@/src/stores/financeStore'
import { useBoubaAction } from './useBoubaAction'
import type { DocumentItem } from '@/src/stores/documentStore'

const DOCUMENT_LABELS: Record<string, string> = {
  invoice: 'facture',
  quote: 'devis',
  receipt: 'reçu',
  proforma: 'facture proforma',
  payslip: 'fiche de paie',
  purchase_order: 'bon de commande',
  delivery: 'bon de livraison',
  exit_voucher: 'bon de sortie',
}

export interface GeneratedDocDraft {
  number: string
  date: string
  clientName: string
  clientEmail: string
  clientAddress: string
  items: DocumentItem[]
  vatRate: number
  notes: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
}

/**
 * Valide une transaction extraite d'une réponse IA avant insertion (mission 3.5).
 * Retourne la transaction normalisée ou une erreur explicite — jamais
 * d'insertion silencieuse d'une transaction invalide.
 */
function validateTransaction(
  txData: any,
  fallbackDescription: string,
  today: string
): { ok: true; tx: Omit<Transaction, 'id'> } | { ok: false; reason: string } {
  if (!txData || typeof txData !== 'object') {
    return { ok: false, reason: 'format inattendu' }
  }
  if (txData.type !== 'income' && txData.type !== 'expense') {
    return { ok: false, reason: `type invalide « ${txData.type ?? '∅'} » (attendu: income ou expense)` }
  }
  const amount = Number(txData.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: `montant invalide « ${txData.amount ?? '∅'} »` }
  }
  let date = today
  if (txData.date) {
    const parsedDate = new Date(txData.date)
    if (Number.isNaN(parsedDate.getTime())) {
      return { ok: false, reason: `date invalide « ${txData.date} »` }
    }
    date = parsedDate.toISOString().slice(0, 10)
  }
  return {
    ok: true,
    tx: {
      type: txData.type,
      amount,
      category: typeof txData.category === 'string' && txData.category.trim() ? txData.category : 'Autre',
      description: typeof txData.description === 'string' && txData.description.trim() ? txData.description : fallbackDescription,
      date,
      status: 'completed' as const,
    } as Omit<Transaction, 'id'>,
  }
}

export function useFinanceAI() {
  const [isProcessing, setIsProcessing] = useState(false)
  const transactions = useFinanceStore(state => state.transactions)
  const { callBouba } = useBoubaAction()

  /**
   * Enregistre une transaction à partir d'une commande texte.
   * Ex: "J'ai payé 45 000 FCFA d'hébergement ce mois"
   */
  const processFinanceCommand = async (command: string) => {
    setIsProcessing(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const context = [
        '[CONTEXTE FINANCIER]',
        `Date actuelle : ${today}`,
        `Dernières transactions :`,
        transactions.slice(0, 10).map(t =>
          `- ${t.type === 'income' ? '+' : '-'}${t.amount} ${t.category} (${t.date})`
        ).join('\n'),
      ].join('\n')

      const result = await callBouba(command, context)

      if (result.success) {
        // Priorité 1 : balise [TRANSACTION]{...}[/TRANSACTION] (format structuré n8n)
        // Regex tolérante + JSON.parse en try/catch + validation stricte des champs.
        const txTagMatch = result.output.match(/\[TRANSACTION\]([\s\S]*?)\[\/TRANSACTION\]/i)
        if (txTagMatch) {
          let txData: any = null
          try {
            txData = JSON.parse(txTagMatch[1].trim())
          } catch {
            return { success: false, error: 'Bouba a renvoyé une transaction illisible (JSON invalide). Réessayez.' }
          }
          const validated = validateTransaction(txData, command, today)
          if (!validated.ok) {
            // Transaction invalide → erreur explicite, JAMAIS d'insertion silencieuse
            return { success: false, error: `Transaction refusée : ${validated.reason}.` }
          }
          return {
            success: true,
            data: validated.tx,
            boubaMessage: result.output.replace(/\[TRANSACTION\][\s\S]*?\[\/TRANSACTION\]/i, '').trim(),
          }
        }

        // Repli : objet JSON libre avec amount + type dans la réponse
        const jsonMatch = result.output.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
          try {
            const txData = JSON.parse(jsonMatch[0])
            if (txData.amount !== undefined && txData.type !== undefined) {
              const validated = validateTransaction(txData, command, today)
              if (!validated.ok) {
                return { success: false, error: `Transaction refusée : ${validated.reason}.` }
              }
              return { success: true, data: validated.tx, boubaMessage: result.output }
            }
          } catch { /* pas du JSON — réponse conversationnelle normale */ }
        }
        return { success: true, data: null, boubaMessage: result.output }
      }

      return { success: false, error: result.error || "Impossible de traiter la commande." }
    } catch (err) {
      console.error('[FinanceAI]', err)
      return { success: false, error: "Erreur lors de l'analyse." }
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Rapport mensuel via Bouba — analyse les revenus, dépenses, tendances.
   */
  const generateMonthlyReport = async (): Promise<string> => {
    setIsProcessing(true)
    try {
      const now = new Date()
      const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

      // Contexte = transactions du MOIS COURANT uniquement, max 50,
      // champs essentiels (mission 3.5 — lenteur = tokens)
      const monthPrefix = now.toISOString().slice(0, 7) // "YYYY-MM"
      const monthTransactions = transactions
        .filter(t => (t.date || '').startsWith(monthPrefix))
        .slice(0, 50)

      const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      const topCategories = Object.entries(
        monthTransactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount
          return acc
        }, {} as Record<string, number>)
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ${amt.toLocaleString('fr-FR')}`)

      const context = [
        `[DONNÉES FINANCIÈRES — ${monthLabel}]`,
        `Revenus du mois : ${income.toLocaleString('fr-FR')}`,
        `Dépenses du mois : ${expense.toLocaleString('fr-FR')}`,
        `Bénéfice net : ${(income - expense).toLocaleString('fr-FR')}`,
        `Top catégories : ${topCategories.join(', ') || 'aucune'}`,
        `Transactions du mois (${monthTransactions.length}) :`,
        monthTransactions.map(t =>
          `- ${t.type === 'income' ? '+' : '-'}${t.amount} | ${t.category} | ${t.date}`
        ).join('\n'),
      ].join('\n')

      const result = await callBouba(
        `Génère un rapport narratif financier pour ${monthLabel} (3-4 phrases). Analyse la santé financière, les tendances et donne un conseil d'optimisation. Sois professionnel et motivant.`,
        context
      )

      return result.output || 'Rapport indisponible pour le moment.'
    } catch {
      return "Désolé, je n'ai pas pu générer le rapport pour le moment."
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Génère un brouillon de document structuré via Bouba.
   * Retourne un GeneratedDocDraft prêt à être affiché dans le template.
   */
  const generateDocument = async (
    type: keyof typeof DOCUMENT_LABELS,
    details: string
  ): Promise<GeneratedDocDraft | null> => {
    setIsProcessing(true)
    try {
      const label = DOCUMENT_LABELS[type] || type
      const now = new Date()
      const prefix = type.toUpperCase().replace('_', '').slice(0, 3)
      const docNumber = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const todayISO = now.toISOString().slice(0, 10)

      const result = await callBouba(
        `Génère un ${label} professionnel. Description : ${details}. ` +
        `Réponds UNIQUEMENT avec un JSON valide sur UNE SEULE LIGNE, sans texte autour. Format : ` +
        `{"number":"${docNumber}","date":"${todayISO}","clientName":"","clientEmail":"","clientAddress":"","items":[{"description":"","qty":1,"unitPrice":0}],"vatRate":20,"notes":"","status":"draft"}`,
        `[GÉNÉRATION DOCUMENT]\nType: ${label}\nDate: ${now.toLocaleDateString('fr-FR')}`
      )

      if (!result.success || !result.output) return null

      const jsonMatch = result.output.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null

      const parsed = JSON.parse(jsonMatch[0])
      return {
        number:        parsed.number        || docNumber,
        date:          parsed.date          || todayISO,
        clientName:    parsed.clientName    || '',
        clientEmail:   parsed.clientEmail   || '',
        clientAddress: parsed.clientAddress || '',
        items:         Array.isArray(parsed.items) && parsed.items.length
                         ? parsed.items
                         : [{ description: '', qty: 1, unitPrice: 0 }],
        vatRate:       typeof parsed.vatRate === 'number' ? parsed.vatRate : 20,
        notes:         parsed.notes  || '',
        status:        parsed.status || 'draft',
      } satisfies GeneratedDocDraft
    } catch {
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Analyse financière personnalisée (dépenses, gains, projections).
   */
  const analyzeFinances = async (question: string): Promise<string> => {
    setIsProcessing(true)
    try {
      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      // > 50 transactions → résumé agrégé par catégorie plutôt que la liste
      // brute (mission 3.5 — lenteur = tokens)
      let detailBlock: string
      if (transactions.length > 50) {
        const byCategory = transactions.reduce((acc, t) => {
          const key = `${t.type}:${t.category}`
          acc[key] = (acc[key] || 0) + t.amount
          return acc
        }, {} as Record<string, number>)
        detailBlock = [
          `Résumé agrégé par catégorie (${transactions.length} transactions au total) :`,
          ...Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([key, amt]) => {
              const [type, category] = key.split(':')
              return `- [${type}] ${category} : ${amt.toLocaleString('fr-FR')}`
            }),
        ].join('\n')
      } else {
        detailBlock = [
          `Transactions (${transactions.length}) :`,
          ...transactions.slice(0, 50).map(t =>
            `- [${t.type}] ${t.amount} | ${t.category} | ${t.date}`
          ),
        ].join('\n')
      }

      const context = [
        '[DONNÉES FINANCIÈRES]',
        `Revenus totaux : ${income.toLocaleString('fr-FR')}`,
        `Dépenses totales : ${expense.toLocaleString('fr-FR')}`,
        `Bénéfice : ${(income - expense).toLocaleString('fr-FR')}`,
        detailBlock,
      ].join('\n')

      const result = await callBouba(question, context)
      return result.output || "Je n'ai pas pu analyser les données pour le moment."
    } catch {
      return "Erreur lors de l'analyse financière."
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    processFinanceCommand,
    generateMonthlyReport,
    generateDocument,
    analyzeFinances,
    isProcessing,
  }
}
