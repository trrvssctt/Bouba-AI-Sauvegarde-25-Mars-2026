import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Download,
  Eye,
  X,
  Clock,
  Ban,
  Loader2,
  AlertTriangle,
  CalendarClock,
  UserCheck,
  UserX,
  RefreshCw,
  Mail,
  Bell,
  Tag,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

interface UpgradeRequest {
  id: string
  userId: string
  fromPlan: string
  toPlan: string
  paymentMethod: 'wave' | 'card'
  paymentReference?: string
  stripeSessionId?: string
  amount: number
  months_paid?: number
  next_payment_date?: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  adminNote?: string
  decidedAt?: string
  createdAt: string
  email: string
  firstName?: string
  lastName?: string
  currentPlan?: string
}

const REJECTION_REASONS = [
  'Référence de paiement introuvable',
  'Montant incorrect',
  'Paiement non reçu',
  'Référence déjà utilisée',
  'Document frauduleux',
  'Autre raison',
]

const planBadge = (plan: string) => {
  const map: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-600',
    pro: 'bg-violet-100 text-violet-700',
    enterprise: 'bg-amber-100 text-amber-700',
  }
  return map[plan] || 'bg-gray-100 text-gray-600'
}

const statusBadge = (status: string) => {
  if (status === 'pending') return 'bg-warning/15 text-warning'
  if (status === 'approved') return 'bg-success/15 text-success'
  return 'bg-danger/15 text-danger'
}

const statusLabel = (status: string) => {
  if (status === 'pending') return 'En attente'
  if (status === 'approved') return 'Approuvé'
  return 'Refusé'
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  request: UpgradeRequest | null
  onClose: () => void
  onDecide: (id: string, action: 'approve' | 'reject', rejectionReason?: string) => Promise<void>
}

function DetailDrawer({ request, onClose, onDecide }: DetailDrawerProps) {
  const [showConfirm, setShowConfirm] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setShowConfirm(null)
    setRejectionReason('')
    setOtherReason('')
  }, [request?.id])

  if (!request) return null

  const isPending = request.status === 'pending'
  const name = [request.firstName, request.lastName].filter(Boolean).join(' ') || request.email
  const amountEur = (request.amount / 100).toFixed(0)

  const handleDecide = async (action: 'approve' | 'reject') => {
    const reason = rejectionReason === 'Autre raison' ? otherReason : rejectionReason
    if (action === 'reject' && !reason.trim()) {
      toast.error('Veuillez sélectionner un motif de refus')
      return
    }
    setLoading(true)
    await onDecide(request.id, action, reason || undefined)
    setLoading(false)
    setShowConfirm(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-surface border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-secondary text-lg">Demande d'upgrade</h2>
            <p className="text-xs text-muted mt-0.5">{name} — {request.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-xl text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase', statusBadge(request.status))}>
              {statusLabel(request.status)}
            </span>
            <span className="text-xs text-muted">
              {new Date(request.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Plan transition */}
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted uppercase font-bold mb-1">Plan actuel</p>
              <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase', planBadge(request.fromPlan))}>
                {request.fromPlan}
              </span>
            </div>
            <div className="text-muted text-xl">→</div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted uppercase font-bold mb-1">Plan demandé</p>
              <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase', planBadge(request.toPlan))}>
                {request.toPlan}
              </span>
            </div>
          </div>

          {/* Payment info */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-secondary">Informations de paiement</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase">Méthode</p>
                <p className="font-medium text-secondary capitalize">{request.paymentMethod === 'wave' ? 'Wave Mobile' : 'Carte bancaire'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase">Montant total</p>
                <p className="font-bold text-secondary">{amountEur} €</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase">Mois payés</p>
                <p className="font-bold text-secondary">{request.months_paid || 1} mois</p>
              </div>
              {request.next_payment_date && (
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase">Prochain paiement</p>
                  <p className="font-bold text-primary">
                    {new Date(request.next_payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {request.paymentReference && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-muted uppercase">Référence Wave</p>
                  <p className="font-mono font-bold text-primary text-base mt-0.5 bg-primary/5 rounded-xl px-3 py-2">
                    {request.paymentReference}
                  </p>
                </div>
              )}
              {request.stripeSessionId && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-muted uppercase">Session Stripe</p>
                  <p className="font-mono text-xs text-muted mt-0.5 truncate">{request.stripeSessionId}</p>
                </div>
              )}
            </div>
          </div>

          {/* User info */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-sm font-bold text-secondary">Utilisateur</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-muted">Nom :</span> <span className="font-medium text-secondary">{name}</span></p>
              <p><span className="text-muted">Email :</span> <span className="font-medium text-secondary">{request.email}</span></p>
              {request.currentPlan && (
                <p><span className="text-muted">Plan actuel en DB :</span> <span className="font-medium text-secondary">{request.currentPlan}</span></p>
              )}
            </div>
          </div>

          {/* Decision info (already decided) */}
          {!isPending && (
            <div className={cn('p-4 rounded-2xl border text-sm space-y-1',
              request.status === 'approved' ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'
            )}>
              <p className="font-bold">{request.status === 'approved' ? '✓ Approuvé' : '✗ Refusé'}</p>
              {request.decidedAt && (
                <p className="text-muted text-xs">{new Date(request.decidedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              )}
              {request.rejectionReason && (
                <p><span className="text-muted">Motif :</span> {request.rejectionReason}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions (pending only) */}
        {isPending && (
          <div className="p-6 border-t border-border space-y-4">
            {!showConfirm && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm('approve')}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Approuver
                </button>
                <button
                  onClick={() => setShowConfirm('reject')}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Refuser
                </button>
              </div>
            )}

            {/* Confirmation APPROVE */}
            {showConfirm === 'approve' && (
              <div className="space-y-3">
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Cette action est <strong>irréversible</strong>. Le plan de l'utilisateur sera immédiatement activé et un email lui sera envoyé.</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirm(null)} className="flex-1 btn-secondary py-2.5 text-sm">
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDecide('approve')}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-success text-white hover:bg-success/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Confirmer l'approbation
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation REJECT */}
            {showConfirm === 'reject' && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-secondary">Motif du refus *</p>
                <div className="space-y-1.5">
                  {REJECTION_REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRejectionReason(r)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all',
                        rejectionReason === r
                          ? 'border-danger bg-danger/5 text-secondary font-medium'
                          : 'border-border text-muted hover:border-danger/30'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {rejectionReason === 'Autre raison' && (
                  <textarea
                    value={otherReason}
                    onChange={e => setOtherReason(e.target.value)}
                    placeholder="Précisez le motif…"
                    rows={2}
                    className="w-full input-field resize-none text-sm"
                  />
                )}
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Cette action est <strong>irréversible</strong>. Un email sera envoyé à l'utilisateur pour l'informer du refus.</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirm(null)} className="flex-1 btn-secondary py-2.5 text-sm">
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDecide('reject')}
                    disabled={loading || !rejectionReason}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-danger text-white hover:bg-danger/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Confirmer le refus
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  overdue:  { label: 'En retard',   bg: 'bg-danger/10',  text: 'text-danger',  border: 'border-danger/20' },
  critical: { label: 'Critique',    bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  warning:  { label: 'Bientôt',     bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  upcoming: { label: 'Ce mois',     bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
}

const REVENUE_SOURCE_LABELS: Record<string, string> = {
  subscription: 'Nouveaux abonnements',
  renewal: 'Réabonnements',
  upgrade: 'Upgrades validés',
}

function fmtRevenue(amount: number, currency: string): string {
  // Les paiements Stripe sont en centimes ; les upgrades Wave en XOF entiers
  const value = currency === 'EUR' && amount > 200 ? amount / 100 : amount
  const symbol = currency === 'EUR' ? '€' : currency === 'XOF' ? 'FCFA' : currency
  return `${value.toLocaleString('fr-FR')} ${symbol}`
}

export default function AdminBillingPage() {
  const [stats, setStats] = useState<any>(null)
  const [revenue, setRevenue] = useState<{ sources: any[]; monthly: any[] } | null>(null)
  const [monthEnd, setMonthEnd] = useState<{ autoEnabled: boolean; data: any[] } | null>(null)
  const [sendingRenewalId, setSendingRenewalId] = useState<string | null>(null)

  const fetchMonthEnd = useCallback(() => {
    fetch('/api/admin/billing/month-end-invoices', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setMonthEnd({ autoEnabled: j.autoEnabled, data: j.data }) })
      .catch(() => {})
  }, [])

  const handleSendRenewal = async (userId: string, email: string) => {
    setSendingRenewalId(userId)
    try {
      const res = await fetch('/api/admin/billing/month-end-invoices/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (json.emailSent) toast.success(json.message)
      else toast.warning(json.message)
      fetchMonthEnd()
    } catch (err: any) {
      toast.error(err.message || `Erreur lors de l'envoi à ${email}`)
    } finally {
      setSendingRenewalId(null)
    }
  }
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([])
  const [failedPayments, setFailedPayments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)
  const [relancingBouba, setRelancingBouba] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const prevPendingRef = useRef<number | null>(null)

  const handleSendInvoice = async (userId: string, paymentId?: string, upgradeRequestId?: string) => {
    const key = upgradeRequestId || paymentId || userId
    setSendingInvoiceId(key)
    try {
      const res = await fetch('/api/admin/billing/send-invoice', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, paymentId, upgradeRequestId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Facture envoyée par email au client.')
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi de la facture.')
    } finally {
      setSendingInvoiceId(null)
    }
  }

  const fetchUpgradeRequests = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/admin/billing/upgrade-requests', { credentials: 'include' })
      const j = await res.json()
      if (j.data) {
        setUpgradeRequests(j.data)
        setLastRefresh(new Date())
        const pending = j.data.filter((r: any) => r.status === 'pending').length
        if (prevPendingRef.current !== null && pending > prevPendingRef.current && silent) {
          toast(`🔔 ${pending - prevPendingRef.current} nouvelle(s) demande(s) d'upgrade !`, {
            description: 'Faites défiler vers la section Demandes d\'upgrade.',
            duration: 6000,
          })
        }
        prevPendingRef.current = pending
      }
    } catch {
      if (!silent) toast.error('Erreur demandes upgrade.')
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    await Promise.all([
      fetch('/api/admin/billing/stats', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setStats(j.data) })
        .catch(() => toast.error('Erreur stats MRR.')),

      fetchUpgradeRequests(false),

      fetch('/api/admin/billing/failed-payments', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setFailedPayments(j.data.map((f: any) => ({ ...f, name: `${f.firstName} ${f.lastName}` }))) })
        .catch(() => {}),

      fetch('/api/admin/billing/transactions', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setTransactions(j.data.map((t: any) => ({ ...t, name: `${t.firstName} ${t.lastName}` }))) })
        .catch(() => {}),

      fetch('/api/admin/billing/upcoming-payments', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setUpcomingPayments(j.data) })
        .catch(() => {})
        .finally(() => setLoadingUpcoming(false)),

      fetch('/api/admin/billing/revenue', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setRevenue(j.data) })
        .catch(() => {}),

      Promise.resolve(fetchMonthEnd()),
    ])
  }, [fetchUpgradeRequests, fetchMonthEnd])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Auto-refresh toutes les 30s ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => fetchUpgradeRequests(true), 30_000)
    return () => clearInterval(interval)
  }, [fetchUpgradeRequests])

  const handleDecide = async (id: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      const res = await fetch(`/api/admin/billing/upgrade-requests/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast.success(action === 'approve' ? 'Upgrade approuvé ! L\'utilisateur a été notifié.' : 'Demande refusée. L\'utilisateur a été notifié.')

      // Rafraîchir la liste
      setUpgradeRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', rejectionReason } : r)
      )
      // Mettre à jour le drawer
      setSelectedRequest(prev => prev?.id === id
        ? { ...prev, status: action === 'approve' ? 'approved' : 'rejected', rejectionReason }
        : prev
      )
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la décision')
    }
  }

  const handleUnblock = async (id: string) => {
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      setFailedPayments(p => p.filter(f => f.id !== id))
      toast.success('Compte débloqué manuellement.')
    } catch {
      toast.error('Erreur lors du déblocage.')
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    setTogglingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUpcomingPayments(prev =>
        prev.map(u => u.id === userId ? { ...u, status: data.newStatus } : u)
      )
      toast.success(data.newStatus === 'suspended' ? 'Compte suspendu.' : 'Compte réactivé.')
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du changement de statut.')
    } finally {
      setTogglingId(null)
    }
  }

  const mrrCards = stats && stats.mrr ? [
    { label: 'MRR actuel', value: `${stats.mrr.toFixed(0)} €`, trend: `${stats.newCount || 0} clients actifs`, up: true },
    { label: 'ARR projeté', value: `${stats.arr ? stats.arr.toFixed(0) : '0'} €`, trend: '+12 mois', up: true },
    { label: 'Nouveau MRR (ce mois)', value: `${stats.newMrr ? stats.newMrr.toFixed(0) : '0'} €`, trend: `+${stats.newCount || 0} clients`, up: true },
    { label: 'Churn MRR', value: `${stats.churnMrr ? stats.churnMrr.toFixed(0) : '0'} €`, trend: `${stats.churnCount || 0} client(s)`, up: false },
  ] : []

  const pendingCount = upgradeRequests.filter(r => r.status === 'pending').length

  // Relances par email (individuelle : [id] — groupée : liste d'ids)
  const [remindingIds, setRemindingIds] = useState<Set<string>>(new Set())

  const handleSendReminders = async (userIds: string[], label?: string) => {
    const ids = [...new Set(userIds.filter(Boolean))]
    if (ids.length === 0) { toast.error('Aucun destinataire à relancer'); return }
    setRelancingBouba(true)
    setRemindingIds(new Set(ids))
    try {
      const res = await fetch('/api/admin/billing/send-reminders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (json.emailSent) toast.success(`${label ? label + ' — ' : ''}${json.message}`)
      else toast.warning(json.message)
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la relance')
    } finally {
      setRelancingBouba(false)
      setRemindingIds(new Set())
    }
  }

  // Télécharger la facture PDF (nouvel onglet)
  const handleDownloadInvoice = (userId: string, opts: { paymentId?: string; upgradeRequestId?: string }) => {
    const params = new URLSearchParams({ userId })
    if (opts.paymentId) params.set('paymentId', opts.paymentId)
    if (opts.upgradeRequestId) params.set('upgradeRequestId', opts.upgradeRequestId)
    window.open(`/api/admin/billing/invoice-pdf?${params}`, '_blank')
  }

  return (
    <div className="space-y-8">
      {/* ── Banner alerte demandes en attente ── */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-800 text-sm">
              {pendingCount} demande{pendingCount > 1 ? 's' : ''} d'upgrade en attente de validation
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Vérifiez les références de paiement et approuvez ou refusez les demandes.
            </p>
          </div>
          <button
            onClick={() => {
              document.getElementById('upgrade-requests-section')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="shrink-0 text-xs font-bold text-amber-700 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-xl transition-colors"
          >
            Voir les demandes
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-secondary">Facturation</h1>
          <p className="text-sm text-muted mt-0.5">Revenus, impayés et demandes d'upgrade.</p>
        </div>
        <button
          onClick={() => toast.info('Export CSV en cours…')}
          className="btn-ghost border border-border text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* MRR Cards */}
      {mrrCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {mrrCards.map(s => (
            <div key={s.label} className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <DollarSign className="w-5 h-5 text-primary" />
                <div className={cn('flex items-center gap-0.5 text-xs font-bold', s.up ? 'text-success' : 'text-danger')}>
                  {s.up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {s.trend}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-bold text-secondary mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Revenus encaissés (abonnements, réabonnements, upgrades) ── */}
      <div className="space-y-4">
        <h3 className="font-bold text-secondary flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" />
          Revenus encaissés
        </h3>
        {!revenue ? (
          <div className="glass-card py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>
        ) : revenue.sources.length === 0 ? (
          <div className="glass-card py-8 text-center text-sm text-muted">Aucun encaissement enregistré pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(['subscription', 'renewal', 'upgrade'] as const).map(sourceKey => {
              const rows = revenue.sources.filter(s => s.source === sourceKey)
              const count = rows.reduce((n, r) => n + r.count, 0)
              return (
                <div key={sourceKey} className="glass-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{REVENUE_SOURCE_LABELS[sourceKey]}</p>
                    <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full">{count} paiement{count > 1 ? 's' : ''}</span>
                  </div>
                  {rows.length === 0 ? (
                    <p className="text-lg font-bold text-muted/50">—</p>
                  ) : rows.map(r => (
                    <div key={r.currency}>
                      <p className="text-xl font-bold text-secondary">{fmtRevenue(r.total, r.currency)}</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        dont <span className="font-bold text-success">{fmtRevenue(r.thisMonth, r.currency)}</span> ce mois-ci
                      </p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Échéances du mois — factures de renouvellement ──────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-secondary flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Échéances du mois — factures de renouvellement
            {monthEnd && monthEnd.data.length > 0 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded-full">
                {monthEnd.data.length}
              </span>
            )}
          </h3>
          {monthEnd && (
            <span className={cn(
              'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border',
              monthEnd.autoEnabled
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-warning/10 text-warning border-warning/20'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', monthEnd.autoEnabled ? 'bg-success animate-pulse' : 'bg-warning')} />
              {monthEnd.autoEnabled ? 'Envoi automatique actif (email + PDF joint)' : 'Envoi automatique désactivé'}
            </span>
          )}
        </div>

        <div className="glass-card overflow-hidden">
          {!monthEnd ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>
          ) : monthEnd.data.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">
              <Clock className="w-8 h-8 mx-auto mb-2 text-border" />
              Aucun plan payant n'arrive à échéance ce mois-ci.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-background/50 border-b border-border">
                  <tr>
                    {['Client', 'Plan', 'Échéance', 'Montant', 'Envoi de la facture', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthEnd.data.map((r: any) => {
                    const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email
                    const symbol = r.currency === 'EUR' ? '€' : r.currency === 'XOF' ? 'FCFA' : r.currency
                    const overdue = new Date(r.periodEnd).getTime() < Date.now()
                    return (
                      <tr key={r.userId} className="hover:bg-background/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-secondary">{name}</p>
                          <p className="text-[11px] text-muted">{r.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase">{r.planId}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={cn('text-sm font-medium', overdue ? 'text-danger' : 'text-secondary')}>
                            {new Date(r.periodEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                          </p>
                          {overdue && <p className="text-[10px] text-danger font-bold">Échue</p>}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold text-secondary">
                          {r.displayAmount.toLocaleString('fr-FR')} {symbol}
                        </td>
                        <td className="px-4 py-3.5">
                          {r.sentAt ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 uppercase">
                                <CheckCircle className="w-3 h-3" />
                                {r.sentAuto ? 'Envoyée (auto)' : 'Envoyée (manuel)'}
                              </span>
                              <p className="text-[10px] text-muted mt-1">
                                {new Date(r.sentAt).toLocaleDateString('fr-FR')} · {r.invoiceNumber}
                                {r.emailSent === false && <span className="text-warning font-bold"> · email non parti</span>}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 uppercase">
                              <Clock className="w-3 h-3" /> En attente d'envoi auto
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => window.open(`/api/admin/billing/invoice-pdf?userId=${r.userId}&type=renewal`, '_blank')}
                              title="Voir la facture de renouvellement (PDF)"
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-border text-secondary hover:bg-background transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Voir
                            </button>
                            <button
                              onClick={() => handleSendRenewal(r.userId, r.email)}
                              disabled={sendingRenewalId === r.userId}
                              title={r.sentAt ? 'Renvoyer la facture par email' : 'Envoyer la facture maintenant sans attendre l\'envoi auto'}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-primary/25 text-primary hover:bg-primary/8 transition-colors disabled:opacity-50"
                            >
                              {sendingRenewalId === r.userId
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Mail className="w-3.5 h-3.5" />}
                              {r.sentAt ? 'Renvoyer' : 'Envoyer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Prochains paiements ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-secondary flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Prochains paiements
            {upcomingPayments.filter(u => u.urgency === 'overdue' || u.urgency === 'critical').length > 0 && (
              <span className="px-2 py-0.5 bg-danger/10 text-danger border border-danger/20 text-[10px] font-bold rounded-full">
                {upcomingPayments.filter(u => u.urgency === 'overdue' || u.urgency === 'critical').length} urgents
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">30 prochains jours</span>
            {upcomingPayments.some(u => u.urgency === 'overdue' || u.urgency === 'critical') && (
              <button
                onClick={() => handleSendReminders(
                  upcomingPayments.filter(u => u.urgency === 'overdue' || u.urgency === 'critical').map(u => u.id),
                  'Relance groupée'
                )}
                disabled={relancingBouba}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-danger/25 text-danger hover:bg-danger/8 transition-colors disabled:opacity-50"
              >
                {relancingBouba ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Relancer les urgents
              </button>
            )}
            <button
              onClick={() => {
                setLoadingUpcoming(true)
                fetch('/api/admin/billing/upcoming-payments', { credentials: 'include' })
                  .then(r => r.json())
                  .then(j => { if (j.data) setUpcomingPayments(j.data) })
                  .finally(() => setLoadingUpcoming(false))
              }}
              className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loadingUpcoming && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          {loadingUpcoming ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : upcomingPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">
              <CalendarClock className="w-8 h-8 mx-auto mb-2 text-border" />
              Aucun renouvellement à venir dans les 30 prochains jours.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-background/50 border-b border-border">
                  <tr>
                    {['Utilisateur', 'Plan', 'Prochain paiement', 'Montant', 'Urgence', 'Statut', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcomingPayments.map(u => {
                    const urgCfg = URGENCY_CONFIG[u.urgency as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG.upcoming
                    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
                    const isActive = u.status === 'active'
                    const toggling = togglingId === u.id
                    return (
                      <tr key={u.id} className={cn('hover:bg-background/30 transition-colors', !isActive && 'opacity-60')}>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-secondary">{name}</p>
                          <p className="text-[11px] text-muted">{u.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-secondary">
                            {new Date(u.nextPayment).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-muted">
                            {(() => {
                              const diff = Math.ceil((new Date(u.nextPayment).getTime() - Date.now()) / 86400000)
                              return diff <= 0 ? `Expiré depuis ${Math.abs(diff)}j` : `Dans ${diff} jour${diff > 1 ? 's' : ''}`
                            })()}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold text-secondary">
                          {u.amount} {u.currency || '€'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase', urgCfg.bg, urgCfg.text, urgCfg.border)}>
                            {urgCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase',
                            isActive ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
                          )}>
                            {isActive ? 'Actif' : 'Suspendu'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendReminders([u.id], name)}
                              disabled={remindingIds.has(u.id)}
                              title="Envoyer un email de relance à ce client"
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-primary/25 text-primary hover:bg-primary/8 transition-all disabled:opacity-50"
                            >
                              {remindingIds.has(u.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                              Relancer
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id, u.status)}
                              disabled={toggling}
                              className={cn(
                                'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all disabled:opacity-50',
                                isActive
                                  ? 'bg-danger/8 text-danger border-danger/20 hover:bg-danger/15'
                                  : 'bg-success/8 text-success border-success/20 hover:bg-success/15'
                              )}
                            >
                              {toggling
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : isActive
                                ? <><UserX className="w-3.5 h-3.5" /> Suspendre</>
                                : <><UserCheck className="w-3.5 h-3.5" /> Activer</>
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Demandes d'upgrade ── */}
        <div id="upgrade-requests-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Demandes d'upgrade
              {pendingCount > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">
                Mis à jour {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <button
                onClick={() => fetchUpgradeRequests(false)}
                disabled={loadingRequests}
                className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loadingRequests && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="glass-card divide-y divide-border">
            {loadingRequests ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted" />
              </div>
            ) : upgradeRequests.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">Aucune demande.</div>
            ) : (
              upgradeRequests.map(req => {
                const name = [req.firstName, req.lastName].filter(Boolean).join(' ') || req.email
                return (
                  <div
                    key={req.id}
                    className={cn('p-4 space-y-3 transition-colors', req.status !== 'pending' && 'opacity-60')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-secondary">{name}</p>
                        <p className="text-xs text-muted">{req.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', statusBadge(req.status))}>
                          {statusLabel(req.status)}
                        </span>
                        {req.status === 'pending' && (
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase', planBadge(req.fromPlan))}>
                        {req.fromPlan}
                      </span>
                      <span className="text-muted">→</span>
                      <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase', planBadge(req.toPlan))}>
                        {req.toPlan}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-muted">
                          {req.paymentMethod === 'wave' ? 'Wave' : 'Carte'}
                        </span>
                        {(req.months_paid || 1) > 1 && (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                            <Tag className="w-2.5 h-2.5" />
                            {req.months_paid} mois
                          </span>
                        )}
                        <span className="font-bold text-secondary">{(req.amount / 100).toFixed(0)} €</span>
                      </span>
                    </div>

                    {req.paymentReference && (
                      <div className="bg-background rounded-xl px-3 py-1.5 font-mono text-xs text-primary font-bold">
                        Réf : {req.paymentReference}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="flex-1 py-1.5 text-xs font-bold border border-border rounded-xl hover:bg-background transition-colors flex items-center justify-center gap-1 text-muted hover:text-secondary"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir le détail
                      </button>
                      {req.status === 'approved' && (
                        <>
                          <button
                            onClick={() => handleDownloadInvoice(req.userId, { upgradeRequestId: req.id })}
                            title="Télécharger le reçu (PDF)"
                            className="px-3 py-1.5 text-xs font-bold border border-border text-secondary rounded-xl hover:bg-background transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                          <button
                            onClick={() => handleSendInvoice(req.userId, undefined, req.id)}
                            disabled={sendingInvoiceId === req.id}
                            title="Envoyer la facture par email (PDF en pièce jointe)"
                            className="px-3 py-1.5 text-xs font-bold border border-primary/30 text-primary rounded-xl hover:bg-primary/8 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {sendingInvoiceId === req.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Mail className="w-3.5 h-3.5" />
                            }
                            Facture
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Impayés ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger" />
              Impayés
              {failedPayments.length > 0 && (
                <span className="w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {failedPayments.length}
                </span>
              )}
            </h3>
            <button
              onClick={() => handleSendReminders(failedPayments.map(f => f.userId), 'Relance groupée impayés')}
              disabled={relancingBouba || failedPayments.length === 0}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-danger/25 text-danger hover:bg-danger/8 transition-colors disabled:opacity-50"
            >
              {relancingBouba ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Relancer tous par email
            </button>
          </div>
          <div className="glass-card divide-y divide-border">
            {failedPayments.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">Aucun impayé.</div>
            ) : (
              failedPayments.map(f => (
                <div key={f.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-secondary">{f.name}</p>
                      <p className="text-xs text-muted">{f.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-danger">{f.amount} €</p>
                      <p className="text-[10px] text-muted">Depuis {f.daysOverdue} jours</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleSendReminders([f.userId], f.name)}
                      disabled={remindingIds.has(f.userId)}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-50"
                    >
                      {remindingIds.has(f.userId) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                      Relancer par email
                    </button>
                    <button onClick={() => handleUnblock(f.id)} className="text-xs font-bold text-success hover:underline">
                      Débloquer manuellement
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-4">
        <h3 className="font-bold text-secondary flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Historique des transactions
        </h3>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead className="bg-background/50 border-b border-border">
              <tr>
                {['Utilisateur', 'Plan', 'Montant', 'Statut', 'Date', ''].map(h => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">Aucune transaction.</td></tr>
              ) : transactions.map(t => {
                const isPaid = t.status === 'paid' || t.status === 'succeeded' || t.status === 'completed'
                return (
                  <tr key={t.id} className="hover:bg-background/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-secondary">{t.name}</p>
                      <p className="text-[11px] text-muted">{t.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold bg-background border border-border px-2 py-0.5 rounded-full uppercase">{t.plan}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-secondary">
                      {t.amount} {t.currency || '€'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        isPaid ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      )}>
                        {isPaid ? 'Payé' : 'Échoué'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5 text-right">
                      {t.userId && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownloadInvoice(t.userId, { paymentId: t.id })}
                            title={isPaid ? 'Télécharger le reçu (PDF, tampon PAYÉE)' : 'Télécharger la facture (PDF)'}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-border text-secondary hover:bg-background transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                          {isPaid && (
                            <button
                              onClick={() => handleSendInvoice(t.userId, t.id)}
                              disabled={sendingInvoiceId === t.id}
                              title="Envoyer la facture par email (PDF en pièce jointe)"
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-primary/25 text-primary hover:bg-primary/8 transition-colors disabled:opacity-50"
                            >
                              {sendingInvoiceId === t.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Mail className="w-3.5 h-3.5" />
                              }
                              Envoyer
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedRequest && (
        <DetailDrawer
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  )
}
