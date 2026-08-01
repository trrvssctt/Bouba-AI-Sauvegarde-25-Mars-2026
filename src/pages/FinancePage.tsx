import { useState, useMemo, useEffect, useRef } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight, Plus, FileText, Download, Search,
  Filter, MoreHorizontal, Bot, Sparkles, X, Target, ChevronDown,
  Receipt, FileCheck, ClipboardList, Settings, Trash2, Edit3,
  Eye, Send, Printer, Copy, CheckCircle2, Clock, AlertCircle,
  BarChart2, Wallet, CreditCard, TrendingUp as SalesIcon, ChevronRight,
  RefreshCw, Building2, User, Mail, Phone, MapPin, Package, Truck,
  UserCheck, ShoppingCart, Share2, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { formatCurrency, cn } from '@/src/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { useFinanceStore, Transaction } from '@/src/stores/financeStore'
import { useFinanceAI } from '@/src/hooks/useFinanceAI'
import { useCompanyStore } from '@/src/stores/companyStore'
import {
  useDocumentStore, SavedDocument, DocType as StoreDocType,
  DOC_TYPE_LABELS, calcTotals, generateDocNumber,
} from '@/src/stores/documentStore'
import DocumentTemplate, { buildPrintHTML, buildEmailBody } from '@/src/components/finance/DocumentTemplate'
import { usePrefsStore, CURRENCY_OPTIONS } from '@/src/stores/prefsStore'
import { useBoubaAction } from '@/src/hooks/useBoubaAction'
import { useReportStore, FinancialReport } from '@/src/stores/reportStore'
import { useAuth } from '@/src/hooks/useAuth'
import { toast } from 'sonner'
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

const COLORS = ['#6C3EF4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899']

type Tab = 'dashboard' | 'transactions' | 'documents' | 'reports' | 'settings'
type DocType = StoreDocType

const DOC_LABELS: Record<DocType, { label: string; icon: React.ElementType; color: string }> = {
  invoice:        { label: 'Facture',           icon: FileText,     color: 'text-primary' },
  quote:          { label: 'Devis',             icon: ClipboardList, color: 'text-warning' },
  receipt:        { label: 'Reçu',              icon: Receipt,      color: 'text-success' },
  proforma:       { label: 'Proforma',          icon: FileCheck,    color: 'text-blue-500' },
  payslip:        { label: 'Fiche de paie',     icon: UserCheck,    color: 'text-emerald-600' },
  purchase_order: { label: 'Bon de commande',   icon: ShoppingCart, color: 'text-orange-500' },
  delivery:       { label: 'Bon de livraison',  icon: Truck,        color: 'text-cyan-500' },
  exit_voucher:   { label: 'Bon de sortie',     icon: Package,      color: 'text-rose-500' },
}

interface DocumentDraft {
  type: DocType
  number: string
  date: string
  clientName: string
  clientEmail: string
  clientAddress: string
  items: { description: string; qty: number; unitPrice: number }[]
  vatRate: number
  notes: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
}

function emptyDraft(type: DocType, vatRate = 20): DocumentDraft {
  return {
    type,
    number: generateDocNumber(type),
    date: new Date().toISOString().slice(0, 10),
    clientName: '', clientEmail: '', clientAddress: '',
    items: [{ description: '', qty: 1, unitPrice: 0 }],
    vatRate, notes: '', status: 'draft',
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, color, trend, trendValue, accentGradient }: {
  title: string; value: string; sub?: string; icon: React.ElementType
  color: string; trend?: 'up' | 'down'; trendValue?: string; accentGradient?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden cursor-default group"
    >
      {/* Top accent gradient bar — thicker */}
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', accentGradient || 'bg-primary')} />
      {/* Radial glow */}
      <div className={cn(
        'absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-[0.06] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.14]',
        color.replace('text-', 'bg-')
      )} />

      <div className="px-5 pt-6 pb-5 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'p-3 rounded-2xl ring-1',
            color.replace('text-', 'bg-') + '/10',
            color.replace('text-', 'ring-') + '/20',
          )}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          {trend && trendValue && (
            <span className={cn(
              'text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5 shadow-sm',
              trend === 'up' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'
            )}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendValue}
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{title}</p>
        <p className="text-[1.9rem] font-black text-gray-900 leading-none tracking-tighter">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-2.5 font-medium">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ t, onDelete, onEdit }: {
  t: Transaction
  onDelete: (t: Transaction) => void
  onEdit: (t: Transaction) => void
}) {
  const { currency } = usePrefsStore()
  return (
    <tr className="hover:bg-gray-50/70 transition-colors group">
      <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap font-medium">
        {format(parseISO(t.date), 'dd MMM yyyy', { locale: fr })}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black',
            t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          )}>
            {t.type === 'income' ? '↑' : '↓'}
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{t.description}</p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn(
          'text-[10px] font-bold px-2.5 py-1 rounded-full border',
          t.type === 'income'
            ? 'bg-violet-50 text-violet-600 border-violet-100'
            : 'bg-gray-50 text-gray-500 border-gray-100'
        )}>
          {t.category}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn('text-sm font-black', t.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn(
          'text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border',
          t.status === 'completed'
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : 'bg-amber-50 text-amber-600 border-amber-100'
        )}>
          {t.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {t.status === 'completed' ? 'Validé' : 'En attente'}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-violet-50 hover:text-violet-600 rounded-lg text-gray-400 transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(t)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add Transaction Modal ─────────────────────────────────────────────────────
function AddTransactionModal({
  isOpen, onClose, onAdd, categories, editData,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (t: Omit<Transaction, 'id'>) => void
  categories: string[]
  editData?: Transaction | null
}) {
  const [form, setForm] = useState<Omit<Transaction, 'id'>>({
    type: 'income',
    amount: 0,
    category: categories[0] || 'Autre',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'completed',
  })

  useEffect(() => {
    if (editData) {
      const { id, ...rest } = editData
      setForm(rest)
    } else {
      setForm({
        type: 'income', amount: 0, category: categories[0] || 'Autre',
        description: '', date: new Date().toISOString().slice(0, 10), status: 'completed',
      })
    }
  }, [editData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount) return toast.error('Remplis tous les champs obligatoires')
    onAdd(form)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-secondary">{editData ? 'Modifier la transaction' : 'Ajouter une transaction'}</h3>
              <button onClick={onClose} className="p-1.5 hover:bg-background rounded-lg text-muted"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-2xl">
                {(['income', 'expense'] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn('py-2 rounded-xl text-sm font-bold transition-all',
                      form.type === t
                        ? t === 'income' ? 'bg-success text-white shadow-sm' : 'bg-danger text-white shadow-sm'
                        : 'text-muted hover:text-secondary'
                    )}
                  >
                    {t === 'income' ? '↑ Revenu' : '↓ Dépense'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Montant (€) *</label>
                  <input type="number" step="0.01" min="0" required
                    value={form.amount || ''}
                    onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Date *</label>
                  <input type="date" required
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Description *</label>
                <input type="text" required
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ex: Prestation développement web"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Statut</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as 'completed' | 'pending' }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="completed">Validé</option>
                    <option value="pending">En attente</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-2.5">
                {editData ? 'Enregistrer les modifications' : 'Ajouter la transaction'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Document Builder ─────────────────────────────────────────────────────────
function DocumentBuilder({ onClose, generateDocument, isProcessing, initialType }: {
  onClose: () => void
  generateDocument: (type: DocType, details: string) => Promise<import('@/src/hooks/useFinanceAI').GeneratedDocDraft | null>
  isProcessing: boolean
  initialType?: DocType
}) {
  const { company } = useCompanyStore()
  const { saveDocument } = useDocumentStore()
  const { currency, defaultVatRate } = usePrefsStore()
  const { callBouba: boubaCall } = useBoubaAction()
  const [mode, setMode] = useState<'choice' | 'ai' | 'manual' | 'preview'>('choice')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [docType, setDocType] = useState<DocType>(initialType || 'invoice')
  const [aiPrompt, setAiPrompt] = useState('')
  const [draft, setDraft] = useState<DocumentDraft>(() => emptyDraft(initialType || 'invoice', defaultVatRate))
  const [previewDoc, setPreviewDoc] = useState<SavedDocument | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Build a SavedDocument from a draft + company snapshot
  const buildSavedDoc = (d: DocumentDraft): Omit<SavedDocument, 'id' | 'createdAt'> => {
    const { totalHT, totalTVA, totalTTC } = calcTotals(d.items, d.vatRate)
    return {
      type: d.type, number: d.number, date: d.date, status: d.status,
      companyName: company.name, companyLogo: company.logo,
      companyAddress: company.address, companyCity: company.city,
      companyPostalCode: company.postalCode, companyCountry: company.country,
      companyPhone: company.phone, companyEmail: company.email,
      companyWebsite: company.website, companySiret: company.siret,
      companyVat: company.vat, companyLegalForm: company.legalForm,
      clientName: d.clientName, clientEmail: d.clientEmail, clientAddress: d.clientAddress,
      items: d.items, vatRate: d.vatRate,
      totalHT, totalTVA, totalTTC, notes: d.notes,
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return
    const result = await generateDocument(docType, aiPrompt)
    if (result) {
      const d: DocumentDraft = { type: docType, ...result }
      setDraft(d)
      setPreviewDoc(buildSavedDoc(d) as SavedDocument)
      setMode('preview')
    } else {
      toast.error('Erreur lors de la génération du document')
    }
  }

  const handleManualPreview = () => {
    setPreviewDoc(buildSavedDoc(draft) as SavedDocument)
    setMode('preview')
  }

  const handleSave = async () => {
    if (!previewDoc) return
    setIsSaving(true)
    try {
      await saveDocument(previewDoc)
      toast.success(`${DOC_LABELS[docType].label} sauvegardée avec succès !`)
      onClose()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    if (!previewDoc) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML(previewDoc))
    win.document.close()
    setTimeout(() => { win.print() }, 400)
  }

  const handleShare = async () => {
    if (!previewDoc) return
    if (!previewDoc.clientEmail) {
      toast.error('Aucune adresse email disponible pour ce client')
      return
    }
    setIsSendingEmail(true)
    try {
      const label = DOC_LABELS[docType].label
      const introHtml = [
        `<p style="margin:0 0 10px;">Bonjour${previewDoc.clientName ? ' <strong>' + previewDoc.clientName + '</strong>' : ''},</p>`,
        `<p style="margin:0 0 10px;">Veuillez trouver ci-dessous ${label.toLowerCase()} N°&nbsp;<strong>${previewDoc.number}</strong> d'un montant de <strong>${formatCurrency(previewDoc.totalTTC, currency)}</strong>.</p>`,
        previewDoc.notes ? `<p style="margin:0 0 10px;">Remarques : ${previewDoc.notes}</p>` : '',
        `<p style="margin:0;">Cordialement,<br><strong>${company.name || 'Notre équipe'}</strong></p>`,
      ].join('')
      const emailBodyHtml = buildEmailBody(previewDoc, introHtml)
      const result = await boubaCall(
        `Envoie le document ${label} N° ${previewDoc.number} par email à ${previewDoc.clientEmail}`,
        [
          `[ENVOI DOCUMENT]`,
          `[EMAIL_TO]${previewDoc.clientEmail}[/EMAIL_TO]`,
          `[EMAIL_SUBJECT]${label} N° ${previewDoc.number}${company.name ? ' — ' + company.name : ''}[/EMAIL_SUBJECT]`,
          `[EMAIL_BODY_HTML]${emailBodyHtml}[/EMAIL_BODY_HTML]`,
          `Type: ${label} | N°: ${previewDoc.number} | Client: ${previewDoc.clientName} | Total: ${formatCurrency(previewDoc.totalTTC, currency)}`,
        ].join('\n')
      )
      if (result.success) {
        toast.success(`Email envoyé à ${previewDoc.clientName || previewDoc.clientEmail}`)
        await saveDocument({ ...previewDoc, status: 'sent' })
        onClose()
      } else {
        toast.error(result.error || "Erreur lors de l'envoi")
      }
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface w-full max-w-3xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {mode !== 'choice' && (
              <button onClick={() => setMode('choice')} className="p-1.5 hover:bg-background rounded-lg text-muted mr-1">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-secondary">
              {mode === 'choice' ? 'Nouveau document' :
               mode === 'ai' ? `Générer avec Bouba — ${DOC_LABELS[docType].label}` :
               mode === 'manual' ? `Saisie manuelle — ${DOC_LABELS[docType].label}` :
               `Aperçu — ${DOC_LABELS[docType].label} N° ${previewDoc?.number}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-background rounded-lg text-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Step 1: Choice ── */}
          {mode === 'choice' && (
            <div className="p-5 space-y-6">
              {!company.name && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <Building2 className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Complétez vos <a href="/settings/profile" className="font-bold underline">infos entreprise</a> pour qu'elles apparaissent sur vos documents.</span>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Type de document</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(DOC_LABELS) as DocType[]).map(t => {
                    const { label, icon: Icon, color } = DOC_LABELS[t]
                    return (
                      <button key={t} onClick={() => { setDocType(t); setDraft(emptyDraft(t, defaultVatRate)) }}
                        className={cn('p-3 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all text-center',
                          docType === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className={cn('p-2 rounded-xl', color.replace('text-', 'bg-') + '/10')}>
                          <Icon className={cn('w-5 h-5', color)} />
                        </div>
                        <span className="font-semibold text-secondary text-xs leading-tight">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Méthode de création</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setMode('ai')}
                    className="p-5 border-2 border-border hover:border-primary/40 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                  >
                    <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <p className="font-bold text-secondary text-sm">Générer avec Bouba</p>
                    <p className="text-xs text-muted text-center">Décris en langage naturel</p>
                  </button>
                  <button onClick={() => setMode('manual')}
                    className="p-5 border-2 border-border hover:border-primary/40 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                  >
                    <div className="p-3 bg-background rounded-2xl group-hover:bg-gray-100 transition-colors">
                      <Edit3 className="w-6 h-6 text-muted" />
                    </div>
                    <p className="font-bold text-secondary text-sm">Remplir manuellement</p>
                    <p className="text-xs text-muted text-center">Formulaire complet</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2a: AI ── */}
          {mode === 'ai' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-2xl text-sm text-primary">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Décris le document et Bouba extrait toutes les informations automatiquement.</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Description du document</label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={5}
                  autoFocus
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder={`Ex: Facture pour Dupont SARL, 3 jours de consulting à 800€/jour, TVA 20%, email client dupont@email.fr`}
                />
              </div>
              <button onClick={handleAIGenerate} disabled={isProcessing || !aiPrompt.trim()}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isProcessing
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Génération en cours...</>
                  : <><Sparkles className="w-4 h-4" /> Générer avec Bouba</>
                }
              </button>
            </div>
          )}

          {/* ── Step 2b: Manual ── */}
          {mode === 'manual' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Numéro</label>
                  <input value={draft.number} onChange={e => setDraft(d => ({ ...d, number: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Date</label>
                  <input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 border border-border rounded-2xl">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Informations client
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Nom / Société *</label>
                    <input value={draft.clientName} onChange={e => setDraft(d => ({ ...d, clientName: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Dupont SARL"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Email</label>
                    <input type="email" value={draft.clientEmail} onChange={e => setDraft(d => ({ ...d, clientEmail: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted">Adresse</label>
                  <input value={draft.clientAddress} onChange={e => setDraft(d => ({ ...d, clientAddress: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="10 rue de la Paix, 75001 Paris"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Lignes</p>
                  <button type="button"
                    onClick={() => setDraft(d => ({ ...d, items: [...d.items, { description: '', qty: 1, unitPrice: 0 }] }))}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[1fr_60px_100px_auto] gap-2 text-[10px] font-bold text-muted uppercase tracking-widest px-1">
                    <span>Description</span><span className="text-center">Qté</span><span>Prix HT</span><span />
                  </div>
                  {draft.items.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap sm:grid sm:grid-cols-[1fr_60px_100px_auto] gap-2 items-center">
                      <input value={item.description}
                        onChange={e => setDraft(d => { const it = [...d.items]; it[idx] = { ...it[idx], description: e.target.value }; return { ...d, items: it } })}
                        className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="Description"
                      />
                      <input type="number" value={item.qty} min="1"
                        onChange={e => setDraft(d => { const it = [...d.items]; it[idx] = { ...it[idx], qty: parseInt(e.target.value) || 1 }; return { ...d, items: it } })}
                        className="w-16 bg-background border border-border rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-center"
                      />
                      <input type="number" value={item.unitPrice} min="0" step="0.01"
                        onChange={e => setDraft(d => { const it = [...d.items]; it[idx] = { ...it[idx], unitPrice: parseFloat(e.target.value) || 0 }; return { ...d, items: it } })}
                        className="w-24 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="0.00"
                      />
                      {draft.items.length > 1 && (
                        <button type="button"
                          onClick={() => setDraft(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }))}
                          className="p-1.5 hover:bg-danger/10 hover:text-danger text-muted rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Live totals */}
                {(() => {
                  const { totalHT, totalTVA, totalTTC } = calcTotals(draft.items, draft.vatRate)
                  return (
                    <div className="flex justify-end">
                      <div className="text-right text-sm space-y-0.5 text-muted bg-background rounded-xl px-4 py-3 border border-border">
                        <p>HT : <span className="font-semibold text-secondary">{totalHT.toFixed(2)} €</span></p>
                        <p>TVA ({draft.vatRate}%) : <span className="font-semibold text-secondary">{totalTVA.toFixed(2)} €</span></p>
                        <p className="text-base font-bold text-secondary">TTC : {totalTTC.toFixed(2)} €</p>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">TVA (%)</label>
                  <input type="number" value={draft.vatRate} min="0" max="100"
                    onChange={e => setDraft(d => ({ ...d, vatRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Statut</label>
                  <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as DocumentDraft['status'] }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="sent">Envoyé</option>
                    <option value="paid">Payé</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Notes / Conditions de paiement (optionnel)</label>
                <textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} rows={2}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder="Paiement sous 30 jours. IBAN : ..."
                />
              </div>

              <button onClick={handleManualPreview}
                disabled={!draft.clientName.trim()}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Eye className="w-4 h-4" /> Prévisualiser le document
              </button>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {mode === 'preview' && previewDoc && (
            <div>
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap p-4 border-b border-border bg-background/60 sticky top-0 z-10">
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs font-semibold border border-border rounded-lg px-3 py-2 hover:bg-background transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
                <button onClick={handleShare} disabled={isSendingEmail}
                  className="flex items-center gap-1.5 text-xs font-semibold border border-border rounded-lg px-3 py-2 hover:bg-background transition-colors disabled:opacity-50"
                >
                  {isSendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                  {isSendingEmail ? 'Envoi...' : 'Envoyer par email'}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setMode(draft.clientName ? 'manual' : 'ai')}
                    className="text-xs font-semibold text-muted hover:text-secondary px-3 py-2 transition-colors"
                  >
                    Modifier
                  </button>
                  <button onClick={handleSave} disabled={isSaving}
                    className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
                  >
                    {isSaving
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sauvegarde...</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" /> Sauvegarder</>
                    }
                  </button>
                </div>
              </div>
              {/* Document preview */}
              <div className="bg-gray-100 p-4 overflow-auto">
                <div className="shadow-xl rounded-lg overflow-hidden">
                  <DocumentTemplate doc={previewDoc} />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FinancePage() {
  const { transactions, goal, addTransaction, updateTransaction, deleteTransaction, getMonthlyStats, loadFromDB, categories, addCategory, removeCategory, setGoal, isLoading } = useFinanceStore()
  const { processFinanceCommand, generateMonthlyReport, generateDocument, analyzeFinances, isProcessing } = useFinanceAI()
  const { documents, deleteDocument: deleteDoc, updateDocumentStatus, loadDocuments } = useDocumentStore()
  const { currency, setCurrency, defaultVatRate, setDefaultVatRate } = usePrefsStore()
  const { callBouba } = useBoubaAction()
  const { reports, addReport, markSent: markReportSent, deleteReport: deleteReportItem } = useReportStore()
  const { user } = useAuth()

  useEffect(() => { loadFromDB(); loadDocuments() }, [])

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [aiCommand, setAiCommand] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [isDocOpen, setIsDocOpen] = useState(false)
  const [previewSavedDoc, setPreviewSavedDoc] = useState<SavedDocument | null>(null)
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null)
  const [isSendingDoc, setIsSendingDoc] = useState<string | null>(null)
  const [reportModal, setReportModal] = useState<{ open: boolean; content: string | null }>({ open: false, content: null })
  const [newGoal, setNewGoal] = useState(goal.target)
  const [newGoalPeriod, setNewGoalPeriod] = useState<'monthly' | 'yearly'>(goal.period)
  const [newVatRate, setNewVatRate] = useState(defaultVatRate)
  const [newCategory, setNewCategory] = useState('')
  const aiInputRef = useRef<HTMLInputElement>(null)

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const stats = getMonthlyStats(currentMonth, currentYear)
  const lastMonthStats = getMonthlyStats(currentMonth === 0 ? 11 : currentMonth - 1, currentMonth === 0 ? currentYear - 1 : currentYear)

  const incomeGrowth = lastMonthStats.income ? Math.round(((stats.income - lastMonthStats.income) / lastMonthStats.income) * 100) : 0
  const expenseGrowth = lastMonthStats.expenses ? Math.round(((stats.expenses - lastMonthStats.expenses) / lastMonthStats.expenses) * 100) : 0
  const pendingAmount = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
  const goalProgress = Math.min((stats.income / goal.target) * 100, 100)

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      const s = getMonthlyStats(d.getMonth(), d.getFullYear())
      return { name: format(d, 'MMM', { locale: fr }), Revenus: s.income, Dépenses: s.expenses, Bénéfice: s.profit }
    })
  }, [transactions])

  const pieData = useMemo(() => {
    const cats: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount })
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchType = typeFilter === 'all' || t.type === typeFilter
      return matchSearch && matchType
    })
  }, [transactions, searchQuery, typeFilter])

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return

    // Check if the command is a question/analysis (not a transaction entry)
    const isAnalysis = /analys|rapport|bilan|compar|évolution|tendance|conseil|comment|combien|quel|pourquoi/i.test(aiCommand)

    if (isAnalysis) {
      setReportModal({ open: true, content: null })
      const analysis = await analyzeFinances(aiCommand)
      setReportModal({ open: true, content: analysis })
      setAiCommand('')
      return
    }

    // Otherwise treat as transaction entry via Bouba
    const result = await processFinanceCommand(aiCommand)
    if (result.success) {
      if (result.data) {
        await addTransaction(result.data)
        toast.success(`✓ ${result.data.type === 'income' ? 'Revenu' : 'Dépense'} ajouté(e) : ${formatCurrency(result.data.amount, currency)}`)
      } else if (result.boubaMessage) {
        // Bouba responded but no structured data — show in report modal
        setReportModal({ open: true, content: result.boubaMessage })
      }
      setAiCommand('')
    } else {
      toast.error(result.error || 'Erreur lors du traitement')
    }
  }

  const handleGenerateReport = async () => {
    setReportModal({ open: true, content: null })
    const reportContent = await generateMonthlyReport()
    setReportModal({ open: true, content: reportContent })
    // Save to report store (once per month)
    const alreadySaved = reports.some(r => r.month === currentMonth && r.year === currentYear)
    if (!alreadySaved) {
      addReport({
        month: currentMonth,
        year: currentYear,
        content: reportContent,
        stats: {
          income: stats.income,
          expenses: stats.expenses,
          profit: stats.profit,
          transactionCount: transactions.length,
        },
      })
    }
  }

  const handleSendReport = async (report: FinancialReport) => {
    const recipientEmail = user?.email || company.email
    if (!recipientEmail) {
      toast.error('Aucun email configuré pour recevoir le rapport')
      return
    }
    const reportDate = new Date(report.year, report.month)
    const monthLabel = format(reportDate, 'MMMM yyyy', { locale: fr })
    const body = `Rapport financier — ${monthLabel}\n\n${report.content}\n\n---\nCA : ${formatCurrency(report.stats.income, currency)}\nDépenses : ${formatCurrency(report.stats.expenses, currency)}\nBénéfice net : ${formatCurrency(report.stats.profit, currency)}`
    const result = await callBouba(
      `Envoie un email à ${recipientEmail} avec comme sujet "Rapport financier ${monthLabel}" et comme corps HTML : ${body.replace(/\n/g, '<br>')}`,
      `[RAPPORT FINANCIER]\nPériode: ${monthLabel}\nCA: ${formatCurrency(report.stats.income, currency)}`
    )
    if (result.success) {
      markReportSent(report.id, new Date().toISOString())
      toast.success(`Rapport envoyé à ${recipientEmail}`)
    } else {
      toast.error(result.error || "Erreur lors de l'envoi du rapport")
    }
  }

  const handleEditTx = (t: Transaction) => { setEditTx(t); setIsAddOpen(true) }
  const handleAddOrEdit = async (data: Omit<Transaction, 'id'>) => {
    if (editTx) { updateTransaction(editTx.id, data); toast.success('Transaction modifiée') }
    else { await addTransaction(data); toast.success('Transaction ajoutée') }
    setEditTx(null)
  }

  const handleDelete = (t: Transaction) => {
    setConfirmDeleteTx(t)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteTx) return
    await deleteTransaction(confirmDeleteTx.id)
    toast.success('Transaction supprimée')
    setConfirmDeleteTx(null)
  }

  const handleDocStatusChange = async (doc: SavedDocument, newStatus: SavedDocument['status']) => {
    updateDocumentStatus(doc.id, newStatus)
    if (doc.type === 'invoice' && newStatus === 'paid') {
      const alreadyExists = transactions.some(t =>
        t.description.includes(doc.number) && t.type === 'income'
      )
      if (!alreadyExists) {
        await addTransaction({
          type: 'income',
          amount: doc.totalTTC,
          category: 'Facture',
          description: `Facture N° ${doc.number}${doc.clientName ? ' — ' + doc.clientName : ''}`,
          date: new Date().toISOString().slice(0, 10),
          status: 'completed',
        })
        toast.success(`CA mis à jour : +${formatCurrency(doc.totalTTC, currency)}`)
      }
    }
  }

  const handleSendDocByEmail = async (doc: SavedDocument) => {
    if (!doc.clientEmail) {
      toast.error('Aucune adresse email disponible pour ce client')
      return
    }
    const docMeta = DOC_LABELS[doc.type]
    setIsSendingDoc(doc.id)
    try {
      const introHtml = [
        `<p style="margin:0 0 10px;">Bonjour${doc.clientName ? ' <strong>' + doc.clientName + '</strong>' : ''},</p>`,
        `<p style="margin:0 0 10px;">Veuillez trouver ci-dessous ${docMeta.label.toLowerCase()} N°&nbsp;<strong>${doc.number}</strong> d'un montant de <strong>${formatCurrency(doc.totalTTC, currency)}</strong>.</p>`,
        doc.notes ? `<p style="margin:0 0 10px;">Remarques : ${doc.notes}</p>` : '',
        `<p style="margin:0;">Cordialement,<br><strong>${doc.companyName || 'Notre équipe'}</strong></p>`,
      ].join('')
      const emailBodyHtml = buildEmailBody(doc, introHtml)
      const result = await callBouba(
        `Envoie le document ${docMeta.label} N° ${doc.number} par email à ${doc.clientEmail}`,
        [
          `[ENVOI DOCUMENT]`,
          `[EMAIL_TO]${doc.clientEmail}[/EMAIL_TO]`,
          `[EMAIL_SUBJECT]${docMeta.label} N° ${doc.number}${doc.companyName ? ' — ' + doc.companyName : ''}[/EMAIL_SUBJECT]`,
          `[EMAIL_BODY_HTML]${emailBodyHtml}[/EMAIL_BODY_HTML]`,
          `Type: ${docMeta.label} | N°: ${doc.number} | Client: ${doc.clientName} | Total: ${formatCurrency(doc.totalTTC, currency)}`,
        ].join('\n')
      )
      if (result.success) {
        toast.success(`Email envoyé à ${doc.clientName || doc.clientEmail}`)
        handleDocStatusChange(doc, 'sent')
      } else {
        toast.error(result.error || "Erreur lors de l'envoi")
      }
    } finally {
      setIsSendingDoc(null)
    }
  }

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Description', 'Catégorie', 'Montant', 'Statut'],
      ...transactions.map(t => [t.date, t.type === 'income' ? 'Revenu' : 'Dépense', t.description, t.category, t.amount.toString(), t.status])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'finance-bouba.csv' })
    a.click()
    toast.success('Export CSV terminé')
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart2 },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'reports', label: 'Rapports', icon: ClipboardList },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8F9FC]">
      {/* Top bar — premium header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 shadow-sm">
        {/* Header gradient band */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 px-6 pt-5 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Finance</h1>
              </div>
              <p className="text-xs text-indigo-300/70 ml-8">Pilotez votre trésorerie en temps réel</p>
            </div>
            {/* AI Command Bar */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-96">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300" />
                <input
                  ref={aiInputRef}
                  value={aiCommand}
                  onChange={e => setAiCommand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiCommand()}
                  placeholder="Demande à Bouba : J'ai reçu 1200€ pour une prestation..."
                  className="w-full bg-white/10 border border-white/15 text-white placeholder:text-indigo-300/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-400/50 focus:bg-white/15 outline-none transition-all"
                />
                {isProcessing && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300 animate-spin" />}
              </div>
              <button
                onClick={handleAiCommand}
                disabled={!aiCommand.trim() || isProcessing}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white border border-white/20 py-2.5 px-4 rounded-2xl text-sm font-semibold transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs — underline style */}
        <div className="flex items-center gap-0 px-2 overflow-x-auto border-t border-gray-100/80">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-indigo-700'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="financeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-8 space-y-6">
        {/* ── Dashboard ─────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="CA du mois" value={formatCurrency(stats.income, currency)} icon={TrendingUp} color="text-violet-600"
                trend={incomeGrowth >= 0 ? 'up' : 'down'} trendValue={`${Math.abs(incomeGrowth)}%`}
                sub={`Objectif ${Math.round(goalProgress)}% atteint`}
                accentGradient="bg-gradient-to-r from-violet-500 to-indigo-500"
              />
              <KpiCard title="Dépenses" value={formatCurrency(stats.expenses, currency)} icon={TrendingDown} color="text-red-500"
                trend={expenseGrowth <= 0 ? 'up' : 'down'} trendValue={`${Math.abs(expenseGrowth)}%`}
                accentGradient="bg-gradient-to-r from-red-400 to-rose-500"
              />
              <KpiCard title="Bénéfice net" value={formatCurrency(stats.profit, currency)} icon={DollarSign} color="text-emerald-600"
                sub={stats.profit >= 0 ? 'Positif ce mois' : 'Déficit ce mois'}
                accentGradient="bg-gradient-to-r from-emerald-400 to-teal-500"
              />
              <KpiCard title="En attente" value={formatCurrency(pendingAmount, currency)} icon={Clock} color="text-amber-500"
                sub={`${transactions.filter(t => t.status === 'pending').length} transaction(s)`}
                accentGradient="bg-gradient-to-r from-amber-400 to-orange-400"
              />
            </div>

            {/* Goal progress */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center ring-1 ring-amber-100">
                    <Target className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-800">Objectif mensuel</span>
                    <p className="text-[11px] text-gray-400 font-medium">{formatCurrency(stats.income, currency)} encaissés sur {formatCurrency(goal.target, currency)}</p>
                  </div>
                </div>
                <span className={cn(
                  'text-sm font-black px-3 py-1.5 rounded-xl',
                  goalProgress >= 100 ? 'bg-emerald-50 text-emerald-600' : goalProgress >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                )}>{Math.round(goalProgress)}%</span>
              </div>
              {/* Progress bar with milestone dots */}
              <div className="relative">
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${goalProgress}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', goalProgress >= 100
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    )}
                  />
                </div>
                {/* Milestone dots */}
                {[25, 50, 75].map(m => (
                  <div
                    key={m}
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white',
                      goalProgress >= m ? 'bg-amber-500' : 'bg-gray-300'
                    )}
                    style={{ left: `calc(${m}% - 4px)` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 px-0">
                {[0, 25, 50, 75, 100].map(m => (
                  <span key={m} className="text-[9px] font-bold text-gray-300">{m}%</span>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-black text-gray-900 text-base">Évolution sur 6 mois</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Revenus · Dépenses · Bénéfice net</p>
                  </div>
                  <button onClick={handleGenerateReport}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Rapport IA
                  </button>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatCurrency(v, currency)} width={70} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E1B4B', borderRadius: '14px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', color: '#fff' }}
                        labelStyle={{ color: '#A5B4FC', fontWeight: 700, fontSize: 11 }}
                        itemStyle={{ color: '#E0E7FF', fontSize: 12 }}
                        formatter={(v: number) => formatCurrency(v, currency)}
                      />
                      <Area type="monotone" dataKey="Revenus" stroke="#7C3AED" strokeWidth={2.5} fill="url(#gRevenue)" dot={false} activeDot={{ r: 5, fill: '#7C3AED', strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="Dépenses" stroke="#F43F5E" strokeWidth={1.5} fill="transparent" strokeDasharray="5 4" dot={false} />
                      <Area type="monotone" dataKey="Bénéfice" stroke="#10B981" strokeWidth={2.5} fill="url(#gProfit)" dot={false} activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                  {[{ color: '#7C3AED', label: 'Revenus', dash: false }, { color: '#F43F5E', label: 'Dépenses', dash: true }, { color: '#10B981', label: 'Bénéfice', dash: false }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <div className={cn('w-4 h-1 rounded-full')} style={{ backgroundColor: l.color, opacity: l.dash ? 0.6 : 1 }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-gray-900 text-sm">Répartition dépenses</h3>
                  <span className="text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-400 uppercase tracking-wider px-2 py-0.5 rounded-full">Ce mois</span>
                </div>
                {pieData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2 py-8">
                    <PieChartIcon className="w-10 h-10 opacity-20" />
                    Aucune dépense enregistrée
                  </div>
                ) : (
                  <>
                    <div className="h-[180px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1E1B4B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: 12 }}
                            formatter={(v: number) => formatCurrency(v, currency)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                        <span className="text-sm font-bold text-gray-800">{formatCurrency(stats.expenses, currency)}</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 pt-3 border-t border-gray-50">
                      {pieData.slice(0, 5).map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-gray-500 truncate max-w-[90px]">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{formatCurrency(item.value, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent transactions preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-violet-50 rounded-xl flex items-center justify-center ring-1 ring-violet-100">
                    <CreditCard className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">Transactions récentes</h3>
                    <p className="text-[10px] text-gray-400">{transactions.length} au total</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Voir tout <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-gray-50/80">
                    {transactions.slice(0, 5).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/70 transition-colors group">
                        <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap font-medium w-20">
                          {format(parseISO(t.date), 'dd MMM', { locale: fr })}
                        </td>
                        <td className="px-3 py-3.5 text-sm font-semibold text-gray-700 truncate max-w-[160px]">{t.description}</td>
                        <td className="px-3 py-3.5">
                          <span className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-full border',
                            t.type === 'income'
                              ? 'bg-violet-50 text-violet-600 border-violet-100'
                              : 'bg-gray-50 text-gray-500 border-gray-100'
                          )}>{t.category}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-black text-right whitespace-nowrap">
                          <span className={t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                        Aucune transaction. Utilisez Bouba pour en ajouter une !
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Transactions ──────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher..."
                    className="bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white w-52 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                  {(['all', 'income', 'expense'] as const).map(f => (
                    <button key={f} onClick={() => setTypeFilter(f)}
                      className={cn('px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                        typeFilter === f
                          ? f === 'income' ? 'bg-emerald-500 text-white shadow-sm'
                            : f === 'expense' ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-600'
                      )}
                    >
                      {f === 'all' ? 'Tout' : f === 'income' ? '↑ Revenus' : '↓ Dépenses'}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">{filteredTx.length} résultat(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-100 py-2 px-3 rounded-xl transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => { setEditTx(null); setIsAddOpen(true) }} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3.5 rounded-xl shadow-sm transition-all">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    {['Date', 'Description', 'Catégorie', 'Montant', 'Statut', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTx.map(t => (
                    <TxRow key={t.id} t={t} onDelete={handleDelete} onEdit={handleEditTx} />
                  ))}
                  {filteredTx.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center text-sm text-gray-400">
                      {isLoading ? 'Chargement...' : 'Aucune transaction trouvée.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Documents ─────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-500">Générez et gérez vos documents professionnels.</p>
                {documents.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-bold text-violet-600">{documents.length}</span> document(s) sauvegardé(s)
                  </p>
                )}
              </div>
              <button onClick={() => setIsDocOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
              >
                <Plus className="w-4 h-4" /> Nouveau document
              </button>
            </div>

            {/* Quick-create type shortcuts */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {(Object.keys(DOC_LABELS) as DocType[]).map(type => {
                const { label, icon: Icon, color } = DOC_LABELS[type]
                return (
                  <motion.button key={type} whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDocOpen(true)}
                    className="bg-white border border-gray-100 shadow-sm rounded-2xl p-3.5 flex flex-col items-center gap-2 hover:border-violet-200 hover:shadow-lg transition-all text-center group"
                  >
                    <div className={cn(
                      'p-2.5 rounded-xl group-hover:scale-110 transition-transform ring-1',
                      color.replace('text-', 'bg-') + '/10',
                      color.replace('text-', 'ring-') + '/20',
                    )}>
                      <Icon className={cn('w-4 h-4', color)} />
                    </div>
                    <p className="font-bold text-gray-600 text-[10px] leading-tight">{label}</p>
                  </motion.button>
                )
              })}
            </div>

            {/* Saved documents list */}
            {documents.length === 0 ? (
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-12 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Aucun document encore</h3>
                  <p className="text-sm text-gray-400 max-w-sm">Créez votre premier document via Bouba en langage naturel ou remplissez un formulaire.</p>
                </div>
                <button onClick={() => setIsDocOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-violet-500/20 transition-all hover:shadow-lg"
                >
                  <Sparkles className="w-4 h-4" /> Générer avec Bouba
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {documents.map(doc => {
                  const docMeta = DOC_LABELS[doc.type] || { label: DOC_TYPE_LABELS[doc.type], icon: FileText, color: 'text-primary' }
                  const Icon = docMeta.icon
                  const statusConfig: Record<SavedDocument['status'], { label: string; bg: string; text: string }> = {
                    draft:     { label: 'Brouillon',  bg: 'bg-gray-100',   text: 'text-gray-500' },
                    sent:      { label: 'Envoyé',     bg: 'bg-blue-50',    text: 'text-blue-600' },
                    paid:      { label: 'Payé',       bg: 'bg-emerald-50', text: 'text-emerald-600' },
                    cancelled: { label: 'Annulé',     bg: 'bg-red-50',     text: 'text-red-500' },
                  }
                  const st = statusConfig[doc.status] || statusConfig.draft
                  return (
                    <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col hover:shadow-md hover:border-violet-100 transition-all overflow-hidden group"
                    >
                      {/* Card top strip */}
                      <div className={cn('h-1 w-full', docMeta.color.replace('text-', 'bg-'))} style={{ opacity: 0.6 }} />

                      <div className="p-4 flex flex-col gap-3">
                        {/* Card header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={cn('p-2.5 rounded-xl shadow-sm', docMeta.color.replace('text-', 'bg-') + '/10')}>
                              <Icon className={cn('w-5 h-5', docMeta.color)} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{docMeta.label}</p>
                              <p className="text-[11px] text-gray-400 font-mono">{doc.number}</p>
                            </div>
                          </div>
                          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', st.bg, st.text,
                            st.bg.replace('bg-', 'border-').replace('-50', '-100').replace('-100', '-200')
                          )}>{st.label}</span>
                        </div>

                        {/* Doc info */}
                        <div className="space-y-1 text-xs text-gray-400">
                          {doc.clientName && (
                            <div className="flex items-center gap-1.5 font-medium text-gray-500"><User className="w-3 h-3" />{doc.clientName}</div>
                          )}
                          <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{format(parseISO(doc.date), 'dd MMM yyyy', { locale: fr })}</div>
                        </div>

                        {/* Totals */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Total TTC</span>
                          <span className="font-bold text-gray-800 text-sm">{formatCurrency(doc.totalTTC, currency)}</span>
                        </div>

                        {/* Status quick-change + Actions */}
                        <div className="flex items-center gap-1">
                          <select
                            value={doc.status}
                            onChange={e => handleDocStatusChange(doc, e.target.value as SavedDocument['status'])}
                            className="flex-1 text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-violet-300 font-semibold text-gray-500 cursor-pointer"
                          >
                            <option value="draft">Brouillon</option>
                            <option value="sent">Envoyé</option>
                            <option value="paid">Payé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                          <div className="flex items-center">
                            <button onClick={() => setPreviewSavedDoc(doc)}
                              className="p-1.5 hover:bg-violet-50 rounded-lg text-gray-400 hover:text-violet-600 transition-colors" title="Aperçu"
                            ><Eye className="w-4 h-4" /></button>
                            <button
                              onClick={() => { const win = window.open('', '_blank'); if (win) { win.document.write(buildPrintHTML(doc)); win.document.close(); setTimeout(() => win.print(), 400) } }}
                              className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700 transition-colors" title="Imprimer / PDF"
                            ><Printer className="w-4 h-4" /></button>
                            <button onClick={() => handleSendDocByEmail(doc)} disabled={isSendingDoc === doc.id}
                              className="p-1.5 hover:bg-violet-50 rounded-lg text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-40" title="Envoyer par email"
                            >{isSendingDoc === doc.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                            <button
                              onClick={() => { if (confirm('Supprimer ce document ?')) { deleteDoc(doc.id); toast.success('Document supprimé') } }}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"
                            ><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Reports ───────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-500">Rapports financiers mensuels générés par Bouba et envoyés par email.</p>
                {reports.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-bold text-violet-600">{reports.length}</span> rapport(s) sauvegardé(s)
                  </p>
                )}
              </div>
              <button onClick={handleGenerateReport} disabled={isProcessing}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-violet-500/25 transition-all">
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Générer le rapport du mois
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <ClipboardList className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-secondary mb-1">Aucun rapport généré</h3>
                  <p className="text-sm text-muted max-w-md">Générez votre premier rapport financier mensuel. Bouba analysera vos données et pourra envoyer un résumé par email.</p>
                </div>
                <button onClick={handleGenerateReport} disabled={isProcessing} className="btn-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Générer le rapport de {format(new Date(), 'MMMM yyyy', { locale: fr })}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(report => {
                  const reportDate = new Date(report.year, report.month)
                  const monthLabel = format(reportDate, 'MMMM yyyy', { locale: fr })
                  return (
                    <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center ring-1 ring-violet-100">
                            <ClipboardList className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 capitalize text-sm">{monthLabel}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{format(parseISO(report.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {report.sentAt && (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Envoyé
                            </span>
                          )}
                          <button onClick={() => handleSendReport(report)}
                            className="p-1.5 hover:bg-violet-50 rounded-lg text-gray-400 hover:text-violet-600 transition-colors" title="Envoyer par email">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { deleteReportItem(report.id); toast.success('Rapport supprimé') }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-violet-50 rounded-xl p-3 text-center border border-violet-100">
                          <p className="text-[10px] font-bold text-violet-400 uppercase mb-1">CA</p>
                          <p className="font-black text-violet-700 text-sm">{formatCurrency(report.stats.income, currency)}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Dépenses</p>
                          <p className="font-black text-red-600 text-sm">{formatCurrency(report.stats.expenses, currency)}</p>
                        </div>
                        <div className={cn('rounded-xl p-3 text-center border', report.stats.profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
                          <p className={cn('text-[10px] font-bold uppercase mb-1', report.stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>Bénéfice</p>
                          <p className={cn('font-black text-sm', report.stats.profit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {formatCurrency(report.stats.profit, currency)}
                          </p>
                        </div>
                      </div>

                      {report.content && (
                        <div className="flex gap-3 items-start p-3.5 bg-violet-50/60 rounded-xl border border-violet-100">
                          <Bot className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-3">"{report.content}"</p>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Settings ──────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-secondary text-lg">Paramètres Finance</h2>
                <p className="text-xs text-muted">Configurez votre espace financier selon vos besoins</p>
              </div>
            </div>

            {/* Row 1: Objectif + Devise */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Objectif financier */}
              <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-secondary">Objectif financier</h3>
                </div>

                {/* Period toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Période</label>
                  <div className="flex rounded-xl border border-border overflow-hidden">
                    {(['monthly', 'yearly'] as const).map(p => (
                      <button key={p} onClick={() => setNewGoalPeriod(p)}
                        className={cn('flex-1 py-2.5 text-xs font-semibold transition-all',
                          newGoalPeriod === p ? 'bg-primary text-white' : 'text-muted hover:bg-background'
                        )}>
                        {p === 'monthly' ? 'Mensuel' : 'Annuel'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    Objectif {newGoalPeriod === 'monthly' ? 'mensuel' : 'annuel'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="number" value={newGoal} onChange={e => setNewGoal(Number(e.target.value))} min="0"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  {newGoalPeriod === 'yearly' && (
                    <p className="text-[11px] text-muted">≈ {formatCurrency(Math.round(newGoal / 12), currency)} / mois</p>
                  )}
                  {newGoalPeriod === 'monthly' && (
                    <p className="text-[11px] text-muted">≈ {formatCurrency(newGoal * 12, currency)} / an</p>
                  )}
                </div>

                {/* Current progress */}
                <div className="bg-background rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted">Ce mois</span>
                    <span className="text-xs font-bold text-secondary">{formatCurrency(stats.income, currency)}</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((stats.income / (newGoalPeriod === 'yearly' ? newGoal / 12 : newGoal)) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', stats.income >= (newGoalPeriod === 'yearly' ? newGoal / 12 : newGoal) ? 'bg-emerald-500' : 'bg-primary')}
                    />
                  </div>
                  <p className="text-[10px] text-muted text-right">
                    {Math.round((stats.income / (newGoalPeriod === 'yearly' ? newGoal / 12 : newGoal)) * 100)}% atteint
                  </p>
                </div>

                <button onClick={() => { setGoal({ ...goal, target: newGoal, period: newGoalPeriod }); toast.success('Objectif mis à jour') }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  <CheckCircle2 className="w-4 h-4" /> Sauvegarder l'objectif
                </button>
              </div>

              {/* Devise */}
              <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-secondary">Devise</h3>
                    <p className="text-[11px] text-muted">Affichée sur toute la plateforme</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {CURRENCY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setCurrency(opt.value)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                        currency === opt.value
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-background'
                      )}
                    >
                      <span className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0',
                        currency === opt.value ? 'bg-primary text-white' : 'bg-background text-secondary'
                      )}>{opt.symbol}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-secondary text-sm">{opt.label}</p>
                        <p className="text-[11px] text-muted">{opt.value}</p>
                      </div>
                      {currency === opt.value && (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: TVA + Catégories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TVA par défaut */}
              <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-secondary">TVA par défaut</h3>
                    <p className="text-[11px] text-muted">Appliquée automatiquement aux nouveaux documents</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[0, 5.5, 10, 20].map(rate => (
                    <button key={rate} onClick={() => setNewVatRate(rate)}
                      className={cn(
                        'py-3 rounded-xl border-2 text-sm font-bold transition-all',
                        newVatRate === rate
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-border hover:border-amber-300 text-muted'
                      )}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Taux personnalisé</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type="number" value={newVatRate} onChange={e => setNewVatRate(parseFloat(e.target.value) || 0)}
                        min="0" max="100" step="0.5"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">%</span>
                    </div>
                    <button onClick={() => { setDefaultVatRate(newVatRate); toast.success(`TVA par défaut : ${newVatRate}%`) }}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> OK
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-amber-700">
                    TVA actuelle : <span className="font-bold">{defaultVatRate}%</span>
                    {defaultVatRate === 0 && ' — Exonéré de TVA'}
                  </p>
                </div>
              </div>

              {/* Catégories */}
              <div className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-secondary">Catégories</h3>
                    <p className="text-[11px] text-muted">{categories.length} catégorie{categories.length > 1 ? 's' : ''} configurée{categories.length > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <span key={cat}
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-medium text-secondary hover:border-red-300 transition-colors">
                      {cat}
                      <button onClick={() => { removeCategory(cat); toast.success(`Catégorie "${cat}" supprimée`) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-3.5 h-3.5 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory(''); toast.success('Catégorie ajoutée') } }}
                    placeholder="Nouvelle catégorie..."
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button onClick={() => { if (newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory(''); toast.success('Catégorie ajoutée') } }}
                    className="btn-primary px-4">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Export (full width) */}
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Download className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-secondary">Export des données</h3>
                  <p className="text-[11px] text-muted">Téléchargez vos données financières</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={exportCSV}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center group-hover:border-primary/30">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-secondary">Export CSV</p>
                    <p className="text-[11px] text-muted">Toutes les transactions</p>
                  </div>
                  <Download className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                </button>

                <button onClick={() => {
                    const data = JSON.stringify({ transactions, categories, goal }, null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url
                    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`
                    a.click(); URL.revokeObjectURL(url)
                    toast.success('Export JSON téléchargé')
                  }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center group-hover:border-primary/30">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-secondary">Export JSON</p>
                    <p className="text-[11px] text-muted">Données complètes</p>
                  </div>
                  <Download className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                </button>

                <button onClick={() => window.print()}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center group-hover:border-primary/30">
                    <Printer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-secondary">Imprimer</p>
                    <p className="text-[11px] text-muted">Résumé du tableau de bord</p>
                  </div>
                  <Printer className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Transaction Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmDeleteTx(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 text-danger" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-secondary text-lg">Supprimer la transaction ?</h3>
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-secondary">{confirmDeleteTx.description}</span>
                    {' '}— {formatCurrency(confirmDeleteTx.amount, currency)}
                  </p>
                  <p className="text-xs text-muted">Cette action est irréversible.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setConfirmDeleteTx(null)} className="py-2.5 rounded-2xl border border-border text-sm font-semibold text-secondary hover:bg-background transition-colors">
                    Annuler
                  </button>
                  <button onClick={confirmDelete} className="py-2.5 rounded-2xl bg-danger text-white text-sm font-bold hover:bg-danger/90 transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); setEditTx(null) }}
        onAdd={handleAddOrEdit}
        categories={categories}
        editData={editTx}
      />

      {/* Document Builder Modal */}
      <AnimatePresence>
        {isDocOpen && (
          <DocumentBuilder
            onClose={() => setIsDocOpen(false)}
            generateDocument={generateDocument}
            isProcessing={isProcessing}
          />
        )}
      </AnimatePresence>

      {/* Saved Document Preview Modal */}
      <AnimatePresence>
        {previewSavedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewSavedDoc(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-3xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-bold text-secondary">{DOC_LABELS[previewSavedDoc.type]?.label || DOC_TYPE_LABELS[previewSavedDoc.type]} — N° {previewSavedDoc.number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const win = window.open('', '_blank'); if (win) { win.document.write(buildPrintHTML(previewSavedDoc)); win.document.close(); setTimeout(() => win.print(), 400) } }}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-background transition-colors"
                  ><Printer className="w-3.5 h-3.5" /> Imprimer</button>
                  <button onClick={() => setPreviewSavedDoc(null)} className="p-1.5 hover:bg-background rounded-lg text-muted"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 p-4">
                <div className="shadow-xl rounded-lg overflow-hidden">
                  <DocumentTemplate doc={previewSavedDoc!} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Monthly Report Modal */}
      <AnimatePresence>
        {reportModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setReportModal({ open: false, content: null })}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white relative overflow-hidden">
                <div className="absolute -top-4 -right-4 opacity-10"><Bot className="w-28 h-28" /></div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Analyse IA</span>
                </div>
                <h3 className="text-xl font-display font-bold">Rapport Financier</h3>
                <p className="text-sm opacity-80">{format(new Date(), 'MMMM yyyy', { locale: fr })}</p>
              </div>
              <div className="p-6 space-y-5">
                {!reportModal.content ? (
                  <div className="space-y-3 py-4">
                    {[1, 0.75, 0.9].map((w, i) => (
                      <div key={i} className="h-3 bg-background animate-pulse rounded" style={{ width: `${w * 100}%` }} />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <p className="text-secondary text-sm leading-relaxed italic">"{reportModal.content}"</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-background rounded-2xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-muted uppercase mb-1">CA</p>
                    <p className="font-bold text-secondary text-sm">{formatCurrency(stats.income, currency)}</p>
                  </div>
                  <div className="bg-background rounded-2xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-muted uppercase mb-1">Dépenses</p>
                    <p className="font-bold text-danger text-sm">{formatCurrency(stats.expenses, currency)}</p>
                  </div>
                  <div className="bg-background rounded-2xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-muted uppercase mb-1">Bénéfice</p>
                    <p className={cn('font-bold text-sm', stats.profit >= 0 ? 'text-success' : 'text-danger')}>{formatCurrency(stats.profit, currency)}</p>
                  </div>
                </div>
                <button onClick={() => setReportModal({ open: false, content: null })} className="w-full btn-primary py-3">
                  Compris, merci Bouba !
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
