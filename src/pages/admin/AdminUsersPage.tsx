import { useState, useEffect, useRef } from 'react'
import { Search, ChevronRight, UserPlus, RefreshCw, Shield, ShieldCheck, X, Plus, UserX, UserCheck, Loader2, KeyRound, Trash2, Paperclip } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import type { AdminUser } from '@/src/types'

const PLAN_BADGE: Record<string, string> = {
  business: 'bg-secondary text-white',
  enterprise: 'bg-secondary text-white',
  pro: 'bg-primary/10 text-primary',
  starter: 'bg-primary/10 text-primary',
  free: 'bg-background text-muted border border-border',
}

// Plans actifs proposés à la création / au filtre (les anciens restent affichés en badge)
const ACTIVE_PLANS = [
  { id: 'free', label: 'Free (gratuit)', paid: false },
  { id: 'starter', label: 'Starter (payant)', paid: true },
  { id: 'business', label: 'Business (payant)', paid: true },
]

const ROLE_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  superadmin: { label: 'Super Admin', class: 'bg-red-100 text-red-700 border-red-200', icon: ShieldCheck },
  admin:      { label: 'Admin',       class: 'bg-orange-100 text-orange-700 border-orange-200', icon: Shield },
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-success',
  pending: 'bg-warning',
  suspended: 'bg-danger',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  pending: 'En attente',
  suspended: 'Suspendu',
  inactive: 'Inactif',
  cancelled: 'Annulé',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', plan: 'starter', paymentReference: '', paymentNote: '' })
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [inviteSending, setInviteSending] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  const isPaidPlanSelected = ACTIVE_PLANS.find(p => p.id === inviteForm.plan)?.paid ?? true

  const handleInviteSubmit = async () => {
    if (!inviteForm.email.trim()) { toast.error('Email requis'); return }
    if (isPaidPlanSelected && !inviteForm.paymentReference.trim() && !proofFile) {
      toast.error('Plan payant : référence de paiement OU fichier justificatif obligatoire')
      return
    }
    setInviteSending(true)
    try {
      // FormData : permet d'joindre le fichier de preuve de paiement
      const form = new FormData()
      Object.entries(inviteForm).forEach(([k, v]) => form.append(k, v))
      if (proofFile) form.append('proofFile', proofFile)

      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Compte créé et email envoyé à ${inviteForm.email}`)
        setShowInviteModal(false)
        setInviteForm({ email: '', firstName: '', lastName: '', plan: 'starter', paymentReference: '', paymentNote: '' })
        setProofFile(null)
        fetchUsers()
      } else {
        toast.error(json.error || "Erreur lors de l'invitation")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setInviteSending(false)
    }
  }

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [resetting, setResetting] = useState(false)

  const handleResetPasswordConfirm = async () => {
    if (!resetTarget) return
    setResetting(true)
    setActionId(resetTarget.id)
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}/reset-password`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || 'Mot de passe réinitialisé et email envoyé.')
        setResetTarget(null)
      } else {
        toast.error(json.error || 'Erreur lors de la réinitialisation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setResetting(false)
      setActionId(null)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`⚠️ Supprimer DÉFINITIVEMENT le compte ${user.email} et toutes ses données (messages, paiements, contacts…) ?\n\nCette action est irréversible.`)) return
    setActionId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || 'Compte supprimé.')
        setUsers(prev => prev.filter(u => u.id !== user.id))
      } else {
        toast.error(json.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionId(null)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setUsers(data.data)
    } catch (err) {
      console.error('Error fetching admin users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: string, isAdmin: boolean) => {
    if (isAdmin) { toast.error('Impossible de suspendre un administrateur.'); return }
    setTogglingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: data.newStatus } : u))
      toast.success(data.newStatus === 'suspended' ? 'Compte suspendu.' : 'Compte réactivé.')
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du changement de statut.')
    } finally {
      setTogglingId(null)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    const matchPlan = planFilter === 'all' || u.plan === planFilter
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'user' && !u.role || u.role === 'user') ||
      u.role === roleFilter
    return matchSearch && matchPlan && matchStatus && matchRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-secondary">Utilisateurs</h1>
          <p className="text-sm text-muted mt-0.5">Gestion des comptes et abonnements.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="btn-ghost border border-border text-sm flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Actualiser
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un utilisateur
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: users.length, color: 'text-secondary' },
          { label: 'Actifs', value: users.filter((u) => u.status === 'active').length, color: 'text-success' },
          { label: 'Suspendus / En attente', value: users.filter((u) => u.status !== 'active').length, color: 'text-warning' },
          { label: 'Admins', value: users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length, color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-widest">{s.label}</span>
            <span className={cn('text-2xl font-bold', s.color)}>{loading ? '…' : s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Tous les plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="business">Business</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="suspended">Suspendu</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Tous les rôles</option>
          <option value="user">Utilisateurs</option>
          <option value="admin">Admins</option>
          <option value="superadmin">Super Admins</option>
        </select>
        <span className="text-xs text-muted ml-auto">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-background/50 border-b border-border">
              <tr>
                {['Utilisateur', 'Rôle', 'Plan', 'Statut', 'Prochain paiement', 'Usage messages', 'Inscrit le', ''].map((h) => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => {
                const pct = user.messagesLimit > 0
                  ? Math.round((user.messagesUsed / user.messagesLimit) * 100)
                  : 0
                return (
                  <tr key={user.id} className="hover:bg-background/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {(user.firstName || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-secondary leading-none">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {ROLE_CONFIG[user.role ?? ''] ? (() => {
                        const rc = ROLE_CONFIG[user.role!]
                        const RIcon = rc.icon
                        return (
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider', rc.class)}>
                            <RIcon className="w-3 h-3" /> {rc.label}
                          </span>
                        )
                      })() : (
                        <span className="text-[10px] text-muted">Utilisateur</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider', PLAN_BADGE[user.plan] || PLAN_BADGE.starter)}>
                        {user.plan || 'starter'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[user.status] || 'bg-muted')} />
                        <span className="text-xs text-secondary">{STATUS_LABEL[user.status] || user.status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                      {(user as any).nextPayment
                        ? (() => {
                            const d = new Date((user as any).nextPayment)
                            const diff = Math.ceil((d.getTime() - Date.now()) / 86400000)
                            const label = diff <= 0
                              ? <span className="text-danger font-bold">Expiré</span>
                              : diff <= 5
                              ? <span className="text-warning font-bold">Dans {diff}j</span>
                              : <span>Dans {diff}j</span>
                            return (
                              <div>
                                <p>{d.toLocaleDateString('fr-FR')}</p>
                                <p className="text-[10px] mt-0.5">{label}</p>
                              </div>
                            )
                          })()
                        : <span className="text-muted/50">—</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5 min-w-[120px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted font-medium">{user.messagesUsed} / {user.messagesLimit}</span>
                          <span className={cn('font-bold', pct >= 90 ? 'text-danger' : pct >= 70 ? 'text-warning' : 'text-muted')}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success')}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(user.role !== 'admin' && user.role !== 'superadmin') && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(user.id, user.status, false)}
                              disabled={togglingId === user.id}
                              title={user.status === 'active' ? 'Suspendre (bloque la connexion)' : 'Réactiver ce compte'}
                              className={cn(
                                'p-1.5 rounded-lg border transition-all disabled:opacity-50',
                                user.status === 'active'
                                  ? 'text-danger border-danger/20 hover:bg-danger/10'
                                  : 'text-success border-success/20 hover:bg-success/10'
                              )}
                            >
                              {togglingId === user.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : user.status === 'active'
                                ? <UserX className="w-3.5 h-3.5" />
                                : <UserCheck className="w-3.5 h-3.5" />
                              }
                            </button>
                            <button
                              onClick={() => setResetTarget(user)}
                              disabled={actionId === user.id}
                              title="Réinitialiser le mot de passe (email automatique)"
                              className="p-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-50"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={actionId === user.id}
                              title="Supprimer définitivement ce compte"
                              className="p-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                            >
                              {actionId === user.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium ml-1"
                        >
                          Voir <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted text-sm">Aucun utilisateur trouvé.</div>
        )}
      </div>

      {/* Modal Réinitialiser le mot de passe */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">Réinitialiser le mot de passe</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Réinitialiser le mot de passe de <strong className="text-gray-900 break-all">{resetTarget.email}</strong> ?
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800">
                    📧 Un email avec un <strong>mot de passe temporaire</strong> lui sera envoyé automatiquement.
                    Son mot de passe actuel cessera de fonctionner immédiatement.
                  </p>
                </div>
              </div>
              <button onClick={() => setResetTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPasswordConfirm}
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {resetting ? 'Envoi en cours…' : 'Réinitialiser et envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inviter un utilisateur */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Inviter un utilisateur</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="utilisateur@exemple.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={inviteForm.plan}
                  onChange={(e) => setInviteForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTIVE_PLANS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {isPaidPlanSelected && (
                <div className="col-span-2 border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Preuve de paiement <span className="text-red-500">*</span>
                    <span className="normal-case font-normal text-gray-400 ml-1">(référence OU fichier)</span>
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Référence de paiement</label>
                      <input
                        type="text"
                        value={inviteForm.paymentReference}
                        onChange={(e) => setInviteForm(f => ({ ...f, paymentReference: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ID Stripe (pi_xxx, cs_xxx) ou référence virement/Wave"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Justificatif (capture, reçu…)</label>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast.error('Fichier trop volumineux (max 5 Mo)')
                            e.target.value = ''
                            return
                          }
                          setProofFile(f)
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => proofInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                          {proofFile ? 'Changer le fichier' : 'Joindre un fichier'}
                        </button>
                        {proofFile && (
                          <span className="text-xs text-gray-600 flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                            {proofFile.name} ({(proofFile.size / 1024).toFixed(0)} Ko)
                            <button onClick={() => { setProofFile(null); if (proofInputRef.current) proofInputRef.current.value = '' }} className="text-gray-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP ou PDF — max 5 Mo. Ex : capture Wave, reçu de virement.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note (optionnel)</label>
                      <input
                        type="text"
                        value={inviteForm.paymentNote}
                        onChange={(e) => setInviteForm(f => ({ ...f, paymentNote: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex : virement reçu le 22/04, montant 29€…"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Un email avec le mot de passe temporaire sera envoyé automatiquement au client.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleInviteSubmit}
                disabled={inviteSending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {inviteSending ? 'Création...' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
