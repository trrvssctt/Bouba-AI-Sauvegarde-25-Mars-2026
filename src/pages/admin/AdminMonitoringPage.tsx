import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, Zap, AlertTriangle, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, Gauge, Users, Search, ServerCog,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

const AGENT_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  calendar: 'bg-violet-100 text-violet-700',
  finance: 'bg-emerald-100 text-emerald-700',
  contacts: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
  bouba_action: 'bg-primary/10 text-primary',
}

interface QuotaRow {
  id: string; email: string; firstName?: string; lastName?: string; plan: string
  used: number; limit: number | null; unlimited: boolean; remaining: number | null; pct: number
  usedToday: number; quotaResetAt?: string
}
interface Performance {
  total7d: number; last24h: number; errors7d: number; errorRate: number
  avgMs: number; p95Ms: number; maxMs: number
  byAgent: Array<{ agent: string; requests: number; avgMs: number; errors: number; errorRate: number }>
  recentErrors: Array<{ id: string; agent: string; source: string; durationMs: number; error: string; createdAt: string; email?: string }>
}
interface LogRow {
  id: string; agent: string; source: string; durationMs: number
  success: boolean; error?: string; createdAt: string; email?: string
}

const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
const REFRESH_MS = 15_000

export default function AdminMonitoringPage() {
  const [quotas, setQuotas] = useState<QuotaRow[]>([])
  const [perf, setPerf] = useState<Performance | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [agentFilter, setAgentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [quotaSearch, setQuotaSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const firstError = useRef(true)

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (agentFilter !== 'all') params.set('agent', agentFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const get = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json())
      const [q, p, l] = await Promise.all([
        get('/api/admin/monitoring/quotas'),
        get('/api/admin/monitoring/performance'),
        get(`/api/admin/monitoring/n8n-logs?${params}`),
      ])
      if (q.success) setQuotas(q.data ?? [])
      if (p.success) setPerf(p.data ?? null)
      if (l.success) setLogs(l.data ?? [])
      setLastUpdate(new Date())
    } catch {
      if (firstError.current) { toast.error('Erreur chargement monitoring.'); firstError.current = false }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [agentFilter, statusFilter])

  // Temps réel : chargement + polling silencieux
  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => fetchAll(), REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchAll])

  const filteredQuotas = quotas.filter(u => {
    if (!quotaSearch) return true
    const q = quotaSearch.toLowerCase()
    return u.email?.toLowerCase().includes(q) || `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement du monitoring…
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Header temps réel */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Monitoring IA</h1>
          <p className="text-sm text-muted mt-0.5">Quotas, performances des agents et logs n8n.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Temps réel · {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : '…'}
          </span>
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 btn-ghost border border-border text-sm"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── PERFORMANCES IA ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <Gauge className="w-4 h-4" /> Performances IA (7 derniers jours)
        </h2>
        {perf && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Requêtes 7 j', value: perf.total7d, sub: `${perf.last24h} sur 24 h`, icon: Activity, color: 'text-primary' },
                { label: 'Temps moyen', value: fmtMs(perf.avgMs), sub: 'Réponse n8n', icon: Clock, color: perf.avgMs < 8000 ? 'text-success' : 'text-warning' },
                { label: 'P95', value: fmtMs(perf.p95Ms), sub: `Max : ${fmtMs(perf.maxMs)}`, icon: Zap, color: perf.p95Ms < 20000 ? 'text-success' : 'text-warning' },
                { label: 'Erreurs 7 j', value: perf.errors7d, sub: 'Demandes non traitées', icon: AlertTriangle, color: perf.errors7d > 0 ? 'text-danger' : 'text-success' },
                { label: "Taux d'erreur", value: `${perf.errorRate}%`, sub: perf.errorRate <= 5 ? 'Sain' : 'À surveiller', icon: perf.errorRate <= 5 ? CheckCircle : XCircle, color: perf.errorRate <= 5 ? 'text-success' : 'text-danger' },
              ].map(k => (
                <div key={k.label} className="glass-card p-5 space-y-2">
                  <k.icon className={cn('w-4 h-4', k.color)} />
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{k.label}</p>
                    <p className={cn('text-xl font-bold mt-0.5', k.color)}>{k.value}</p>
                    <p className="text-[11px] text-muted">{k.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Par agent */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-widest">Par agent</h3>
                {perf.byAgent.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">Aucune requête enregistrée — les données apparaissent dès les premiers échanges.</p>
                ) : perf.byAgent.map(a => (
                  <div key={a.agent} className="flex items-center justify-between text-xs border-b border-border last:border-0 pb-3 last:pb-0">
                    <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase', AGENT_COLORS[a.agent] || AGENT_COLORS.general)}>
                      {a.agent}
                    </span>
                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-muted">{a.requests} req.</span>
                      <span className={cn('font-bold', a.avgMs < 8000 ? 'text-success' : 'text-warning')}>{fmtMs(a.avgMs)}</span>
                      <span className={cn('font-bold w-14 text-right', a.errors > 0 ? 'text-danger' : 'text-success')}>
                        {a.errors > 0 ? `${a.errors} err.` : '✓ 0 err.'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dernières erreurs (l'IA n'a pas su répondre à la demande) */}
              <div className="glass-card p-6 space-y-3">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger" /> Dernières erreurs agents
                </h3>
                {perf.recentErrors.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">Aucune erreur récente — tout fonctionne ✓</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {perf.recentErrors.map(e => (
                      <div key={e.id} className="bg-danger/5 border border-danger/15 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', AGENT_COLORS[e.agent] || AGENT_COLORS.general)}>
                            {e.agent}
                          </span>
                          <span className="text-[10px] text-muted">
                            {e.email || '—'} · {new Date(e.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-xs text-danger mt-1.5 leading-relaxed line-clamp-2">{e.error || 'Erreur inconnue'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── QUOTAS PAR UTILISATEUR ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4" /> Quotas par utilisateur
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={quotaSearch}
              onChange={e => setQuotaSearch(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 w-64"
            />
          </div>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  {['Utilisateur', 'Plan', 'Utilisé / Limite', 'Restant', "Aujourd'hui", 'Consommation'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuotas.map(u => {
                  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
                  return (
                    <tr key={u.id} className="hover:bg-background/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-secondary">{name}</p>
                        <p className="text-[11px] text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                          {u.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-secondary whitespace-nowrap">
                        {u.used.toLocaleString('fr-FR')} / {u.unlimited ? '∞' : (u.limit ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                        {u.unlimited
                          ? <span className="text-success">Illimité</span>
                          : <span className={cn(u.remaining !== null && u.remaining <= 0 ? 'text-danger' : (u.pct >= 80 ? 'text-warning' : 'text-secondary'))}>
                              {u.remaining !== null ? u.remaining.toLocaleString('fr-FR') : '—'}
                            </span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-muted">{u.usedToday}</td>
                      <td className="px-4 py-3">
                        {u.unlimited ? (
                          <span className="text-[11px] text-muted">—</span>
                        ) : (
                          <div className="space-y-1 min-w-[130px]">
                            <div className="flex justify-between text-[10px]">
                              <span className={cn('font-bold', u.pct >= 90 ? 'text-danger' : u.pct >= 70 ? 'text-warning' : 'text-muted')}>{u.pct}%</span>
                              {u.pct >= 100 && <span className="text-danger font-bold uppercase">Épuisé</span>}
                            </div>
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', u.pct >= 90 ? 'bg-danger' : u.pct >= 70 ? 'bg-warning' : 'bg-success')}
                                style={{ width: `${Math.min(100, u.pct)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredQuotas.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">Aucun utilisateur trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── LOGS N8N ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            <ServerCog className="w-4 h-4" /> Logs n8n — chaque requête
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Tous les agents</option>
              {['email', 'calendar', 'contacts', 'finance', 'general'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Tous les statuts</option>
              <option value="success">Succès</option>
              <option value="error">Erreurs</option>
            </select>
          </div>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  {['Horodatage', 'Utilisateur', 'Agent', 'Source', 'Durée', 'Statut', 'Erreur'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    Aucun log — les requêtes n8n apparaissent ici dès les premiers échanges avec Bouba.
                  </td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className={cn('hover:bg-background/30 transition-colors', !l.success && 'bg-danger/3')}>
                    <td className="px-4 py-2.5 text-xs text-muted font-mono whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-secondary max-w-[160px] truncate">{l.email || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', AGENT_COLORS[l.agent] || AGENT_COLORS.general)}>
                        {l.agent}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted">{l.source}</td>
                    <td className="px-4 py-2.5 text-xs font-mono">
                      <span className={cn('font-bold', l.durationMs < 8000 ? 'text-success' : l.durationMs < 20000 ? 'text-warning' : 'text-danger')}>
                        {fmtMs(l.durationMs)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        l.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      )}>
                        {l.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {l.success ? 'OK' : 'Erreur'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-danger max-w-[220px] truncate" title={l.error || ''}>
                      {l.error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
