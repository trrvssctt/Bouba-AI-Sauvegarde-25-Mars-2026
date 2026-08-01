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

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(localStorage.getItem('auth_token')
    ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    : {}),
})

// Map server snake_case response → client camelCase
function mapServerDoc(d: any): SavedDocument {
  return {
    id: d.id,
    type: d.type as DocType,
    number: d.number,
    date: d.date,
    createdAt: d.created_at,
    status: d.status as SavedDocument['status'],
    companyName: d.company_name || '',
    companyLogo: d.company_logo || '',
    companyAddress: d.company_address || '',
    companyCity: d.company_city || '',
    companyPostalCode: d.company_postal_code || '',
    companyCountry: d.company_country || '',
    companyPhone: d.company_phone || '',
    companyEmail: d.company_email || '',
    companyWebsite: d.company_website || '',
    companySiret: d.company_siret || '',
    companyVat: d.company_vat || '',
    companyLegalForm: d.company_legal_form || '',
    clientName: d.client_name || '',
    clientEmail: d.client_email || '',
    clientAddress: d.client_address || '',
    items: typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []),
    vatRate: parseFloat(d.vat_rate) || 0,
    totalHT: parseFloat(d.total_ht) || 0,
    totalTVA: parseFloat(d.total_tva) || 0,
    totalTTC: parseFloat(d.total_ttc) || 0,
    notes: d.notes || '',
  }
}

interface DocumentStore {
  documents: SavedDocument[]
  isLoading: boolean
  loadDocuments: () => Promise<void>
  saveDocument: (doc: Omit<SavedDocument, 'id' | 'createdAt'>) => Promise<SavedDocument>
  updateDocumentStatus: (id: string, status: SavedDocument['status']) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  getDocument: (id: string) => SavedDocument | undefined
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      isLoading: false,

      loadDocuments: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/finance/documents', { headers: authHeaders() })
          if (!res.ok) return
          const data = await res.json()
          if (data.success) {
            set({ documents: (data.data || []).map(mapServerDoc) })
          }
        } catch (err) {
          console.error('[DOCS] loadDocuments error:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      saveDocument: async (doc) => {
        // Optimistic: generate a temp id
        const tempId = `temp-${Date.now()}`
        const optimistic: SavedDocument = {
          ...doc,
          id: tempId,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ documents: [optimistic, ...state.documents] }))

        try {
          const res = await fetch('/api/finance/documents', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              type: doc.type,
              number: doc.number,
              date: doc.date,
              status: doc.status,
              company_name: doc.companyName,
              company_logo: doc.companyLogo,
              company_address: doc.companyAddress,
              company_city: doc.companyCity,
              company_postal_code: doc.companyPostalCode,
              company_country: doc.companyCountry,
              company_phone: doc.companyPhone,
              company_email: doc.companyEmail,
              company_website: doc.companyWebsite,
              company_siret: doc.companySiret,
              company_vat: doc.companyVat,
              company_legal_form: doc.companyLegalForm,
              client_name: doc.clientName,
              client_email: doc.clientEmail,
              client_address: doc.clientAddress,
              items: doc.items,
              vat_rate: doc.vatRate,
              total_ht: doc.totalHT,
              total_tva: doc.totalTVA,
              total_ttc: doc.totalTTC,
              notes: doc.notes,
            }),
          })
          const data = await res.json()
          if (data.success && data.data) {
            const saved = mapServerDoc(data.data)
            set((state) => ({
              documents: state.documents.map((d) => d.id === tempId ? saved : d),
            }))
            return saved
          }
        } catch (err) {
          console.error('[DOCS] saveDocument API error:', err)
        }
        return optimistic
      },

      updateDocumentStatus: async (id, status) => {
        set((state) => ({
          documents: state.documents.map((d) => d.id === id ? { ...d, status } : d),
        }))
        try {
          await fetch(`/api/finance/documents/${id}/status`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ status }),
          })
        } catch (err) {
          console.error('[DOCS] updateDocumentStatus error:', err)
        }
      },

      deleteDocument: async (id) => {
        set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }))
        try {
          await fetch(`/api/finance/documents/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
          })
        } catch (err) {
          console.error('[DOCS] deleteDocument error:', err)
        }
      },

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
