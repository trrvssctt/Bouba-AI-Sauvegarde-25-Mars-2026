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
import { useCalendarAI } from '@/src/hooks/useCalendarAI'
import { useBoubaAction } from '@/src/hooks/useBoubaAction'
import { useFinanceStore } from '@/src/stores/financeStore'
import { useCalendarStore } from '@/src/stores/calendarStore'
import { useEmailStore } from '@/src/stores/emailStore'
import { useContactStore } from '@/src/stores/contactStore'
import { useDocumentStore, DOC_TYPE_LABELS, calcTotals } from '@/src/stores/documentStore'
import type { DocType, SavedDocument } from '@/src/stores/documentStore'
import { useCompanyStore } from '@/src/stores/companyStore'
import { usePrefsStore } from '@/src/stores/prefsStore'

const quickActions = [
  // Stratégie & Clients
  { label: '🚀 Relancer prospects',   prompt: "Aide-moi à préparer des messages de relance pour mes prospects qui n'ont pas répondu.", feature: 'gmail',    accent: 'from-orange-400 to-red-500' },
  { label: '🤝 Onboarding client',    prompt: "Je viens de signer un nouveau client, aide-moi à préparer son onboarding et les prochaines étapes.", feature: 'general',  accent: 'from-blue-400 to-indigo-600' },
  
  // Intelligence Quotidienne
  { label: '📊 Récap complet',       prompt: "Fais-moi un récapitulatif complet de ma journée (Agenda, Emails, Finances)", feature: 'general', accent: 'from-primary to-violet-500' },
  { label: '📧 Emails non lus',      prompt: 'Montre-moi mes emails non lus du jour et les priorités',    feature: 'gmail',    accent: 'from-rose-400 to-pink-500' },

  // Calendrier & RDV
  { label: '📅 RDV du jour',         prompt: "Quels sont mes rendez-vous aujourd'hui ?",  feature: 'calendar', accent: 'from-blue-400 to-sky-500' },
  { label: '📅 Nouveau RDV',         prompt: "Aide-moi à planifier un nouveau rendez-vous avec un client", feature: 'calendar', accent: 'from-sky-400 to-cyan-500' },

  // Finance & Documents
  { label: '💰 Rapport financier',   prompt: 'Génère un rapport financier de ce mois',    feature: 'finance',  accent: 'from-emerald-400 to-green-500' },
  { label: '📄 Créer un document',   prompt: 'Je veux créer une facture ou un devis pour un client',  feature: 'finance',  accent: 'from-amber-400 to-orange-500' },
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

  // Finance actions from chat
  const { generateDocument, generateMonthlyReport, processFinanceCommand, analyzeFinances, isProcessing: isGeneratingDoc } = useFinanceAI()
  const { addTransaction, transactions: financeTransactions } = useFinanceStore()

  // Data stores for AI context
  const { processNaturalLanguageCommand } = useCalendarAI()
  const calendarEvents = useCalendarStore(state => state.events)
  const emails = useEmailStore(state => state.emails)
  const contacts = useContactStore(state => state.contacts)
  const { callBouba } = useBoubaAction()
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
    // Accept explicit create verbs OR "besoin d'un/d'une", "prepare", "redige", "etablis"
    const createPattern = /\b(creer?|generer?|genere|faire?|nouveau|nouvelle|cree?|preparer?|prepare|rediger?|redige|etablir?|etablis|besoin\s+d[ue']|donne[\s-]moi|fais[\s-]moi|j'?ai\s+besoin)\b/
    if (!createPattern.test(n)) return null
    for (const { pattern, type } of DOC_INTENT) {
      if (pattern.test(n)) return type
    }
    return null
  }

  const isReportIntent = (text: string): boolean =>
    /rapport.*(financier|mensuel|mois)|bilan.*(financier|mois)/i.test(normText(text))

  // Detect explicit transaction recording intent ("enregistre une dépense", "j'ai payé", etc.)
  const detectTransactionIntent = (text: string): boolean => {
    const n = normText(text)
    const actionPattern = /\b(enregistr|note\s+une?|ajoute?\s+une?\s+(depense|recette|revenu|transaction)|j'?ai\s+(paye|depense|recu|encaisse|gagne))\b/
    const financePattern = /\b(depense|recette|revenu|transaction|paiement|loyer|salaire|vente|prestation|achat)\b/
    return actionPattern.test(n) && financePattern.test(n)
  }

  // ── Data-query intent detectors ────────────────────────────────────
  // Enhanced with client-friendly patterns and natural language variations

  const isCalendarQuery = (text: string): boolean => {
    const n = normText(text)
    // Core calendar terms
    const core = /\b(agenda|calendrier|planning|rdv|rendez.?vous|reunion|seance|evenement|semaine|journee|aujourd.?hui|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|apres.?midi|prochain.{0,10}(rdv|evenement|reunion)|creneau|dispo|disponible|planifie|planifier|programme|emploi du temps)\b/.test(n)
    // Exclude finance-related
    const exclude = /\b(facture|devis|recu|paiement|depense|revenu|transaction)\b/.test(n)
    return core && !exclude
  }

  const isEmailQuery = (text: string): boolean => {
    const n = normText(text)
    // Email terms including compose, send, reply patterns
    return /\b(email|mail|gmail|inbox|boite|non.?lu|unread|courrier|courriel|message.{0,15}(recu|envoye|nouveau)|envoie[r]?|redige[r]?|repond[r]?|relance[r]?|destinataire|expediteur|objet|piece jointe|annexe)\b/.test(n)
  }

  const isFinanceQuery = (text: string): boolean => {
    const n = normText(text)
    // Broadened to catch more natural finance questions
    return /\b(depense|revenu|solde|chiffre.?d.?affaires|ca|argent|budget|transaction|combien.{0,25}(depense|gagne|encaiss|coute)|combien.{0,15}(ai|j.?ai).{0,15}(depense|gagne)|analyse.{0,10}(finance|depens)|mes\s+finances|situation\s+financiere|benefice|marge|tresorerie|facture|devis|recu|bon de commande|livraison|paie|salaire|loyer|impot|taxe)\b/.test(n)
  }

  const isContactQuery = (text: string): boolean => {
    const n = normText(text)
    // Contact terms including search, find, add patterns
    return /\b(contact|carnet|annuaire|coordonnee|cherche.{0,20}(personne|nom|quelqu)|qui\s+est|liste.{0,10}contact|mes\s+contacts|trouve[r]?|recherche[r]?|ajoute[r]?|nouveau contact|nouvelle contact|telephone|mobile|portable|email contact)\b/.test(n)
  }

  const isDataRecapRequest = (text: string): boolean => {
    const n = normText(text)
    // Daily/weekly recap patterns
    return /\b(recap|recapitulatif|bilan\s+(complet|global|journalier|hebdo|de\s+(ma\s*)?journee|de\s*(la\s*)?semaine)|resume\s+(complet|de\s*(ma\s*)?journee|de\s*(la\s*)?semaine|global|de\s*tout)|vue.?d.?ensemble|fais.?le.?point|quoi\s+de\s+neuf|que\s+se\s+passe|donne.?moi.{0,15}(resume|recap|bilan)|rapport\s+(journalier|hebdo)|synthese|point de la journee|nouvelles)\b/.test(n)
  }

  // ── Client interaction helpers ────────────────────────────────────
  // Detect client-specific scenarios

  const isClientFollowUp = (text: string): boolean => {
    const n = normText(text)
    const followWords = /\b(relance|relancer|rappel|rappeler|suivi|follow.?up|check|verifie|verification|statut|avancement|nouvelles|retour|reponse|attend|attends|attendant)\b/
    const clientWords = /\b(client|prospect|partenaire|fournisseur|contact|dossier|projet|contrat|devis|opportunite|lead)\b/
    return followWords.test(n) && clientWords.test(n)
  }

  const isClientOnboarding = (text: string): boolean => {
    const n = normText(text)
    const onboardingWords = /\b(nouveau client|nouvelle cliente|onboarding|integration|bienvenue|kickoff|lancement|demarrage|premiere reunion|contrat signe|commence|debuter|accueillir|signer|signature)\b/
    return onboardingWords.test(n)
  }

  const isInvoiceRequest = (text: string): boolean => {
    const n = normText(text)
    return detectDocIntent(n) !== null || /\b(facture|devis|recu|proforma|bon de commande|bon de livraison|fiche de paie)\b/.test(n)
  }

  const handleTransactionFromChat = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Enregistrement de la transaction…', agent: 'FINANCE' })

    const result = await processFinanceCommand(text)
    if (result.success) {
      if (result.data) {
        await addTransaction(result.data)
        const label = result.data.type === 'income' ? 'Revenu' : 'Dépense'
        useChatStore.getState().addMessage({
          role: 'assistant',
          content: result.boubaMessage
            || `✅ **${label}** de **${formatCurrency(result.data.amount, currency)}** enregistré(e) !\n\n**Catégorie :** ${result.data.category}\n**Description :** ${result.data.description}\n**Date :** ${result.data.date}\n\nRetrouvez-la dans **Finance → Transactions**.`,
          agent: 'FINANCE',
          suggestions: ['Ajouter une autre transaction', 'Voir mes finances', 'Générer un rapport financier'],
        })
        toast.success(`${label} enregistré(e) : ${formatCurrency(result.data.amount, currency)}`)
      } else {
        useChatStore.getState().addMessage({
          role: 'assistant',
          content: result.boubaMessage
            || "Je n'ai pas pu extraire les données. Essaie : *\"Enregistre une dépense de 50 000 pour le loyer\"*.",
          agent: 'FINANCE',
        })
      }
    } else {
      useChatStore.getState().addMessage({
        role: 'assistant',
        content: `Désolé, je n'ai pas pu enregistrer cette transaction. ${result.error || ''}`,
        agent: 'FINANCE',
      })
    }
  }

  // ── Data-aware handlers ────────────────────────────────────────────
  const handleCalendarQueryFromChat = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Je consulte votre calendrier…', agent: 'CALENDAR', isStreaming: true })
    const result = await processNaturalLanguageCommand(text)
    const response = result.boubaMessage || result.error || "Je n'ai trouvé aucun événement correspondant dans votre calendrier."
    useChatStore.getState().finalizeLastMessage(response, ['Voir mon agenda', 'Ajouter un événement', 'Récap de la semaine'])
  }

  const handleEmailQueryFromChat = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Je consulte votre boîte mail…', agent: 'EMAIL', isStreaming: true })
    const today = new Date().toISOString().slice(0, 10)
    const inboxEmails = emails.filter(e => e.folder === 'inbox').slice(0, 20)
    const unreadCount = inboxEmails.filter(e => !e.read).length
    const emailContext = [
      '[DONNÉES EMAILS]',
      `Date actuelle : ${today}`,
      `Boîte de réception : ${inboxEmails.length} email(s), dont ${unreadCount} non lu(s)`,
      'Emails récents :',
      inboxEmails.slice(0, 15).map(e =>
        `- [${e.read ? 'lu' : 'NON LU'}${e.isUrgent ? ' URGENT' : ''}] "${e.subject}" — De: ${e.from} — ${e.date}`
      ).join('\n') || '  Aucun email en boîte de réception (synchronisez vos emails dans la page Email)',
    ].join('\n')
    const result = await callBouba(text, emailContext)
    const response = result.success ? result.output : (result.error || "Je n'ai pas pu consulter vos emails.")
    useChatStore.getState().finalizeLastMessage(response, ['Voir mes emails', 'Emails non lus', 'Rédiger un email'])
  }

  const handleContactQueryFromChat = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Je consulte vos contacts…', agent: 'CONTACT', isStreaming: true })
    const contactContext = [
      '[DONNÉES CONTACTS]',
      `Nombre total de contacts : ${contacts.length}`,
      contacts.length > 0 ? 'Liste des contacts :' : 'Aucun contact enregistré.',
      contacts.slice(0, 30).map(c =>
        `- ${c.name}${c.company ? ` (${c.company})` : ''}${c.position ? ` — ${c.position}` : ''} — ${c.email || 'pas d\'email'}${c.phone ? ` | ${c.phone}` : ''}`
      ).join('\n'),
    ].join('\n')
    const result = await callBouba(text, contactContext)
    const response = result.success ? result.output : (result.error || "Je n'ai pas pu consulter vos contacts.")
    useChatStore.getState().finalizeLastMessage(response, ['Voir mes contacts', 'Ajouter un contact'])
  }

  const handleFinanceQueryFromChat = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Analyse de vos finances en cours…', agent: 'FINANCE', isStreaming: true })
    const response = await analyzeFinances(text)
    useChatStore.getState().finalizeLastMessage(response, ['Générer un rapport', 'Voir mes transactions', 'Ajouter une dépense'])
  }

  const handleFullRecapFromChat = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Je prépare votre récapitulatif complet…', isStreaming: true })

    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10)
    // Week: Monday to Sunday
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const todayEvents = calendarEvents.filter(e => e.start.startsWith(todayISO))
    const weekEvents = calendarEvents.filter(e => { const d = new Date(e.start); return d >= weekStart && d <= weekEnd })
    const inboxEmails = emails.filter(e => e.folder === 'inbox')
    const unreadEmails = inboxEmails.filter(e => !e.read)
    const income = financeTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = financeTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const fullContext = [
      `[RÉCAPITULATIF COMPLET — ${today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}]`,
      '',
      '📅 CALENDRIER',
      `Événements aujourd'hui (${todayISO}) : ${todayEvents.length}`,
      todayEvents.length > 0
        ? todayEvents.map(e => `  - "${e.title}" à ${new Date(e.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${e.location ? ` @ ${e.location}` : ''}`).join('\n')
        : "  Aucun événement aujourd'hui",
      `Événements cette semaine : ${weekEvents.length}`,
      weekEvents.slice(0, 8).map(e => `  - "${e.title}" le ${e.start.slice(0, 10)} à ${new Date(e.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`).join('\n'),
      '',
      '📧 EMAILS',
      `Emails non lus : ${unreadEmails.length} (sur ${inboxEmails.length} en boîte de réception)`,
      unreadEmails.slice(0, 5).map(e => `  - "${e.subject}" — De: ${e.from} (${e.date})`).join('\n') || '  Aucun email non lu',
      '',
      '💰 FINANCES',
      `Revenus enregistrés : ${income.toLocaleString('fr-FR')}`,
      `Dépenses enregistrées : ${expense.toLocaleString('fr-FR')}`,
      `Solde net : ${(income - expense).toLocaleString('fr-FR')}`,
      financeTransactions.slice(0, 5).map(t => `  - ${t.type === 'income' ? '+' : '-'}${t.amount} ${t.category} (${t.date})`).join('\n'),
      '',
      '👤 CONTACTS',
      `Nombre de contacts enregistrés : ${contacts.length}`,
    ].join('\n')

    const result = await callBouba(text, fullContext)
    const response = result.success ? result.output : (result.error || "Je n'ai pas pu préparer votre récapitulatif.")
    useChatStore.getState().finalizeLastMessage(response, ['Voir mon agenda', 'Voir mes emails', 'Rapport financier'])
  }

  // ── Client follow-up helper ─────────────────────────────────────
  const handleClientFollowUp = async (text: string) => {
    if (!currentSessionId) {
      try { await createNewSession() } catch { toast.error('Erreur lors de la création de la conversation'); return }
    }
    useChatStore.getState().addMessage({ role: 'user', content: text })
    useChatStore.getState().addMessage({ role: 'assistant', content: '⏳ Je prépare ta relance client…', agent: 'GENERAL', isStreaming: true })

    const contactContext = [
      '[CONTEXTE CLIENT]',
      `Contacts disponibles: ${contacts.length}`,
      contacts.slice(0, 20).map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''} — ${c.email || c.phone}`).join('\n'),
    ].join('\n')

    const result = await callBouba(
      text + "\n\nGénère un template de message de relance professionnel et chaleureux.",
      contactContext
    )
    const response = result.success ? result.output : (result.error || "Je n'ai pas pu préparer ta relance.")
    useChatStore.getState().finalizeLastMessage(response, ['Envoyer par email', 'Voir le contact', 'Autre relance'])
  }

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

    // Client follow-up (relance, suivi client)
    if (isClientFollowUp(input)) {
      setInput('')
      handleClientFollowUp(input)
      return
    }

    // Client onboarding (nouveau client, kickoff)
    if (isClientOnboarding(input)) {
      setInput('')
      handleFullRecapFromChat(input) // Use recap as base for onboarding
      return
    }

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

    if (detectTransactionIntent(input)) {
      const cmd = input
      setInput('')
      handleTransactionFromChat(cmd)
      return
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

    // Client follow-up
    if (isClientFollowUp(action.prompt)) {
      handleClientFollowUp(action.prompt)
      return
    }

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

  // Callback stable : ne casse pas le memo des MessageBubble à chaque frappe
  const handleSuggestionClick = useCallback((s: string) => { sendMessage(s) }, [sendMessage])

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
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-gray-50 to-violet-50/30 relative overflow-hidden">

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
              <div className="p-4 border-b border-gray-100/80 bg-gradient-to-r from-white to-slate-50/60 flex items-center justify-between">
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
                        ? "bg-gradient-to-r from-primary/8 to-violet-500/5 border border-primary/15"
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
        <div className="px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100/80 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] sticky top-0 z-10">
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
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white" />
                </span>
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm leading-tight truncate max-w-[180px]">
                  {currentSession?.title || 'Nouvelle conversation'}
                </h2>
                {activeAgent ? (
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">
                    {activeAgent} agent actif…
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600 font-semibold">En ligne · Réponse instantanée</p>
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
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-violet-600/20 rounded-[2.5rem] blur-2xl" />
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-violet-600 rounded-3xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(108,62,244,0.4)] relative">
                  <Sparkles className="w-10 h-10" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white shadow-sm" />
                </span>
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
                      whileHover={{ scale: hasAccess && !isOverLimit ? 1.02 : 1, y: hasAccess && !isOverLimit ? -2 : 0 }}
                      whileTap={{ scale: hasAccess && !isOverLimit ? 0.97 : 1 }}
                      onClick={() => hasAccess ? handleQuickAction(action) : null}
                      disabled={!hasAccess || isOverLimit}
                      className={cn(
                        "p-3.5 border rounded-2xl text-left transition-all group relative bg-white overflow-hidden",
                        hasAccess && !isOverLimit
                          ? "border-gray-100 hover:border-transparent hover:shadow-lg cursor-pointer"
                          : "border-gray-100 cursor-not-allowed opacity-50"
                      )}
                    >
                      {hasAccess && !isOverLimit && (
                        <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${action.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
                      )}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className={cn(
                          "text-sm font-semibold leading-snug",
                          hasAccess && !isOverLimit
                            ? "text-gray-700 group-hover:text-gray-900"
                            : "text-gray-400"
                        )}>
                          {action.label}
                        </p>
                        {!hasAccess && <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-400 group-hover:text-gray-500 transition-colors">
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
                onSuggestionClick={handleSuggestionClick}
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
              <div className="bg-white border border-gray-100/80 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} className="w-2 h-2 bg-gradient-to-br from-primary to-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
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
            <div className="px-4 pt-2 bg-gradient-to-t from-slate-50/80 to-transparent">
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
        <div className="px-4 pb-4 pt-2 bg-gradient-to-t from-slate-50/80 to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "bg-white rounded-2xl border transition-all",
              isListening
                ? "border-red-300 ring-2 ring-red-100 shadow-[0_4px_16px_rgba(239,68,68,0.10)]"
                : "border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.07)] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-[0_4px_20px_rgba(108,62,244,0.10)]"
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
                      "p-2.5 rounded-xl transition-all",
                      input.trim() && !isLoading && !isOverLimit && !isGeneratingDoc
                        ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-[0_4px_12px_rgba(108,62,244,0.35)] hover:shadow-[0_6px_16px_rgba(108,62,244,0.40)] hover:scale-105 active:scale-95"
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
