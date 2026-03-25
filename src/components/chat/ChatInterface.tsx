import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Mic, Sparkles, PlusCircle, Download, Trash2, MicOff, Lock, MessageSquare, ChevronLeft, Pencil, X, Check, ArrowUp, FileText, RefreshCw, CheckCircle2, Search, SlidersHorizontal } from 'lucide-react'
import { useChatStore, Message } from '@/src/stores/chatStore'
import { useNotificationStore } from '@/src/stores/notificationStore'
import { useBouba } from '@/src/hooks/useBouba'
import { usePlans } from '@/src/hooks/usePlans'
import { useAuth } from '@/src/hooks/useAuth'
import MessageBubble from './MessageBubble'
import { NewConversationModal } from './NewConversationModal'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/src/lib/utils'
import { useFinanceAI } from '@/src/hooks/useFinanceAI'
import { useDocumentStore, DOC_TYPE_LABELS, calcTotals } from '@/src/stores/documentStore'
import type { DocType, SavedDocument } from '@/src/stores/documentStore'
import { useCompanyStore } from '@/src/stores/companyStore'
import { usePrefsStore } from '@/src/stores/prefsStore'

const quickActions = [
  { label: '📧 Emails non lus',     prompt: 'Montre-moi mes emails non lus du jour',   feature: 'gmail' },
  { label: '📅 RDV du jour',        prompt: "Quels sont mes rendez-vous aujourd'hui ?",  feature: 'calendar' },
  { label: '💰 Rapport financier',  prompt: 'Génère un rapport financier de ce mois',   feature: 'finance' },
  { label: '👤 Ajouter contact',    prompt: "Aide-moi à ajouter un nouveau contact",    feature: 'contacts' },
  { label: '📄 Créer une facture',  prompt: 'Je veux créer une facture pour un client', feature: 'finance' },
  { label: '📊 Chiffre d\'affaires', prompt: "Quel est mon chiffre d'affaires ce mois ?", feature: 'finance' },
]

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'az' | 'za'>('recent')
  const recognitionRef = useRef<any>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const { sessions, currentSessionId, createNewSession, clearMessages, switchSession, deleteSession, renameSession } = useChatStore()
  const { sendMessage, isLoading, activeAgent } = useBouba()
  const { hasFeatureAccess, getUsageStatus } = usePlans()
  const { profile } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Document generation from chat
  const { generateDocument, generateMonthlyReport, isProcessing: isGeneratingDoc } = useFinanceAI()
  const { saveDocument } = useDocumentStore()
  const { company } = useCompanyStore()
  const { currency } = usePrefsStore()
  const [docCard, setDocCard] = useState<{
    docType: DocType
    number: string
    clientName: string
    docData: Omit<SavedDocument, 'id' | 'createdAt'>
  } | null>(null)

  const currentSession = sessions.find(s => s.id === currentSessionId)
  const messages = currentSession?.messages || []

  const filteredSessions = useMemo(() => {
    let list = [...sessions]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s => s.title.toLowerCase().includes(q))
    }
    switch (sortOption) {
      case 'recent':  list.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()); break
      case 'oldest':  list.sort((a, b) => new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime()); break
      case 'az':      list.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })); break
      case 'za':      list.sort((a, b) => b.title.localeCompare(a.title, 'fr', { sensitivity: 'base' })); break
    }
    return list
  }, [sessions, searchQuery, sortOption])
  const usageStatus = getUsageStatus()
  const isOverLimit = usageStatus.limit !== -1 && usageStatus.remaining <= 0

  // Clear unread message badge when chat is opened
  useEffect(() => {
    useNotificationStore.getState().clearUnreadMessages()
  }, [])

  // Sync on mount
  useEffect(() => {
    if (profile?.id) {
      useChatStore.getState().syncWithAPI().catch(() => {})
    }
  }, [profile?.id])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus rename input
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingSessionId])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  // ── Document intent detection ──────────────────────────────────────
  // Normalize: remove diacritics so "genere" matches "génère", "recu" matches "reçu", etc.
  const normText = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const DOC_INTENT: Array<{ pattern: RegExp; type: DocType }> = [
    { pattern: /facture|invoice/i,            type: 'invoice' },
    { pattern: /devis|quote|estimation/i,     type: 'quote' },
    { pattern: /recu|receipt/i,               type: 'receipt' },
    { pattern: /proforma/i,                   type: 'proforma' },
    { pattern: /fiche\s*de\s*paie|payslip/i,  type: 'payslip' },
    { pattern: /bon\s*de\s*commande/i,        type: 'purchase_order' },
    { pattern: /bon\s*de\s*livraison/i,       type: 'delivery' },
    { pattern: /bon\s*de\s*sortie/i,          type: 'exit_voucher' },
  ]

  const detectDocIntent = (text: string): DocType | null => {
    const n = normText(text)
    const createPattern = /\b(creer?|generer?|genere|faire?|nouveau|nouvelle|cree?)\b/
    if (!createPattern.test(n)) return null
    for (const { pattern, type } of DOC_INTENT) {
      if (pattern.test(n)) return type
    }
    return null
  }

  const isReportIntent = (text: string): boolean =>
    /rapport.*(financier|mensuel|mois)|bilan.*(financier|mois)/i.test(normText(text))

  const handleReportFromChat = async () => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    useChatStore.getState().addMessage({ role: 'user', content: `Génère un rapport financier de ${monthLabel}` })
    useChatStore.getState().addMessage({ role: 'assistant', content: `⏳ Analyse de vos données financières en cours…`, agent: 'FINANCE' })
    const report = await generateMonthlyReport()
    useChatStore.getState().addMessage({
      role: 'assistant',
      content: `📊 **Rapport financier — ${monthLabel}**\n\n${report}`,
      agent: 'FINANCE',
      suggestions: ['Créer une facture', 'Voir mes transactions', 'Analyser mes dépenses'],
    })
  }

  const handleDocGeneration = async (description: string, docType: DocType) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: description })
    useChatStore.getState().addMessage({ role: 'assistant', content: `⏳ Je génère votre ${DOC_TYPE_LABELS[docType].toLowerCase()}…`, agent: 'FINANCE' })

    const draft = await generateDocument(docType, description)
    if (!draft) {
      toast.error('Impossible de générer le document')
      return
    }
    const { totalHT, totalTVA, totalTTC } = calcTotals(draft.items, draft.vatRate)
    const docData: Omit<SavedDocument, 'id' | 'createdAt'> = {
      type: docType, number: draft.number, date: draft.date, status: draft.status,
      companyName: company.name, companyLogo: company.logo,
      companyAddress: company.address, companyCity: company.city,
      companyPostalCode: company.postalCode, companyCountry: company.country,
      companyPhone: company.phone, companyEmail: company.email,
      companyWebsite: company.website, companySiret: company.siret,
      companyVat: company.vat, companyLegalForm: company.legalForm,
      clientName: draft.clientName, clientEmail: draft.clientEmail, clientAddress: draft.clientAddress,
      items: draft.items, vatRate: draft.vatRate, totalHT, totalTVA, totalTTC, notes: draft.notes,
    }
    setDocCard({ docType, number: draft.number, clientName: draft.clientName, docData })
  }

  const handleSaveDocFromChat = () => {
    if (!docCard) return
    saveDocument(docCard.docData)
    useChatStore.getState().addMessage({
      role: 'assistant',
      content: `✅ **${DOC_TYPE_LABELS[docCard.docType]} N° ${docCard.number}** sauvegardée avec succès !\n\n**Client :** ${docCard.clientName || 'Non précisé'}\n**Total TTC :** ${formatCurrency(docCard.docData.totalTTC, currency)}\n\nRetrouvez-la dans **Finance → Documents**.`,
      agent: 'FINANCE',
      suggestions: ['Créer un devis', 'Voir mes finances', 'Générer un rapport financier'],
    })
    toast.success(`${DOC_TYPE_LABELS[docCard.docType]} sauvegardée dans Finance !`)
    setDocCard(null)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || isGeneratingDoc) return
    if (isOverLimit) { toast.error('Limite de messages atteinte. Mettez à niveau votre plan.'); return }

    if (isReportIntent(input)) {
      setInput('')
      handleReportFromChat()
      return
    }

    const docType = detectDocIntent(input)
    if (docType) {
      const desc = input
      setInput('')
      handleDocGeneration(desc, docType)
      return
    }

    if (!currentSessionId) {
      try { await createNewSession() }
      catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    sendMessage(input)
    setInput('')
  }

  const handleQuickAction = async (action: any) => {
    if (!hasFeatureAccess(action.feature)) {
      toast.error(`Cette fonctionnalité nécessite un plan supérieur.`)
      return
    }
    if (isOverLimit) { toast.error('Limite de messages atteinte.'); return }

    if (isReportIntent(action.prompt)) {
      handleReportFromChat()
      return
    }

    const docType = detectDocIntent(action.prompt)
    if (docType) {
      handleDocGeneration(action.prompt, docType)
      return
    }

    if (!currentSessionId) {
      try { await createNewSession() }
      catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    sendMessage(action.prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoiceInput = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error("Reconnaissance vocale non supportée."); return }
    if (isListening) { recognitionRef.current?.stop(); return }
    const r = new SR()
    recognitionRef.current = r
    r.lang = 'fr-FR'
    r.continuous = true
    r.interimResults = true
    r.onstart  = () => { setIsListening(true); setInterimTranscript('') }
    r.onresult = (e: any) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) setInput(p => p + (p ? ' ' : '') + final)
      setInterimTranscript(interim)
    }
    r.onerror = (e: any) => {
      if (e.error !== 'aborted') toast.error(`Erreur microphone: ${e.error}`)
      setIsListening(false); setInterimTranscript('')
    }
    r.onend = () => { setIsListening(false); setInterimTranscript('') }
    r.start()
  }, [isListening])

  const exportChat = () => {
    if (!messages.length) return
    const content = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }))
    a.download = `conversation-bouba-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    toast.success('Conversation exportée')
  }

  const handleConfirmRename = async () => {
    if (!editingSessionId || !editingTitle.trim()) { setEditingSessionId(null); return }
    try {
      await renameSession(editingSessionId, editingTitle.trim())
      toast.success('Conversation renommée')
    } catch { toast.error('Erreur lors du renommage') }
    setEditingSessionId(null)
  }

  const handleDeleteSession = async (id: string) => {
    try { await deleteSession(id); toast.success('Conversation supprimée') }
    catch { toast.error('Erreur lors de la suppression') }
  }

  const formatDate = (date: Date) => {
    const d = date instanceof Date ? date : new Date(date)
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff === 1) return 'Hier'
    if (diff < 7) return `Il y a ${diff}j`
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="flex h-full bg-[#F5F6FA] relative overflow-hidden">

      {/* ── Sidebar Conversations ─────────────────────────────────── */}
      <AnimatePresence>
        {showSessions && (
          <>
            {/* Overlay mobile */}
            <div
              className="fixed inset-0 bg-black/30 z-20 lg:hidden"
              onClick={() => setShowSessions(false)}
            />
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed lg:relative inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-100 flex flex-col shadow-xl lg:shadow-none"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Conversations</span>
                </div>
                <button
                  onClick={() => setShowSessions(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* New conversation + Search + Sort */}
              <div className="p-3 space-y-2 border-b border-gray-100">
                <button
                  onClick={async () => { await createNewSession(); setShowSessions(false) }}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Nouvelle conversation
                </button>

                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher…"
                    className="w-full pl-8 pr-7 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 text-gray-700 placeholder:text-gray-400 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Sort row */}
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-gray-400 shrink-0" />
                  <select
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value as typeof sortOption)}
                    className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none focus:border-primary/40 cursor-pointer"
                  >
                    <option value="recent">Plus récent</option>
                    <option value="oldest">Plus ancien</option>
                    <option value="az">A → Z</option>
                    <option value="za">Z → A</option>
                  </select>
                </div>
              </div>

              {/* Sessions list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Aucune conversation</p>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Aucun résultat</p>
                    <button onClick={() => setSearchQuery('')} className="mt-1 text-[11px] text-primary hover:underline">
                      Effacer la recherche
                    </button>
                  </div>
                ) : filteredSessions.map(session => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative rounded-xl px-3 py-2.5 cursor-pointer transition-all",
                      session.id === currentSessionId
                        ? "bg-primary/8 border border-primary/15"
                        : "hover:bg-gray-50"
                    )}
                    onClick={() => { if (editingSessionId !== session.id) { switchSession(session.id); setShowSessions(false) } }}
                  >
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <input
                          ref={editInputRef}
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleConfirmRename()
                            if (e.key === 'Escape') setEditingSessionId(null)
                          }}
                          className="flex-1 text-xs bg-transparent border border-primary/40 rounded-lg px-2 py-1 outline-none focus:border-primary"
                        />
                        <button onClick={handleConfirmRename} className="p-1 text-green-500 hover:text-green-600">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingSessionId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={cn(
                            "text-xs font-semibold leading-tight truncate flex-1",
                            session.id === currentSessionId ? "text-primary" : "text-gray-700"
                          )}>
                            {session.title}
                          </p>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setEditingSessionId(session.id); setEditingTitle(session.title) }}
                              className="p-1 hover:text-primary text-gray-400 transition-colors rounded"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteSession(session.id) }}
                              className="p-1 hover:text-red-500 text-gray-400 transition-colors rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                          {formatDate(session.lastUpdate)}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className={cn(
                "p-2 rounded-xl transition-colors relative",
                showSessions ? "bg-primary/10 text-primary" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              {sessions.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {sessions.length > 9 ? '9+' : sessions.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm leading-tight truncate max-w-[180px]">
                  {currentSession?.title || 'Nouvelle conversation'}
                </h2>
                {activeAgent && (
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">
                    {activeAgent} agent actif…
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={exportChat} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors" title="Exporter">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={clearMessages} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors" title="Effacer">
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="ml-1 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
            >
              + Nouveau
            </button>
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scroll-smooth">

          {messages.length === 0 ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8 px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="relative"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-violet-600 rounded-3xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(108,62,244,0.35)]">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white" />
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold text-gray-800">
                  Bonjour {profile?.first_name || 'là'} 👋
                </h1>
                <p className="text-base text-gray-500">
                  Je suis Bouba, votre assistant IA personnel. Comment puis-je vous aider ?
                </p>

                {usageStatus.limit !== -1 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-3.5 mt-4 text-left shadow-sm">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-700 font-semibold text-xs">Messages ce mois</span>
                      <span className="text-gray-500 text-xs font-bold">
                        {profile?.messages_used || 0} / {usageStatus.limit}
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-500",
                          usageStatus.percentage > 80 ? "bg-orange-400" : "bg-primary"
                        )}
                        style={{ width: `${Math.min(usageStatus.percentage, 100)}%` }}
                      />
                    </div>
                    {isOverLimit && (
                      <p className="text-red-500 text-xs mt-2 font-medium">
                        Limite atteinte. <a href="/settings/plan" className="underline">Mettre à niveau →</a>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Quick actions grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
                {quickActions.map((action) => {
                  const hasAccess = hasFeatureAccess(action.feature)
                  return (
                    <motion.button
                      key={action.label}
                      whileHover={{ scale: hasAccess && !isOverLimit ? 1.02 : 1 }}
                      whileTap={{ scale: hasAccess && !isOverLimit ? 0.97 : 1 }}
                      onClick={() => hasAccess ? handleQuickAction(action) : null}
                      disabled={!hasAccess || isOverLimit}
                      className={cn(
                        "p-3.5 border rounded-2xl text-left transition-all group relative bg-white",
                        hasAccess && !isOverLimit
                          ? "border-gray-100 hover:border-primary/30 hover:shadow-md cursor-pointer"
                          : "border-gray-100 cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className={cn(
                          "text-sm font-semibold leading-snug",
                          hasAccess && !isOverLimit
                            ? "text-gray-700 group-hover:text-primary"
                            : "text-gray-400"
                        )}>
                          {action.label}
                        </p>
                        {!hasAccess && <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {!hasAccess ? 'Plan Pro+' : isOverLimit ? 'Limite atteinte' : 'Appuyer pour envoyer'}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                {...msg}
                onSuggestionClick={(s) => sendMessage(s)}
              />
            ))
          )}

          {/* Loading indicator */}
          {isLoading && !messages[messages.length - 1]?.isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 ml-12 mb-2"
            >
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2.5">
                <div className="flex gap-1">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {activeAgent ? `${activeAgent} agent…` : 'Bouba réfléchit…'}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Document Card Overlay ──────────────────────────────── */}
        <AnimatePresence>
          {(isGeneratingDoc || docCard) && (
            <div className="px-4 pt-2 bg-[#F5F6FA]">
              <div className="max-w-3xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="bg-white border border-primary/20 rounded-2xl p-4 shadow-lg"
                >
                  {isGeneratingDoc && !docCard ? (
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">Bouba génère votre document…</p>
                        <p className="text-xs text-gray-500">Extraction des informations en cours</p>
                      </div>
                    </div>
                  ) : docCard && (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4.5 h-4.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{DOC_TYPE_LABELS[docCard.docType]} générée</p>
                            <p className="text-[11px] text-gray-500 font-mono">{docCard.number}</p>
                          </div>
                        </div>
                        <button onClick={() => setDocCard(null)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5 pl-0.5">
                        {docCard.clientName && <p>Client : <span className="font-semibold text-gray-800">{docCard.clientName}</span></p>}
                        <p>Total TTC : <span className="font-bold text-gray-900">{formatCurrency(docCard.docData.totalTTC, currency)}</span></p>
                      </div>
                      <button
                        onClick={handleSaveDocFromChat}
                        className="w-full text-xs font-bold bg-gradient-to-br from-primary to-violet-600 text-white rounded-xl py-2.5 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sauvegarder dans Finance
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Input Area ─────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2 bg-[#F5F6FA]">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "bg-white rounded-2xl border transition-all shadow-sm",
              isListening
                ? "border-red-300 ring-2 ring-red-100"
                : "border-gray-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10"
            )}>
              <div className="flex items-end gap-2 px-3 py-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Je t'écoute…" : "Parle à Bouba… (Entrée pour envoyer)"}
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-1 min-h-[40px] max-h-40 text-sm text-gray-800 placeholder:text-gray-400 font-medium overflow-y-auto"
                  rows={1}
                  disabled={isLoading}
                />

                <div className="flex items-center gap-1 pb-1">
                  <button
                    onClick={handleVoiceInput}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isListening
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-gray-400 hover:text-primary hover:bg-primary/8"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || isOverLimit || isGeneratingDoc}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      input.trim() && !isLoading && !isOverLimit && !isGeneratingDoc
                        ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-sm hover:shadow-md hover:scale-105"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isLoading || isGeneratingDoc
                      ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                      : <ArrowUp className="w-5 h-5" />
                    }
                  </button>
                </div>
              </div>

              {/* Interim transcript */}
              {interimTranscript && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-400 italic">{interimTranscript}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 px-0.5">
              <p className="text-[10px] text-gray-400 font-medium">
                Bouba peut faire des erreurs — vérifiez les informations importantes.
              </p>
              {usageStatus.limit !== -1 && (
                <p className={cn(
                  "text-[10px] font-semibold shrink-0 ml-2",
                  isOverLimit ? "text-red-500" : usageStatus.percentage > 80 ? "text-orange-500" : "text-gray-400"
                )}>
                  {profile?.messages_used || 0}/{usageStatus.limit} msg
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal nouvelle conversation */}
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async (title) => {
          try {
            const store = useChatStore.getState()
            await store.createNewSession()
            if (store.currentSessionId) {
              await store.renameSession(store.currentSessionId, title)
              toast.success(`Conversation "${title}" créée`)
            }
          } catch { toast.error('Erreur lors de la création de la conversation') }
        }}
      />
    </div>
  )
}
