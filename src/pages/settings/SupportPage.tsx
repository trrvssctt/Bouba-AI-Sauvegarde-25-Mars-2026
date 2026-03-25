import { useState, useEffect } from 'react'
import { Headphones, Plus, ChevronDown, ChevronUp, Send, Loader2, CheckCircle, Clock, MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { motion, AnimatePresence } from 'motion/react'

const CATEGORIES = [
  { value: 'general',  label: 'Question générale' },
  { value: 'bug',      label: 'Bug ou dysfonctionnement' },
  { value: 'billing',  label: 'Facturation / abonnement' },
  { value: 'feature',  label: 'Demande de fonctionnalité' },
  { value: 'account',  label: 'Mon compte' },
]

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: any }> = {
  open:        { label: 'Ouvert',    class: 'bg-warning/10 text-warning border-warning/20',    icon: Clock },
  in_progress: { label: 'En cours', class: 'bg-primary/10 text-primary border-primary/20',    icon: MessageSquare },
  resolved:    { label: 'Résolu',   class: 'bg-success/10 text-success border-success/20',    icon: CheckCircle },
  closed:      { label: 'Fermé',    class: 'bg-muted/20 text-muted border-border',             icon: X },
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')

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
    if (!subject.trim() || !body.trim()) {
      toast.error('Veuillez remplir tous les champs.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), category }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Votre ticket a bien été créé. Nous vous répondrons dans les plus brefs délais.')
        setTickets((prev) => [data.data, ...prev])
        setSubject('')
        setBody('')
        setCategory('general')
        setShowForm(false)
      } else {
        toast.error(data.error || 'Erreur lors de la création du ticket.')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const openCount = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-600" />
            Support & Aide
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Signalez un problème ou posez une question à notre équipe.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau ticket
        </button>
      </div>

      {/* Formulaire création ticket */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-bold text-gray-900">Créer un ticket de support</h3>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex : Mon agenda ne se synchronise plus"
                  maxLength={120}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Décrivez le problème en détail : ce que vous avez fait, ce qui s'est passé, le message d'erreur éventuel…"
                  rows={5}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !subject.trim() || !body.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Envoyer</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ rapide */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Questions fréquentes</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• <strong>Quota dépassé ?</strong> Rendez-vous sur <a href="/settings/plan" className="text-blue-600 hover:underline">Abonnement</a> pour upgrader votre plan.</p>
          <p>• <strong>Gmail / Calendar non connecté ?</strong> Vérifiez dans <a href="/settings/connections" className="text-blue-600 hover:underline">Connexions</a>.</p>
          <p>• <strong>Bouba ne répond plus ?</strong> Actualisez la page et réessayez dans quelques instants.</p>
        </div>
      </div>

      {/* Liste des tickets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">
            Mes tickets
            {openCount > 0 && (
              <span className="ml-2 text-xs bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-bold">
                {openCount} ouvert{openCount > 1 ? 's' : ''}
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Chargement…
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Headphones className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Aucun ticket pour le moment.</p>
            <p className="text-xs mt-1">Créez un ticket si vous rencontrez un problème.</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === ticket.id
            return (
              <div key={ticket.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <StatusIcon className={cn('w-4 h-4 shrink-0 mt-0.5', cfg.class.includes('warning') ? 'text-yellow-500' : cfg.class.includes('primary') ? 'text-blue-500' : cfg.class.includes('success') ? 'text-green-500' : 'text-gray-400')} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-500 capitalize">
                          {CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase', cfg.class)}>
                      {cfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3">
                          {ticket.body}
                        </p>
                        {ticket.status === 'resolved' && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-success">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Ce ticket a été résolu par notre équipe.
                          </div>
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

      {/* Contact alternatif */}
      <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 text-center">
        <p className="text-sm text-gray-500">
          Besoin d'une réponse urgente ?{' '}
          <a href="mailto:support@boubaia.com" className="text-blue-600 hover:underline font-medium">
            support@boubaia.com
          </a>
        </p>
      </div>
    </div>
  )
}
