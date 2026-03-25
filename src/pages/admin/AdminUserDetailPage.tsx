import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Shield,
  Ban,
  RefreshCw,
  CreditCard,
  MessageCircle,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

const SUSPENSION_REASONS = [
  'Paiement échoué',
  'Souscription non payée',
  'Violation des conditions générales d\'utilisation',
  'Fraude détectée',
  'Activité suspecte',
  'Demande de l\'utilisateur',
  'Autre',
]

const AGENT_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  calendar: 'bg-violet-100 text-violet-700',
  finance: 'bg-emerald-100 text-emerald-700',
  contacts: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
}

const PLAN_OPTIONS = ['starter', 'pro', 'enterprise']

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState(SUSPENSION_REASONS[0])
  const [suspending, setSuspending] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/admin/users/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setUser(json.data)
          setPlan(json.data.plan)
          setStatus(json.data.status)
        }
      })
      .catch(() => toast.error('Erreur lors du chargement de l\'utilisateur.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, status }),
      })
      const json = await res.json()
      if (json.success !== false) {
        toast.success(`Modifications sauvegardées pour ${user.firstName} ${user.lastName}`)
      } else {
        toast.error('Erreur lors de la sauvegarde.')
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    }
  }

  const handleResetQuota = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-quota`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success !== false) {
        toast.success('Quota réinitialisé.')
      } else {
        toast.error('Erreur lors de la réinitialisation.')
      }
    } catch {
      toast.error('Erreur lors de la réinitialisation.')
    }
  }

  const handleSuspend = async () => {
    setSuspending(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended', suspensionReason }),
      })
      const json = await res.json()
      if (json.success !== false) {
        setStatus('suspended')
        setShowSuspendModal(false)
        toast.success(`Compte suspendu. Un email a été envoyé à ${user.email}.`)
      } else {
        toast.error('Erreur lors de la suspension.')
      }
    } catch {
      toast.error('Erreur lors de la suspension.')
    } finally {
      setSuspending(false)
    }
  }

  const handleSendEmail = () => {
    toast.info(`Email envoyé à ${user.email}`)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-muted">Utilisateur introuvable.</div>
    )
  }

  const pct = Math.round((user.messagesUsed / user.messagesLimit) * 100)

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 hover:bg-surface rounded-xl transition-colors text-muted hover:text-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            {user.firstName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSendEmail} className="btn-ghost border border-border text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" /> Envoyer un email
          </button>
          <button onClick={handleSave} className="btn-primary text-sm">
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations & Actions admin */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="font-bold text-secondary text-sm uppercase tracking-widest">Informations du compte</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="active">Actif</option>
                  <option value="pending">En attente</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Stripe ID</label>
                <p className="text-sm text-secondary font-mono bg-background border border-border rounded-xl px-3 py-2">{user.stripeCustomerId || '—'}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">Dernière connexion</label>
                <p className="text-sm text-secondary bg-background border border-border rounded-xl px-3 py-2">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR') : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button
                onClick={handleResetQuota}
                className="flex items-center gap-2 text-xs btn-ghost border border-border"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser le quota
              </button>
              {status === 'active' ? (
                <button
                  onClick={() => setShowSuspendModal(true)}
                  className="flex items-center gap-2 text-xs bg-danger/10 text-danger border border-danger/20 px-3 py-1.5 rounded-xl font-medium hover:bg-danger/20 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" /> Suspendre le compte
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/users/${id}`, {
                        method: 'PUT', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'active' }),
                      })
                      const json = await res.json()
                      if (json.success !== false) { setStatus('active'); toast.success('Compte réactivé.') }
                      else toast.error('Erreur lors de la réactivation.')
                    } catch { toast.error('Erreur lors de la réactivation.') }
                  }}
                  className="flex items-center gap-2 text-xs bg-success/10 text-success border border-success/20 px-3 py-1.5 rounded-xl font-medium hover:bg-success/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" /> Réactiver le compte
                </button>
              )}
            </div>
          </div>

          {/* Historique des messages */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-secondary text-sm uppercase tracking-widest flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Derniers messages
            </h3>
            <div className="space-y-2">
              {(user.recentMessages || []).map((msg: any) => (
                <div key={msg.id} className="flex items-start gap-3 p-3 bg-background rounded-xl">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-0.5 shrink-0', AGENT_COLORS[msg.agent] || AGENT_COLORS.general)}>
                    {msg.agent}
                  </span>
                  <p className="text-xs text-secondary flex-1 leading-relaxed">{msg.content}</p>
                  <span className="text-[10px] text-muted shrink-0">{new Date(msg.date).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Historique facturation */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-secondary text-sm uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Historique de facturation
            </h3>
            <div className="divide-y divide-border">
              {(user.billing || []).map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary font-medium">{b.description}</p>
                    <p className="text-xs text-muted mt-0.5">{new Date(b.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-secondary">{b.amount} €</span>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                      b.status === 'paid' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    )}>
                      {b.status === 'paid' ? 'Payé' : 'Échoué'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Usage stats */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-secondary text-xs uppercase tracking-widest">Usage ce mois</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted font-medium">Messages</span>
                  <span className={cn('font-bold', pct >= 90 ? 'text-danger' : 'text-secondary')}>
                    {user.messagesUsed} / {user.messagesLimit}
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-primary')}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Tokens consommés</span>
                  <span className="font-bold text-secondary">{user.tokensUsed != null ? (user.tokensUsed / 1000).toFixed(0) + 'k' : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Coût estimé</span>
                  <span className="font-bold text-secondary">{user.estimatedCost != null ? user.estimatedCost.toFixed(2) + ' €' : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Inscrit le</span>
                  <span className="font-bold text-secondary">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connexions OAuth */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="font-bold text-secondary text-xs uppercase tracking-widest">Connexions actives</h3>
            {(user.connections || []).length === 0 ? (
              <p className="text-xs text-muted">Aucune connexion OAuth.</p>
            ) : (
              (user.connections || []).map((c: string) => (
                <div key={c} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-secondary font-medium">{c}</span>
                </div>
              ))
            )}
          </div>

          {/* Bouba tip */}
          <div className="glass-card p-5 bg-primary/5 border-primary/20">
            <p className="text-xs text-muted font-medium mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Demander à Bouba
            </p>
            <p className="text-xs text-secondary leading-relaxed">
              "Envoie un email de relance à {user.firstName} {user.lastName} pour régulariser son abonnement"
            </p>
          </div>
        </div>
      </div>

      {/* Suspension Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md mx-4 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <h3 className="font-bold text-secondary text-base">Suspendre le compte</h3>
                  <p className="text-xs text-muted">{user.firstName} {user.lastName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="p-1.5 hover:bg-surface rounded-lg text-muted hover:text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">
                Motif de suspension
              </label>
              <select
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-danger/40"
              >
                {SUSPENSION_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl">
              <p className="text-xs text-warning font-medium">
                Un email sera automatiquement envoyé à <strong>{user.email}</strong> pour l'informer de la suspension et son motif.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 btn-ghost border border-border text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspending}
                className="flex-1 flex items-center justify-center gap-2 text-sm bg-danger text-white px-4 py-2 rounded-xl font-medium hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                {suspending ? 'Suspension…' : 'Confirmer la suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
