import { useEffect, useRef } from 'react'
import { useEmailStore } from '@/src/stores/emailStore'
import { useNotificationStore } from '@/src/stores/notificationStore'

const EMAIL_POLL_MS = 2 * 60 * 1000   // 2 minutes
const NOTIF_POLL_MS = 60 * 1000       // 1 minute

/**
 * Sets up browser notification permission + email polling + app notification polling.
 * Mount this once in DashboardLayout.
 */
export function useNotificationSetup() {
  const { requestPermission, detectNewEmails, fetchAppNotifications } = useNotificationStore()
  const emailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkEmails = async () => {
    const store = useEmailStore.getState()
    await store.loadEmails('inbox')
    const emails = useEmailStore.getState().emails
    detectNewEmails(
      emails.map((e) => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        read: e.read,
        folder: e.folder,
      }))
    )
  }

  useEffect(() => {
    // Request browser notification permission on first mount
    requestPermission()

    // Initial checks
    checkEmails()
    fetchAppNotifications()

    // Poll emails every 2 minutes
    emailTimerRef.current = setInterval(checkEmails, EMAIL_POLL_MS)

    // Poll app notifications every minute
    notifTimerRef.current = setInterval(fetchAppNotifications, NOTIF_POLL_MS)

    return () => {
      if (emailTimerRef.current) clearInterval(emailTimerRef.current)
      if (notifTimerRef.current) clearInterval(notifTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
