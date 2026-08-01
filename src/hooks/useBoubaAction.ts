import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useChatStore } from '@/src/stores/chatStore'
import { parseBoubaApiResponse, capContext } from '@/src/lib/boubaResponse'

export interface BoubaActionResult {
  success: boolean
  output: string
  agent?: string
  raw?: any
  error?: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

/**
 * Shared hook for calling Bouba's n8n workflow from any page.
 * Does NOT create a chat session — results stay page-local.
 * Always sends userId + conversation_id in every request.
 *
 * États exposés : isLoading, error, lastAgent (mission 2.2).
 */
export function useBoubaAction() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAgent, setLastAgent] = useState<string | null>(null)
  const { user } = useAuth()

  const callBouba = useCallback(
    async (message: string, context?: string): Promise<BoubaActionResult> => {
      if (!user) return { success: false, output: '', error: 'Non authentifié' }
      setIsLoading(true)
      setError(null)
      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => controller.abort(), 60_000)
      try {
        const conversationId = useChatStore.getState().currentSessionId ?? null
        const res = await fetch('/api/bouba/action', {
          method: 'POST',
          signal: controller.signal,
          headers: authHeaders(),
          body: JSON.stringify({
            message,
            // Tronqué à 4000 caractères (défense en profondeur — le backend tronque aussi)
            context: capContext(context),
            userId: user.id,
            conversation_id: conversationId,
            tokens_used: 0,
          }),
        })

        if (res.status === 429) {
          const data = await res.json().catch(() => ({} as any))
          const quotaError = `Quota atteint (${data.used ?? '?'}/${data.limit ?? '?'} messages). Mettez à niveau votre plan.`
          setError(quotaError)
          return { success: false, output: '', error: quotaError }
        }

        // Réponse déjà normalisée par le backend : success + output, point.
        const data = parseBoubaApiResponse(await res.json().catch(() => null))
        setLastAgent(data.agent)

        if (!res.ok || !data.success) {
          const errMsg = data.output || 'Erreur Bouba'
          setError(errMsg)
          return { success: false, output: '', agent: data.agent, error: errMsg }
        }

        return { success: true, output: data.output, agent: data.agent, raw: data.raw }
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError'
        const errMsg = isAbort
          ? 'Bouba a mis trop de temps à répondre (> 60s). Réessaie dans un instant.'
          : 'Erreur réseau'
        setError(errMsg)
        return { success: false, output: '', error: errMsg }
      } finally {
        clearTimeout(timeoutHandle)
        setIsLoading(false)
      }
    },
    [user]
  )

  return { callBouba, isLoading, error, lastAgent }
}
