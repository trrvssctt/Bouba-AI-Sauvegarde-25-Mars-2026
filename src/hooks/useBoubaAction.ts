import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useChatStore } from '@/src/stores/chatStore'

export interface BoubaActionResult {
  success: boolean
  output: string
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
 */
export function useBoubaAction() {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const callBouba = useCallback(
    async (message: string, context?: string): Promise<BoubaActionResult> => {
      if (!user) return { success: false, output: '', error: 'Non authentifié' }
      setIsLoading(true)
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
            context,
            userId: user.id,
            conversation_id: conversationId,
            tokens_used: 0,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          const error = res.status === 429
            ? `Quota atteint (${data.used}/${data.limit} messages). Mettez à niveau votre plan.`
            : data.error || 'Erreur Bouba'
          return { success: false, output: '', error }
        }
        return { success: true, output: data.output || '', raw: data.raw }
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError'
        return {
          success: false,
          output: '',
          error: isAbort
            ? 'Bouba a mis trop de temps à répondre (> 60s). Réessaie dans un instant.'
            : 'Erreur réseau',
        }
      } finally {
        clearTimeout(timeoutHandle)
        setIsLoading(false)
      }
    },
    [user]
  )

  return { callBouba, isLoading }
}
