// Service de synchronisation des données depuis les APIs OAuth connectées
import type { Email } from '@/src/stores/emailStore'
import type { Contact } from '@/src/stores/contactStore'

export interface SyncResult {
  success: boolean
  count?: number
  error?: string
  lastSync?: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
})

class DataSyncService {

  /**
   * Synchronise les emails Gmail via le proxy backend
   */
  async syncGmailEmails(maxResults: number = 50): Promise<SyncResult & { emails?: Email[] }> {
    try {
      const response = await fetch(
        `/api/google/gmail/messages?maxResults=${maxResults}&folder=inbox`,
        { headers: authHeaders() }
      )
      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'NOT_CONNECTED') {
          return { success: false, error: 'Gmail not connected' }
        }
        throw new Error(data.error || `API error: ${response.status}`)
      }

      const emails: Email[] = data.emails || []
      return { success: true, count: emails.length, emails, lastSync: new Date().toISOString() }
    } catch (error) {
      console.error('[SYNC] Gmail sync error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Synchronise les contacts Google via le proxy backend
   */
  async syncGoogleContacts(_maxResults: number = 100): Promise<SyncResult & { contacts?: Contact[] }> {
    try {
      const response = await fetch('/api/google/contacts', { headers: authHeaders() })
      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'NOT_CONNECTED') {
          return { success: false, error: 'Google Contacts not connected' }
        }
        throw new Error(data.error || `API error: ${response.status}`)
      }

      const contacts: Contact[] = data.contacts || []
      return { success: true, count: contacts.length, contacts, lastSync: new Date().toISOString() }
    } catch (error) {
      console.error('[SYNC] Google Contacts sync error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // These methods no longer use Supabase - return empty arrays as fallback
  async loadCachedEmails(): Promise<Email[]> {
    return []
  }

  async loadCachedContacts(): Promise<Contact[]> {
    return []
  }
}

export const dataSyncService = new DataSyncService()
export default dataSyncService
