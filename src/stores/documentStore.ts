import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DocType =
  | 'invoice'
  | 'quote'
  | 'receipt'
  | 'proforma'
  | 'payslip'
  | 'purchase_order'
  | 'delivery'
  | 'exit_voucher'

export interface DocumentItem {
  description: string
  qty: number
  unitPrice: number
}

export interface SavedDocument {
  id: string
  type: DocType
  number: string
  date: string
  createdAt: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'

  // Snapshot of company info at creation time
  companyName: string
  companyLogo: string
  companyAddress: string
  companyCity: string
  companyPostalCode: string
  companyCountry: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  companySiret: string
  companyVat: string
  companyLegalForm: string

  // Client
  clientName: string
  clientEmail: string
  clientAddress: string

  // Lines
  items: DocumentItem[]
  vatRate: number
  totalHT: number
  totalTVA: number
  totalTTC: number
  notes: string
}

interface DocumentStore {
  documents: SavedDocument[]
  saveDocument: (doc: Omit<SavedDocument, 'id' | 'createdAt'>) => SavedDocument
  updateDocumentStatus: (id: string, status: SavedDocument['status']) => void
  deleteDocument: (id: string) => void
  getDocument: (id: string) => SavedDocument | undefined
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],

      saveDocument: (doc) => {
        const saved: SavedDocument = {
          ...doc,
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ documents: [saved, ...state.documents] }))
        return saved
      },

      updateDocumentStatus: (id, status) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, status } : d
          ),
        })),

      deleteDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),

      getDocument: (id) => get().documents.find((d) => d.id === id),
    }),
    { name: 'bouba-documents-storage-v1' }
  )
)

// ── Helpers ───────────────────────────────────────────────────────────────────

export function calcTotals(items: DocumentItem[], vatRate: number) {
  const totalHT = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const totalTVA = totalHT * (vatRate / 100)
  const totalTTC = totalHT + totalTVA
  return { totalHT, totalTVA, totalTTC }
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  invoice:        'Facture',
  quote:          'Devis',
  receipt:        'Reçu',
  proforma:       'Facture Proforma',
  payslip:        'Fiche de paie',
  purchase_order: 'Bon de commande',
  delivery:       'Bon de livraison',
  exit_voucher:   'Bon de sortie',
}

export function generateDocNumber(type: DocType): string {
  const now = new Date()
  const prefix = type.toUpperCase().replace('_', '').slice(0, 3)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `${prefix}-${year}${month}-${rand}`
}
