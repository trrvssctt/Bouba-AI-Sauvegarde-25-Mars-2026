import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, DollarSign, RefreshCw, ArrowRight, Loader2,
  UserPlus, Megaphone, Headphones, Gauge, BarChart3, CreditCard,
  FileText, AlertTriangle, CheckCircle, Wallet, Clock,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

interface DashboardStats {
  overview: {
    totalRevenue: number;
    totalUsers: number;
    activeCustomers: number;
    pendingPayments: number;
    conversionRate: number;
    churnRate: number;
  };
  mrr: number;
  arr: number;
  pendingActions: {
    upgrades: number;
    tickets: number;
    wave: number;
    aiErrors24h: number;
    quotaExhausted: number;
    renewalsPending: number;
  };
  subsByPlan: { plan: string; count: number }[];
  plansDistribution: { plan: string; count: number; percentage: number; revenue: number }[];
  revenueByMonth: { month: string; monthKey?: string; revenue: number }[];
  recentCustomers: { id: string; name: string; email: string; plan: string; joined: string; status: string }[];
}

// Couleur fixe par plan (identité stable, jamais recyclée)
const PLAN_STYLE: Record<string, { bar: string; badge: string; label: string }> = {
  free:       { bar: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-700',     label: 'Free' },
  starter:    { bar: 'bg-primary',   badge: 'bg-primary/10 text-primary',    label: 'Starter' },
  business:   { bar: 'bg-violet-700', badge: 'bg-violet-100 text-violet-700', label: 'Business' },
  pro:        { bar: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700',     label: 'Pro' },
  enterprise: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700',   label: 'Enterprise' },
};
const planStyle = (plan: string) => PLAN_STYLE[(plan || 'free').toLowerCase()] || PLAN_STYLE.free;

const fmtEur = (cents: number) => {
  const v = cents > 200 ? cents / 100 : cents;
  return `${v.toLocaleString('fr-FR')} €`;
};

const REFRESH_MS = 30_000;

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const firstError = useRef(true);

  const fetchStats = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/dashboard/stats', { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
        setLastUpdate(new Date());
      }
    } catch {
      if (firstError.current) { toast.error('Erreur chargement du tableau de bord.'); firstError.current = false; }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement du tableau de bord…
      </div>
    );
  }

  const pa = stats.pendingActions;
  const totalPending = pa.upgrades + pa.wave + pa.tickets + pa.renewalsPending;

  // KPI principaux — chaque carte est un lien vers sa page
  const kpis = [
    {
      label: 'Utilisateurs',
      value: stats.overview.totalUsers,
      sub: `${stats.overview.activeCustomers} actifs · churn ${stats.overview.churnRate}%`,
      icon: Users, color: 'text-primary', bg: 'bg-primary/10', to: '/admin/users',
    },
    {
      label: 'MRR',
      value: fmtEur(stats.mrr),
      sub: `ARR estimé : ${fmtEur(stats.arr)}`,
      icon: DollarSign, color: 'text-success', bg: 'bg-success/10', to: '/admin/billing',
    },
    {
      label: 'Paiements en attente',
      value: pa.wave,
      sub: pa.wave > 0 ? 'Wave à valider manuellement' : 'Rien à valider',
      icon: CreditCard, color: pa.wave > 0 ? 'text-warning' : 'text-success',
      bg: pa.wave > 0 ? 'bg-warning/10' : 'bg-success/10', to: '/admin/payments',
    },
    {
      label: 'Erreurs IA (24 h)',
      value: pa.aiErrors24h,
      sub: pa.aiErrors24h > 0 ? 'Voir le monitoring' : 'Aucune erreur ✓',
      icon: pa.aiErrors24h > 0 ? AlertTriangle : CheckCircle,
      color: pa.aiErrors24h > 0 ? 'text-danger' : 'text-success',
      bg: pa.aiErrors24h > 0 ? 'bg-danger/10' : 'bg-success/10', to: '/admin/monitoring',
    },
  ];

  // Actions rapides — liens contextualisés vers chaque page admin
  const quickActions = [
    { label: 'Demandes d\'upgrade', desc: 'Valider ou refuser', count: pa.upgrades, icon: TrendingUp, to: '/admin/billing', urgent: pa.upgrades > 0 },
    { label: 'Paiements Wave', desc: 'Vérifier et valider', count: pa.wave, icon: Wallet, to: '/admin/payments', urgent: pa.wave > 0 },
    { label: 'Tickets support', desc: 'Demandes à traiter', count: pa.tickets, icon: Headphones, to: '/admin/support', urgent: pa.tickets > 0 },
    { label: 'Factures d\'échéance', desc: 'Envois du mois', count: pa.renewalsPending, icon: FileText, to: '/admin/billing', urgent: pa.renewalsPending > 0 },
    { label: 'Quotas épuisés', desc: 'Utilisateurs bloqués', count: pa.quotaExhausted, icon: Gauge, to: '/admin/monitoring', urgent: pa.quotaExhausted > 0 },
    { label: 'Créer un client', desc: 'Compte + preuve de paiement', count: null, icon: UserPlus, to: '/admin/users', urgent: false },
    { label: 'Nouvelle annonce', desc: 'Bannière utilisateurs', count: null, icon: Megaphone, to: '/admin/announcements', urgent: false },
    { label: 'Analytics', desc: 'Revenus, funnels, rétention', count: null, icon: BarChart3, to: '/admin/analytics', urgent: false },
  ];

  const maxRevenue = Math.max(...stats.revenueByMonth.map(r => r.revenue), 1);
  const maxPlanCount = Math.max(...stats.plansDistribution.map(p => p.count), 1);
  const totalSubs = stats.subsByPlan.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Tableau de bord</h1>
          <p className="text-sm text-muted mt-0.5">
            Vue d'ensemble de Bouba'ia
            {totalPending > 0 && (
              <span className="ml-2 text-warning font-bold">· {totalPending} action{totalPending > 1 ? 's' : ''} en attente</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Temps réel · {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : '…'}
          </span>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 btn-ghost border border-border text-sm"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── KPI (liens vers les pages) ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Link key={k.label} to={k.to} className="glass-card p-5 space-y-3 hover:border-primary/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', k.bg)}>
                <k.icon className={cn('w-4 h-4', k.color)} />
              </div>
              <ArrowRight className="w-4 h-4 text-border group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{k.label}</p>
              <p className={cn('text-2xl font-bold mt-0.5', k.color)}>{k.value}</p>
              <p className="text-[11px] text-muted mt-0.5">{k.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── ACTIONS RAPIDES ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4" /> Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <Link
              key={a.label}
              to={a.to}
              className={cn(
                'glass-card p-4 flex items-start gap-3 transition-all hover:shadow-md group',
                a.urgent ? 'border-warning/40 bg-warning/5 hover:border-warning' : 'hover:border-primary/40'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                a.urgent ? 'bg-warning/15' : 'bg-primary/10'
              )}>
                <a.icon className={cn('w-4 h-4', a.urgent ? 'text-warning' : 'text-primary')} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-secondary leading-tight truncate">{a.label}</p>
                  {a.count !== null && a.count > 0 && (
                    <span className={cn(
                      'shrink-0 min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                      a.urgent ? 'bg-warning text-white' : 'bg-primary text-white'
                    )}>
                      {a.count}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted mt-0.5 truncate">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── STATS PLANS (répartition + abonnements + revenus) ────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Plans & abonnements
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Répartition des utilisateurs par plan */}
          <div className="glass-card p-6 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Répartition des utilisateurs</p>
            {stats.plansDistribution.map(p => {
              const st = planStyle(p.plan);
              return (
                <div key={p.plan} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase text-[10px]', st.badge)}>{st.label}</span>
                    <span className="font-mono text-muted">
                      {p.count} utilisateur{p.count > 1 ? 's' : ''} · <span className="font-bold text-secondary">{p.percentage}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', st.bar)}
                      style={{ width: `${Math.max(3, Math.round((p.count / maxPlanCount) * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Abonnements payants actifs par plan */}
          <div className="glass-card p-6 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Abonnements payants actifs</p>
            {totalSubs === 0 ? (
              <p className="text-sm text-muted text-center py-6">Aucun abonnement payant actif.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-display font-bold text-secondary">{totalSubs}</p>
                  <p className="text-xs text-muted">abonnement{totalSubs > 1 ? 's' : ''} en cours</p>
                </div>
                {/* Barre segmentée par plan */}
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {stats.subsByPlan.map(s => (
                    <div
                      key={s.plan}
                      className={cn('transition-all', planStyle(s.plan).bar)}
                      style={{ width: `${(s.count / totalSubs) * 100}%` }}
                      title={`${planStyle(s.plan).label} : ${s.count}`}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  {stats.subsByPlan.map(s => (
                    <div key={s.plan} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full', planStyle(s.plan).bar)} />
                        <span className="font-semibold text-secondary">{planStyle(s.plan).label}</span>
                      </span>
                      <span className="font-mono text-muted">{s.count} · {Math.round((s.count / totalSubs) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Revenus théoriques par plan (MRR) */}
          <div className="glass-card p-6 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">MRR par plan</p>
            {stats.plansDistribution.filter(p => p.revenue > 0).length === 0 ? (
              <p className="text-sm text-muted text-center py-6">Aucun revenu récurrent.</p>
            ) : stats.plansDistribution.filter(p => p.revenue > 0).map(p => {
              const st = planStyle(p.plan);
              const maxRev = Math.max(...stats.plansDistribution.map(x => x.revenue), 1);
              return (
                <div key={p.plan} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase text-[10px]', st.badge)}>{st.label}</span>
                    <span className="font-bold text-secondary">{fmtEur(p.revenue)}<span className="text-muted font-normal"> / mois</span></span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', st.bar)} style={{ width: `${Math.max(3, Math.round((p.revenue / maxRev) * 100))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── REVENUS ENCAISSÉS (6 mois) + CLIENTS RÉCENTS ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mini graphique revenus mensuels */}
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Encaissements (6 derniers mois)</p>
            <Link to="/admin/billing" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Facturation <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.revenueByMonth.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucun encaissement sur la période.</p>
          ) : (
            <div className="flex items-end gap-2 h-32 pt-2">
              {stats.revenueByMonth.map(r => {
                const h = Math.max(4, Math.round((r.revenue / maxRevenue) * 100));
                return (
                  <div key={r.monthKey || r.month} className="flex-1 flex flex-col items-center gap-1 group">
                    {r.revenue === maxRevenue && r.revenue > 0 && (
                      <span className="text-[9px] font-bold text-secondary whitespace-nowrap">{fmtEur(r.revenue)}</span>
                    )}
                    <div
                      title={`${r.month} : ${fmtEur(r.revenue)}`}
                      className="w-full max-w-[36px] rounded-t-[4px] bg-primary group-hover:bg-primary/80 transition-colors"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] text-muted capitalize">{r.month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Clients récents */}
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Derniers inscrits</p>
            <Link to="/admin/users" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Tous les utilisateurs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.recentCustomers.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucun utilisateur récent.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentCustomers.map(c => (
                <Link key={c.id} to={`/admin/users/${c.id}`} className="flex items-center gap-3 py-2.5 hover:bg-background/40 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {(c.name || c.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-secondary truncate">{c.name || c.email}</p>
                    <p className="text-[11px] text-muted truncate">{c.email}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0', planStyle(c.plan).badge)}>
                    {planStyle(c.plan).label}
                  </span>
                  <span className="text-[10px] text-muted shrink-0">{new Date(c.joined).toLocaleDateString('fr-FR')}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
