import { useState, useCallback } from 'react'
import { useContactStore, Contact } from '@/src/stores/contactStore'
import { useBoubaAction } from './useBoubaAction'
import { toast } from 'sonner'

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useContactAI() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const addContact = useContactStore(state => state.addContact)
  const setContacts = useContactStore(state => state.setContacts)
  const { callBouba } = useBoubaAction()

  /**
   * Parse une commande texte pour extraire les données d'un contact.
   * Toujours exiger email OU téléphone + nom complet.
   */
  const processContactCommand = async (command: string) => {
    setIsProcessing(true)
    try {
      const prompt = `Analyse cette demande et extrais les informations d'un contact.
Commande : "${command}"
Réponds UNIQUEMENT en JSON avec : firstName (requis), lastName (requis), email, phone, company, position, tags (array string).
Si prénom ou nom manque, mets "Inconnu". Email OU téléphone obligatoire.`

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        body: JSON.stringify({ prompt, type: 'contact', responseMimeType: 'application/json' }),
      })
      const data = await res.json()
      const contactData = typeof data.data === 'string' ? JSON.parse(data.data) : (data.data || {})

      if ((contactData.email || contactData.phone) && contactData.firstName) {
        return {
          success: true,
          data: {
            name: `${contactData.firstName} ${contactData.lastName || ''}`.trim(),
            firstName: contactData.firstName,
            lastName: contactData.lastName || '',
            email: contactData.email || '',
            phone: contactData.phone || '',
            company: contactData.company || '',
            position: contactData.position || '',
            tags: contactData.tags || [],
            notes: `Ajouté via Bouba le ${new Date().toLocaleDateString('fr-FR')}`,
            groups: [],
            avatar: '',
          } as Omit<Contact, 'id'>,
        }
      }

      return { success: false, error: 'Nom + email ou téléphone requis pour créer un contact.' }
    } catch (err) {
      console.error('[ContactAI]', err)
      return { success: false, error: "Erreur lors de l'analyse." }
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Ajoute un contact via Bouba (Contact Agent → PostgreSQL).
   * Utilisé pour les commandes vocales ou texte comme :
   * "Ajoute Seydou Dianka, seydou@uahb.sn, UAHB"
   */
  const addContactViaBouba = useCallback(
    async (instruction: string): Promise<{ success: boolean; output: string; error?: string }> => {
      const result = await callBouba(
        instruction,
        '[ACTION REQUISE] Ajouter ou mettre à jour un contact dans la base de données. ' +
        "S'assurer que le contact a au moins un nom et un email ou un numéro de téléphone."
      )
      // Reload local store after Bouba's DB write
      if (result.success) {
        await useContactStore.getState().loadFromDB()
      }
      return result
    },
    [callBouba]
  )

  /**
   * Modifie un contact via Bouba.
   */
  const updateContactViaBouba = useCallback(
    async (instruction: string, contact: Contact): Promise<{ success: boolean; output: string; error?: string }> => {
      const context = [
        '[CONTACT À MODIFIER]',
        `Nom : ${contact.name}`,
        `Email : ${contact.email}`,
        `Téléphone : ${contact.phone}`,
        `Entreprise : ${contact.company}`,
        `Poste : ${contact.position}`,
      ].join('\n')
      const result = await callBouba(instruction, context)
      if (result.success) await useContactStore.getState().loadFromDB()
      return result
    },
    [callBouba]
  )

  /**
   * Supprime un contact via Bouba.
   */
  const deleteContactViaBouba = useCallback(
    async (contact: Contact): Promise<{ success: boolean; output: string; error?: string }> => {
      const result = await callBouba(
        `Supprime définitivement le contact "${contact.name}" (email: ${contact.email || 'N/A'}, tél: ${contact.phone || 'N/A'}) de la base de données.`,
        '[ACTION REQUISE] Suppression de contact. Confirme la suppression dans ta réponse.'
      )
      if (result.success) await useContactStore.getState().loadFromDB()
      return result
    },
    [callBouba]
  )

  // Sync contacts from Google Contacts (People API)
  const syncGoogleContacts = useCallback(async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    setIsSyncing(true)
    try {
      const resp = await fetch('/api/google/contacts', { headers: getAuthHeaders() })
      const data = await resp.json()

      if (!resp.ok) {
        if (data.code === 'NOT_CONNECTED') {
          toast.warning('Google Contacts non connecté. Allez dans Paramètres > Connexions.')
          return { success: false, error: 'NOT_CONNECTED' }
        }
        if (data.code === 'TOKEN_EXPIRED') {
          toast.error('Session Google Contacts expirée. Reconnectez dans les paramètres.')
          return { success: false, error: 'TOKEN_EXPIRED' }
        }
        toast.error(data.error || 'Erreur synchronisation Contacts')
        return { success: false, error: data.error }
      }

      const googleContacts = (data.data || []).map((c: any) => ({
        name: c.name,
        first_name: c.name.split(' ')[0] || '',
        last_name: c.name.split(' ').slice(1).join(' ') || '',
        google_id: c.id || null,
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        position: c.role || '',
        avatar: c.avatar || null,
        tags: [],
        notes: 'Importé depuis Google Contacts',
        groups: [],
      }))

      const bulkRes = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contacts: googleContacts }),
      })
      const bulkData = await bulkRes.json()

      if (bulkData.success) {
        await useContactStore.getState().loadFromDB()
        toast.success(`${bulkData.upserted} contact(s) importé(s) depuis Google Contacts`)
        return { success: true, count: bulkData.upserted }
      }

      toast.success(`${googleContacts.length} contact(s) importé(s)`)
      return { success: true, count: googleContacts.length }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur réseau'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsSyncing(false)
    }
  }, [addContact, setContacts])

  return {
    processContactCommand,
    addContactViaBouba,
    updateContactViaBouba,
    deleteContactViaBouba,
    syncGoogleContacts,
    isProcessing,
    isSyncing,
  }
}
