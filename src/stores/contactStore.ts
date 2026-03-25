import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Contact {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  position: string
  avatar?: string
  tags: string[]
  notes: string
  lastInteraction?: string
  groups: string[]
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(localStorage.getItem('auth_token')
    ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    : {})
})

function mapDbContact(c: any): Contact {
  return {
    id: c.id,
    name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    firstName: c.first_name || c.name?.split(' ')[0] || '',
    lastName: c.last_name || c.name?.split(' ').slice(1).join(' ') || '',
    email: c.email || '',
    phone: c.phone || '',
    company: c.company || '',
    position: c.position || '',
    avatar: c.avatar || undefined,
    tags: c.tags || [],
    notes: c.notes || '',
    groups: c.groups || [],
  }
}

interface ContactState {
  contacts: Contact[]
  selectedContactId: string | null
  searchQuery: string
  activeGroup: string | null
  isLoading: boolean

  setContacts: (contacts: Contact[]) => void
  loadFromDB: () => Promise<void>
  addContact: (contact: Omit<Contact, 'id'>) => Promise<void>
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  selectContact: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setActiveGroup: (group: string | null) => void
  addTag: (id: string, tag: string) => Promise<void>
  removeTag: (id: string, tag: string) => Promise<void>
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: [],
      selectedContactId: null,
      searchQuery: '',
      activeGroup: null,
      isLoading: false,

      setContacts: (contacts) => set({ contacts }),

      loadFromDB: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/contacts', { headers: authHeaders() })
          if (!res.ok) return
          const data = await res.json()
          if (data.success) {
            set({ contacts: (data.data || []).map(mapDbContact) })
          }
        } catch (err) {
          console.error('[CONTACTS] loadFromDB error:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      addContact: async (contact) => {
        // Optimistic local insert with temp id
        const tempId = 'temp-' + Date.now()
        const tempContact: Contact = { ...contact, id: tempId }
        set((state) => ({ contacts: [tempContact, ...state.contacts] }))

        try {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              name: contact.name,
              first_name: contact.firstName,
              last_name: contact.lastName,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              position: contact.position,
              avatar: contact.avatar,
              notes: contact.notes,
              tags: contact.tags,
              groups: contact.groups,
            })
          })
          const data = await res.json()
          if (data.success && data.data?.id) {
            // Replace temp id with real DB id
            set((state) => ({
              contacts: state.contacts.map(c => c.id === tempId ? mapDbContact(data.data) : c)
            }))
          }
        } catch (err) {
          console.error('[CONTACTS] addContact API error:', err)
        }
      },

      updateContact: async (id, updates) => {
        // Optimistic update
        set((state) => ({
          contacts: state.contacts.map(c => c.id === id ? { ...c, ...updates } : c)
        }))
        try {
          const contact = get().contacts.find(c => c.id === id)
          if (!contact) return
          await fetch(`/api/contacts/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({
              name: updates.name ?? contact.name,
              first_name: updates.firstName ?? contact.firstName,
              last_name: updates.lastName ?? contact.lastName,
              email: updates.email ?? contact.email,
              phone: updates.phone ?? contact.phone,
              company: updates.company ?? contact.company,
              position: updates.position ?? contact.position,
              avatar: updates.avatar ?? contact.avatar,
              notes: updates.notes ?? contact.notes,
              tags: updates.tags ?? contact.tags,
              groups: updates.groups ?? contact.groups,
            })
          })
        } catch (err) {
          console.error('[CONTACTS] updateContact API error:', err)
        }
      },

      deleteContact: async (id) => {
        set((state) => ({ contacts: state.contacts.filter(c => c.id !== id) }))
        try {
          await fetch(`/api/contacts/${id}`, { method: 'DELETE', headers: authHeaders() })
        } catch (err) {
          console.error('[CONTACTS] deleteContact API error:', err)
        }
      },

      selectContact: (id) => set({ selectedContactId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveGroup: (group) => set({ activeGroup: group }),

      addTag: async (id, tag) => {
        const contact = get().contacts.find(c => c.id === id)
        if (!contact) return
        const newTags = [...new Set([...contact.tags, tag])]
        await get().updateContact(id, { tags: newTags })
      },

      removeTag: async (id, tag) => {
        const contact = get().contacts.find(c => c.id === id)
        if (!contact) return
        const newTags = contact.tags.filter(t => t !== tag)
        await get().updateContact(id, { tags: newTags })
      },
    }),
    { name: 'bouba-contact-storage-v2' }
  )
)
