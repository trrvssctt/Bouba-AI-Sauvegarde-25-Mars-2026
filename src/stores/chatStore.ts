import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  agent?: string
  isStreaming?: boolean
  suggestions?: string[]
  feedback?: 'up' | 'down'
  /** true = message d'erreur (agent en échec) — affiché en bulle erreur, jamais comme réponse normale */
  isError?: boolean
}

export interface Session {
  id: string
  title: string
  lastUpdate: Date
  messages: Message[]
}

function getAuthHeaders() {
  const token = localStorage.getItem('bouba_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getStoredUserId(): string {
  const token = localStorage.getItem('bouba_auth_token')
  if (!token) return 'demo-user'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || payload.userId || payload.id || 'demo-user'
  } catch {
    return 'demo-user'
  }
}

interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateLastMessage: (content: string) => void
  finalizeLastMessage: (content: string, suggestions?: string[], meta?: { isError?: boolean; agent?: string }) => void
  setFeedback: (messageId: string, feedback: 'up' | 'down') => void
  clearMessages: () => void
  createNewSession: () => Promise<void>
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<void>
  setCurrentSessionId: (sessionId: string) => void
  updateSessionId: (oldId: string | null, newId: string) => void
  updateSessionFromAPI: (sessionId: string, title?: string) => void
  loadSessionsFromAPI: (sessions: any[]) => void
  syncWithAPI: () => Promise<void>
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createNewSession: async () => {
        const userId = getStoredUserId()

        try {
          const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId, title: 'Nouvelle conversation' }),
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              const newSession: Session = {
                id: result.conversation.id,
                title: result.conversation.title,
                lastUpdate: new Date(),
                messages: [],
              }
              set((state) => ({
                sessions: [newSession, ...state.sessions],
                currentSessionId: newSession.id,
              }))
              return
            }
          }
        } catch (error) {
          console.error('[CHAT] Erreur création conversation API:', error)
        }

        // Fallback local
        const newSession: Session = {
          id: crypto.randomUUID(),
          title: 'Nouvelle conversation',
          lastUpdate: new Date(),
          messages: [],
        }
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        }))
      },

      switchSession: (sessionId) => set({ currentSessionId: sessionId }),

      deleteSession: async (sessionId) => {
        const userId = getStoredUserId()

        try {
          await fetch(`/api/conversations/${sessionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId }),
          })
        } catch (error) {
          console.error('[CHAT] Erreur suppression conversation API:', error)
        }

        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId)
          const newCurrentId =
            state.currentSessionId === sessionId
              ? newSessions.length > 0 ? newSessions[0].id : null
              : state.currentSessionId
          return { sessions: newSessions, currentSessionId: newCurrentId }
        })
      },

      renameSession: async (sessionId, title) => {
        const userId = getStoredUserId()

        try {
          await fetch(`/api/conversations/${sessionId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, userId }),
          })
        } catch (error) {
          console.error('[CHAT] Erreur renommage conversation API:', error)
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title } : s
          ),
        }))
      },

      addMessage: (message) =>
        set((state) => {
          let currentId = state.currentSessionId
          let sessions = [...state.sessions]

          if (!currentId) {
            const newSession: Session = {
              id: crypto.randomUUID(),
              title:
                message.content.slice(0, 30) +
                (message.content.length > 30 ? '...' : ''),
              lastUpdate: new Date(),
              messages: [],
            }
            sessions = [newSession, ...sessions]
            currentId = newSession.id
          }

          const newMessage: Message = {
            ...message,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
          }

          const updatedSessions = sessions.map((s) => {
            if (s.id === currentId) {
              const isFirstMessage = s.messages.length === 0
              return {
                ...s,
                title:
                  isFirstMessage && message.role === 'user'
                    ? message.content.slice(0, 30) +
                      (message.content.length > 30 ? '...' : '')
                    : s.title,
                lastUpdate: new Date(),
                messages: [...s.messages, newMessage],
              }
            }
            return s
          })

          return { sessions: updatedSessions, currentSessionId: currentId }
        }),

      updateLastMessage: (content) =>
        set((state) => {
          const updatedSessions = state.sessions.map((s) => {
            if (s.id === state.currentSessionId) {
              const newMessages = [...s.messages]
              if (newMessages.length > 0) {
                newMessages[newMessages.length - 1].content = content
              }
              return { ...s, messages: newMessages }
            }
            return s
          })
          return { sessions: updatedSessions }
        }),

      finalizeLastMessage: (content, suggestions, meta) =>
        set((state) => {
          const updatedSessions = state.sessions.map((s) => {
            if (s.id === state.currentSessionId) {
              const newMessages = [...s.messages]
              if (newMessages.length > 0) {
                const last = newMessages[newMessages.length - 1]
                last.content = content
                last.isStreaming = false
                last.suggestions = suggestions
                last.isError = meta?.isError || false
                if (meta?.agent) last.agent = meta.agent
              }
              return { ...s, messages: newMessages }
            }
            return s
          })
          return { sessions: updatedSessions }
        }),

      setFeedback: (messageId, feedback) => {
        // Persister le retour côté serveur (satisfaction admin) — fire-and-forget
        const state = get()
        const session = state.sessions.find(s => s.id === state.currentSessionId)
        const msg = session?.messages.find(m => m.id === messageId)
        if (msg && msg.feedback !== feedback) {
          fetch('/api/feedback', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
              rating: feedback,
              agent: msg.agent || 'general',
              excerpt: (msg.content || '').slice(0, 300),
            }),
          }).catch(() => { /* non bloquant */ })
        }
        set((state) => {
          const updatedSessions = state.sessions.map((s) => {
            if (s.id === state.currentSessionId) {
              const newMessages = s.messages.map((m) =>
                m.id === messageId ? { ...m, feedback } : m
              )
              return { ...s, messages: newMessages }
            }
            return s
          })
          return { sessions: updatedSessions }
        })
      },

      clearMessages: () =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === state.currentSessionId ? { ...s, messages: [] } : s
          ),
        })),

      setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),

      // Rename local session ID to match server-assigned ID (prevents session mismatch)
      updateSessionId: (oldId, newId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === oldId ? { ...s, id: newId } : s
          ),
          currentSessionId:
            state.currentSessionId === oldId ? newId : state.currentSessionId,
        })),

      updateSessionFromAPI: (sessionId, title) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, title: title || s.title, lastUpdate: new Date() }
              : s
          ),
        })),

      loadSessionsFromAPI: (apiSessions) =>
        set((state) => {
          // Map locale pour préserver les messages déjà chargés
          const localById = new Map(state.sessions.map((s) => [s.id, s]))

          const merged: Session[] = apiSessions.map((s) => {
            const local = localById.get(s.id)
            return {
              id: s.id,
              title: s.title || 'Conversation',
              lastUpdate: new Date(s.updated_at || s.created_at),
              messages: local?.messages ?? [],
            }
          })

          merged.sort(
            (a, b) =>
              new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
          )

          // Si le currentSessionId ne figure plus dans les sessions serveur, prendre la première
          const validCurrentId =
            merged.some((s) => s.id === state.currentSessionId)
              ? state.currentSessionId
              : merged.length > 0 ? merged[0].id : null

          return { sessions: merged, currentSessionId: validCurrentId }
        }),

      syncWithAPI: async () => {
        const userId = getStoredUserId()

        try {
          const response = await fetch(
            `/api/conversations?userId=${userId}`,
            { headers: getAuthHeaders() }
          )

          if (response.ok) {
            const result = await response.json()
            if (result.success && Array.isArray(result.conversations)) {
              // Only add sessions we don't already have locally
              get().loadSessionsFromAPI(result.conversations)
            }
          }
        } catch (error) {
          console.error('[CHAT] Erreur synchronisation conversations:', error)
        }
      },
    }),
    { name: 'bouba-chat-storage-v3' }
  )
)
