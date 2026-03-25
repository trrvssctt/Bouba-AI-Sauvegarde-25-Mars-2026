import { useState, useCallback } from 'react'
import { useChatStore } from '@/src/stores/chatStore'
import { useAuth } from './useAuth'
import { useContactStore } from '@/src/stores/contactStore'
import { useEmailStore } from '@/src/stores/emailStore'
import { useNotificationStore } from '@/src/stores/notificationStore'
import { toast } from 'sonner'

/**
 * Parse [ACTION:TYPE key="value" ...] tokens from AI response.
 * Returns the cleaned text (actions stripped) and list of action objects.
 */
function parseActions(text: string): { cleanText: string; actions: Array<{ type: string; params: Record<string, string> }> } {
  const actionRegex = /\[ACTION:(\w+)((?:\s+\w+="[^"]*")*)\]/g
  const actions: Array<{ type: string; params: Record<string, string> }> = []
  const cleanText = text.replace(actionRegex, (_match, type: string, paramsStr: string) => {
    const params: Record<string, string> = {}
    const paramRegex = /(\w+)="([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = paramRegex.exec(paramsStr)) !== null) {
      params[m[1]] = m[2]
    }
    actions.push({ type, params })
    return ''
  }).trim()
  return { cleanText, actions }
}

export function useBouba(source?: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const {
    addMessage,
    updateLastMessage,
    finalizeLastMessage,
    sessions,
    currentSessionId,
    setCurrentSessionId,
    updateSessionId,
  } = useChatStore()
  const { user, profile, incrementLocalUsage } = useAuth()

  const sendMessage = useCallback(async (chatInput: string) => {
    if (!chatInput.trim() || isLoading || !user) return

    setIsLoading(true)
    addMessage({ role: 'user', content: chatInput })
    addMessage({ role: 'assistant', content: '', isStreaming: true })

    // 60-second timeout — Bouba has at most 1 minute to respond
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), 60_000)

    try {
      const currentSession = sessions.find(s => s.id === currentSessionId)
      const history = currentSession?.messages.slice(-10) || []

      const isValidUUID = (id: string | null) => {
        if (!id) return false
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      }
      const finalSessionId = isValidUUID(currentSessionId) ? currentSessionId : null

      const response = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        credentials: 'include', // Send httpOnly auth cookie
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          sessionId: finalSessionId,
          conversation_id: finalSessionId,
          tokens_used: 0,
          source: source || 'dashboard',
          history: history.map(m => ({ role: m.role, content: m.content })),
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 429) {
          finalizeLastMessage(
            '⚠️ **Limite de messages atteinte**\n\nVous avez utilisé tous vos messages pour ce mois. [Mettez à niveau votre plan](/settings/plan) pour continuer.',
            ['Voir les plans']
          )
          return
        }

        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Erreur API')

      // If server assigned a new sessionId, rename local session to match
      if (data.sessionId && data.sessionId !== currentSessionId) {
        updateSessionId(currentSessionId, data.sessionId)
      }

      const responseData = data.data
      let fullResponse = ''
      let suggestions: string[] = []

      if (typeof responseData === 'string') {
        fullResponse = responseData
      } else {
        fullResponse = responseData?.output || responseData?.message || responseData?.text || responseData?.response || JSON.stringify(responseData)
        suggestions = responseData?.suggestions || []
      }

      // Detect active agent
      const agentName = responseData?.agent?.toUpperCase()
      if (agentName) {
        setActiveAgent(agentName)
      } else {
        const lower = fullResponse.toLowerCase()
        if (lower.includes('email') || lower.includes('mail')) setActiveAgent('EMAIL')
        else if (lower.includes('calendar') || lower.includes('rendez-vous')) setActiveAgent('CALENDAR')
        else if (lower.includes('contact')) setActiveAgent('CONTACT')
        else if (lower.includes('finance') || lower.includes('dépense')) setActiveAgent('FINANCE')
      }

      // Handle embedded suggestions
      let visibleText = fullResponse.trim()
      if (fullResponse.includes('---SUGGESTIONS---')) {
        const parts = fullResponse.split('---SUGGESTIONS---')
        visibleText = parts[0].trim()
        try {
          suggestions = JSON.parse(parts[1].trim())
        } catch {}
      }

      // Execute structured actions from backend (simulatedResponse.actions array)
      const backendActions: Array<{ type: string; payload?: any }> = responseData?.actions || []
      if (backendActions.length > 0) {
        await executeBackendActions(backendActions)
      }

      // Parse and execute [ACTION:...] tokens from response text
      const { cleanText, actions } = parseActions(visibleText)
      if (actions.length > 0) {
        visibleText = cleanText
        await executeActions(actions, chatInput)
      }

      finalizeLastMessage(visibleText || fullResponse.trim(), suggestions)

      // Mettre à jour le quota localement (non admin)
      const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
      if (!isAdmin) incrementLocalUsage()

      // Notify if user is away from chat or tab is hidden
      if (document.hidden || window.location.pathname !== '/dashboard') {
        const notifStore = useNotificationStore.getState()
        notifStore.incrementUnreadMessages()
        notifStore.notifyBoubaReply(visibleText || fullResponse.trim())
      }

    } catch (error) {
      console.error('[CHAT] Error:', error)
      updateLastMessage('')

      let userMessage = 'Désolé, je rencontre une difficulté technique. Peux-tu réessayer ?'
      const errStr = error instanceof Error ? error.message : String(error)
      const isAbort = error instanceof Error && error.name === 'AbortError'

      if (isAbort) {
        userMessage = '⏱️ **Bouba met trop de temps à répondre**\n\nLa requête a dépassé 60 secondes. Cela peut arriver lors d\'une tâche complexe. Réessaie dans quelques instants ou reformule ta demande.'
      } else if (errStr.includes('Failed to fetch') || errStr.includes('NetworkError')) {
        userMessage = '🌐 **Problème de connexion**\n\nVérifiez votre connexion internet et réessayez.'
      } else if (errStr.includes('404')) {
        userMessage = '⚠️ **Service indisponible**\n\nLe service est en cours de maintenance. Réessayez dans quelques minutes.'
      } else if (errStr.includes('500')) {
        userMessage = '🔧 **Erreur serveur**\n\nUne erreur est survenue côté serveur. Réessayez dans quelques instants.'
      }

      finalizeLastMessage(userMessage, ['Réessayer'])
    } finally {
      clearTimeout(timeoutHandle)
      setIsLoading(false)
      setActiveAgent(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, addMessage, updateLastMessage, finalizeLastMessage, sessions, currentSessionId, setCurrentSessionId, updateSessionId, user])

  /**
   * Execute structured actions returned directly from backend (actions array)
   */
  const executeBackendActions = useCallback(async (actions: Array<{ type: string; payload?: any }>) => {
    for (const action of actions) {
      if (action.type === 'RELOAD_CONTACTS') {
        useContactStore.getState().loadFromDB()
      }
      if (action.type === 'NAVIGATE' && action.payload) {
        // Soft navigate via history.pushState so the router picks it up
        window.history.pushState({}, '', action.payload)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
      if (action.type === 'OPEN_COMPOSE' && action.payload) {
        // Emit custom event that EmailPage can listen to
        window.dispatchEvent(new CustomEvent('bouba:compose', { detail: action.payload }))
      }
    }
  }, [])

  /**
   * Execute parsed actions: CREATE_CONTACT, SEND_EMAIL
   */
  const executeActions = useCallback(async (
    actions: Array<{ type: string; params: Record<string, string> }>,
    _originalInput: string
  ) => {
    for (const action of actions) {
      if (action.type === 'CREATE_CONTACT') {
        const { name, email, phone, company, position } = action.params
        if (!email && !phone) {
          toast.warning("Contact non créé : email ou téléphone requis")
          continue
        }
        const firstName = name?.split(' ')[0] || ''
        const lastName = name?.split(' ').slice(1).join(' ') || ''
        try {
          useContactStore.getState().addContact({
            name: name || email || phone,
            firstName,
            lastName,
            email: email || '',
            phone: phone || '',
            company: company || '',
            position: position || '',
            tags: [],
            notes: '',
            groups: [],
            avatar: '',
          })
          toast.success(`Contact "${name || email}" créé par Bouba`)
        } catch (err) {
          toast.error("Échec création contact")
        }
      }

      if (action.type === 'SEND_EMAIL') {
        const { to, subject, body } = action.params
        if (!to || !subject) {
          toast.warning("Email non envoyé : destinataire et sujet requis")
          continue
        }
        try {
          const result = await useEmailStore.getState().sendEmail({ to, subject, body: body || '' })
          if (result.success) {
            toast.success(`Email envoyé à ${to}`)
          } else {
            toast.error(result.error || "Échec envoi email")
          }
        } catch (err) {
          toast.error("Erreur lors de l'envoi de l'email")
        }
      }
    }
  }, [])

  return { sendMessage, isLoading, activeAgent }
}
