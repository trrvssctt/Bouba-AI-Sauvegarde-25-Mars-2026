import { useState, useCallback } from 'react'
import { useAuth } from '@/src/hooks/useAuth'
import { toast } from 'sonner'

export interface GmailEmail {
  gmail_id: string
  thread_id: string
  from_email: string
  from_name: string
  to_email: string
  subject: string
  body: string
  snippet: string
  html_body?: string
  email_date: string
  read: boolean
  starred: boolean
  labels: string[]
  folder: string
  attachments: any[]
  in_reply_to?: string
  message_id?: string
  raw_headers: any
  is_urgent: boolean
}

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useGmailAPI() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch emails from real Gmail API via backend proxy
  const fetchGmailEmails = useCallback(async (
    folder: string = 'inbox',
    maxResults: number = 20
  ): Promise<{ emails: GmailEmail[]; error?: string; code?: string }> => {
    if (!user) return { emails: [], error: 'Non authentifié' }

    setIsLoading(true)
    try {
      const resp = await fetch(
        `/api/google/gmail/messages?folder=${folder}&maxResults=${maxResults}`,
        { headers: getAuthHeaders() }
      )

      const data = await resp.json()

      if (!resp.ok) {
        return { emails: [], error: data.error || 'Erreur Gmail API', code: data.code }
      }

      return { emails: data.data || [] }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur réseau'
      return { emails: [], error: message }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch full email content (with body)
  const fetchEmailContent = useCallback(async (
    gmailId: string
  ): Promise<{ email?: GmailEmail; error?: string }> => {
    if (!user) return { error: 'Non authentifié' }

    try {
      const resp = await fetch(
        `/api/google/gmail/messages/${gmailId}`,
        { headers: getAuthHeaders() }
      )
      const data = await resp.json()
      if (!resp.ok) return { error: data.error || 'Erreur Gmail API' }
      return { email: data.data }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erreur réseau' }
    }
  }, [user])

  // Send an email via Gmail API
  const sendEmail = useCallback(async (params: {
    to: string
    subject: string
    body: string
    replyToMessageId?: string
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' }

    try {
      const resp = await fetch(`/api/google/gmail/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
      })

      const data = await resp.json()

      if (!resp.ok) {
        if (data.code === 'NOT_CONNECTED') {
          toast.error('Gmail non connecté. Allez dans Paramètres > Connexions pour connecter Gmail.')
        } else {
          toast.error(data.error || 'Erreur lors de l\'envoi')
        }
        return { success: false, error: data.error }
      }

      toast.success('Email envoyé avec succès !')
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur réseau'
      toast.error(message)
      return { success: false, error: message }
    }
  }, [user])

  // Sync emails (fetch and return)
  const syncGmailEmails = useCallback(async (_connectionId: string) => {
    if (!user) throw new Error('User not authenticated')

    setIsSyncing(true)
    try {
      toast.info('Récupération des emails Gmail...')
      const { emails, error, code } = await fetchGmailEmails('inbox', 30)

      if (error) {
        if (code === 'NOT_CONNECTED') {
          toast.warning('Gmail non connecté. Connectez votre compte dans Paramètres > Connexions.')
        } else if (code === 'TOKEN_EXPIRED') {
          toast.error('Session Gmail expirée. Veuillez reconnecter Gmail dans les paramètres.')
        } else {
          toast.error(error)
        }
        return { success: false, count: 0 }
      }

      toast.success(`${emails.length} emails récupérés depuis Gmail`)
      return { success: true, count: emails.length, emails }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de synchronisation'
      toast.error(message)
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [user, fetchGmailEmails])

  return {
    isLoading,
    isSyncing,
    fetchGmailEmails,
    fetchEmailContent,
    sendEmail,
    syncGmailEmails,
  }
}
