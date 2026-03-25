import { useState, useCallback } from 'react'
import { CalendarEvent, useCalendarStore } from '@/src/stores/calendarStore'
import { useBoubaAction } from './useBoubaAction'
import { toast } from 'sonner'

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatEventsForContext(events: CalendarEvent[]): string {
  if (!events.length) return 'Aucun événement.'
  return events
    .slice(0, 20)
    .map(e => `- "${e.title}" le ${e.start}${e.end ? ` → ${e.end}` : ''}${e.location ? ` @ ${e.location}` : ''}`)
    .join('\n')
}

export function useCalendarAI() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { checkConflicts, setEvents, events } = useCalendarStore()
  const { callBouba } = useBoubaAction()

  /**
   * Traite une commande calendrier en langage naturel via Bouba.
   * Bouba détecte l'action (créer/modifier/supprimer/lister) et utilise
   * ses outils Google Calendar pour l'exécuter.
   */
  const processNaturalLanguageCommand = useCallback(
    async (command: string) => {
      setIsProcessing(true)
      try {
        const today = new Date().toISOString()
        const context = [
          `[CONTEXTE CALENDRIER]`,
          `Date et heure actuelles : ${today}`,
          `Événements à venir :`,
          formatEventsForContext(
            events.filter(e => new Date(e.start) >= new Date()).slice(0, 10)
          ),
        ].join('\n')

        const result = await callBouba(command, context)

        if (!result.success) {
          return { error: result.error || 'Impossible de traiter la commande.' }
        }

        // Try to parse JSON from Bouba's output (for create actions)
        const jsonMatch = result.output.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.action === 'create' && parsed.eventData) {
              const conflicts = checkConflicts(parsed.eventData.start, parsed.eventData.end)
              return { ...parsed, conflicts, boubaMessage: result.output }
            }
            return { ...parsed, boubaMessage: result.output }
          } catch { /* not JSON, return as text */ }
        }

        return { action: 'message', boubaMessage: result.output }
      } catch (err) {
        console.error('Calendar AI Error:', err)
        return { error: "Désolé, je n'ai pas pu traiter cette commande." }
      } finally {
        setIsProcessing(false)
      }
    },
    [callBouba, checkConflicts, events]
  )

  /**
   * Briefing quotidien via Bouba — liste les événements du jour avec un commentaire motivant.
   */
  const generateDailyBriefing = useCallback(
    async (dayEvents: CalendarEvent[]): Promise<string> => {
      setIsProcessing(true)
      try {
        if (dayEvents.length === 0) {
          return "Aucun événement prévu aujourd'hui. Profitez de cette journée libre !"
        }

        const eventsText = formatEventsForContext(dayEvents)
        const today = new Date().toLocaleDateString('fr-FR', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        })

        const result = await callBouba(
          `Génère un briefing quotidien motivant (2-3 phrases maximum) pour mes événements du ${today}. Sois concis, enthousiaste et professionnel. Réponds en français.`,
          `[ÉVÉNEMENTS DU JOUR]\n${eventsText}`
        )

        return result.output || `Vous avez ${dayEvents.length} événement(s) aujourd'hui.`
      } catch {
        const list = dayEvents.map(e => `- ${e.title}`).join('\n')
        return `Vous avez ${dayEvents.length} événement(s) aujourd'hui :\n${list}`
      } finally {
        setIsProcessing(false)
      }
    },
    [callBouba]
  )

  // Sync events from Google Calendar
  const syncGoogleCalendar = useCallback(async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    setIsSyncing(true)
    try {
      const resp = await fetch('/api/google/calendar/events', { headers: getAuthHeaders() })
      const data = await resp.json()

      if (!resp.ok) {
        if (data.code === 'NOT_CONNECTED') {
          toast.warning('Google Calendar non connecté. Allez dans Paramètres > Connexions.')
          return { success: false, error: 'NOT_CONNECTED' }
        }
        if (data.code === 'TOKEN_EXPIRED') {
          toast.error('Session Google Calendar expirée. Veuillez reconnecter dans les paramètres.')
          return { success: false, error: 'TOKEN_EXPIRED' }
        }
        toast.error(data.error || 'Erreur synchronisation Calendar')
        return { success: false, error: data.error }
      }

      const googleEvents = (data.data || []).map((e: any) => ({
        google_id: e.google_id || e.id,
        title: e.title,
        start_at: e.start,
        end_at: e.end,
        location: e.location || '',
        description: e.description || '',
        category: e.category || 'work',
        participants: e.attendees || [],
        meeting_link: e.videoLink || '',
      }))

      const bulkRes = await fetch('/api/calendar/events/bulk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ events: googleEvents }),
      })
      const bulkData = await bulkRes.json()

      if (bulkData.success) {
        await useCalendarStore.getState().loadFromDB()
        toast.success(`${bulkData.upserted} événement(s) synchronisé(s) depuis Google Calendar`)
        return { success: true, count: bulkData.upserted }
      }

      setEvents(
        googleEvents.map((e: any, i: number) => ({
          ...e, id: `google-${i}`, start: e.start_at, end: e.end_at,
        } as CalendarEvent))
      )
      toast.success(`${googleEvents.length} événement(s) synchronisé(s)`)
      return { success: true, count: googleEvents.length }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur réseau'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsSyncing(false)
    }
  }, [setEvents])

  // Create event in Google Calendar
  const createGoogleEvent = useCallback(
    async (event: Omit<CalendarEvent, 'id'>): Promise<{ success: boolean; error?: string }> => {
      try {
        const resp = await fetch('/api/google/calendar/events', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: event.title,
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            attendees: event.participants,
          }),
        })
        const data = await resp.json()
        if (!resp.ok) return { success: false, error: data.error }
        return { success: true }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Erreur réseau' }
      }
    },
    []
  )

  return {
    processNaturalLanguageCommand,
    generateDailyBriefing,
    syncGoogleCalendar,
    createGoogleEvent,
    isProcessing,
    isSyncing,
  }
}
