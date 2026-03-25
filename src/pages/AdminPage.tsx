
import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Activity,
  Search,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  MessageSquare,
  Shield,
  AlertCircle,
  CreditCard,
  Calendar,
  Zap,
} from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/src/lib/utils'
import { Link } from 'react-router-dom'

interface BillingStats {
  mrr: number
  activeUsers: number
  churnRate: number
}

interface AgentStats {
  totalMessages: number
  avgPerUser: number
}

interface RecentUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  plan: string | null
  status: string | null
  messagesUsed: number
  messagesLimit: number
  tokensUsed: number
  estimatedCost: number
  createdAt: string
  nextPayment: string | null
  role: string
}

const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-secondary text-white',
  pro: 'bg-primary/10 text-primary',
  starter: 'bg-border text-muted',
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-success',
  pending: 'bg-warning',
  suspended: 'bg-danger',
  inactive: 'bg-muted',
}

export default function AdminPage() {
  const [billing, setBilling] = useState<BillingStats | null>(null)
  const [agent, setAgent] = useState<AgentStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [bRes, aRes, uRes] = await Promise.all([
        fetch('/api/admin/billing/stats', { credentials: 'include' }),
        fetch('/api/admin/monitoring/agent-stats', { credentials: 'include' }),
        fetch('/api/admin/users?limit=10', { credentials: 'include' }),
      ])
      const [bData, aData, uData] = await Promise.all([bRes.json(), aRes.json(), uRes.json()])

      if (bData.success) {
        setBilling({
          mrr: bData.data.mrr ?? 0,
          activeUsers: bData.data.active_users ?? 0,
          churnRate: bData.data.churn_rate ?? 0,
        })
      }
      if (aData.success) {
        setAgent({
          totalMessages: aData.data.total_messages_today ?? aData.data.messages_today ?? 0,
          avgPerUser: aData.data.avg_messages_per_user ?? 0,
        })
      }
      if (uData.success) setRecentUsers(uData.data.slice(0, 10))
    } catch (err) {
      console.error('Admin dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const totalUsers = recentUsers.length
  const adminCount = recentUsers.filter((u) => u.role === 'admin' || u.role === 'superadmin').length
  const suspendedCount = recentUsers.filter((u) => u.status === 'suspended').length

  const filtered = recentUsers.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q)
    )
  })

  const stats = [
    {
      label: 'Utilisateurs actifs',
      value: loading ? '—' : billing ? String(billing.activeUsers) : '—',
      sub: loading ? '' : `sur ${totalUsers} total`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      trend: '+',
    },
    {
      label: 'Revenus MRR',
      value: loading ? '—' : billing ? `${billing.mrr.toLocaleString('fr-FR')} €` : '—',
      sub: loading ? '' : `churn ${billing?.churnRate.toFixed(1) ?? 0}%`,
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
      trend: '+',
    },
    {
      label: 'Messages IA / jour',
      value: loading ? '—' : agent ? String(agent.totalMessages) : '—',
      sub: loading ? '' : agent ? `~${agent.avgPerUser.toFixed(1)} / utilisateur` : '',
      icon: Activity,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      trend: '+',
    },
    {
      label: 'Comptes suspendus',
      value: loading ? '—' : String(suspendedCount),
      sub: loading ? '' : `${adminCount} admin${adminCount > 1 ? 's' : ''}`,
      icon: ShieldAlert,
      color: suspendedCount > 0 ? 'text-danger' : 'text-muted',
      bg: suspendedCount > 0 ? 'bg-danger/10' : 'bg-border',
      trend: suspendedCount > 0 ? '!' : '✓',
    },
  ]

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-secondary">Admin Dashboard</h1>
          <p className="text-muted">Vue d'ensemble de la plateforme BOUBA.</p>
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="flex items-center gap-2 btn-ghost border border-border text-sm"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-4.5 h-4.5', stat.color)} />
              </div>
              <span className={cn(
                'text-xs font-bold px-1.5 py-0.5 rounded-md',
                stat.trend === '+' ? 'text-success bg-success/10' :
                stat.trend === '!' ? 'text-danger bg-danger/10' : 'text-muted bg-border'
              )}>
                {stat.trend === '+' ? <ArrowUpRight className="w-3 h-3 inline" /> : stat.trend}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{stat.label}</p>
              <p className={cn('text-2xl font-bold text-secondary mt-0.5', loading && 'animate-pulse')}>
                {stat.value}
              </p>
              {stat.sub && <p className="text-[11px] text-muted mt-0.5">{stat.sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Users Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <Users className="w-4 h-4 text-muted" />
              Utilisateurs récents
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  {['Utilisateur', 'Plan', 'Quota messages', 'Inscrit le', 'Prochain paiement', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-border shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-2.5 w-24 bg-border rounded" />
                            <div className="h-2 w-32 bg-border rounded" />
                          </div>
                        </div>
                      </td>
                      {[1,2,3,4].map((j) => (
                        <td key={j} className="px-5 py-4"><div className="h-3 w-16 bg-border rounded" /></td>
                      ))}
                      <td className="px-5 py-4" />
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => {
                    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
                    const plan = user.plan ?? 'starter'
                    const limit = user.messagesLimit > 0 ? user.messagesLimit : null
                    const pct = limit ? Math.min(100, Math.round((user.messagesUsed / limit) * 100)) : 0

                    return (
                      <tr key={user.id} className="hover:bg-background/30 transition-colors">
                        {/* Utilisateur */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {name[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-secondary leading-none">{name}</p>
                                {(user.role === 'admin' || user.role === 'superadmin') && (
                                  <Shield className="w-3 h-3 text-orange-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">{user.email}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[user.status ?? ''] || 'bg-muted')} />
                                <span className="text-[10px] text-muted capitalize">{user.status ?? '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-4">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', PLAN_COLORS[plan] || PLAN_COLORS.starter)}>
                            {plan}
                          </span>
                        </td>

                        {/* Quota */}
                        <td className="px-5 py-4 min-w-[130px]">
                          {limit === null || limit === -1 ? (
                            <span className="text-xs text-success font-medium">Illimité</span>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted">{user.messagesUsed} / {limit}</span>
                                <span className={cn('font-bold', pct >= 90 ? 'text-danger' : pct >= 70 ? 'text-warning' : 'text-muted')}>
                                  {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-border rounded-full overflow-hidden w-full">
                                <div
                                  className={cn('h-full rounded-full transition-all', pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success')}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Inscrit le */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </td>

                        {/* Prochain paiement */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {user.nextPayment ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <CreditCard className="w-3 h-3 shrink-0 text-muted" />
                              <span className={cn(
                                new Date(user.nextPayment) < new Date() ? 'text-danger font-medium' : 'text-muted'
                              )}>
                                {new Date(user.nextPayment).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>

                        {/* Action */}
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
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-right">
            <Link to="/admin/users" className="text-xs text-primary font-semibold hover:underline flex items-center justify-end gap-1">
              Voir tous les utilisateurs <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* System Health */}
          <div>
            <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted" />
              Santé du système
            </h3>
            <div className="glass-card p-5 space-y-5">
              {[
                { label: 'API n8n', status: 'Opérationnel', color: 'success', pct: 100 },
                { label: 'Base de données', status: 'Opérationnel', color: 'success', pct: 100 },
                { label: 'DeepSeek API', status: 'Latence élevée', color: 'warning', pct: 85 },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted">{item.label}</span>
                    <span className={`text-${item.color}`}>{item.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${item.color} rounded-full transition-all`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <Link
                  to="/admin/monitoring"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-background text-secondary rounded-xl text-sm font-bold hover:bg-border transition-colors"
                >
                  Voir les logs <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Revenue breakdown */}
          <div>
            <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted" />
              Répartition plans
            </h3>
            <div className="glass-card p-5 space-y-3">
              {(['enterprise', 'pro', 'starter'] as const).map((p) => {
                const count = recentUsers.filter((u) => (u.plan ?? 'starter') === p).length
                const pct = recentUsers.length > 0 ? Math.round((count / recentUsers.length) * 100) : 0
                const colors = { enterprise: 'bg-secondary', pro: 'bg-primary', starter: 'bg-border' }
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-secondary capitalize">{p}</span>
                      <span className="text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', colors[p])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="glass-card p-4 space-y-1">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Raccourcis</p>
            {[
              { label: 'Envoyer une notification', to: '/admin/conversations', icon: MessageSquare },
              { label: 'Tickets support', to: '/admin/support', icon: AlertCircle },
              { label: 'Feature flags', to: '/admin/settings', icon: Shield },
              { label: 'Analytics', to: '/admin/analytics', icon: TrendingUp },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background text-sm text-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <l.icon className="w-3.5 h-3.5 text-muted" />
                  {l.label}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
