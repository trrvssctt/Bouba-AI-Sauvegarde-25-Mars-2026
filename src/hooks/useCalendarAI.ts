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

// Champs id/titre/début/fin uniquement, max 30 événements (mission 3.3 — lenteur = tokens)
function formatEventsForContext(events: CalendarEvent[]): string {
  if (!events.length) return 'Aucun événement.'
  return events
    .slice(0, 30)
    .map(e => `- [ID:${e.id}] "${e.title}" ${e.start}${e.end ? ` → ${e.end}` : ''}`)
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
        const now = new Date()
        // Fenêtre pertinente uniquement : aujourd'hui −7 jours → +30 jours (mission 3.3)
        const windowStart = new Date(now.getTime() - 7 * 24 * 3600000)
        const windowEnd = new Date(now.getTime() + 30 * 24 * 3600000)
        const relevantEvents = events.filter(e => {
          const start = new Date(e.start)
          return start >= windowStart && start <= windowEnd
        })

        const instructions = [
          `INSTRUCTIONS IMPORTANTES: Pour toute commande calendrier, réponds UNIQUEMENT en JSON structuré:`,
          `- Créer: {"action":"create","eventData":{"title":"...","start":"ISO8601","end":"ISO8601","category":"work|personal|meeting|urgent","location":"...","description":"..."}}`,
          `- Supprimer: {"action":"delete","eventId":"ID_EXACT","boubaMessage":"message de confirmation"}`,
          `- Modifier: {"action":"update","eventId":"ID_EXACT","eventData":{"title":"...","start":"ISO8601","end":"ISO8601"},"boubaMessage":"message de confirmation"}`,
          `- Message seul: {"action":"message","boubaMessage":"ta réponse"}`,
          `Utilise les IDs exacts des événements listés ci-dessous pour delete/update.`,
        ].join('\n')

        const context = [
          instructions,
          ``,
          `[CONTEXTE CALENDRIER]`,
          `Date et heure actuelles : ${today}`,
          `Événements (fenêtre −7 jours → +30 jours, max 30) :`,
          formatEventsForContext(relevantEvents),
        ].join('\n')

        const result = await callBouba(command, context)

        if (!result.success) {
          return { error: result.error || 'Impossible de traiter la commande.' }
        }

        // Try to parse JSON from Bouba's output
        const jsonMatch = result.output.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.action === 'create' && parsed.eventData) {
              const conflicts = checkConflicts(parsed.eventData.start, parsed.eventData.end)
              return { ...parsed, conflicts, boubaMessage: parsed.boubaMessage || result.output }
            }
            if (parsed.action === 'delete' || parsed.action === 'update') {
              return { ...parsed, boubaMessage: parsed.boubaMessage || result.output }
            }
            return { ...parsed, boubaMessage: parsed.boubaMessage || result.output }
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
