import { useState, useEffect, useCallback } from 'react'
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
  Zap,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

// Cohorts — illustration statique (nécessiterait event timestamps pour être dynamique)
const COHORTS = [
  { week: 'Semaine 1', j7: 71, j30: 48, j90: 38 },
  { week: 'Semaine 2', j7: 68, j30: 44, j90: 36 },
  { week: 'Semaine 3', j7: 73, j30: 50, j90: null },
  { week: 'Semaine 4', j7: 65, j30: 42, j90: null },
  { week: 'Semaine 5', j7: 74, j30: 46, j90: null },
  { week: 'Semaine 6', j7: 70, j30: null, j90: null },
  { week: 'Semaine 7', j7: 76, j30: null, j90: null },
  { week: 'Semaine 8', j7: 69, j30: null, j90: null },
]

function pctColor(v: number | null): string {
  if (v === null) return 'bg-background text-muted'
  if (v >= 65) return 'bg-success/20 text-success font-bold'
  if (v >= 45) return 'bg-primary/15 text-primary font-semibold'
  if (v >= 30) return 'bg-warning/15 text-warning font-medium'
  return 'bg-danger/10 text-danger font-medium'
}

interface AgentStat { agent: string; calls: number; pct: number; color: string }
interface AnalyticsOverview {
  registrations: { thisMonth: number; lastMonth: number; total: number; trend: string }
  funnel: Array<{ step: string; value: number; pct: number; color?: string }>
  retentionRate: number
  conversionRate: number
}
interface BillingStats {
  mrr: number; arr: number
  newMrr: number; newCount: number
  churnMrr: number; churnCount: number
}

function Skeleton({ w = 'w-20', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={cn('animate-pulse bg-border rounded', w, h)} />
}

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [billing, setBilling] = useState<BillingStats | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStat[]>([])
  const [agentSummary, setAgentSummary] = useState<{ total_messages_today: number; avg_messages_per_user: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [ovRes, agRes, biRes] = await Promise.all([
        fetch('/api/admin/analytics/overview', { credentials: 'include' }),
        fetch('/api/admin/monitoring/agent-stats', { credentials: 'include' }),
        fetch('/api/admin/billing/stats', { credentials: 'include' }),
      ])
      const [ovData, agData, biData] = await Promise.all([ovRes.json(), agRes.json(), biRes.json()])

      if (ovData.success && ovData.data) setOverview(ovData.data)
      if (agData.success) {
        setAgentStats(agData.data ?? [])
        setAgentSummary(agData.summary ?? null)
      }
      if (biData.success && biData.data) setBilling(biData.data)
    } catch {
      toast.error('Erreur chargement analytics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtEur = (n: number) => `${fmt(n)} €`

  // ─── KPI cards ────────────────────────────────────────────────────────────
  const revenueKpis = billing ? [
    {
      label: 'MRR',
      value: fmtEur(billing.mrr),
      sub: `ARR estimé : ${fmtEur(billing.arr)}`,
      icon: DollarSign,
      up: true,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Nouveau MRR (mois)',
      value: fmtEur(billing.newMrr),
      sub: `${billing.newCount} nouveau${billing.newCount > 1 ? 'x' : ''} abonnement${billing.newCount > 1 ? 's' : ''}`,
      icon: ArrowUpRight,
      up: billing.newMrr > 0,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Churn MRR (mois)',
      value: fmtEur(billing.churnMrr),
      sub: `${billing.churnCount} résiliation${billing.churnCount > 1 ? 's' : ''}`,
      icon: billing.churnMrr > 0 ? TrendingDown : TrendingUp,
      up: billing.churnMrr === 0,
      color: billing.churnMrr > 0 ? 'text-danger' : 'text-success',
      bg: billing.churnMrr > 0 ? 'bg-danger/10' : 'bg-success/10',
    },
    {
      label: 'Net MRR (mois)',
      value: fmtEur(billing.newMrr - billing.churnMrr),
      sub: billing.newMrr >= billing.churnMrr ? 'Expansion positive' : 'Churn supérieur',
      icon: billing.newMrr >= billing.churnMrr ? ArrowUpRight : ArrowDownRight,
      up: billing.newMrr >= billing.churnMrr,
      color: billing.newMrr >= billing.churnMrr ? 'text-success' : 'text-danger',
      bg: billing.newMrr >= billing.churnMrr ? 'bg-success/10' : 'bg-danger/10',
    },
  ] : []

  const growthKpis = overview ? [
    {
      label: 'Inscriptions ce mois',
      value: `+${overview.registrations.thisMonth}`,
      sub: `${overview.registrations.lastMonth} le mois dernier (${overview.registrations.trend})`,
      up: overview.registrations.thisMonth >= overview.registrations.lastMonth,
    },
    {
      label: 'Total inscrits',
      value: fmt(overview.registrations.total),
      sub: 'Depuis le lancement',
      up: true,
    },
    {
      label: 'Taux de rétention',
      value: `${overview.retentionRate}%`,
      sub: 'Actifs / total inscrits',
      up: overview.retentionRate >= 40,
    },
    {
      label: 'Conversion → Pro+',
      value: `${overview.conversionRate}%`,
      sub: overview.conversionRate >= 20 ? 'Objectif atteint ✓' : 'Objectif : 20%',
      up: overview.conversionRate >= 20,
    },
  ] : []

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Analytics & Croissance</h1>
          <p className="text-sm text-muted mt-0.5">Revenus, funnel, rétention et usage des agents.</p>
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

      {/* ── REVENUS ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Revenus
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <div className="w-9 h-9 bg-border rounded-xl" />
              <Skeleton w="w-16" h="h-2" />
              <Skeleton w="w-24" h="h-6" />
              <Skeleton w="w-28" h="h-2" />
            </div>
          )) : revenueKpis.map((k) => (
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
      </section>

      {/* ── CROISSANCE ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Croissance utilisateurs
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <Skeleton w="w-20" h="h-2" />
              <Skeleton w="w-16" h="h-6" />
              <Skeleton w="w-28" h="h-2" />
            </div>
          )) : growthKpis.map((s) => (
            <div key={s.label} className="glass-card p-5 space-y-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
              <p className={cn('text-2xl font-bold', s.up ? 'text-success' : 'text-warning')}>{s.value}</p>
              <p className="text-[11px] text-muted">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── USAGE IA ──────────────────────────────────────────────────────── */}
      {agentSummary && !loading && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" /> Usage IA (aujourd'hui)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Messages envoyés aujourd\'hui', value: agentSummary.total_messages_today, icon: Zap },
              { label: 'Moyenne par utilisateur actif', value: agentSummary.avg_messages_per_user.toFixed(1), icon: Users },
            ].map((s) => (
              <div key={s.label} className="glass-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
                  <p className="text-2xl font-bold text-secondary">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FUNNEL & AGENTS ──────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Funnel */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
              <ArrowRight className="w-4 h-4" /> Funnel de conversion
            </h2>
            <div className="glass-card p-6 space-y-4">
              {(overview?.funnel ?? []).length === 0 ? (
                <p className="text-sm text-muted text-center py-4">Aucune donnée.</p>
              ) : (overview?.funnel ?? []).map((step, i) => (
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
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', step.color ?? 'bg-primary')}
                      style={{ width: `${step.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Agents */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Agents utilisés (30 jours)
            </h2>
            <div className="glass-card p-6 space-y-4">
              {agentStats.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted">Aucune donnée d'agent disponible.</p>
                  <p className="text-xs text-muted mt-1">Les données apparaîtront après les premières utilisations.</p>
                </div>
              ) : agentStats.map((a) => (
                <div key={a.agent} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-secondary capitalize">{a.agent}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted font-mono">{a.calls.toLocaleString('fr-FR')} appels</span>
                      <span className="font-bold text-secondary w-10 text-right">{a.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', a.color)}
                      style={{ width: `${a.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── COHORTS ──────────────────────────────────────────────────────── */}
      {!loading && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" /> Cohortes de rétention
            </h2>
            <span className="text-xs text-muted bg-background border border-border px-2 py-0.5 rounded-lg">
              Illustration — nécessite event tracking
            </span>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-background/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest">Cohorte</th>
                  {['J+7', 'J+30', 'J+90'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-muted uppercase tracking-widest text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COHORTS.map((c) => (
                  <tr key={c.week} className="hover:bg-background/30 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium text-secondary">{c.week}</td>
                    {([c.j7, c.j30, c.j90] as (number | null)[]).map((val, i) => (
                      <td key={i} className="px-5 py-3 text-center">
                        {val === null
                          ? <span className="text-xs text-border">—</span>
                          : <span className={cn('inline-block text-xs px-3 py-1 rounded-lg', pctColor(val))}>{val}%</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted">
            <span>Légende :</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20 inline-block" /> ≥ 65%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/15 inline-block" /> 45–64%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/15 inline-block" /> 30–44%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-danger/10 inline-block" /> &lt; 30%</span>
          </div>
        </section>
      )}

      {/* ── LOADER ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des analytics…
        </div>
      )}
    </div>
  )
}
