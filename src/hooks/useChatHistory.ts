import { useState, useEffect } from 'react'
import { useChatStore, Session, Message } from '@/src/stores/chatStore'
import { useAuth } from './useAuth'

export interface ChatHistory {
  sessions: Session[]
  isLoading: boolean
  error: string | null
  loadSessions: () => Promise<void>
  loadSessionMessages: (sessionId: string) => Promise<Message[]>
  createNewSession: (title?: string) => Promise<string>
  deleteSession: (sessionId: string) => Promise<void>
}

export function useChatHistory(): ChatHistory {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { sessions, loadSessionsFromAPI } = useChatStore()

  // Charger toutes les sessions de l'utilisateur depuis l'API
  const loadSessions = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/chat/sessions/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        loadSessionsFromAPI(data.data)
      } else {
        throw new Error(data.error || 'Failed to load sessions')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      console.error('[CHAT HISTORY] Error loading sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les messages d'une session spécifique depuis l'API
  const loadSessionMessages = async (sessionId: string): Promise<Message[]> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${user.access_token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        // Convertir les messages API au format du store
        const messages: Message[] = data.data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          agent: msg.agent_type,
          suggestions: msg.suggestions || []
        }))
        return messages
      } else {
        throw new Error(data.error || 'Failed to load messages')
      }
    } catch (err) {
      console.error('[CHAT HISTORY] Error loading messages:', err)
      throw err
    }
  }

  // Créer une nouvelle session via l'API
  const createNewSession = async (title?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/chat/sessions/${user.id}/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token || ''}`
        },
        body: JSON.stringify({ title })
      })

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        // Recharger les sessions pour inclure la nouvelle
        await loadSessions()
        return data.sessionId
      } else {
        throw new Error(data.error || 'Failed to create session')
      }
    } catch (err) {
      console.error('[CHAT HISTORY] Error creating session:', err)
      throw err
    }
  }

  // Supprimer une session via l'API
  const deleteSession = async (sessionId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token || ''}`
        },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete session')
      }

      // Recharger les sessions après suppression
      await loadSessions()
    } catch (err) {
      console.error('[CHAT HISTORY] Error deleting session:', err)
      throw err
    }
  }

  // Charger automatiquement les sessions au montage si l'utilisateur est connecté
  useEffect(() => {
    if (user && sessions.length === 0) {
      loadSessions()
    }
  }, [user])

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    loadSessionMessages,
    createNewSession,
    deleteSession
  }
}