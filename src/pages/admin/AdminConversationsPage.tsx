import { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  Radio,
  Bell,
  History,
  Send,
  Loader2,
  Users,
  CheckCheck,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/src/hooks/useAuth'

// ─── Bouba generation helper ─────────────────────────────────────────────────
async function generateWithBouba(
  userId: string,
  context: string,
  type: 'email' | 'notification'
): Promise<{ subject?: string; body: string } | null> {
  const prompt =
    type === 'email'
      ? `Tu es un assistant de rédaction pour une équipe SaaS. Génère un email professionnel en français basé sur ce contexte : "${context}". Réponds UNIQUEMENT avec un JSON valide de la forme {"subject":"...","body":"..."} sans aucun texte avant ou après.`
      : `Tu es un assistant de rédaction pour une équipe SaaS. Génère une notification in-app courte et claire en français basée sur ce contexte : "${context}". Réponds UNIQUEMENT avec un JSON valide de la forme {"body":"..."} sans aucun texte avant ou après.`

  try {
    const res = await fetch('/api/bouba/action', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify({ message: prompt, userId }),
    })
    const data = await res.json()
    if (!data.success) return null
    const raw = data.output || ''
    // Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─── BoubaGenerateButton ──────────────────────────────────────────────────────
function BoubaGenerateButton({
  type,
  onGenerated,
}: {
  type: 'email' | 'notification'
  onGenerated: (result: { subject?: string; body: string }) => void
}) {
  const { user } = useAuth()
  const [showPrompt, setShowPrompt] = useState(false)
  const [context, setContext] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!context.trim() || !user) return
    setGenerating(true)
    const result = await generateWithBouba(user.id, context.trim(), type)
    setGenerating(false)
    if (result) {
      onGenerated(result)
      setShowPrompt(false)
      setContext('')
      toast.success('Bouba a rédigé le message !')
    } else {
      toast.error('Bouba n\'a pas pu générer le message. Réessayez.')
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPrompt((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Générer avec Bouba
      </button>

      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="absolute right-0 top-10 z-20 w-80 bg-surface border border-border rounded-2xl shadow-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-secondary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Contexte pour Bouba
              </p>
              <button onClick={() => setShowPrompt(false)} className="text-muted hover:text-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={
                type === 'email'
                  ? 'Ex : rappeler aux utilisateurs Pro que leur abonnement expire dans 7 jours'
                  : 'Ex : annoncer la nouvelle fonctionnalité de calendrier disponible cette semaine'
              }
              rows={3}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !context.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {generating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Bouba rédige…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Générer</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type Tab = 'individual' | 'broadcast_email' | 'broadcast_app' | 'history'

interface UserOption {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

interface NotifRecord {
  id: string
  user_id: string
  userEmail: string
  userName: string
  type: string
  subject: string | null
  body: string
  isRead: boolean
  sentAt: string
  campaignId: string | null
}

const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'individual',
    label: 'Email individuel',
    icon: Mail,
    description: 'Envoyer un email à un utilisateur via Bouba',
  },
  {
    id: 'broadcast_email',
    label: 'Email broadcast',
    icon: Radio,
    description: 'Envoyer un email à tous les utilisateurs actifs',
  },
  {
    id: 'broadcast_app',
    label: 'Notification groupée',
    icon: Bell,
    description: 'Envoyer une notification in-app à tous les utilisateurs',
  },
  {
    id: 'history',
    label: 'Historique',
    icon: History,
    description: 'Toutes les communications envoyées',
  },
]

// ─── Individual Email Form ───────────────────────────────────────────────────
function IndividualEmailForm() {
  const [users, setUsers] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users?limit=200', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setUsers(d.data) })
      .catch(console.error)
  }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(q)
    )
  })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !body.trim()) {
      toast.error('Sélectionnez un destinataire et rédigez un message.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          userId: selectedUser.id,
          subject: subject.trim() || null,
          body: body.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Email envoyé via Bouba.')
        setSelectedUser(null)
        setSearch('')
        setSubject('')
        setBody('')
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-5 max-w-2xl">
      {/* Destinataire */}
      <div className="relative">
        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
          Destinataire <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={selectedUser ? `${selectedUser.first_name ?? ''} ${selectedUser.last_name ?? ''} <${selectedUser.email}>` : search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedUser(null)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Rechercher un utilisateur…"
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <AnimatePresence>
          {showDropdown && !selectedUser && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto"
            >
              {filtered.slice(0, 20).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u)
                    setShowDropdown(false)
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-background text-sm transition-colors"
                >
                  <p className="font-medium text-secondary">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-muted">{u.email}</p>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sujet */}
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
          Sujet
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet de l'email"
          maxLength={200}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Corps */}
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
          Message <span className="text-danger">*</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Rédigez votre email…"
          rows={8}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          required
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <BoubaGenerateButton
          type="email"
          onGenerated={(r) => { if (r.subject) setSubject(r.subject); setBody(r.body) }}
        />
        <button
          type="submit"
          disabled={sending || !selectedUser || !body.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer l'email
        </button>
      </div>
    </form>
  )
}

// ─── Broadcast Email Form ────────────────────────────────────────────────────
function BroadcastEmailForm() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      toast.error('Le message est requis.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'broadcast_email',
          subject: subject.trim() || null,
          body: body.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Email broadcast envoyé à ${data.recipients ?? 'tous les'} utilisateurs.`)
        setSubject('')
        setBody('')
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-5 max-w-2xl">
      <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
        <Radio className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-secondary">Email à tous les utilisateurs actifs</p>
          <p className="text-muted text-xs mt-0.5">
            Cet email sera envoyé via Bouba à chaque utilisateur avec un abonnement actif.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
          Sujet
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet de l'email broadcast"
          maxLength={200}
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
          Message <span className="text-danger">*</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Rédigez votre message broadcast…"
          rows={8}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          required
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <BoubaGenerateButton
          type="email"
          onGenerated={(r) => { if (r.subject) setSubject(r.subject); setBody(r.body) }}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-warning text-white text-sm font-semibold rounded-xl hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          Envoyer le broadcast email
        </button>
      </div>
    </form>
  )
}

// ─── Broadcast App Notification Form ─────────────────────────────────────────
function BroadcastAppForm() {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      toast.error('Le message est requis.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'broadcast_app',
          body: body.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Notification envoyée à ${data.recipients ?? 'tous les'} utilisateurs.`)
        setBody('')
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi.')
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-5 max-w-2xl">
      <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
        <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-secondary">Notification in-app groupée</p>
          <p className="text-muted text-xs mt-0.5">
            Tous les utilisateurs actifs recevront une alerte dans leur interface et dans le centre de notifications.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
          Message <span className="text-danger">*</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ex : Une nouvelle fonctionnalité est disponible…"
          rows={5}
          maxLength={500}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          required
        />
        <p className="text-xs text-muted mt-1 text-right">{body.length}/500</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <BoubaGenerateButton
          type="notification"
          onGenerated={(r) => setBody(r.body)}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Envoyer la notification
        </button>
      </div>
    </form>
  )
}

// ─── History ─────────────────────────────────────────────────────────────────
function NotificationHistory() {
  const [records, setRecords] = useState<NotifRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notifications?limit=100', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setRecords(data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const TYPE_LABEL: Record<string, { label: string; class: string }> = {
    email: { label: 'Email', class: 'bg-blue-100 text-blue-700' },
    broadcast_email: { label: 'Broadcast email', class: 'bg-orange-100 text-orange-700' },
    broadcast_app: { label: 'Notif app', class: 'bg-primary/10 text-primary' },
    app: { label: 'App', class: 'bg-gray-100 text-gray-600' },
  }

  const filtered = records.filter((r) => {
    const q = search.toLowerCase()
    return (
      (r.userEmail ?? '').toLowerCase().includes(q) ||
      (r.userName ?? '').toLowerCase().includes(q) ||
      (r.subject ?? '').toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q)
    )
  })

  // Group by campaignId (broadcasts appear as single entry)
  const seen = new Set<string>()
  const grouped = filtered.filter((r) => {
    if (!r.campaignId) return true
    if (seen.has(r.campaignId)) return false
    seen.add(r.campaignId)
    return true
  })

  const readCount = (campaignId: string | null) => {
    if (!campaignId) return null
    const rows = records.filter((r) => r.campaignId === campaignId)
    const read = rows.filter((r) => r.isRead).length
    return { total: rows.length, read }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          onClick={load}
          className="p-2 hover:bg-background rounded-xl text-muted transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <History className="w-8 h-8 mx-auto mb-3 text-border" />
          <p className="text-sm">Aucune communication envoyée.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((r) => {
            const cfg = TYPE_LABEL[r.type] ?? TYPE_LABEL.app
            const isExpanded = expandedId === r.id
            const stats = r.campaignId ? readCount(r.campaignId) : null

            return (
              <div key={r.id} className="border border-border rounded-xl overflow-hidden bg-surface">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-background transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5', cfg.class)}>
                      {cfg.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-secondary truncate">
                        {r.subject || r.body.slice(0, 60)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {!r.campaignId && (
                          <span className="text-xs text-muted">→ {r.userName || r.userEmail}</span>
                        )}
                        {r.campaignId && stats && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {stats.total} destinataires
                          </span>
                        )}
                        <span className="text-[10px] text-muted">
                          {new Date(r.sentAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {!r.campaignId && (
                      r.isRead
                        ? <CheckCheck className="w-4 h-4 text-success" title="Lu" />
                        : <Eye className="w-4 h-4 text-muted" title="Non lu" />
                    )}
                    {r.campaignId && stats && (
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <CheckCheck className="w-3.5 h-3.5 text-success" />
                        {stats.read}/{stats.total}
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
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
                      <div className="px-4 pb-4 pt-0 border-t border-border">
                        {r.subject && (
                          <p className="text-xs text-muted mt-3 mb-1">
                            <span className="font-bold uppercase tracking-wider">Sujet :</span> {r.subject}
                          </p>
                        )}
                        <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap mt-3">
                          {r.body}
                        </p>
                        {r.campaignId && stats && (
                          <div className="mt-4 flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-success">
                              <Eye className="w-3.5 h-3.5" /> {stats.read} lus
                            </span>
                            <span className="flex items-center gap-1.5 text-muted">
                              <EyeOff className="w-3.5 h-3.5" /> {stats.total - stats.read} non lus
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminConversationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('individual')

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-secondary">Conversations</h1>
        <p className="text-muted mt-1">Envoyez des emails ou notifications à vos utilisateurs.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-border text-muted hover:text-secondary hover:bg-background'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab description */}
      <p className="text-sm text-muted -mt-4">
        {TAB_CONFIG.find((t) => t.id === activeTab)?.description}
      </p>

      {/* Tab content */}
      <div className="glass-card p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'individual' && <IndividualEmailForm />}
            {activeTab === 'broadcast_email' && <BroadcastEmailForm />}
            {activeTab === 'broadcast_app' && <BroadcastAppForm />}
            {activeTab === 'history' && <NotificationHistory />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
