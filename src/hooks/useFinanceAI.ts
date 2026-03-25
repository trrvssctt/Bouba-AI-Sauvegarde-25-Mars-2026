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
        // Try to parse a transaction from Bouba's response
        const jsonMatch = result.output.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
          try {
            const txData = JSON.parse(jsonMatch[0])
            if (txData.amount && txData.type) {
              return {
                success: true,
                data: {
                  type: txData.type as 'income' | 'expense',
                  amount: Number(txData.amount),
                  category: txData.category || 'Autre',
                  description: txData.description || command,
                  date: txData.date || today,
                  status: 'completed' as const,
                } as Omit<Transaction, 'id'>,
                boubaMessage: result.output,
              }
            }
          } catch { /* not JSON */ }
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

      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      const topCategories = Object.entries(
        transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount
          return acc
        }, {} as Record<string, number>)
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ${amt.toLocaleString('fr-FR')}`)

      const context = [
        `[DONNÉES FINANCIÈRES — ${monthLabel}]`,
        `Revenus totaux : ${income.toLocaleString('fr-FR')}`,
        `Dépenses totales : ${expense.toLocaleString('fr-FR')}`,
        `Bénéfice net : ${(income - expense).toLocaleString('fr-FR')}`,
        `Top catégories : ${topCategories.join(', ')}`,
        `Dernières transactions :`,
        transactions.slice(0, 15).map(t =>
          `- ${t.type === 'income' ? '+' : '-'}${t.amount} | ${t.category} | ${t.description} | ${t.date}`
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

      const context = [
        '[DONNÉES FINANCIÈRES COMPLÈTES]',
        `Revenus totaux : ${income.toLocaleString('fr-FR')}`,
        `Dépenses totales : ${expense.toLocaleString('fr-FR')}`,
        `Bénéfice : ${(income - expense).toLocaleString('fr-FR')}`,
        `Transactions (${transactions.length} au total) :`,
        transactions.slice(0, 30).map(t =>
          `- [${t.type}] ${t.amount} | ${t.category} | ${t.description} | ${t.date} | ${t.status}`
        ).join('\n'),
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
