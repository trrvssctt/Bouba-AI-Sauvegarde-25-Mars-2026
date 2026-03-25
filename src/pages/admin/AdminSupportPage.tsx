import { useState, useEffect } from 'react'
import { Headphones, ThumbsDown, BarChart2, MessageCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

const NPS = { score: 52, promoteurs: 41, passifs: 28, detracteurs: 31 }

const STATUS_CONFIG = {
  open: { label: 'Ouvert', class: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'En cours', class: 'bg-primary/10 text-primary border-primary/20' },
  resolved: { label: 'Résolu', class: 'bg-success/10 text-success border-success/20' },
}

type TicketStatus = keyof typeof STATUS_CONFIG

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'tickets' | 'feedbacks' | 'nps'>('tickets')
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/support/tickets', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => { if (json.data) setTickets(json.data) })
      .catch(() => toast.error('Erreur chargement tickets.'))

    fetch('/api/admin/support/feedbacks', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => { if (json.data) setFeedbacks(json.data) })
      .catch(() => toast.error('Erreur chargement feedbacks.'))
  }, [])

  const handleResolve = async (id: string) => {
    try {
      await fetch(`/api/admin/support/tickets/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      })
      setTickets((t) => t.map((ticket) => ticket.id === id ? { ...ticket, status: 'resolved' } : ticket))
      toast.success('Ticket marqué comme résolu.')
    } catch {
      toast.error('Erreur lors de la résolution du ticket.')
    }
  }

  const handleBoubaDraft = (ticket: any) => {
    toast.info(`Bouba rédige une réponse pour "${ticket.subject}"…`)
  }

  const handleAnalyze = () => {
    toast.info('Bouba analyse les feedbacks négatifs et identifie les patterns…')
  }

  const openTickets = tickets.filter((t) => t.status !== 'resolved').length

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary">Support & Feedback</h1>
          <p className="text-sm text-muted mt-0.5">Tickets, retours utilisateurs et NPS.</p>
        </div>
        {openTickets > 0 && (
          <span className="text-sm font-bold text-warning bg-warning/10 border border-warning/20 px-3 py-1.5 rounded-xl">
            {openTickets} ticket{openTickets > 1 ? 's' : ''} ouvert{openTickets > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-2xl border border-border w-fit">
        {([
          { key: 'tickets', label: 'Tickets', icon: Headphones },
          { key: 'feedbacks', label: 'Feedbacks négatifs', icon: ThumbsDown },
          { key: 'nps', label: 'NPS', icon: BarChart2 },
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

      {/* Tickets tab */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket.id === selectedTicket ? null : ticket.id)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border transition-all',
                  selectedTicket === ticket.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface hover:border-primary/40'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-secondary leading-snug line-clamp-1">{ticket.subject}</p>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase shrink-0', STATUS_CONFIG[ticket.status as TicketStatus].class)}>
                    {STATUS_CONFIG[ticket.status as TicketStatus].label}
                  </span>
                </div>
                <p className="text-xs text-muted">{ticket.userName} · {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            {selectedTicket ? (() => {
              const ticket = tickets.find((t) => t.id === selectedTicket)!
              return (
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-secondary">{ticket.subject}</h3>
                      <p className="text-xs text-muted mt-0.5">{ticket.userName} · {ticket.userEmail}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase', STATUS_CONFIG[ticket.status as TicketStatus].class)}>
                      {STATUS_CONFIG[ticket.status as TicketStatus].label}
                    </span>
                  </div>

                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-secondary leading-relaxed">{ticket.body}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBoubaDraft(ticket)}
                      className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Rédiger avec Bouba
                    </button>
                    {ticket.status !== 'resolved' && (
                      <button
                        onClick={() => handleResolve(ticket.id)}
                        className="flex items-center gap-2 text-sm btn-ghost border border-border"
                      >
                        <CheckCircle className="w-4 h-4 text-success" />
                        Résoudre
                      </button>
                    )}
                  </div>
                </div>
              )
            })() : (
              <div className="glass-card p-12 text-center text-muted text-sm flex flex-col items-center gap-3">
                <Headphones className="w-8 h-8 text-border" />
                Sélectionnez un ticket pour le traiter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedbacks tab */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{feedbacks.length} retours négatifs récents</p>
            <button
              onClick={handleAnalyze}
              className="btn-ghost border border-border text-sm flex items-center gap-2"
            >
              <ThumbsDown className="w-4 h-4" />
              Analyser avec Bouba
            </button>
          </div>

          <div className="space-y-3">
            {feedbacks.map((f) => (
              <div key={f.id} className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-secondary">{f.userName}</span>
                  <span className="text-[10px] text-muted">{new Date(f.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Message utilisateur</p>
                    <p className="text-xs text-secondary">{f.originalMessage}</p>
                  </div>
                  <div className="bg-danger/5 border border-danger/10 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Réponse Bouba</p>
                    <p className="text-xs text-secondary">{f.boubaResponse}</p>
                  </div>
                </div>
                {f.note && (
                  <div className="flex items-start gap-2 text-xs text-warning">
                    <ThumbsDown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{f.note}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPS tab */}
      {activeTab === 'nps' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="glass-card p-6 lg:col-span-1 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Score NPS</p>
              <p className={cn('text-5xl font-bold', NPS.score >= 50 ? 'text-success' : NPS.score >= 0 ? 'text-warning' : 'text-danger')}>
                {NPS.score}
              </p>
              <p className="text-xs text-muted">Objectif : 60</p>
            </div>
            {[
              { label: 'Promoteurs', value: NPS.promoteurs, pct: NPS.promoteurs, color: 'bg-success', textColor: 'text-success' },
              { label: 'Passifs', value: NPS.passifs, pct: NPS.passifs, color: 'bg-warning', textColor: 'text-warning' },
              { label: 'Détracteurs', value: NPS.detracteurs, pct: NPS.detracteurs, color: 'bg-danger', textColor: 'text-danger' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-6 space-y-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{s.label}</p>
                <p className={cn('text-3xl font-bold', s.textColor)}>{s.value}%</p>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', s.color)} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <p className="text-sm text-muted text-center">
              Données NPS basées sur les retours des 30 derniers jours. Intégrez votre outil de sondage (Typeform, Hotjar) pour alimenter ce module.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
