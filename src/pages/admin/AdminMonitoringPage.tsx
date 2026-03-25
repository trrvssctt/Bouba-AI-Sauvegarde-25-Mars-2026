import { useState, useEffect } from 'react'
import { Activity, Zap, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

const LATENCY = [
  { label: 'P50 DeepSeek', value: '1.2s', status: 'ok' },
  { label: 'P95 DeepSeek', value: '4.8s', status: 'warn' },
  { label: 'P50 n8n webhook', value: '0.3s', status: 'ok' },
  { label: 'P95 n8n webhook', value: '1.1s', status: 'ok' },
]

const AGENT_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  calendar: 'bg-violet-100 text-violet-700',
  finance: 'bg-emerald-100 text-emerald-700',
  contacts: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
}

export default function AdminMonitoringPage() {
  const [agentFilter, setAgentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [topUsers, setTopUsers] = useState<any[]>([])
  const [agentStats, setAgentStats] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/monitoring/top-users', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setTopUsers(
            json.data.map((u: any) => ({
              id: u.id,
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              plan: u.plan,
              messagesUsed: u.messagesUsed,
              messagesLimit: u.messagesLimit,
              tokensUsed: 0,
              cost: 0,
            }))
          )
        }
      })
      .catch(() => toast.error('Erreur chargement top utilisateurs.'))

    fetch('/api/admin/monitoring/agent-stats', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => { if (json.data) setAgentStats(json.data) })
      .catch(() => toast.error('Erreur chargement stats agents.'))
  }, [])

  useEffect(() => {
    const url = agentFilter === 'all'
      ? '/api/admin/monitoring/logs'
      : `/api/admin/monitoring/logs?agent=${agentFilter}`
    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setLogs(
            json.data.map((l: any) => ({
              ...l,
              createdAt: l.created_at ?? l.createdAt,
            }))
          )
        }
      })
      .catch(() => toast.error('Erreur chargement logs.'))
  }, [agentFilter])

  const filteredLogs = logs.filter((l) => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchStatus
  })

  const errorCount = logs.filter((l) => l.status === 'error').length

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Monitoring IA</h1>
          <p className="text-sm text-muted mt-0.5">Quotas, performances et logs n8n.</p>
        </div>
        <button
          onClick={() => toast.info('Bouba analyse les logs d\'erreurs de cette semaine…')}
          className="btn-ghost border border-border text-sm flex items-center gap-2"
        >
          <Activity className="w-4 h-4 text-primary" />
          Analyser avec Bouba
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top consumers */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-secondary text-sm uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Top consommateurs
          </h3>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  {['Utilisateur', 'Plan', 'Messages', 'Tokens', 'Coût estimé'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topUsers.map((u, i) => {
                  const pct = Math.round((u.messagesUsed / u.messagesLimit) * 100)
                  return (
                    <tr key={i} className="hover:bg-background/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-secondary">{u.name}</p>
                        <p className="text-[11px] text-muted">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold bg-background border border-border px-2 py-0.5 rounded-full uppercase">{u.plan}</span>
                      </td>
                      <td className="px-5 py-3.5 min-w-[120px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted">{u.messagesUsed}/{u.messagesLimit}</span>
                            <span className={cn('font-bold', pct >= 90 ? 'text-danger' : 'text-muted')}>{pct}%</span>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-primary')}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-secondary">{(u.tokensUsed / 1000).toFixed(0)}k</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-secondary">{u.cost.toFixed(2)} €</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agent usage */}
        <div className="space-y-4">
          <h3 className="font-bold text-secondary text-sm uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4" /> Agents utilisés
          </h3>
          <div className="glass-card p-5 space-y-4">
            {agentStats.map((a) => (
              <div key={a.agent} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-secondary">{a.agent}</span>
                  <span className="text-muted">{a.calls.toLocaleString('fr-FR')} appels</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', a.color)} style={{ width: `${a.pct}%` }} />
                </div>
                <p className="text-[10px] text-muted text-right">{a.pct}%</p>
              </div>
            ))}
          </div>

          {/* Latence */}
          <h3 className="font-bold text-secondary text-sm uppercase tracking-widest flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4" /> Latence
          </h3>
          <div className="glass-card p-5 space-y-3">
            {LATENCY.map((l) => (
              <div key={l.label} className="flex items-center justify-between">
                <span className="text-xs text-muted">{l.label}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold', l.status === 'warn' ? 'text-warning' : 'text-secondary')}>{l.value}</span>
                  {l.status === 'warn' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logs n8n */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-secondary flex items-center gap-2">
            Logs n8n
            {errorCount > 0 && (
              <span className="text-[10px] font-bold bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded-full">
                {errorCount} erreur{errorCount > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-xs outline-none"
            >
              <option value="all">Tous les agents</option>
              <option value="email">Email</option>
              <option value="calendar">Calendar</option>
              <option value="finance">Finance</option>
              <option value="contacts">Contacts</option>
              <option value="general">Général</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-xs outline-none"
            >
              <option value="all">Tous</option>
              <option value="success">Succès</option>
              <option value="error">Erreurs</option>
            </select>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-background/50 border-b border-border">
              <tr>
                {['Utilisateur', 'Agent', 'Statut', 'Durée', 'Erreur', 'Heure'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className={cn('hover:bg-background/30 transition-colors', log.status === 'error' && 'bg-danger/5')}>
                  <td className="px-5 py-3 text-xs text-secondary font-medium">{log.userId}</td>
                  <td className="px-5 py-3">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', AGENT_COLORS[log.agent])}>
                      {log.agent}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-danger" />
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted font-mono">{log.duration >= 10000 ? '30s ⚠' : `${(log.duration / 1000).toFixed(1)}s`}</td>
                  <td className="px-5 py-3 text-xs text-danger max-w-[200px] truncate">{log.error || '—'}</td>
                  <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
