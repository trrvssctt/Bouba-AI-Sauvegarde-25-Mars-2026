import { useState, useEffect } from 'react'
import {
  Headphones, Plus, Send, Loader2, CheckCircle, Clock,
  MessageSquare, X, Search, Zap, BookOpen, HelpCircle,
  AlertCircle, CreditCard, Settings2, ChevronRight, ChevronDown,
  LifeBuoy, Mail, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { motion, AnimatePresence } from 'motion/react'

const CATEGORIES = [
  { value: 'general',  label: 'Question générale',         icon: HelpCircle },
  { value: 'bug',      label: 'Bug ou dysfonctionnement',  icon: AlertCircle },
  { value: 'billing',  label: 'Facturation / abonnement',  icon: CreditCard },
  { value: 'feature',  label: 'Demande de fonctionnalité', icon: Zap },
  { value: 'account',  label: 'Mon compte',                icon: Settings2 },
]

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  open:        { label: 'Ouvert',    bg: 'bg-warning/10',  text: 'text-warning',  border: 'border-warning/25',  icon: Clock },
  in_progress: { label: 'En cours', bg: 'bg-primary/10',  text: 'text-primary',  border: 'border-primary/25',  icon: MessageSquare },
  resolved:    { label: 'Résolu',   bg: 'bg-success/10',  text: 'text-success',  border: 'border-success/25',  icon: CheckCircle },
  closed:      { label: 'Fermé',    bg: 'bg-border/30',   text: 'text-muted',    border: 'border-border',      icon: X },
}

const FAQ_ITEMS = [
  {
    q: 'Mon quota de messages est épuisé, que faire ?',
    a: 'Rendez-vous sur la page Abonnement pour upgrader votre plan ou attendre la réinitialisation mensuelle. Les plans Pro et Business offrent des quotas bien plus généreux.',
    link: { label: 'Voir les plans', href: '/settings/plan' },
  },
  {
    q: 'Comment connecter Gmail et Google Calendar ?',
    a: 'Dans Connexions, cliquez sur le bouton d\'authentification Google. Vous serez redirigé vers une page de consentement Google — acceptez les permissions demandées. La connexion est sécurisée via OAuth 2.0.',
    link: { label: 'Gérer les connexions', href: '/settings/connections' },
  },
  {
    q: 'Bouba ne répond plus / répond lentement',
    a: 'Actualisez la page (Ctrl+R) et réessayez. Si le problème persiste, vérifiez votre connexion internet. En cas de panne persistante, consultez notre statut de service ou ouvrez un ticket.',
  },
  {
    q: 'Comment modifier ou supprimer mon compte ?',
    a: 'Rendez-vous dans Paramètres > Profil pour modifier vos informations. Pour la suppression de compte, contactez-nous via un ticket — nous traiterons votre demande sous 48h.',
    link: { label: 'Mon profil', href: '/settings/profile' },
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Toutes vos données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Nous ne partageons jamais vos données avec des tiers et vous pouvez les exporter à tout moment.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Dans Abonnement, cliquez sur "Gérer mon abonnement" puis "Annuler". Votre accès reste actif jusqu\'à la fin de la période payée. Aucun remboursement au prorata.',
    link: { label: 'Mon abonnement', href: '/settings/plan' },
  },
]

interface Ticket {
  id: string
  subject: string
  body: string
  status: string
  category: string
  createdAt: string
  updatedAt?: string
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setTickets(data.data)
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) { toast.error('Veuillez remplir tous les champs.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), category, priority }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Ticket créé ! Nous vous répondrons dans les plus brefs délais.')
        setTickets((prev) => [data.data, ...prev])
        setSubject(''); setBody(''); setCategory('general'); setPriority('medium'); setShowForm(false)
      } else {
        toast.error(data.error || 'Erreur lors de la création du ticket.')
      }
    } catch { toast.error('Erreur réseau. Veuillez réessayer.') }
    finally { setSubmitting(false) }
  }

  const filteredTickets = tickets.filter((t) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase())
  )
  const openCount = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length

  return (
    <div className="space-y-6 w-full">

      {/* ── Header + bouton ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-secondary flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-primary" />
            Support & Aide
          </h2>
          <p className="text-sm text-muted mt-1">
            Posez une question ou signalez un problème — nous répondons sous 24h.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-all active:scale-95 shrink-0 shadow-violet"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuler' : 'Nouveau ticket'}
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Temps de réponse',   value: '< 24h',         icon: Clock,         color: 'text-primary',  bg: 'bg-primary/10' },
          { label: 'Taux de résolution', value: '98%',           icon: CheckCircle,   color: 'text-success',  bg: 'bg-success/10' },
          { label: 'Tickets ouverts',    value: String(openCount), icon: MessageSquare, color: openCount > 0 ? 'text-warning' : 'text-muted', bg: openCount > 0 ? 'bg-warning/10' : 'bg-border/20' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-5 flex items-center gap-4">
            <div className={cn('p-3 rounded-xl shrink-0', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-secondary">{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Formulaire ────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <form
              onSubmit={handleSubmit}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-5"
            >
              <h3 className="font-display font-bold text-secondary text-lg">Créer un ticket de support</h3>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-bouba text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Priorité</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                          priority === p
                            ? p === 'low'    ? 'bg-success/15 text-success border-success/30'
                            : p === 'medium' ? 'bg-warning/15 text-warning border-warning/30'
                            :                  'bg-danger/15 text-danger border-danger/30'
                            : 'bg-surface border-border text-muted hover:border-primary/30'
                        )}
                      >
                        {p === 'low' ? 'Faible' : p === 'medium' ? 'Moyenne' : 'Haute'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Sujet <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex : Mon agenda ne se synchronise plus"
                  maxLength={120}
                  className="input-bouba text-sm"
                  required
                />
                <p className="text-[10px] text-muted mt-1 text-right">{subject.length}/120</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Décrivez le problème en détail : ce que vous avez fait, ce qui s'est passé, le message d'erreur éventuel…"
                  rows={5}
                  className="input-bouba text-sm resize-none"
                  required
                />
                <p className="text-[10px] text-muted mt-1">Plus vous êtes précis, plus vite nous pourrons vous aider.</p>
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-secondary transition-colors">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !subject.trim() || !body.trim()}
                  className="btn-primary text-sm flex items-center gap-2 !px-5 !py-2.5 !rounded-xl"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <><Send className="w-4 h-4" /> Envoyer le ticket</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deux colonnes : FAQ | Tickets ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── Colonne gauche : FAQ ──────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-secondary">Questions fréquentes</h3>
          </div>

          {FAQ_ITEMS.map((item, idx) => {
            const open = expandedFaqIdx === idx
            return (
              <div
                key={idx}
                className={cn(
                  'border rounded-xl overflow-hidden transition-colors',
                  open ? 'border-primary/30 bg-primary/3' : 'border-border bg-surface hover:border-primary/20'
                )}
              >
                <button
                  onClick={() => setExpandedFaqIdx(open ? null : idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                >
                  <span className="text-sm font-semibold text-secondary leading-snug">{item.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted shrink-0 transition-transform duration-200', open && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-primary/10">
                        <p className="text-sm text-muted leading-relaxed mt-4">{item.a}</p>
                        {item.link && (
                          <a
                            href={item.link.href}
                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                          >
                            {item.link.label} <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href="mailto:support@boubaia.com"
              className="flex items-center gap-3 p-4 border border-border rounded-2xl bg-surface hover:border-primary/30 hover:bg-primary/3 transition-all group"
            >
              <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/15 transition-colors">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-secondary">Email direct</p>
                <p className="text-xs text-muted truncate">support@boubaia.com</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
            <div className="flex items-center gap-3 p-4 border border-border rounded-2xl bg-surface">
              <div className="p-2.5 bg-success/10 rounded-xl">
                <Zap className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary">Réponse rapide</p>
                <p className="text-xs text-muted">Tickets urgents en 4h</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne droite : Tickets ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-secondary">
                Mes tickets
                {openCount > 0 && (
                  <span className="ml-2 text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-bold">
                    {openCount} ouvert{openCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>
            {tickets.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="pl-8 pr-4 py-1.5 text-xs bg-surface border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 w-36"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
              <LifeBuoy className="w-10 h-10 mx-auto mb-3 text-border" />
              <p className="text-sm font-semibold text-secondary">
                {search ? 'Aucun ticket correspondant' : 'Aucun ticket pour le moment'}
              </p>
              <p className="text-xs text-muted mt-1">
                {search ? 'Essayez d\'autres mots-clés.' : 'Créez un ticket si vous rencontrez un problème.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  Créer mon premier ticket →
                </button>
              )}
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
              const StatusIcon = cfg.icon
              const isExpanded = expandedTicketId === ticket.id
              const cat = CATEGORIES.find((c) => c.value === ticket.category)
              const CatIcon = cat?.icon || HelpCircle

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'border rounded-2xl overflow-hidden bg-surface transition-all',
                    isExpanded ? 'border-primary/30 shadow-sm' : 'border-border hover:border-primary/20'
                  )}
                >
                  <button
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    className="w-full flex items-center justify-between p-4 text-left gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn('p-1.5 rounded-lg mt-0.5 shrink-0', cfg.bg)}>
                        <StatusIcon className={cn('w-3.5 h-3.5', cfg.text)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-secondary leading-snug truncate">{ticket.subject}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border', cfg.bg, cfg.text, cfg.border)}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            <CatIcon className="w-3 h-3" />
                            {cat?.label || ticket.category}
                          </span>
                          <span className="text-[10px] text-muted">
                            {new Date(ticket.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-muted shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-border">
                          <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap mt-4 bg-background rounded-xl p-4">
                            {ticket.body}
                          </p>
                          {/* Réponse de l'équipe support */}
                          {ticket.adminReply && (
                            <div className="mt-3 bg-primary/5 border border-primary/15 rounded-xl p-4">
                              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                                💬 Réponse de l'équipe Bouba'ia
                              </p>
                              <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                                {ticket.adminReply}
                              </p>
                            </div>
                          )}
                          {ticket.status === 'resolved' && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-success font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Ce ticket a été résolu par notre équipe.
                            </div>
                          )}
                          {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                            <p className="text-[10px] text-muted mt-2">
                              Mis à jour le {new Date(ticket.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
