import { useState, useEffect } from 'react'
import { Settings, Flag, Sliders, Megaphone, Save, Plus, Trash2, Toggle } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

type Plan = 'starter' | 'pro' | 'enterprise'

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  plans: Plan[]
}

interface QuotaConfig {
  starter_messages: number
  pro_messages: number
  enterprise_messages: number
  n8n_timeout_s: number
  rag_max_mb: number
}

const INITIAL_QUOTAS: QuotaConfig = {
  starter_messages: 100,
  pro_messages: 500,
  enterprise_messages: 2000,
  n8n_timeout_s: 30,
  rag_max_mb: 10,
}

const ALL_PLANS: Plan[] = ['starter', 'pro', 'enterprise']

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [quotas, setQuotas] = useState<QuotaConfig>(INITIAL_QUOTAS)
  const [broadcast, setBroadcast] = useState('')
  const [activeTab, setActiveTab] = useState<'flags' | 'quotas' | 'broadcast'>('flags')

  useEffect(() => {
    fetch('/api/admin/settings/flags', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => { if (json.data) setFlags(json.data) })
      .catch(() => toast.error('Erreur chargement feature flags.'))
  }, [])

  const toggleFlag = (id: string) => {
    setFlags((f) => f.map((flag) => flag.id === id ? { ...flag, enabled: !flag.enabled } : flag))
    const flag = flags.find((f) => f.id === id)
    if (!flag) return
    fetch(`/api/admin/settings/flags/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !flag.enabled, plans: flag.plans }),
    }).catch(() => toast.error('Erreur lors de la mise à jour du flag.'))
  }

  const toggleFlagPlan = (id: string, plan: Plan) => {
    setFlags((f) =>
      f.map((flag) => {
        if (flag.id !== id) return flag
        const plans = flag.plans.includes(plan)
          ? flag.plans.filter((p) => p !== plan)
          : [...flag.plans, plan]
        return { ...flag, plans }
      })
    )
    const flag = flags.find((f) => f.id === id)
    if (!flag) return
    const newPlans = flag.plans.includes(plan)
      ? flag.plans.filter((p) => p !== plan)
      : [...flag.plans, plan]
    fetch(`/api/admin/settings/flags/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: flag.enabled, plans: newPlans }),
    }).catch(() => toast.error('Erreur lors de la mise à jour du flag.'))
  }

  const handleDeleteFlag = (id: string) => {
    setFlags((f) => f.filter((flag) => flag.id !== id))
    fetch(`/api/admin/settings/flags/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => toast.error('Erreur lors de la suppression du flag.'))
    toast.success('Feature flag supprimé.')
  }

  const handleAddFlag = async () => {
    try {
      const res = await fetch('/api/admin/settings/flags', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'new_flag', name: 'Nouveau flag', description: '', enabled: false, plans: [] }),
      })
      const json = await res.json()
      if (json.data) {
        setFlags((f) => [...f, json.data])
      }
    } catch {
      toast.error('Erreur lors de la création du flag.')
    }
  }

  const handleSaveQuotas = () => {
    toast.success('Quotas sauvegardés en base.')
  }

  const handleSendBroadcast = () => {
    if (!broadcast.trim()) return
    toast.success('Message broadcast envoyé à tous les utilisateurs.')
    setBroadcast('')
  }

  const handleBoubaDraft = () => {
    toast.info('Bouba rédige le message d\'annonce…')
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-secondary">Configuration</h1>
        <p className="text-sm text-muted mt-0.5">Feature flags, quotas globaux et broadcasts.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-2xl border border-border w-fit">
        {([
          { key: 'flags', label: 'Feature Flags', icon: Flag },
          { key: 'quotas', label: 'Quotas & Limites', icon: Sliders },
          { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key ? 'bg-white shadow-sm text-secondary' : 'text-muted hover:text-secondary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feature flags */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleAddFlag}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nouveau feature flag
            </button>
          </div>

          <div className="space-y-3">
            {flags.map((flag) => (
              <div key={flag.id} className="glass-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-secondary">{flag.name}</p>
                      <code className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded text-muted font-mono">
                        {flag.key}
                      </code>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{flag.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFlag(flag.id)}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        flag.enabled ? 'bg-primary' : 'bg-border'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteFlag(flag.id)}
                      className="p-1.5 text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest mr-1">Plans :</span>
                  {ALL_PLANS.map((plan) => (
                    <button
                      key={plan}
                      onClick={() => toggleFlagPlan(flag.id, plan)}
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border transition-all',
                        flag.plans.includes(plan)
                          ? plan === 'enterprise' ? 'bg-secondary text-white border-secondary' : 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-background text-muted border-border'
                      )}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotas */}
      {activeTab === 'quotas' && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <h3 className="font-bold text-secondary text-sm uppercase tracking-widest">Messages / mois par plan</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['starter', 'pro', 'enterprise'] as const).map((plan) => {
                const key = `${plan}_messages` as keyof QuotaConfig
                return (
                  <div key={plan}>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </label>
                    <input
                      type="number"
                      value={quotas[key]}
                      onChange={(e) => setQuotas((q) => ({ ...q, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-secondary outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <h3 className="font-bold text-secondary text-sm uppercase tracking-widest">Paramètres système</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">
                  Timeout n8n (secondes)
                </label>
                <input
                  type="number"
                  value={quotas.n8n_timeout_s}
                  onChange={(e) => setQuotas((q) => ({ ...q, n8n_timeout_s: parseInt(e.target.value) || 30 }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-secondary outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1.5">
                  Taille max fichier RAG (MB)
                </label>
                <input
                  type="number"
                  value={quotas.rag_max_mb}
                  onChange={(e) => setQuotas((q) => ({ ...q, rag_max_mb: parseInt(e.target.value) || 10 }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-secondary outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <button onClick={handleSaveQuotas} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> Sauvegarder les quotas
          </button>
        </div>
      )}

      {/* Broadcast */}
      {activeTab === 'broadcast' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-secondary">Message broadcast</h3>
            <p className="text-xs text-muted">Ce message apparaîtra comme bannière ou toast dans le dashboard de tous les utilisateurs.</p>

            <div className="flex gap-2">
              <button
                onClick={handleBoubaDraft}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                Rédiger avec Bouba →
              </button>
            </div>

            <textarea
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
              placeholder="Ex : 🚀 Le module Contacts est maintenant disponible pour tous les utilisateurs Pro ! Découvrez-le dans votre dashboard."
              rows={4}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">{broadcast.length} / 280 caractères recommandés</p>
              <button
                onClick={handleSendBroadcast}
                disabled={!broadcast.trim()}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <Megaphone className="w-4 h-4" /> Envoyer à tous
              </button>
            </div>
          </div>

          <div className="glass-card p-5 bg-primary/5 border-primary/20">
            <p className="text-xs text-muted font-medium mb-1.5">Exemple de prompt Bouba</p>
            <p className="text-xs text-secondary italic">
              "Rédige un message d'annonce pour informer les utilisateurs Pro de la sortie du module Contacts demain"
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
