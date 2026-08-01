import { useState, useEffect, useCallback } from 'react'
import {
  Sliders, Save, Trash2, Loader2, X, Pencil, Star,
  CreditCard, Grid3X3, Check, AlertTriangle, Users, Power,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency?: string
  features: string[]
  messages_limit: number
  popular: boolean
  active: boolean
  subscribers: number
}

interface AppIntegration {
  id: string
  name: string
  description?: string
  category?: string
  logo_url?: string
  active: boolean
  connectedUsers: number
  totalUsers: number
  connectionRate: number
}

const fmtPrice = (cents: number) => {
  const v = cents > 200 ? cents / 100 : cents
  return v === 0 ? 'Gratuit' : `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'quotas' | 'plans' | 'apps'>('quotas')
  const [loading, setLoading] = useState(true)

  // ── Quotas ────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<Plan[]>([])
  const [quotaEdits, setQuotaEdits] = useState<Record<string, number>>({})
  const [savingQuotas, setSavingQuotas] = useState(false)

  // ── Plans ─────────────────────────────────────────────────────────
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planForm, setPlanForm] = useState({ name: '', description: '', price: '', features: '', messages_limit: '', popular: false })
  const [savingPlan, setSavingPlan] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null)
  const [migrateTo, setMigrateTo] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  // ── Apps ──────────────────────────────────────────────────────────
  const [apps, setApps] = useState<AppIntegration[]>([])
  const [deletingApp, setDeletingApp] = useState<AppIntegration | null>(null)
  const [appBusy, setAppBusy] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const get = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json())
      const [pl, ap] = await Promise.all([
        get('/api/admin/settings/plans'),
        get('/api/admin/settings/apps'),
      ])
      if (pl.success) {
        setPlans(pl.data ?? [])
        setQuotaEdits(Object.fromEntries((pl.data ?? []).map((p: Plan) => [p.id, p.messages_limit])))
      }
      if (ap.success) setApps(ap.data ?? [])
    } catch {
      toast.error('Erreur chargement des paramètres.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Quotas : sauvegarde + application + notification ──────────────
  const handleSaveQuotas = async () => {
    setSavingQuotas(true)
    try {
      const body: Record<string, number> = {}
      for (const p of plans) {
        const v = quotaEdits[p.id]
        if (v !== undefined && Number(v) !== Number(p.messages_limit)) body[`${p.id}_messages`] = Number(v)
      }
      if (Object.keys(body).length === 0) { toast.info('Aucun quota modifié.'); return }
      const res = await fetch('/api/admin/settings/quotas', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(json.message)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde des quotas.')
    } finally {
      setSavingQuotas(false)
    }
  }

  // ── Plans : édition ───────────────────────────────────────────────
  const openPlanEdit = (p: Plan) => {
    setEditingPlan(p)
    setPlanForm({
      name: p.name || '',
      description: p.description || '',
      price: String(p.price > 200 ? p.price / 100 : p.price),
      features: (p.features || []).join('\n'),
      messages_limit: String(p.messages_limit),
      popular: p.popular,
    })
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return
    setSavingPlan(true)
    try {
      const res = await fetch(`/api/admin/settings/plans/${editingPlan.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planForm.name.trim(),
          description: planForm.description.trim(),
          price: Math.round(Number(planForm.price) * 100),   // euros → centimes
          features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean),
          messages_limit: Number(planForm.messages_limit),
          popular: planForm.popular,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(`Plan ${planForm.name} mis à jour.`)
      setEditingPlan(null)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleTogglePlan = async (p: Plan) => {
    try {
      const res = await fetch(`/api/admin/settings/plans/${p.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(p.active ? `Plan ${p.name} désactivé (masqué des offres).` : `Plan ${p.name} activé.`)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur.')
    }
  }

  const handleDeletePlan = async () => {
    if (!deletingPlan) return
    if (deletingPlan.subscribers > 0 && !migrateTo) {
      toast.error('Choisissez le plan de migration des abonnés.')
      return
    }
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/settings/plans/${deletingPlan.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(migrateTo ? { migrateTo } : {}),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(json.message)
      setDeletingPlan(null)
      setMigrateTo('')
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression.')
    } finally {
      setDeleteBusy(false)
    }
  }

  // ── Apps ──────────────────────────────────────────────────────────
  const handleToggleApp = async (a: AppIntegration) => {
    setAppBusy(a.id)
    try {
      const res = await fetch(`/api/admin/settings/apps/${a.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !a.active }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(a.active
        ? `${a.name} désactivée — plus proposée aux utilisateurs.`
        : `${a.name} activée — disponible pour les utilisateurs.`)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur.')
    } finally {
      setAppBusy(null)
    }
  }

  const handleDeleteApp = async (force: boolean) => {
    if (!deletingApp) return
    setAppBusy(deletingApp.id)
    try {
      const res = await fetch(`/api/admin/settings/apps/${deletingApp.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(json.message)
      setDeletingApp(null)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression.')
    } finally {
      setAppBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des paramètres…
      </div>
    )
  }

  const activePlans = plans.filter(p => p.active)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-secondary">Paramètres</h1>
        <p className="text-sm text-muted mt-0.5">Quotas globaux, gestion des plans et applications.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-2xl border border-border w-fit flex-wrap">
        {([
          { key: 'quotas', label: 'Quotas globaux', icon: Sliders },
          { key: 'plans', label: 'Gestion des plans', icon: CreditCard },
          { key: 'apps', label: 'Applications', icon: Grid3X3 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-secondary hover:bg-background'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── QUOTAS GLOBAUX ─────────────────────────────────────────── */}
      {activeTab === 'quotas' && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
            <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              Modifier un quota l'applique <strong>immédiatement à tous les utilisateurs du plan</strong>,
              et chacun est <strong>notifié automatiquement par email</strong> (+ notification in-app).
              Valeur <span className="font-mono">-1</span> = illimité.
            </p>
          </div>
          <div className="glass-card divide-y divide-border">
            {plans.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-secondary">{p.name}</p>
                  <p className="text-[11px] text-muted">
                    {p.subscribers} abonné{p.subscribers > 1 ? 's' : ''} concerné{p.subscribers > 1 ? 's' : ''}
                    {!p.active && <span className="text-warning font-bold"> · plan désactivé</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={quotaEdits[p.id] ?? p.messages_limit}
                    onChange={e => setQuotaEdits(q => ({ ...q, [p.id]: Number(e.target.value) }))}
                    className="w-32 bg-background border border-border rounded-xl px-3 py-2 text-sm text-right font-mono outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted w-24">messages / mois</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveQuotas}
            disabled={savingQuotas}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {savingQuotas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingQuotas ? 'Application en cours…' : 'Appliquer à tous les utilisateurs'}
          </button>
        </div>
      )}

      {/* ── GESTION DES PLANS (cartes) ─────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map(p => (
            <div key={p.id} className={cn(
              'glass-card p-6 flex flex-col relative transition-all',
              p.popular && p.active && 'ring-2 ring-primary shadow-violet',
              !p.active && 'opacity-70 border-dashed'
            )}>
              {p.popular && p.active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  ★ Populaire
                </span>
              )}
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-lg font-display font-bold text-secondary">{p.name}</h3>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border',
                  p.active ? 'bg-success/10 text-success border-success/20' : 'bg-border/40 text-muted border-border'
                )}>
                  {p.active ? 'Actif' : 'Désactivé'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold text-secondary">{fmtPrice(p.price)}</span>
                {p.price > 0 && <span className="text-muted text-xs">/ mois</span>}
              </div>
              {p.description && <p className="text-xs text-muted mt-1">{p.description}</p>}
              <p className="text-[11px] text-muted mt-2">
                <Users className="w-3 h-3 inline mr-1" />
                {p.subscribers} abonné{p.subscribers > 1 ? 's' : ''} ·{' '}
                {p.messages_limit === -1 ? 'messages illimités' : `${p.messages_limit.toLocaleString('fr-FR')} msg/mois`}
              </p>

              <div className="flex-1 space-y-2 mt-4 pt-4 border-t border-border">
                {(p.features || []).map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs text-secondary">
                    <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
                {(p.features || []).length === 0 && <p className="text-xs text-muted italic">Aucune fonctionnalité listée.</p>}
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                <button
                  onClick={() => openPlanEdit(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-primary/25 text-primary hover:bg-primary/8 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button
                  onClick={() => handleTogglePlan(p)}
                  title={p.active ? 'Désactiver (masquer des offres)' : 'Activer'}
                  className={cn(
                    'p-2 rounded-xl border transition-colors',
                    p.active ? 'text-warning border-warning/25 hover:bg-warning/10' : 'text-success border-success/25 hover:bg-success/10'
                  )}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setDeletingPlan(p); setMigrateTo('') }}
                  title="Supprimer le plan"
                  className="p-2 rounded-xl border border-danger/25 text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── APPLICATIONS ───────────────────────────────────────────── */}
      {activeTab === 'apps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {apps.map(a => (
            <div key={a.id} className={cn('glass-card p-5 space-y-4', !a.active && 'opacity-70 border-dashed')}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  {a.logo_url
                    ? <img src={a.logo_url} alt={a.name} className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span className="text-lg font-bold text-primary">{a.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-secondary">{a.name}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0',
                      a.active ? 'bg-success/10 text-success border-success/20' : 'bg-border/40 text-muted border-border'
                    )}>
                      {a.active ? 'Disponible' : 'Désactivée'}
                    </span>
                  </div>
                  {a.category && <p className="text-[10px] text-muted uppercase font-bold tracking-wider mt-0.5">{a.category}</p>}
                </div>
              </div>

              <p className="text-xs text-muted leading-relaxed">{a.description || '—'}</p>

              {/* Taux d'association */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Taux d'association</span>
                  <span className="font-bold text-secondary">
                    {a.connectedUsers}/{a.totalUsers} utilisateur{a.totalUsers > 1 ? 's' : ''} · {a.connectionRate}%
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${a.connectionRate}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => handleToggleApp(a)}
                  disabled={appBusy === a.id}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors disabled:opacity-50',
                    a.active
                      ? 'text-warning border-warning/25 hover:bg-warning/10'
                      : 'text-success border-success/25 hover:bg-success/10'
                  )}
                >
                  {appBusy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                  {a.active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => setDeletingApp(a)}
                  disabled={appBusy === a.id}
                  title="Supprimer l'application"
                  className="p-2 rounded-xl border border-danger/25 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {apps.length === 0 && (
            <div className="glass-card p-10 text-center text-sm text-muted col-span-full">
              Catalogue vide — exécutez la migration <span className="font-mono">add_app_integrations.sql</span>.
            </div>
          )}
        </div>
      )}

      {/* ── Modal édition de plan ──────────────────────────────────── */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Modifier le plan {editingPlan.name}</h3>
              <button onClick={() => setEditingPlan(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€ / mois)</label>
                  <input type="number" step="0.01" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonctionnalités (une par ligne)</label>
                <textarea rows={6} value={planForm.features} onChange={e => setPlanForm(f => ({ ...f, features: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite messages / mois (-1 = illimité)</label>
                  <input type="number" value={planForm.messages_limit} onChange={e => setPlanForm(f => ({ ...f, messages_limit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 cursor-pointer">
                  <input type="checkbox" checked={planForm.popular} onChange={e => setPlanForm(f => ({ ...f, popular: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                  <Star className="w-4 h-4 text-amber-500" /> Plan populaire
                </label>
              </div>
              <p className="text-xs text-gray-400">La nouvelle limite de messages sera appliquée aux {editingPlan.subscribers} abonné(s) du plan.</p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditingPlan(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleSavePlan} disabled={savingPlan}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression de plan (migration forcée) ───────────── */}
      {deletingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">Supprimer le plan {deletingPlan.name}</h3>
                {deletingPlan.subscribers > 0 ? (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span><strong>{deletingPlan.subscribers} utilisateur(s)</strong> sont abonnés à ce plan.
                        Pour forcer la suppression, choisissez le plan vers lequel les basculer —
                        ils seront <strong>notifiés par email</strong>.</span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Migrer les abonnés vers
                      </label>
                      <select
                        value={migrateTo}
                        onChange={e => setMigrateTo(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="">— Choisir un plan actif —</option>
                        {activePlans.filter(p => p.id !== deletingPlan.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({fmtPrice(p.price)})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">Aucun abonné sur ce plan — suppression sans impact.</p>
                )}
              </div>
              <button onClick={() => setDeletingPlan(null)} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setDeletingPlan(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={deleteBusy || (deletingPlan.subscribers > 0 && !migrateTo)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingPlan.subscribers > 0 ? 'Migrer et supprimer' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression d'application ────────────────────────── */}
      {deletingApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">Supprimer {deletingApp.name}</h3>
                {deletingApp.connectedUsers > 0 ? (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span><strong>{deletingApp.connectedUsers} utilisateur(s)</strong> y sont connectés.
                      Forcer la suppression <strong>déconnectera leurs comptes</strong> et chacun recevra
                      un <strong>email informatif</strong>.</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">Aucun utilisateur connecté — suppression sans impact.</p>
                )}
              </div>
              <button onClick={() => setDeletingApp(null)} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setDeletingApp(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => handleDeleteApp(deletingApp.connectedUsers > 0)}
                disabled={appBusy === deletingApp.id}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {appBusy === deletingApp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingApp.connectedUsers > 0 ? 'Forcer la suppression' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
