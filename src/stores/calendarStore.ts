import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EventCategory = 'work' | 'personal' | 'meeting' | 'urgent'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
  description?: string
  category: EventCategory
  participants?: string[]
  meetingLink?: string
  isRecurring?: boolean
  recurrenceRule?: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(localStorage.getItem('auth_token')
    ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    : {})
})

function mapDbEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    start: e.start_at || e.start,
    end: e.end_at || e.end,
    location: e.location || undefined,
    description: e.description || undefined,
    category: (e.category || 'work') as EventCategory,
    participants: Array.isArray(e.participants) ? e.participants : (e.participants ? JSON.parse(e.participants) : []),
    meetingLink: e.meeting_link || undefined,
    isRecurring: e.is_recurring || false,
    recurrenceRule: e.recurrence_rule || undefined,
  }
}

interface CalendarState {
  events: CalendarEvent[]
  selectedEventId: string | null
  view: 'month' | 'week' | 'day'
  currentDate: string
  isLoading: boolean

  setEvents: (events: CalendarEvent[]) => void
  loadFromDB: () => Promise<void>
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  selectEvent: (id: string | null) => void
  setView: (view: 'month' | 'week' | 'day') => void
  setCurrentDate: (date: string) => void

  getEventsForDate: (date: Date) => CalendarEvent[]
  checkConflicts: (start: string, end: string, excludeId?: string) => CalendarEvent[]
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      selectedEventId: null,
      view: 'week',
      currentDate: new Date().toISOString(),
      isLoading: false,

      setEvents: (events) => set({ events }),

      loadFromDB: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/calendar/events', { headers: authHeaders() })
          if (!res.ok) return
          const data = await res.json()
          if (data.success) {
            set({ events: (data.data || []).map(mapDbEvent) })
          }
        } catch (err) {
          console.error('[CALENDAR] loadFromDB error:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      addEvent: async (event) => {
        const tempId = 'temp-' + Date.now()
        set((state) => ({ events: [...state.events, { ...event, id: tempId }] }))
        try {
          const res = await fetch('/api/calendar/events/local', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              title: event.title,
              start_at: event.start,
              end_at: event.end,
              location: event.location,
              description: event.description,
              category: event.category,
              participants: event.participants,
              meeting_link: event.meetingLink,
              is_recurring: event.isRecurring,
              recurrence_rule: event.recurrenceRule,
            })
          })
          const data = await res.json()
          if (data.success && data.data?.id) {
            set((state) => ({
              events: state.events.map(e => e.id === tempId ? mapDbEvent(data.data) : e)
            }))
          }
        } catch (err) {
          console.error('[CALENDAR] addEvent API error:', err)
        }
      },

      updateEvent: async (id, updates) => {
        set((state) => ({
          events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
        }))
        // Only update events that have a real UUID (not local temp or Google IDs)
        if (!id.startsWith('temp-')) {
          try {
            await fetch(`/api/calendar/events/${id}`, {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({
                title: updates.title,
                start_at: updates.start,
                end_at: updates.end,
                location: updates.location,
                description: updates.description,
                category: updates.category,
                participants: updates.participants,
                meeting_link: updates.meetingLink,
              })
            })
          } catch (err) {
            console.error('[CALENDAR] updateEvent API error:', err)
          }
        }
      },

      deleteEvent: async (id) => {
        set((state) => ({ events: state.events.filter(e => e.id !== id) }))
        if (!id.startsWith('temp-')) {
          try {
            await fetch(`/api/calendar/events/${id}`, { method: 'DELETE', headers: authHeaders() })
          } catch (err) {
            console.error('[CALENDAR] deleteEvent API error:', err)
          }
        }
      },

      selectEvent: (id) => set({ selectedEventId: id }),
      setView: (view) => set({ view }),
      setCurrentDate: (date) => set({ currentDate: date }),

      getEventsForDate: (date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        const nextDay = new Date(d)
        nextDay.setDate(d.getDate() + 1)
        return get().events.filter(e => {
          const start = new Date(e.start)
          return start >= d && start < nextDay
        })
      },

      checkConflicts: (start, end, excludeId) => {
        const s = new Date(start)
        const e = new Date(end)
        return get().events.filter(event => {
          if (event.id === excludeId) return false
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)
          return s < eventEnd && e > eventStart
        })
      },
    }),
    { name: 'bouba-calendar-storage-v2' }
  )
)
