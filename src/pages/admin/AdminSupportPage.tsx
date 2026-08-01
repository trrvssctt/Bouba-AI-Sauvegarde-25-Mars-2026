import { useState, useEffect, useRef } from 'react'
import {
  Headphones, ThumbsDown, BarChart2, MessageCircle, CheckCircle,
  Clock, Search, Filter, Send, Loader2, ChevronDown, RefreshCw,
  AlertTriangle, User, Mail, Calendar, Tag, X, TrendingUp,
  TrendingDown, Minus, Star,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  open:        { label: 'Ouvert',    bg: 'bg-warning/10',  text: 'text-warning',  border: 'border-warning/25' },
  in_progress: { label: 'En cours', bg: 'bg-primary/10',  text: 'text-primary',  border: 'border-primary/25' },
  resolved:    { label: 'Résolu',   bg: 'bg-success/10',  text: 'text-success',  border: 'border-success/25' },
  closed:      { label: 'Fermé',    bg: 'bg-border/30',   text: 'text-muted',    border: 'border-border' },
} as const

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Question générale',
  bug: 'Bug',
  billing: 'Facturation',
  feature: 'Fonctionnalité',
  account: 'Compte',
}

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  bg: 'bg-success/10',  text: 'text-success' },
  medium: { label: 'Moyenne', bg: 'bg-warning/10',  text: 'text-warning' },
  high:   { label: 'Haute',   bg: 'bg-danger/10',   text: 'text-danger' },
}

const NPS_DEFAULTS = { score: 0, promoteurs: 0, passifs: 0, detracteurs: 0, total: 0 }

type TicketStatus = keyof typeof STATUS_CONFIG

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [satisfaction, setSatisfaction] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'tickets' | 'feedbacks' | 'nps'>('tickets')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [draftingBouba, setDraftingBouba] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [npsData, setNpsData] = useState(NPS_DEFAULTS)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([
      fetch('/api/admin/support/tickets', { credentials: 'include' })
        .then((r) => r.json())
        .then((j) => { if (j.data) setTickets(j.data) })
        .catch(() => toast.error('Erreur chargement tickets.')),
      fetch('/api/admin/support/satisfaction', { credentials: 'include' })
        .then((r) => r.json())
        .then((j) => { if (j.data) setSatisfaction(j.data) })
        .catch(() => toast.error('Erreur chargement satisfaction.')),
      fetch('/api/admin/support/nps', { credentials: 'include' })
        .then((r) => r.json())
        .then((j) => { if (j.data) setNpsData(j.data) })
        .catch(() => {}),
    ])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    setUpdatingId(id)
    try {
      // Pour une clôture sans résolution, l'admin peut préciser un motif envoyé au client
      let note: string | undefined
      if (status === 'closed') {
        note = prompt('Motif de clôture (envoyé au client, optionnel) :') || undefined
      }
      const res = await fetch(`/api/admin/support/tickets/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setTickets((t) => t.map((tk) => tk.id === id ? { ...tk, status } : tk))
      toast.success(
        json.notified
          ? `Ticket ${STATUS_CONFIG[status].label.toLowerCase()} — l'utilisateur a été notifié (email + notification).`
          : `Ticket marqué : ${STATUS_CONFIG[status].label}`
      )
    } catch {
      toast.error('Erreur lors de la mise à jour.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicketId) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicketId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (json.emailSent) toast.success(json.message || 'Réponse envoyée au client.')
      else toast.warning(json.message || 'Réponse enregistrée (email non parti).')
      setReply('')
      setTickets((t) => t.map((tk) => tk.id === selectedTicketId && tk.status === 'open' ? { ...tk, status: 'in_progress' } : tk))
    } catch {
      toast.error('Erreur lors de l\'envoi.')
    } finally {
      setSending(false)
    }
  }

  const handleBoubaDraft = async (ticket: any) => {
    setDraftingBouba(true)
    try {
      const res = await fetch('/api/bouba/action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Rédige une réponse professionnelle et bienveillante à ce ticket de support. Ne commence pas par "Voici" ni par "Bien sûr". Commence directement par "Bonjour [prénom]". Sujet : "${ticket.subject}". Message : "${ticket.body}". Utilisateur : ${ticket.userName}.`,
        }),
      })
      const json = await res.json()
      const text = json.output || ''
      if (text) {
        setReply(text)
        replyRef.current?.focus()
        toast.success('Brouillon généré par Bouba')
      } else {
        const fallback = `Bonjour ${ticket.userName?.split(' ')[0] || ''},\n\nMerci pour votre message concernant "${ticket.subject}".\n\n[Complétez votre réponse ici]\n\nCordialement,\nL'équipe Boubaia`
        setReply(fallback)
        replyRef.current?.focus()
        toast.info('Brouillon de base généré — complétez avant d\'envoyer.')
      }
    } catch {
      toast.error('Impossible de contacter Bouba')
    } finally {
      setDraftingBouba(false)
    }
  }

  const handleAnalyze = () => {
    toast.info('Bouba analyse les feedbacks négatifs et identifie les patterns…')
  }

  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.userName?.toLowerCase().includes(search.toLowerCase()) ||
      t.userEmail?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    return matchSearch && matchStatus
  })

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId)

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  }

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Support & Feedback</h1>
          <p className="text-sm text-muted mt-0.5">Tickets, retours utilisateurs et satisfaction.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-ghost border border-border text-sm flex items-center gap-2 !px-3 !py-2 !rounded-xl"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* ── Stats cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total tickets',  value: stats.total,      icon: Headphones,    color: 'text-primary',  bg: 'bg-primary/10' },
          { label: 'Ouverts',        value: stats.open,       icon: Clock,         color: 'text-warning',  bg: 'bg-warning/10' },
          { label: 'En cours',       value: stats.inProgress, icon: MessageCircle, color: 'text-primary',  bg: 'bg-primary/10' },
          { label: 'Résolus',        value: stats.resolved,   icon: CheckCircle,   color: 'text-success',  bg: 'bg-success/10' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">{s.label}</p>
              <div className={cn('p-2 rounded-xl', s.bg)}>
                <s.icon className={cn('w-4 h-4', s.color)} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-secondary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-surface p-1 rounded-2xl border border-border w-fit">
        {([
          { key: 'tickets',   label: 'Tickets',                  icon: Headphones },
          { key: 'feedbacks', label: 'Retours & satisfaction',   icon: Star },
          { key: 'nps',       label: 'NPS',                      icon: BarChart2 },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-secondary hover:bg-background'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tickets tab ───────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par sujet, nom, email…"
                className="input-bouba pl-10 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted shrink-0" />
              <div className="flex gap-1">
                {['all', 'open', 'in_progress', 'resolved'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                      filterStatus === s
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-muted border-border hover:border-primary/30 hover:text-secondary'
                    )}
                  >
                    {s === 'all' ? 'Tous' : STATUS_CONFIG[s as TicketStatus]?.label || s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Layout 2 colonnes */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Liste tickets */}
            <div className="lg:col-span-2 space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />Chargement…
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-muted text-sm border-2 border-dashed border-border rounded-2xl">
                  <Headphones className="w-8 h-8 mx-auto mb-3 text-border" />
                  {search || filterStatus !== 'all' ? 'Aucun ticket correspondant.' : 'Aucun ticket.'}
                </div>
              ) : filteredTickets.map((ticket) => {
                const cfg = STATUS_CONFIG[ticket.status as TicketStatus] || STATUS_CONFIG.open
                const prio = PRIORITY_CONFIG[(ticket.priority || 'medium') as keyof typeof PRIORITY_CONFIG]
                const isSelected = selectedTicketId === ticket.id
                return (
                  <button
                    key={ticket.id}
                    onClick={() => { setSelectedTicketId(isSelected ? null : ticket.id); setReply('') }}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-surface hover:border-primary/30 hover:bg-primary/3'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-bold text-secondary leading-snug line-clamp-2">{ticket.subject}</p>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', cfg.bg, cfg.text, cfg.border)}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted truncate">{ticket.userName}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', prio.bg, prio.text)}>
                          {prio.label}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    {ticket.category && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Tag className="w-2.5 h-2.5 text-muted/60" />
                        <span className="text-[10px] text-muted/70">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Détail ticket */}
            <div className="lg:col-span-3">
              {selectedTicket ? (
                <div className="glass-card p-6 space-y-5 sticky top-6">
                  {/* Infos ticket */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-secondary leading-snug">{selectedTicket.subject}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <User className="w-3.5 h-3.5" /> {selectedTicket.userName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Mail className="w-3.5 h-3.5" /> {selectedTicket.userEmail}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTicketId(null)}
                      className="p-1.5 rounded-lg hover:bg-background transition-colors shrink-0"
                    >
                      <X className="w-4 h-4 text-muted" />
                    </button>
                  </div>

                  {/* Message */}
                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{selectedTicket.body}</p>
                  </div>

                  {/* Changer statut */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted">Statut :</span>
                    {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((s) => {
                      const cfg = STATUS_CONFIG[s]
                      const isActive = selectedTicket.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(selectedTicket.id, s)}
                          disabled={isActive || updatingId === selectedTicket.id}
                          className={cn(
                            'text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all',
                            isActive
                              ? cn(cfg.bg, cfg.text, cfg.border, 'cursor-default')
                              : 'bg-surface text-muted border-border hover:border-primary/30 hover:text-secondary disabled:opacity-50'
                          )}
                        >
                          {updatingId === selectedTicket.id && !isActive
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : cfg.label
                          }
                        </button>
                      )
                    })}
                  </div>

                  {/* Zone de réponse */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wide">Répondre</label>
                      <button
                        onClick={() => handleBoubaDraft(selectedTicket)}
                        disabled={draftingBouba}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                      >
                        {draftingBouba ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                        {draftingBouba ? 'Bouba rédige…' : 'Générer avec Bouba'}
                      </button>
                    </div>
                    <textarea
                      ref={replyRef}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Rédigez votre réponse au client…"
                      rows={5}
                      className="input-bouba text-sm resize-none"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!reply.trim() || sending}
                      className="btn-primary text-sm flex items-center gap-2 !px-5 !py-2.5 !rounded-xl w-full justify-center"
                    >
                      {sending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                      ) : (
                        <><Send className="w-4 h-4" /> Envoyer la réponse</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 text-center text-muted text-sm flex flex-col items-center gap-3 h-64 justify-center">
                  <Headphones className="w-10 h-10 text-border" />
                  <p className="font-semibold text-secondary">Sélectionnez un ticket</p>
                  <p className="text-xs">Cliquez sur un ticket à gauche pour le traiter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Retours & satisfaction tab ────────────────────────── */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-5">
          {/* Vue d'ensemble : les clients aiment ou pas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Satisfaction globale',
                value: satisfaction?.satisfactionRate !== null && satisfaction?.satisfactionRate !== undefined ? `${satisfaction.satisfactionRate}%` : '—',
                sub: satisfaction?.total ? `${satisfaction.total} retour${satisfaction.total > 1 ? 's' : ''} au total` : 'Aucun retour pour le moment',
                icon: Star,
                color: (satisfaction?.satisfactionRate ?? 100) >= 70 ? 'text-success' : (satisfaction?.satisfactionRate ?? 0) >= 40 ? 'text-warning' : 'text-danger',
                bg: 'bg-primary/10',
              },
              { label: 'Bons retours 👍', value: satisfaction?.ups ?? 0, sub: 'Réponses appréciées', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Mauvais retours 👎', value: satisfaction?.downs ?? 0, sub: 'Réponses à améliorer', icon: ThumbsDown, color: 'text-danger', bg: 'bg-danger/10' },
              { label: '30 derniers jours', value: satisfaction?.last30 ?? 0, sub: 'Retours récents', icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10' },
            ].map((s: any) => (
              <div key={s.label} className="glass-card p-5 space-y-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-4 h-4', s.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
                  <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
                  <p className="text-[11px] text-muted mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Satisfaction par agent */}
          {(satisfaction?.byAgent ?? []).length > 0 && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest">Satisfaction par agent</h3>
              {satisfaction.byAgent.map((a: any) => (
                <div key={a.agent} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-secondary capitalize">{a.agent}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-success font-mono">👍 {a.ups}</span>
                      <span className="text-danger font-mono">👎 {a.downs}</span>
                      <span className={cn('font-bold w-10 text-right', (a.rate ?? 0) >= 70 ? 'text-success' : (a.rate ?? 0) >= 40 ? 'text-warning' : 'text-danger')}>
                        {a.rate !== null ? `${a.rate}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-danger/20 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${a.rate ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Derniers retours classés bon / mauvais */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Derniers retours</h3>
            {(satisfaction?.recent ?? []).length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
                <Star className="w-10 h-10 mx-auto mb-3 text-border" />
                <p className="font-semibold text-secondary">Aucun retour utilisateur pour le moment</p>
                <p className="text-xs mt-1">Les 👍/👎 laissés sur les réponses de Bouba apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {satisfaction.recent.map((f: any) => (
                  <div key={f.id} className={cn(
                    'glass-card p-4 flex items-start gap-3 border',
                    f.rating === 'up' ? 'border-success/20' : 'border-danger/20 bg-danger/3'
                  )}>
                    <span className={cn(
                      'shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border',
                      f.rating === 'up'
                        ? 'bg-success/10 text-success border-success/25'
                        : 'bg-danger/10 text-danger border-danger/25'
                    )}>
                      {f.rating === 'up' ? '👍 Bon' : '👎 Mauvais'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-secondary leading-relaxed line-clamp-2">« {f.excerpt || 'Réponse de Bouba'} »</p>
                      <p className="text-[10px] text-muted mt-1.5">
                        {f.userName || f.email} · agent <span className="capitalize font-semibold">{f.agent || 'général'}</span> · {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NPS tab ───────────────────────────────────────────── */}
      {activeTab === 'nps' && (
        <div className="space-y-5">
          {/* Score principal */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="glass-card p-8 lg:col-span-1 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Score NPS</p>
              <p className={cn(
                'text-6xl font-display font-bold',
                npsData.score >= 50 ? 'text-success' : npsData.score >= 0 ? 'text-warning' : 'text-danger'
              )}>
                {npsData.score}
              </p>
              <div className="flex items-center gap-1 text-xs text-success font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                +4 vs mois dernier
              </div>
              <div className="w-full bg-border/50 rounded-full h-2 mt-1">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-success"
                  style={{ width: `${Math.min(100, ((npsData.score + 100) / 200) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted">Objectif : 60</p>
            </div>

            {[
              { label: 'Promoteurs',   value: npsData.promoteurs,   color: 'bg-success', textColor: 'text-success', bg: 'bg-success/10', icon: TrendingUp,   desc: 'Score 9-10' },
              { label: 'Passifs',      value: npsData.passifs,      color: 'bg-warning', textColor: 'text-warning', bg: 'bg-warning/10', icon: Minus,        desc: 'Score 7-8' },
              { label: 'Détracteurs', value: npsData.detracteurs,   color: 'bg-danger',  textColor: 'text-danger',  bg: 'bg-danger/10',  icon: TrendingDown, desc: 'Score 0-6' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
                  <div className={cn('p-1.5 rounded-lg', s.bg)}>
                    <s.icon className={cn('w-3.5 h-3.5', s.textColor)} />
                  </div>
                </div>
                <p className={cn('text-4xl font-display font-bold', s.textColor)}>{s.value}%</p>
                <div>
                  <div className="h-2 bg-border/50 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', s.color)} style={{ width: `${s.value}%` }} />
                  </div>
                  <p className="text-[10px] text-muted mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Barre NPS visuelle */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-display font-bold text-secondary">Distribution des scores</h3>
            <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
              <div className="bg-danger/70 transition-all" style={{ width: `${npsData.detracteurs}%` }} title="Détracteurs" />
              <div className="bg-warning/70 transition-all" style={{ width: `${npsData.passifs}%` }} title="Passifs" />
              <div className="bg-success/70 transition-all" style={{ width: `${npsData.promoteurs}%` }} title="Promoteurs" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-danger font-semibold">Détracteurs {npsData.detracteurs}%</span>
              <span className="text-warning font-semibold">Passifs {npsData.passifs}%</span>
              <span className="text-success font-semibold">Promoteurs {npsData.promoteurs}%</span>
            </div>
          </div>

          {/* Formule NPS */}
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl shrink-0">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary">Comment est calculé le NPS ?</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                NPS = % Promoteurs − % Détracteurs = {npsData.promoteurs}% − {npsData.detracteurs}% = <strong className="text-secondary">{npsData.score}</strong>.
                Données basées sur les 30 derniers jours.
                Intégrez Typeform ou Hotjar pour alimenter automatiquement ce module.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
