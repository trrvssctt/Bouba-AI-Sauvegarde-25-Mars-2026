import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Activity,
  Loader2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Calendar,
  Contact,
  Wallet,
  Sparkles,
  Search,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelStep { step: string; value: number; pct: number }
interface Funnels { conversion: FunnelStep[]; upgrade: FunnelStep[]; paiement: FunnelStep[] }
interface Retention {
  total: number
  activeSubscribers: number
  retentionRate: number
  active7d: number
  active30d: number
  cohorts: Array<{ week: string; size: number; j7: number | null; j30: number | null; j90: number | null }>
}
interface AgentInfo {
  agent: string
  callsToday: number
  calls7d: number
  calls30d: number
  pct: number
  trend: number
  lastUsed: string | null
  status: 'operational' | 'idle'
}
interface AgentsData { n8nStatus: 'up' | 'down'; totalCalls30d: number; agents: AgentInfo[] }
interface BillingStats { mrr: number; arr: number; newMrr: number; newCount: number; churnMrr: number; churnCount: number }
interface Revenue {
  sources: Array<{ source: string; currency: string; total: number; thisMonth: number; count: number }>
  monthly: Array<{ month: string; currency: string; total: number }>
}

const AGENT_META: Record<string, { label: string; icon: any }> = {
  email: { label: 'Email', icon: Mail },
  calendar: { label: 'Calendrier', icon: Calendar },
  contacts: { label: 'Contacts', icon: Contact },
  finance: { label: 'Finance', icon: Wallet },
  general: { label: 'Général', icon: Sparkles },
  search: { label: 'Recherche', icon: Search },
  rag: { label: 'Base de connaissance', icon: Search },
}

const REVENUE_SOURCE_LABELS: Record<string, string> = {
  subscription: 'Abonnements',
  renewal: 'Réabonnements',
  upgrade: 'Upgrades',
}

function pctColor(v: number | null): string {
  if (v === null) return 'bg-background text-muted'
  if (v >= 65) return 'bg-success/20 text-success font-bold'
  if (v >= 45) return 'bg-primary/15 text-primary font-semibold'
  if (v >= 30) return 'bg-warning/15 text-warning font-medium'
  return 'bg-danger/10 text-danger font-medium'
}

function fmtMoney(amount: number, currency: string): string {
  const value = currency === 'EUR' && amount > 200 ? amount / 100 : amount
  const symbol = currency === 'EUR' ? '€' : currency === 'XOF' ? 'FCFA' : currency
  return `${value.toLocaleString('fr-FR')} ${symbol}`
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'jamais'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

// ─── Composants ───────────────────────────────────────────────────────────────

function FunnelCard({ title, steps }: { title: string; steps: FunnelStep[] }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-primary" /> {title}
      </h3>
      {steps.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">Aucune donnée.</p>
      ) : steps.map((step, i) => (
        <div key={step.step} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="w-3 h-3 text-muted shrink-0" />}
              <span className="font-semibold text-secondary">{step.step}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted font-mono">{step.value.toLocaleString('fr-FR')}</span>
              <span className={cn(
                'font-bold w-10 text-right',
                step.pct === 100 ? 'text-secondary' : step.pct >= 50 ? 'text-success' : 'text-warning'
              )}>
                {step.pct}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${step.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Barres mensuelles (une devise = un graphique, jamais de double axe) */
function MonthlyRevenueBars({ currency, points }: { currency: string; points: Array<{ month: string; total: number }> }) {
  const max = Math.max(...points.map(p => p.total), 1)
  const peak = points.reduce((a, b) => (b.total > a.total ? b : a), points[0])
  return (
    <div className="glass-card p-5 space-y-3">
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
        Encaissements mensuels — {currency === 'EUR' ? 'EUR (€)' : currency === 'XOF' ? 'XOF (FCFA)' : currency}
      </p>
      <div className="flex items-end gap-1.5 h-28">
        {points.map(p => {
          const h = Math.max(4, Math.round((p.total / max) * 100))
          const label = new Date(p.month + '-01').toLocaleDateString('fr-FR', { month: 'short' })
          return (
            <div key={p.month} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
              {p === peak && p.total > 0 && (
                <span className="text-[9px] font-bold text-secondary whitespace-nowrap">{fmtMoney(p.total, currency)}</span>
              )}
              <div
                title={`${label} : ${fmtMoney(p.total, currency)}`}
                className="w-full max-w-[26px] rounded-t-[4px] bg-primary group-hover:bg-primary/80 transition-colors"
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] text-muted truncate">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 20_000

export default function AdminAnalyticsPage() {
  const [billing, setBilling] = useState<BillingStats | null>(null)
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [funnels, setFunnels] = useState<Funnels | null>(null)
  const [retention, setRetention] = useState<Retention | null>(null)
  const [agents, setAgents] = useState<AgentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const firstError = useRef(true)

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const get = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json())
      const [bi, rev, fu, re, ag] = await Promise.all([
        get('/api/admin/billing/stats'),
        get('/api/admin/billing/revenue'),
        get('/api/admin/analytics/funnels'),
        get('/api/admin/analytics/retention'),
        get('/api/admin/analytics/agents'),
      ])
      if (bi.success && bi.data) setBilling(bi.data)
      if (rev.success && rev.data) setRevenue(rev.data)
      if (fu.success && fu.data) setFunnels(fu.data)
      if (re.success && re.data) setRetention(re.data)
      if (ag.success && ag.data) setAgents(ag.data)
      setLastUpdate(new Date())
    } catch {
      // Le polling silencieux ne spamme pas de toasts — seule la 1re erreur est signalée
      if (firstError.current) { toast.error('Erreur chargement analytics.'); firstError.current = false }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Temps réel : chargement initial + polling silencieux
  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => fetchAll(), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchAll])

  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  const fmtEur = (n: number) => `${fmt(n)} €`

  const revenueKpis = billing ? [
    { label: 'MRR', value: fmtEur(billing.mrr), sub: `ARR estimé : ${fmtEur(billing.arr)}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Nouveau MRR (mois)', value: fmtEur(billing.newMrr), sub: `${billing.newCount} nouveau${billing.newCount > 1 ? 'x' : ''} client${billing.newCount > 1 ? 's' : ''}`, icon: ArrowUpRight, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Churn MRR (mois)', value: fmtEur(billing.churnMrr), sub: `${billing.churnCount} résiliation${billing.churnCount > 1 ? 's' : ''}`, icon: billing.churnMrr > 0 ? TrendingDown : TrendingUp, color: billing.churnMrr > 0 ? 'text-danger' : 'text-success', bg: billing.churnMrr > 0 ? 'bg-danger/10' : 'bg-success/10' },
    { label: 'Net MRR (mois)', value: fmtEur(billing.newMrr - billing.churnMrr), sub: billing.newMrr >= billing.churnMrr ? 'Expansion positive' : 'Churn supérieur', icon: billing.newMrr >= billing.churnMrr ? ArrowUpRight : ArrowDownRight, color: billing.newMrr >= billing.churnMrr ? 'text-success' : 'text-danger', bg: billing.newMrr >= billing.churnMrr ? 'bg-success/10' : 'bg-danger/10' },
  ] : []

  // Encaissé par devise (mois + total)
  const collectedByCurrency = revenue
    ? Object.values(revenue.sources.reduce((acc, s) => {
        acc[s.currency] = acc[s.currency] || { currency: s.currency, total: 0, thisMonth: 0 }
        acc[s.currency].total += s.total
        acc[s.currency].thisMonth += s.thisMonth
        return acc
      }, {} as Record<string, { currency: string; total: number; thisMonth: number }>))
    : []

  // Séries mensuelles par devise (12 derniers mois, mois manquants à zéro)
  const monthlyByCurrency = (() => {
    if (!revenue) return []
    const months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push(d.toISOString().slice(0, 7))
    }
    const currencies = [...new Set(revenue.monthly.map(m => m.currency))]
    return currencies.map(currency => ({
      currency,
      points: months.map(month => ({
        month,
        total: revenue.monthly.filter(m => m.currency === currency && m.month === month).reduce((s, m) => s + m.total, 0),
      })),
    }))
  })()

  const mostUsed = agents?.agents[0]
  const leastUsed = agents && agents.agents.length > 1 ? agents.agents[agents.agents.length - 1] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des analytics…
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Header temps réel */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Analytics & Croissance</h1>
          <p className="text-sm text-muted mt-0.5">Revenus, funnels, rétention et usage des agents.</p>
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

      {/* ── REVENUS ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Revenus
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueKpis.map(k => (
            <div key={k.label} className="glass-card p-5 space-y-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', k.bg)}>
                <k.icon className={cn('w-4 h-4', k.color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{k.label}</p>
                <p className={cn('text-2xl font-bold mt-0.5', k.color)}>{k.value}</p>
                <p className="text-[11px] text-muted mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Encaissé réel (toutes sources) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collectedByCurrency.map(c => (
            <div key={c.currency} className="glass-card p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Total encaissé ({c.currency})</p>
                <p className="text-2xl font-bold text-secondary mt-0.5">{fmtMoney(c.total, c.currency)}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  dont <span className="font-bold text-success">{fmtMoney(c.thisMonth, c.currency)}</span> ce mois-ci
                </p>
              </div>
              <div className="text-right space-y-1">
                {revenue?.sources.filter(s => s.currency === c.currency).map(s => (
                  <p key={s.source} className="text-[11px] text-muted">
                    {REVENUE_SOURCE_LABELS[s.source] || s.source} : <span className="font-bold text-secondary">{fmtMoney(s.total, s.currency)}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
          {collectedByCurrency.length === 0 && (
            <div className="glass-card p-5 text-sm text-muted text-center col-span-full">Aucun encaissement enregistré.</div>
          )}
        </div>

        {/* Graphiques mensuels (un par devise — jamais de double axe) */}
        {monthlyByCurrency.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monthlyByCurrency.map(m => (
              <MonthlyRevenueBars key={m.currency} currency={m.currency} points={m.points} />
            ))}
          </div>
        )}
      </section>

      {/* ── FUNNELS ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Funnels de conversion
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FunnelCard title="Abonnement" steps={funnels?.conversion ?? []} />
          <FunnelCard title="Upgrade" steps={funnels?.upgrade ?? []} />
          <FunnelCard title="Paiements" steps={funnels?.paiement ?? []} />
        </div>
      </section>

      {/* ── RÉTENTION ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" /> Rétention
        </h2>
        {retention && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Taux de rétention (abonnés)', value: `${retention.retentionRate}%`, sub: `${retention.activeSubscribers} actifs / ${retention.total} inscrits`, good: retention.retentionRate >= 40 },
              { label: 'Actifs 7 derniers jours', value: fmt(retention.active7d), sub: '≥ 1 message envoyé', good: true },
              { label: 'Actifs 30 derniers jours', value: fmt(retention.active30d), sub: '≥ 1 message envoyé', good: true },
              { label: 'Total inscrits', value: fmt(retention.total), sub: 'Depuis le lancement', good: true },
            ].map(s => (
              <div key={s.label} className="glass-card p-5 space-y-1">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
                <p className={cn('text-2xl font-bold', s.good ? 'text-success' : 'text-warning')}>{s.value}</p>
                <p className="text-[11px] text-muted">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cohortes réelles */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[420px]">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest">Cohorte (mois)</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest text-center">Inscrits</th>
                  {['J+7', 'J+30', 'J+90'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(retention?.cohorts ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">Aucune inscription sur les 6 derniers mois.</td></tr>
                ) : (retention?.cohorts ?? []).map(c => (
                  <tr key={c.week} className="hover:bg-background/30 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium text-secondary capitalize">
                      {new Date(c.week).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted text-center font-mono">{c.size}</td>
                    {([c.j7, c.j30, c.j90] as (number | null)[]).map((val, i) => (
                      <td key={i} className="px-5 py-3 text-center">
                        {val === null
                          ? <span className="text-xs text-border" title="Cohorte trop récente">—</span>
                          : <span className={cn('inline-block text-xs px-3 py-1 rounded-lg', pctColor(val))}>{val}%</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-muted">
          % de la cohorte ayant envoyé au moins un message après J+7 / J+30 / J+90. « — » : cohorte trop récente pour mesurer.
        </p>
      </section>

      {/* ── USAGE DES AGENTS ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Usage des agents IA
          </h2>
          {agents && (
            <span className={cn(
              'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border',
              agents.n8nStatus === 'up'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-danger/10 text-danger border-danger/20'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', agents.n8nStatus === 'up' ? 'bg-success' : 'bg-danger animate-pulse')} />
              Moteur n8n : {agents.n8nStatus === 'up' ? 'opérationnel' : 'injoignable'}
            </span>
          )}
        </div>

        {agents && (mostUsed || leastUsed) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mostUsed && (
              <div className="glass-card p-4 flex items-center gap-3 border-success/20 bg-success/5">
                <TrendingUp className="w-5 h-5 text-success shrink-0" />
                <p className="text-sm text-secondary">
                  Agent le plus utilisé : <strong className="capitalize">{AGENT_META[mostUsed.agent]?.label || mostUsed.agent}</strong>
                  <span className="text-muted"> — {fmt(mostUsed.calls30d)} appels sur 30 j ({mostUsed.pct}%)</span>
                </p>
              </div>
            )}
            {leastUsed && (
              <div className="glass-card p-4 flex items-center gap-3 border-warning/20 bg-warning/5">
                <TrendingDown className="w-5 h-5 text-warning shrink-0" />
                <p className="text-sm text-secondary">
                  Le moins utilisé : <strong className="capitalize">{AGENT_META[leastUsed.agent]?.label || leastUsed.agent}</strong>
                  <span className="text-muted"> — {fmt(leastUsed.calls30d)} appels sur 30 j ({leastUsed.pct}%)</span>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(agents?.agents ?? []).length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-muted col-span-full">
              Aucune activité d'agent enregistrée pour le moment.
            </div>
          ) : (agents?.agents ?? []).map(a => {
            const meta = AGENT_META[a.agent] || { label: a.agent, icon: Activity }
            const Icon = meta.icon
            return (
              <div key={a.agent} className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-bold text-secondary capitalize">{meta.label}</p>
                  </div>
                  <span className={cn(
                    'flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border uppercase',
                    a.status === 'operational'
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-warning/10 text-warning border-warning/20'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', a.status === 'operational' ? 'bg-success' : 'bg-warning')} />
                    {a.status === 'operational' ? 'Opérationnel' : 'Inactif'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Aujourd'hui", value: a.callsToday },
                    { label: '7 jours', value: a.calls7d },
                    { label: '30 jours', value: a.calls30d },
                  ].map(s => (
                    <div key={s.label} className="bg-background rounded-xl py-2.5">
                      <p className="text-lg font-bold text-secondary">{fmt(s.value)}</p>
                      <p className="text-[9px] text-muted uppercase font-bold tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">Part d'usage (30 j)</span>
                    <span className="font-bold text-secondary">{a.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${a.pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border">
                  <span className="text-muted">Dernière activité : {timeAgo(a.lastUsed)}</span>
                  <span className={cn(
                    'flex items-center gap-0.5 font-bold',
                    a.trend > 0 ? 'text-success' : a.trend < 0 ? 'text-danger' : 'text-muted'
                  )}>
                    {a.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : a.trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                    {a.trend > 0 ? '+' : ''}{a.trend}% vs 30 j préc.
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
