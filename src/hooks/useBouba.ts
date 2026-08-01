import { useState, useCallback } from 'react'
import { useChatStore } from '@/src/stores/chatStore'
import { useAuth } from './useAuth'
import { useContactStore } from '@/src/stores/contactStore'
import { useEmailStore } from '@/src/stores/emailStore'
import { useNotificationStore } from '@/src/stores/notificationStore'
import {
  parseBoubaApiResponse,
  extractEmbeddedSuggestions,
  parseActionTokens,
  type BoubaAction,
} from '@/src/lib/boubaResponse'
import { toast } from 'sonner'

export function useBouba(source?: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const {
    addMessage,
    updateLastMessage,
    finalizeLastMessage,
    sessions,
    currentSessionId,
    updateSessionId,
  } = useChatStore()
  const { user, profile, incrementLocalUsage } = useAuth()

  const sendMessage = useCallback(async (chatInput: string) => {
    if (!chatInput.trim() || isLoading || !user) return

    setIsLoading(true)
    addMessage({ role: 'user', content: chatInput })
    addMessage({ role: 'assistant', content: '', isStreaming: true })

    // Timeout 60 s — Bouba a au plus 1 minute (le backend coupe à 50 s)
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), 60_000)

    try {
      const currentSession = sessions.find(s => s.id === currentSessionId)
      // 6 derniers messages : aligné avec le plafond backend (mission 1.6)
      const history = currentSession?.messages.slice(-6) || []

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
          source: source || 'direct',
          history: history.map(m => ({ role: m.role, content: m.content })),
        })
      })

      if (!response.ok) {
        if (response.status === 429) {
          finalizeLastMessage(
            '⚠️ **Limite de messages atteinte**\n\nVous avez utilisé tous vos messages pour ce mois. [Mettez à niveau votre plan](/settings/plan) pour continuer.',
            ['Voir les plans'],
            { isError: true }
          )
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Réponse déjà normalisée par le backend : on lit success + output, point.
      const data = parseBoubaApiResponse(await response.json())

      // Si le serveur a assigné un nouveau sessionId, renommer la session locale
      if (data.sessionId && data.sessionId !== currentSessionId) {
        updateSessionId(currentSessionId, data.sessionId)
      }

      setActiveAgent(data.agent ? data.agent.toUpperCase() : null)

      // Agent en échec → bulle d'erreur distincte, JAMAIS une réponse normale
      if (!data.success) {
        finalizeLastMessage(data.output, ['Réessayer'], { isError: true, agent: data.agent })
        return
      }

      // Suggestions embarquées dans le texte (---SUGGESTIONS--- tolérant)
      const embedded = extractEmbeddedSuggestions(data.output)
      let visibleText = embedded.visibleText
      const suggestions = data.suggestions.length > 0 ? data.suggestions : embedded.suggestions

      // Actions structurées renvoyées par le backend (mode démo notamment)
      if (data.actions.length > 0) {
        await executeBackendActions(data.actions)
      }

      // Balises [ACTION:...] dans le texte (tolérant : échec = toast, texte affiché quand même)
      const { cleanText, actions } = parseActionTokens(visibleText)
      if (actions.length > 0) {
        visibleText = cleanText
        await executeActions(actions)
      }

      finalizeLastMessage(visibleText || data.output, suggestions, { agent: data.agent })

      // Mettre à jour le quota localement (non admin)
      const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
      if (!isAdmin) incrementLocalUsage()

      // Notifier si l'utilisateur n'est pas sur le chat ou si l'onglet est masqué
      if (document.hidden || window.location.pathname !== '/dashboard') {
        const notifStore = useNotificationStore.getState()
        notifStore.incrementUnreadMessages()
        notifStore.notifyBoubaReply(visibleText || data.output)
      }

    } catch (error) {
      console.error('[CHAT] Error:', error)
      updateLastMessage('')

      let userMessage = 'Désolé, je rencontre une difficulté technique. Peux-tu réessayer ?'
      const errStr = error instanceof Error ? error.message : String(error)
      const isAbort = error instanceof Error && error.name === 'AbortError'

      if (isAbort) {
        // Timeout : message distinct de l'erreur serveur (mission 2.1)
        userMessage = '⏱️ **Bouba met trop de temps à répondre**\n\nLa requête a dépassé 60 secondes. Cela peut arriver lors d\'une tâche complexe. Réessaie dans quelques instants ou reformule ta demande.'
      } else if (errStr.includes('Failed to fetch') || errStr.includes('NetworkError')) {
        userMessage = '🌐 **Problème de connexion**\n\nVérifiez votre connexion internet et réessayez.'
      } else if (errStr.includes('404')) {
        userMessage = '⚠️ **Service indisponible**\n\nLe service est en cours de maintenance. Réessayez dans quelques minutes.'
      } else if (errStr.includes('500')) {
        userMessage = '🔧 **Erreur serveur**\n\nUne erreur est survenue côté serveur. Réessayez dans quelques instants.'
      }

      finalizeLastMessage(userMessage, ['Réessayer'], { isError: true })
    } finally {
      clearTimeout(timeoutHandle)
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, addMessage, updateLastMessage, finalizeLastMessage, sessions, currentSessionId, updateSessionId, user, source])

  /**
   * Actions structurées renvoyées par le backend (tableau actions)
   */
  const executeBackendActions = useCallback(async (actions: BoubaAction[]) => {
    for (const action of actions) {
      try {
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
      } catch (err) {
        console.warn('[CHAT] Action backend ignorée:', action.type, err)
      }
    }
  }, [])

  /**
   * Balises [ACTION:...] : CREATE_CONTACT, SEND_EMAIL.
   * Un échec d'action n'empêche jamais l'affichage de la réponse.
   */
  const executeActions = useCallback(async (
    actions: Array<{ type: string; params: Record<string, string> }>
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
          console.warn('[CHAT] CREATE_CONTACT échoué:', err)
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
          console.warn('[CHAT] SEND_EMAIL échoué:', err)
          toast.error("Erreur lors de l'envoi de l'email")
        }
      }
    }
  }, [])

  return { sendMessage, isLoading, activeAgent }
}
