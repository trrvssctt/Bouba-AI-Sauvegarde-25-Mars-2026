import { useState, useEffect } from 'react'
import { Search, ChevronRight, UserPlus, RefreshCw, Shield, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/src/lib/utils'
import type { AdminUser } from '@/src/types'

const PLAN_BADGE: Record<string, string> = {
  enterprise: 'bg-secondary text-white',
  pro: 'bg-primary/10 text-primary',
  starter: 'bg-background text-muted border border-border',
}

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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Utilisateurs</h1>
          <p className="text-sm text-muted mt-0.5">Gestion des comptes et abonnements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="btn-ghost border border-border text-sm flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Actualiser
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" />
            Inviter un utilisateur
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-4">
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
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
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
          <table className="w-full text-left">
            <thead className="bg-background/50 border-b border-border">
              <tr>
                {['Utilisateur', 'Rôle', 'Plan', 'Statut', 'Usage messages', 'Inscrit le', ''].map((h) => (
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
                      <Link
                        to={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Voir <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted text-sm">Aucun utilisateur trouvé.</div>
        )}
      </div>
    </div>
  )
}
