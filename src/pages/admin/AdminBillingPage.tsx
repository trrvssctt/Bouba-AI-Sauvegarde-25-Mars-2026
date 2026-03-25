import { useState, useEffect, useCallback } from 'react'
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
                <p className="text-[10px] font-bold text-muted uppercase">Montant</p>
                <p className="font-bold text-secondary">{amountEur} €</p>
              </div>
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

export default function AdminBillingPage() {
  const [stats, setStats] = useState<any>(null)
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([])
  const [failedPayments, setFailedPayments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const fetchData = useCallback(async () => {
    await Promise.all([
      fetch('/api/admin/billing/stats', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setStats(j.data) })
        .catch(() => toast.error('Erreur stats MRR.')),

      fetch('/api/admin/billing/upgrade-requests', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setUpgradeRequests(j.data) })
        .catch(() => toast.error('Erreur demandes upgrade.'))
        .finally(() => setLoadingRequests(false)),

      fetch('/api/admin/billing/failed-payments', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setFailedPayments(j.data.map((f: any) => ({ ...f, name: `${f.firstName} ${f.lastName}` }))) })
        .catch(() => {}),

      fetch('/api/admin/billing/transactions', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.data) setTransactions(j.data.map((t: any) => ({ ...t, name: `${t.firstName} ${t.lastName}` }))) })
        .catch(() => {}),
    ])
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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

  const mrrCards = stats ? [
    { label: 'MRR actuel', value: `${stats.mrr.toFixed(0)} €`, trend: `${stats.newCount} clients actifs`, up: true },
    { label: 'ARR projeté', value: `${stats.arr.toFixed(0)} €`, trend: '+12 mois', up: true },
    { label: 'Nouveau MRR (ce mois)', value: `${stats.newMrr.toFixed(0)} €`, trend: `+${stats.newCount} clients`, up: true },
    { label: 'Churn MRR', value: `${stats.churnMrr.toFixed(0)} €`, trend: `${stats.churnCount} client(s)`, up: false },
  ] : []

  const pendingCount = upgradeRequests.filter(r => r.status === 'pending').length

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Facturation</h1>
          <p className="text-sm text-muted mt-0.5">Revenus, impayés et demandes d'upgrade.</p>
        </div>
        <button
          onClick={() => toast.info('Export CSV en cours…')}
          className="btn-ghost border border-border text-sm flex items-center gap-2"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Demandes d'upgrade ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Demandes d'upgrade
              {pendingCount > 0 && (
                <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </h3>
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

                    <div className="flex items-center gap-2 text-xs">
                      <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase', planBadge(req.fromPlan))}>
                        {req.fromPlan}
                      </span>
                      <span className="text-muted">→</span>
                      <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase', planBadge(req.toPlan))}>
                        {req.toPlan}
                      </span>
                      <span className="text-muted ml-auto">{req.paymentMethod === 'wave' ? 'Wave' : 'Carte'} · {(req.amount / 100).toFixed(0)} €</span>
                    </div>

                    {req.paymentReference && (
                      <div className="bg-background rounded-xl px-3 py-1.5 font-mono text-xs text-primary font-bold">
                        Réf : {req.paymentReference}
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="w-full py-1.5 text-xs font-bold border border-border rounded-xl hover:bg-background transition-colors flex items-center justify-center gap-1 text-muted hover:text-secondary"
                    >
                      <Eye className="w-3.5 h-3.5" /> Voir le détail
                    </button>
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
              onClick={() => toast.info('Bouba va rédiger les emails de relance pour les impayés > 3 jours.')}
              className="text-xs text-primary font-medium hover:underline"
            >
              Relancer via Bouba
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
                      <p className="text-[10px] text-muted">{f.attempts} tentatives</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Depuis {f.daysOverdue} jours</span>
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
          <table className="w-full text-left">
            <thead className="bg-background/50 border-b border-border">
              <tr>
                {['Utilisateur', 'Plan', 'Montant', 'Statut', 'Date'].map(h => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">Aucune transaction.</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-background/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-secondary">{t.name}</p>
                    <p className="text-[11px] text-muted">{t.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[10px] font-bold bg-background border border-border px-2 py-0.5 rounded-full uppercase">{t.plan}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-secondary">{t.amount} €</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                      t.status === 'paid' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    )}>
                      {t.status === 'paid' ? 'Payé' : 'Échoué'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
