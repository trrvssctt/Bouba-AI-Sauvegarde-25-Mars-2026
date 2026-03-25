import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Attachment {
  id: string
  name: string
  size: string
  type: string
  url: string
}

export interface Email {
  id: string
  from: string
  fromEmail: string
  to: string
  subject: string
  body: string
  htmlBody?: string
  snippet: string
  date: string
  timestamp: string
  read: boolean
  starred: boolean
  labels: string[]
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash'
  attachments?: Attachment[]
  summary?: string
  isUrgent?: boolean
  fullLoaded?: boolean
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(localStorage.getItem('auth_token')
    ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    : {}),
})

interface EmailState {
  emails: Email[]
  selectedEmailId: string | null
  searchQuery: string
  activeFolder: string
  activeLabel: string | null
  isLoading: boolean
  isSyncing: boolean
  lastSync: string | null
  syncError: string | null

  setEmails: (emails: Email[]) => void
  loadEmails: (folder?: string) => Promise<void>
  loadEmailDetail: (id: string) => Promise<void>
  refreshEmails: () => Promise<void>
  syncGmailEmails: (force?: boolean) => Promise<void>
  selectEmail: (id: string | null) => void
  toggleRead: (id: string) => void
  toggleStarred: (id: string) => void
  deleteEmail: (id: string) => void
  archiveEmail: (id: string) => void
  addLabel: (id: string, label: string) => void
  removeLabel: (id: string, label: string) => void
  setSearchQuery: (query: string) => void
  setActiveFolder: (folder: string) => void
  setActiveLabel: (label: string | null) => void
  addDraft: (draft: Partial<Email>) => void
  sendEmail: (email: Partial<Email> & { attachments?: { name: string; type: string; size: number; data: string }[] }) => Promise<{ success: boolean; error?: string }>
}

export const useEmailStore = create<EmailState>()(
  persist(
    (set, get) => ({
      emails: [],
      selectedEmailId: null,
      searchQuery: '',
      activeFolder: 'inbox',
      activeLabel: null,
      isLoading: false,
      isSyncing: false,
      lastSync: null,
      syncError: null,

      setEmails: (emails) => set({ emails }),

      loadEmails: async (folder?: string) => {
        const targetFolder = folder || get().activeFolder
        set({ isLoading: true, syncError: null })
        try {
          const res = await fetch(
            `/api/google/gmail/messages?maxResults=50&folder=${targetFolder}`,
            { headers: authHeaders() }
          )
          const data = await res.json()

          if (!res.ok) {
            if (data.code === 'NOT_CONNECTED') {
              set({ syncError: 'NOT_CONNECTED', isLoading: false })
              return
            }
            if (data.code === 'TOKEN_EXPIRED') {
              set({ syncError: 'TOKEN_EXPIRED', isLoading: false })
              return
            }
            console.error('[EMAIL] loadEmails error:', data.error)
            set({ syncError: data.error || 'Erreur chargement emails', isLoading: false })
            return
          }

          // Backend returns { success: true, data: GmailMessage[] }
          // Map backend field names to store Email interface
          const raw: any[] = data.data || data.emails || []
          const emails: Email[] = raw.map((m: any) => ({
            id: m.gmail_id || m.id || String(Math.random()),
            // from_name is display name, fallback to from_email if empty
            from: m.from_name || m.from_email || m.from || '(Expéditeur inconnu)',
            fromEmail: m.from_email || m.fromEmail || '',
            to: m.to_email || m.to || '',
            subject: m.subject || '(Sans objet)',
            body: m.body || m.snippet || '',
            htmlBody: m.html_body || undefined,
            snippet: m.snippet || '',
            date: m.email_date
              ? new Date(m.email_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
              : '',
            timestamp: m.email_date || m.timestamp || new Date().toISOString(),
            read: m.read ?? true,
            starred: m.starred ?? false,
            labels: m.labels || [],
            folder: (m.folder as Email['folder']) || 'inbox',
            attachments: m.attachments || [],
            isUrgent: m.is_urgent || m.isUrgent || false,
          }))
          set({ emails, lastSync: new Date().toISOString(), syncError: null })
        } catch (error) {
          console.error('[EMAIL] loadEmails network error:', error)
          set({ syncError: 'Erreur réseau' })
        } finally {
          set({ isLoading: false })
        }
      },

      loadEmailDetail: async (id: string) => {
        // Skip if already fully loaded
        const existing = get().emails.find(e => e.id === id)
        if (existing?.fullLoaded) return
        try {
          const res = await fetch(`/api/google/gmail/messages/${id}`, { headers: authHeaders() })
          if (!res.ok) return
          const data = await res.json()
          if (!data.success || !data.data) return
          const m = data.data
          set(state => ({
            emails: state.emails.map(e => e.id === id ? {
              ...e,
              htmlBody: m.html_body || e.htmlBody,
              body: m.body || e.body,
              attachments: m.attachments?.length ? m.attachments : e.attachments,
              fullLoaded: true,
            } : e)
          }))
        } catch {
          // silently fail — store keeps existing data
        }
      },

      syncGmailEmails: async (force = false) => {
        if (get().isSyncing && !force) return
        set({ isSyncing: true })
        await get().loadEmails(get().activeFolder)
        set({ isSyncing: false })
      },

      refreshEmails: async () => {
        await get().loadEmails(get().activeFolder)
      },

      selectEmail: (id) => set({ selectedEmailId: id }),

      toggleRead: (id) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, read: !e.read } : e
          ),
        })),

      toggleStarred: (id) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, starred: !e.starred } : e
          ),
        })),

      deleteEmail: (id) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, folder: 'trash' as const } : e
          ),
        })),

      archiveEmail: (id) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, folder: 'archive' as const } : e
          ),
        })),

      addLabel: (id, label) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, labels: [...new Set([...e.labels, label])] } : e
          ),
        })),

      removeLabel: (id, label) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, labels: e.labels.filter((l) => l !== label) } : e
          ),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setActiveFolder: async (folder) => {
        set({ activeFolder: folder, activeLabel: null })
        await get().loadEmails(folder)
      },

      setActiveLabel: (label) => set({ activeLabel: label, activeFolder: 'inbox' }),

      addDraft: (draft) =>
        set((state) => ({
          emails: [
            {
              id: Math.random().toString(36).substring(7),
              from: 'Moi',
              fromEmail: '',
              to: draft.to || '',
              subject: draft.subject || '(Sans objet)',
              body: draft.body || '',
              snippet: (draft.body || '').replace(/<[^>]*>/g, '').slice(0, 100),
              date: "À l'instant",
              timestamp: new Date().toISOString(),
              read: true,
              starred: false,
              labels: [],
              folder: 'drafts',
            },
            ...state.emails,
          ],
        })),

      sendEmail: async (email) => {
        try {
          const res = await fetch('/api/google/gmail/send', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              to: email.to,
              subject: email.subject,
              body: email.body,
              attachments: (email as any).attachments || [],
            }),
          })
          const data = await res.json()

          if (!res.ok) {
            return { success: false, error: data.error || 'Erreur envoi email' }
          }

          // Add optimistically to sent folder
          set((state) => ({
            emails: [
              {
                id: data.data?.id || Math.random().toString(36).substring(7),
                from: 'Moi',
                fromEmail: '',
                to: email.to || '',
                subject: email.subject || '(Sans objet)',
                body: email.body || '',
                snippet: (email.body || '').replace(/<[^>]*>/g, '').slice(0, 100),
                date: "À l'instant",
                timestamp: new Date().toISOString(),
                read: true,
                starred: false,
                labels: [],
                folder: 'sent',
              },
              ...state.emails,
            ],
          }))

          return { success: true }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Erreur réseau'
          return { success: false, error: msg }
        }
      },
    }),
    { name: 'bouba-email-storage-v2' }
  )
)
