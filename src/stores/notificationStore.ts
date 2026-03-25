import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppNotification {
  id: string
  type: string
  subject: string | null
  body: string
  isRead: boolean
  sentAt: string
}

interface NotificationState {
  unreadEmails: number
  unreadMessages: number
  unreadAppNotifications: number
  appNotifications: AppNotification[]
  browserPermission: NotificationPermission
  knownEmailIds: string[]
  knownNotifIds: string[]

  setUnreadEmails: (count: number) => void
  clearUnreadEmails: () => void
  incrementUnreadMessages: () => void
  clearUnreadMessages: () => void
  setBrowserPermission: (p: NotificationPermission) => void
  requestPermission: () => Promise<void>
  showNotification: (title: string, body: string) => void
  notifyNewEmail: (from: string, subject: string) => void
  notifyBoubaReply: (preview: string) => void
  detectNewEmails: (
    emails: Array<{ id: string; from: string; subject: string; read: boolean; folder: string }>
  ) => void
  fetchAppNotifications: () => Promise<void>
  markAppNotificationRead: (id: string) => Promise<void>
  markAllAppNotificationsRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      unreadEmails: 0,
      unreadMessages: 0,
      unreadAppNotifications: 0,
      appNotifications: [],
      browserPermission: 'default',
      knownEmailIds: [],
      knownNotifIds: [],

      setUnreadEmails: (count) => set({ unreadEmails: count }),

      clearUnreadEmails: () => set({ unreadEmails: 0 }),

      incrementUnreadMessages: () =>
        set((s) => ({ unreadMessages: s.unreadMessages + 1 })),

      clearUnreadMessages: () => set({ unreadMessages: 0 }),

      setBrowserPermission: (p) => set({ browserPermission: p }),

      requestPermission: async () => {
        if (!('Notification' in window)) return
        if (Notification.permission === 'granted') {
          set({ browserPermission: 'granted' })
          return
        }
        if (Notification.permission !== 'denied') {
          const result = await Notification.requestPermission()
          set({ browserPermission: result })
        }
      },

      showNotification: (title, body) => {
        if (Notification.permission !== 'granted') return
        try {
          const n = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'bouba-notification',
          })
          n.onclick = () => {
            window.focus()
            n.close()
          }
        } catch {
          // silently fail if browser blocks
        }
      },

      notifyNewEmail: (from, subject) => {
        const { showNotification } = get()
        showNotification(`📧 Nouvel email — ${from}`, subject)
      },

      notifyBoubaReply: (preview) => {
        const { showNotification } = get()
        showNotification('💬 Bouba a répondu', preview.replace(/[#*`]/g, '').slice(0, 120))
      },

      fetchAppNotifications: async () => {
        try {
          const res = await fetch('/api/notifications', { credentials: 'include' })
          if (!res.ok) return
          const data = await res.json()
          if (!data.success) return

          const notifs: AppNotification[] = data.data
          const { knownNotifIds, showNotification } = get()

          const newNotifs = notifs.filter(
            (n) => !n.isRead && !knownNotifIds.includes(n.id)
          )

          // Browser notification for each new app notification (max 3)
          newNotifs.slice(0, 3).forEach((n) => {
            showNotification(
              '🔔 Bouba\'ia',
              n.subject ? `${n.subject}: ${n.body.slice(0, 80)}` : n.body.slice(0, 120)
            )
          })

          const unread = notifs.filter((n) => !n.isRead).length
          set({
            appNotifications: notifs,
            unreadAppNotifications: unread,
            knownNotifIds: notifs.map((n) => n.id),
          })
        } catch {
          // silently fail
        }
      },

      markAppNotificationRead: async (id: string) => {
        try {
          await fetch(`/api/notifications/${id}/read`, {
            method: 'POST',
            credentials: 'include',
          })
          set((s) => ({
            appNotifications: s.appNotifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
            unreadAppNotifications: Math.max(0, s.unreadAppNotifications - 1),
          }))
        } catch {
          // silently fail
        }
      },

      markAllAppNotificationsRead: async () => {
        try {
          await fetch('/api/notifications/read-all', {
            method: 'POST',
            credentials: 'include',
          })
          set((s) => ({
            appNotifications: s.appNotifications.map((n) => ({ ...n, isRead: true })),
            unreadAppNotifications: 0,
          }))
        } catch {
          // silently fail
        }
      },

      detectNewEmails: (emails) => {
        const { knownEmailIds, notifyNewEmail } = get()

        // Filter inbox unread emails only
        const inboxUnread = emails.filter((e) => e.folder === 'inbox' && !e.read)
        const newUnread = inboxUnread.filter((e) => !knownEmailIds.includes(e.id))

        // Update known IDs to all current email IDs
        const allIds = emails.map((e) => e.id)
        set({ knownEmailIds: allIds })

        if (newUnread.length === 0) {
          // Just update count from current unread
          set({ unreadEmails: inboxUnread.length })
          return
        }

        // Notify for each new unread (max 3 notifications)
        newUnread.slice(0, 3).forEach((e) => {
          notifyNewEmail(e.from, e.subject)
        })

        set({ unreadEmails: inboxUnread.length })
      },
    }),
    {
      name: 'bouba-notifications-v1',
      partialize: (s) => ({
        browserPermission: s.browserPermission,
        knownEmailIds: s.knownEmailIds,
        knownNotifIds: s.knownNotifIds,
        // Don't persist counts or notification lists — recomputed on load
      }),
    }
  )
)
