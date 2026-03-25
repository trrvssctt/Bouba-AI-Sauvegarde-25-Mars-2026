import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Inbox,
  Send,
  FileText,
  Tag,
  Search,
  Plus,
  Star,
  Trash2,
  Archive,
  MoreVertical,
  Reply,
  Sparkles,
  X,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Bot,
  Mail,
  AlertCircle,
  Clock,
  ChevronLeft,
  Filter,
  Loader2,
  Users,
  SlidersHorizontal,
  Eye,
  Calendar,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/lib/utils'
import { useEmailStore, Email } from '@/src/stores/emailStore'
import { useNotificationStore } from '@/src/stores/notificationStore'
import { useEmailAI } from '@/src/hooks/useEmailAI'
import { useConnections } from '@/src/hooks/useConnections'
import { useContactStore } from '@/src/stores/contactStore'
import { toast } from 'sonner'
import GoogleSyncBanner from '@/src/components/GoogleSyncBanner'

const folders = [
  { icon: Inbox, label: 'Boîte de réception', id: 'inbox' },
  { icon: Send, label: 'Envoyés', id: 'sent' },
  { icon: FileText, label: 'Brouillons', id: 'drafts' },
  { icon: Archive, label: 'Archives', id: 'archive' },
  { icon: Trash2, label: 'Corbeille', id: 'trash' },
]

const labelsList = [
  { label: 'Travail', color: 'bg-primary' },
  { label: 'Finance', color: 'bg-success' },
  { icon: AlertCircle, label: 'Urgent', color: 'bg-danger' },
  { label: 'Personnel', color: 'bg-warning' },
]

export default function EmailPage() {
  const { connections } = useConnections()
  const gmailConnection = connections?.find(c => c.id === 'gmail')

  const {
    emails,
    selectedEmailId,
    searchQuery,
    activeFolder,
    activeLabel,
    isLoading,
    isSyncing,
    lastSync,
    syncError,
    loadEmails,
    refreshEmails,
    selectEmail,
    toggleRead,
    toggleStarred,
    deleteEmail,
    archiveEmail,
    setSearchQuery,
    setActiveFolder,
    setActiveLabel,
    sendEmail,
    addDraft,
    loadEmailDetail,
  } = useEmailStore()

  const { contacts } = useContactStore()

  const { generateSummary, generateSmartReplies, draftEmailFromPrompt, sendEmailViaBouba, isGenerating } = useEmailAI()

  // Bouba command bar (send email, search, etc.)
  const [boubaInput, setBoubaInput] = useState('')
  const [boubaResult, setBoubaResult] = useState<string | null>(null)
  const [isBoubaRunning, setIsBoubaRunning] = useState(false)

  const handleBoubaCommand = async () => {
    if (!boubaInput.trim() || isBoubaRunning) return
    setIsBoubaRunning(true)
    setBoubaResult(null)
    const result = await sendEmailViaBouba(boubaInput, selectedEmail || undefined)
    setIsBoubaRunning(false)
    setBoubaResult(result.output || result.error || 'Aucune réponse.')
    if (result.success) setBoubaInput('')
  }

  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiDrafting, setIsAiDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'list' | 'detail'>('list')
  const [smartReplies, setSmartReplies] = useState<string[]>([])
  const [emailSummary, setEmailSummary] = useState<string | null>(null)
  const [composeAttachments, setComposeAttachments] = useState<{ name: string; type: string; size: number; data: string }[]>([])

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all')
  const [filterStarred, setFilterStarred] = useState(false)
  const [filterHasAttachment, setFilterHasAttachment] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterSender, setFilterSender] = useState('')

  // Hover preview
  const [previewEmailId, setPreviewEmailId] = useState<string | null>(null)
  const [previewY, setPreviewY] = useState(0)
  const listContainerRef = useRef<HTMLDivElement>(null)

  // Contacts autocomplete
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const contactSuggestions = useMemo(() => {
    if (!composeTo.trim() || composeTo.includes('@')) return []
    const query = composeTo.toLowerCase()
    return contacts
      .filter(c => c.email && (
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.company.toLowerCase().includes(query)
      ))
      .slice(0, 5)
  }, [composeTo, contacts])

  // Load emails on mount always (the API handles the not-connected case)
  useEffect(() => {
    loadEmails()
    // Clear email badge when user opens the email page
    useNotificationStore.getState().clearUnreadEmails()
  }, [])

  // Reload when Gmail connection becomes connected or folder changes
  useEffect(() => {
    if (gmailConnection?.status === 'connected') {
      loadEmails(activeFolder)
    }
  }, [activeFolder, gmailConnection?.status])

  const selectedEmail = useMemo(() =>
    emails.find(e => e.id === selectedEmailId) || null
  , [emails, selectedEmailId])

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return ''
    try {
      return new Date(timestamp).toLocaleString('fr-FR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return timestamp }
  }

  const formatTime = (timestamp: string) => {
    if (!timestamp) return ''
    try {
      return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  const formatCompactDate = (timestamp: string) => {
    if (!timestamp) return ''
    try {
      const d = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffH = diffMs / 3600000
      if (diffH < 24 && d.getDate() === now.getDate()) {
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
      if (diffH < 48) return 'Hier'
      if (diffH < 168) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    } catch { return '' }
  }

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const matchesSearch =
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.snippet.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFolder = email.folder === activeFolder
      const matchesLabel = activeLabel ? email.labels.includes(activeLabel) : true
      const matchesRead =
        filterRead === 'all' ? true :
        filterRead === 'unread' ? !email.read :
        email.read
      const matchesStarred = filterStarred ? email.starred : true
      const matchesAttachment = filterHasAttachment ? (email.attachments?.length ?? 0) > 0 : true
      const matchesSender = filterSender.trim()
        ? email.from.toLowerCase().includes(filterSender.toLowerCase()) ||
          email.fromEmail.toLowerCase().includes(filterSender.toLowerCase())
        : true
      const matchesDateFrom = filterDateFrom
        ? new Date(email.timestamp) >= new Date(filterDateFrom)
        : true
      const matchesDateTo = filterDateTo
        ? new Date(email.timestamp) <= new Date(filterDateTo + 'T23:59:59')
        : true
      return matchesSearch && matchesFolder && matchesLabel &&
        matchesRead && matchesStarred && matchesAttachment &&
        matchesSender && matchesDateFrom && matchesDateTo
    })
  }, [emails, searchQuery, activeFolder, activeLabel, filterRead, filterStarred, filterHasAttachment, filterSender, filterDateFrom, filterDateTo])

  const activeFilterCount = [
    filterRead !== 'all',
    filterStarred,
    filterHasAttachment,
    !!filterSender,
    !!filterDateFrom,
    !!filterDateTo,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterRead('all')
    setFilterStarred(false)
    setFilterHasAttachment(false)
    setFilterSender('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  useEffect(() => {
    if (selectedEmail) {
      if (!selectedEmail.read) toggleRead(selectedEmail.id)
      setSmartReplies([])
      setEmailSummary(selectedEmail.summary || null)
      setMobilePanel('detail')
      // Fetch full body + attachments if not yet loaded
      loadEmailDetail(selectedEmail.id)
      const fetchAI = async () => {
        const replies = await generateSmartReplies(selectedEmail)
        setSmartReplies(replies)
        if (!selectedEmail.summary) {
          const summary = await generateSummary(selectedEmail)
          setEmailSummary(summary)
        }
      }
      fetchAI()
    }
  }, [selectedEmailId])

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return
    setIsAiDrafting(true)
    const draft = await draftEmailFromPrompt(aiPrompt)
    setComposeSubject(draft.subject)
    setComposeBody(draft.body)
    setIsAiDrafting(false)
    setAiPrompt('')
    toast.success("Brouillon généré par Bouba !")
  }

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        // Strip the data:...;base64, prefix to get raw base64
        const base64 = dataUrl.split(',')[1] || ''
        setComposeAttachments(prev => [...prev, { name: file.name, type: file.type, size: file.size, data: base64 }])
      }
      reader.readAsDataURL(file)
    })
    // Reset input so same file can be re-added
    e.target.value = ''
  }

  const handleRemoveAttachment = (index: number) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!composeTo.trim()) {
      toast.error("Veuillez spécifier un destinataire")
      return
    }
    setIsSending(true)
    const result = await sendEmail({ to: composeTo, subject: composeSubject, body: composeBody, attachments: composeAttachments } as any)
    setIsSending(false)
    if (result.success) {
      setIsComposeOpen(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      setComposeAttachments([])
      toast.success("Email envoyé !")
    } else {
      toast.error(result.error || "Erreur lors de l'envoi")
    }
  }

  const handleSmartReply = (reply: string) => {
    setIsComposeOpen(true)
    setComposeTo(selectedEmail?.fromEmail || '')
    setComposeSubject(`Re: ${selectedEmail?.subject}`)
    setComposeBody(`<p>${reply}</p><br><p>Cordialement,</p>`)
  }

  const handleRefreshEmails = async () => {
    if (gmailConnection?.status !== 'connected') {
      toast.error('Veuillez d\'abord connecter Gmail dans les paramètres')
      return
    }
    await refreshEmails()
    toast.success('Emails actualisés')
  }

  const openComposeToContact = (email: string, name: string) => {
    setComposeTo(email)
    setComposeSubject('')
    setComposeBody('')
    setIsComposeOpen(true)
  }

  const isGmailConnected = gmailConnection?.status === 'connected'
  const gmailError = syncError === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : syncError ? 'SYNC_ERROR' : null

  // Show empty state if not connected
  if (!isGmailConnected) {
    return (
      <div className="flex h-full bg-background">
        <GoogleSyncBanner
          service="gmail"
          isConnected={false}
          isLoading={false}
          variant="empty"
          onSync={refreshEmails}
          onConnect={() => window.location.href = '/settings/connections'}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background overflow-hidden flex-col">
      {/* Google Sync Banner */}
      <GoogleSyncBanner
        service="gmail"
        isConnected={isGmailConnected}
        isLoading={isLoading}
        isSyncing={isSyncing}
        lastSync={lastSync}
        error={gmailError}
        onSync={refreshEmails}
        onConnect={() => window.location.href = '/settings/connections'}
        variant="bar"
      />
      {/* Mobile Bouba bar */}
      <div className="md:hidden border-b border-border bg-surface/50 px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-2.5 py-2">
          <Bot className="w-4 h-4 text-primary shrink-0" />
          <input
            value={boubaInput}
            onChange={e => setBoubaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBoubaCommand()}
            placeholder="Demande à Bouba... (ex: lis mes derniers mails)"
            className="flex-1 bg-transparent text-sm border-none focus:ring-0 placeholder:text-muted min-w-0"
          />
          <button
            onClick={handleBoubaCommand}
            disabled={isBoubaRunning || !boubaInput.trim()}
            className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-40 hover:bg-primary-dark transition-colors shrink-0"
          >
            {isBoubaRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </button>
        </div>
        {boubaResult && (
          <div className="text-xs text-secondary bg-primary/5 rounded-lg px-3 py-2 mt-2 leading-relaxed max-h-20 overflow-y-auto">
            {boubaResult}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Email Sidebar */}
      <div className="hidden md:flex w-56 lg:w-64 border-r border-border flex-col p-4 space-y-4 bg-surface/50">
        {/* Bouba command bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-xl">
            <Bot className="w-4 h-4 text-primary shrink-0" />
            <input
              value={boubaInput}
              onChange={e => setBoubaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBoubaCommand()}
              placeholder="Demande à Bouba..."
              className="flex-1 bg-transparent text-xs border-none focus:ring-0 placeholder:text-muted"
            />
            <button
              onClick={handleBoubaCommand}
              disabled={isBoubaRunning || !boubaInput.trim()}
              className="p-1 bg-primary text-white rounded-lg disabled:opacity-40 hover:bg-primary-dark transition-colors"
            >
              {isBoubaRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
          </div>
          {boubaResult && (
            <div className="text-[10px] text-secondary bg-primary/5 rounded-lg p-2 leading-relaxed max-h-24 overflow-y-auto">
              {boubaResult}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsComposeOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Composer
        </button>

        <div className="space-y-1">
          {folders.map((folder) => {
            const count = emails.filter(e => e.folder === folder.id && !e.read).length
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium",
                  activeFolder === folder.id && !activeLabel
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-background hover:text-secondary"
                )}
              >
                <folder.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest px-3">Labels</p>
          <div className="space-y-1">
            {labelsList.map((label) => (
              <button
                key={label.label}
                onClick={() => setActiveLabel(label.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  activeLabel === label.label
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-background hover:text-secondary"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", label.color)} />
                <span>{label.label}</span>
              </button>
            ))}
            {activeLabel && (
              <button
                onClick={() => setActiveLabel(null)}
                className="w-full text-[10px] text-primary font-bold uppercase mt-2 hover:underline"
              >
                Effacer le filtre
              </button>
            )}
          </div>
        </div>

        {/* Contacts with email */}
        {contacts.filter(c => c.email).length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 flex items-center gap-2">
              <Users className="w-3 h-3" />
              Contacts fréquents
            </p>
            <div className="space-y-1">
              {contacts.filter(c => c.email).slice(0, 4).map(contact => (
                <button
                  key={contact.id}
                  onClick={() => openComposeToContact(contact.email, contact.name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:bg-background hover:text-secondary transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </div>
                  <span className="truncate">{contact.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email List */}
      <div className={cn(
        "flex flex-col border-r border-border bg-surface transition-all duration-300",
        mobilePanel === 'list' ? 'flex-1' : 'hidden md:flex',
        selectedEmail ? "md:max-w-xs lg:max-w-sm" : "flex-1"
      )}>
        <div className="border-b border-border">
          <div className="p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans Gmail..."
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <button
              onClick={handleRefreshEmails}
              disabled={isLoading}
              className="p-2 hover:bg-background rounded-lg text-muted hover:text-primary transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                "relative p-2 rounded-lg transition-colors",
                showFilters ? "bg-primary/10 text-primary" : "hover:bg-background text-muted hover:text-primary"
              )}
              title="Filtres avancés"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Advanced filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-border bg-background/50"
              >
                <div className="p-4 space-y-3">
                  {/* Read status */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider w-20 shrink-0">Statut</span>
                    <div className="flex gap-1.5">
                      {(['all', 'unread', 'read'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterRead(s)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-all",
                            filterRead === s ? "bg-primary text-white" : "bg-surface text-muted hover:text-primary border border-border"
                          )}
                        >
                          {s === 'all' ? 'Tous' : s === 'unread' ? 'Non lus' : 'Lus'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setFilterStarred(v => !v)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        filterStarred ? "bg-warning/10 text-warning border-warning/30" : "bg-surface text-muted border-border hover:text-primary"
                      )}
                    >
                      <Star className={cn("w-3 h-3", filterStarred && "fill-warning")} />
                      Favoris
                    </button>
                    <button
                      onClick={() => setFilterHasAttachment(v => !v)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        filterHasAttachment ? "bg-primary/10 text-primary border-primary/30" : "bg-surface text-muted border-border hover:text-primary"
                      )}
                    >
                      <Paperclip className="w-3 h-3" />
                      Avec pièces jointes
                    </button>
                  </div>

                  {/* Sender */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider w-20 shrink-0">Expéditeur</span>
                    <input
                      type="text"
                      value={filterSender}
                      onChange={e => setFilterSender(e.target.value)}
                      placeholder="Nom ou email..."
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                  </div>

                  {/* Date range */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider w-20 shrink-0">Période</span>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                    <span className="text-muted text-xs">→</span>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                  </div>

                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-danger font-bold hover:underline">
                      Effacer tous les filtres ({activeFilterCount})
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] text-muted font-medium">
              {filteredEmails.length} message{filteredEmails.length !== 1 ? 's' : ''}
              {filteredEmails.filter(e => !e.read).length > 0 && (
                <span className="ml-1 text-primary font-bold">· {filteredEmails.filter(e => !e.read).length} non lu{filteredEmails.filter(e => !e.read).length !== 1 ? 's' : ''}</span>
              )}
            </span>
          </div>
        </div>

        <div ref={listContainerRef} className="flex-1 overflow-y-auto relative">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
              <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
              <p className="text-sm">Chargement des emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
              <Mail className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">
                {searchQuery || activeFilterCount > 0 ? 'Aucun email trouvé' : 'Aucun email dans ce dossier'}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-2 text-xs text-primary font-bold hover:underline">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => selectEmail(email.id)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setPreviewY(rect.top)
                  setPreviewEmailId(email.id)
                }}
                onMouseLeave={() => setPreviewEmailId(null)}
                className={cn(
                  "p-4 border-b border-border cursor-pointer transition-all hover:bg-background relative group",
                  !email.read && "bg-primary/5",
                  selectedEmailId === email.id && "bg-primary/10 border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {email.from[0]?.toUpperCase()}
                    </div>
                    <span className={cn("text-sm truncate", !email.read ? "font-bold text-secondary" : "text-muted")}>
                      {email.from}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-2">
                    <span className="text-[10px] text-muted font-medium whitespace-nowrap">{formatCompactDate(email.timestamp)}</span>
                    {(email.attachments?.length ?? 0) > 0 && (
                      <Paperclip className="w-3 h-3 text-muted mt-0.5" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn("text-sm truncate flex-1", !email.read ? "font-bold text-secondary" : "text-muted")}>
                    {email.subject}
                  </h4>
                  {email.isUrgent && (
                    <span className="text-[8px] bg-danger/10 text-danger px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shrink-0">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted line-clamp-1 opacity-80">{email.snippet}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {email.labels.slice(0, 3).map(label => (
                    <span key={label} className="text-[9px] font-bold bg-background px-1.5 py-0.5 rounded text-muted uppercase">
                      {label}
                    </span>
                  ))}
                </div>
                {!email.read && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
                {/* Action buttons on hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewEmailId(previewEmailId === email.id ? null : email.id) }}
                    className="p-1.5 hover:bg-surface rounded-lg text-muted hover:text-primary transition-colors"
                    title="Prévisualiser"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStarred(email.id) }}
                    className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                    title={email.starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Star className={cn("w-3.5 h-3.5", email.starred ? "fill-warning text-warning" : "text-muted hover:text-warning")} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hover Preview Popover */}
      <AnimatePresence>
        {previewEmailId && !selectedEmailId && (() => {
          const pEmail = emails.find(e => e.id === previewEmailId)
          if (!pEmail) return null
          return (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 w-96 bg-surface border border-border rounded-2xl shadow-2xl pointer-events-none overflow-hidden"
              style={{ top: Math.max(80, Math.min(previewY, (typeof window !== 'undefined' ? window.innerHeight : 800) - 340)), right: 24 }}
            >
              <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {pEmail.from[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-secondary text-sm truncate">{pEmail.from}</p>
                    <p className="text-[10px] text-muted truncate">{pEmail.fromEmail}</p>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-[10px] text-muted">{formatCompactDate(pEmail.timestamp)}</p>
                    <p className="text-[9px] text-muted">{formatTime(pEmail.timestamp)}</p>
                  </div>
                </div>
                <h4 className="font-bold text-secondary text-sm line-clamp-1">{pEmail.subject}</h4>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted leading-relaxed line-clamp-4">{pEmail.snippet}</p>
                {(pEmail.attachments?.length ?? 0) > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-primary font-medium">
                    <Paperclip className="w-3 h-3" />
                    {pEmail.attachments!.length} pièce{pEmail.attachments!.length !== 1 ? 's' : ''} jointe{pEmail.attachments!.length !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {pEmail.isUrgent && <span className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded font-black uppercase">Urgent</span>}
                  {pEmail.labels.slice(0, 3).map(l => (
                    <span key={l} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">{l}</span>
                  ))}
                </div>
                <p className="mt-3 text-[9px] text-muted italic">Cliquez pour ouvrir · Oeil pour prévisualiser uniquement</p>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Email Detail */}
      <AnimatePresence mode="wait">
        {selectedEmail ? (
          <motion.div
            key={selectedEmail.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={cn(
              "flex flex-col bg-surface",
              mobilePanel === 'detail' ? 'flex-1' : 'hidden md:flex md:flex-[1.5]'
            )}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { selectEmail(null); setMobilePanel('list') }}
                  className="p-2 hover:bg-background rounded-lg text-muted md:hidden"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => archiveEmail(selectedEmail.id)} className="p-2 hover:bg-background rounded-lg text-muted hover:text-primary transition-colors">
                    <Archive className="w-5 h-5" />
                  </button>
                  <button onClick={() => deleteEmail(selectedEmail.id)} className="p-2 hover:bg-background rounded-lg text-muted hover:text-danger transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-background rounded-lg text-muted hover:text-primary transition-colors">
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <button className="p-2 hover:bg-background rounded-lg text-muted">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    {selectedEmail.isUrgent && (
                      <span className="mt-1 text-[9px] bg-danger/10 text-danger px-2 py-1 rounded font-black uppercase tracking-tighter shrink-0">Urgent</span>
                    )}
                    <h1 className="text-2xl font-display font-bold text-secondary leading-tight">{selectedEmail.subject}</h1>
                  </div>
                  <div className="flex items-start justify-between gap-4 bg-background/50 rounded-2xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
                        {selectedEmail.from[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-secondary">{selectedEmail.from}</p>
                        <p className="text-xs text-muted">&lt;{selectedEmail.fromEmail}&gt;</p>
                        <p className="text-xs text-muted mt-0.5">À: {selectedEmail.to}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-muted justify-end">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium capitalize">
                          {selectedEmail.timestamp
                            ? new Date(selectedEmail.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                            : selectedEmail.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted justify-end mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-secondary">
                          {formatTime(selectedEmail.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {emailSummary && (
                  <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex gap-3">
                    <Bot className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Résumé par Bouba</p>
                      <p className="text-sm text-secondary italic leading-relaxed">"{emailSummary}"</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border overflow-hidden bg-white relative">
                  {!selectedEmail.fullLoaded && !selectedEmail.htmlBody && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/20 overflow-hidden">
                      <div className="h-full w-1/3 bg-primary rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
                    </div>
                  )}
                  <iframe
                    key={selectedEmail.id}
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>
                      * { box-sizing: border-box; }
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.7; color: #1a1a2e; margin: 0; padding: 20px 24px; }
                      img { max-width: 100% !important; height: auto; display: block; border-radius: 4px; }
                      a { color: #6366f1; word-break: break-word; }
                      a:hover { text-decoration: underline; }
                      table { max-width: 100% !important; border-collapse: collapse; width: 100% !important; }
                      td, th { padding: 6px 8px; word-break: break-word; }
                      pre { background: #f4f4f8; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
                      code { background: #f4f4f8; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
                      blockquote { border-left: 3px solid #6366f1; margin: 12px 0; padding: 4px 12px; color: #666; }
                      hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
                      p { margin: 0 0 8px; }
                    </style></head><body>${selectedEmail.htmlBody || selectedEmail.body || selectedEmail.snippet || '<p style="color:#888;font-style:italic">Aucun contenu</p>'}</body></html>`}
                    className="w-full border-0"
                    style={{ minHeight: 220 }}
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    title={`Email: ${selectedEmail.subject}`}
                    onLoad={(e) => {
                      const iframe = e.currentTarget
                      try {
                        const h = iframe.contentDocument?.documentElement?.scrollHeight
                        if (h) iframe.style.height = h + 'px'
                      } catch {}
                    }}
                  />
                </div>

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5" />
                      Pièces jointes ({selectedEmail.attachments.length})
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedEmail.attachments.map(file => {
                        const isImage = file.type?.startsWith('image/')
                        const isPdf = file.type === 'application/pdf'
                        const downloadUrl = file.url
                        return (
                          <a
                            key={file.id}
                            href={downloadUrl}
                            target={isImage || isPdf ? '_blank' : undefined}
                            download={!isImage && !isPdf ? file.name : undefined}
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl hover:border-primary transition-all cursor-pointer group"
                          >
                            {isImage && downloadUrl ? (
                              <img src={downloadUrl} alt={file.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isPdf ? "bg-red-50 text-red-500 group-hover:bg-red-100" : "bg-surface text-muted group-hover:text-primary"
                              )}>
                                {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-secondary truncate group-hover:text-primary transition-colors">{file.name}</p>
                              <p className="text-[10px] text-muted">{file.size}</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Smart Replies */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">Réponses intelligentes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isGenerating ? (
                      <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-8 w-24 bg-primary/5 animate-pulse rounded-full" />
                        ))}
                      </div>
                    ) : (
                      smartReplies.map((reply, i) => (
                        <button
                          key={i}
                          onClick={() => handleSmartReply(reply)}
                          className="px-4 py-2 bg-surface border border-primary/20 rounded-full text-xs font-medium text-primary hover:bg-primary hover:text-white transition-all"
                        >
                          {reply}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Reply */}
                <QuickReply
                  selectedEmail={selectedEmail}
                  onReply={handleSmartReply}
                  onSend={async (body) => {
                    setIsSending(true)
                    const result = await sendEmail({
                      to: selectedEmail.fromEmail,
                      subject: `Re: ${selectedEmail.subject}`,
                      body,
                    })
                    setIsSending(false)
                    if (result.success) toast.success("Réponse envoyée !")
                    else toast.error(result.error || "Erreur envoi")
                  }}
                  isSending={isSending}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex-[1.5] flex flex-col items-center justify-center text-center p-8 space-y-4 bg-surface">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center text-muted">
              <Mail className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary">Sélectionnez un email</h3>
              <p className="text-sm text-muted">Choisissez une conversation pour commencer à lire.</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-secondary text-white p-4 flex items-center justify-between">
                <h3 className="font-bold">Nouveau message</h3>
                <button onClick={() => setIsComposeOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AI Drafting */}
              <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center gap-3">
                <Bot className="w-5 h-5 text-primary" />
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Demandez à Bouba de rédiger... (ex: 'Réponds poliment que je ne suis pas disponible')"
                  className="flex-1 bg-transparent border-none focus:ring-0 text-xs italic"
                  onKeyDown={(e) => e.key === 'Enter' && handleAiDraft()}
                />
                <button
                  onClick={handleAiDraft}
                  disabled={isAiDrafting || !aiPrompt.trim()}
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  {isAiDrafting ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* To field with contacts autocomplete */}
                <div className="relative">
                  <div className="flex items-center gap-4 border-b border-border py-2">
                    <span className="text-sm font-bold text-muted w-12">À</span>
                    <input
                      ref={toInputRef}
                      type="text"
                      value={composeTo}
                      onChange={(e) => { setComposeTo(e.target.value); setShowContactSuggestions(true) }}
                      onFocus={() => setShowContactSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowContactSuggestions(false), 150)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                      placeholder="Destinataires (email ou nom de contact)"
                    />
                    <button
                      onClick={() => setShowContactSuggestions(v => !v)}
                      className="p-1 text-muted hover:text-primary transition-colors"
                      title="Choisir un contact"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Contacts dropdown */}
                  {showContactSuggestions && contactSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-2xl shadow-xl z-10 overflow-hidden">
                      {contactSuggestions.map(contact => (
                        <button
                          key={contact.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setComposeTo(contact.email)
                            setShowContactSuggestions(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-secondary truncate">{contact.name}</p>
                            <p className="text-[10px] text-muted truncate">{contact.email}</p>
                          </div>
                          {contact.company && (
                            <span className="text-[10px] text-muted">{contact.company}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Show all contacts with email when field is empty and focused */}
                  {showContactSuggestions && !composeTo && contacts.filter(c => c.email).length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-2xl shadow-xl z-10 overflow-hidden max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-bold text-muted uppercase px-4 py-2 border-b border-border">Contacts</p>
                      {contacts.filter(c => c.email).slice(0, 8).map(contact => (
                        <button
                          key={contact.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setComposeTo(contact.email)
                            setShowContactSuggestions(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-secondary truncate">{contact.name}</p>
                            <p className="text-[10px] text-muted truncate">{contact.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 border-b border-border py-2">
                  <span className="text-sm font-bold text-muted w-12">Sujet</span>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                    placeholder="Objet du message"
                  />
                </div>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full flex-1 bg-transparent border-none focus:ring-0 resize-none min-h-[300px] text-sm py-4"
                  placeholder="Écrivez votre message ici..."
                />
              </div>

              {/* Attachment chips */}
              {composeAttachments.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2 border-t border-border pt-3">
                  {composeAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                      <Paperclip className="w-3 h-3 shrink-0" />
                      <span className="max-w-[140px] truncate">{att.name}</span>
                      <span className="text-primary/60">({(att.size / 1024).toFixed(0)} Ko)</span>
                      <button onClick={() => handleRemoveAttachment(i)} className="ml-1 hover:text-danger transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-background border-t border-border flex items-center justify-between">
                {/* Hidden file inputs */}
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAddAttachment} />
                <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleAddAttachment} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-surface rounded-lg text-muted hover:text-primary transition-colors"
                    title="Joindre un fichier"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 hover:bg-surface rounded-lg text-muted hover:text-primary transition-colors"
                    title="Joindre une image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setIsComposeOpen(false); setComposeAttachments([]) }}
                    className="px-6 py-2 text-sm font-bold text-muted hover:text-secondary transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isSending || !composeTo.trim()}
                    className="btn-primary flex items-center gap-2 py-2 px-8 text-sm disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        Envoyer
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

// Quick reply sub-component
function QuickReply({ selectedEmail, onReply, onSend, isSending }: {
  selectedEmail: Email
  onReply: (text: string) => void
  onSend: (body: string) => Promise<void>
  isSending: boolean
}) {
  const [replyBody, setReplyBody] = useState('')

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-muted text-sm px-2">
        <Reply className="w-4 h-4" />
        <span>Répondre à {selectedEmail.from}...</span>
      </div>
      <textarea
        value={replyBody}
        onChange={(e) => setReplyBody(e.target.value)}
        placeholder="Écrivez votre réponse ici..."
        className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[100px] text-sm"
      />
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-background rounded-lg text-muted">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg text-muted">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg text-muted">
            <Smile className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { if (replyBody.trim()) { onSend(replyBody); setReplyBody('') } }}
          disabled={isSending || !replyBody.trim()}
          className="btn-primary flex items-center gap-2 py-2 px-6 text-sm disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer
        </button>
      </div>
    </div>
  )
}
