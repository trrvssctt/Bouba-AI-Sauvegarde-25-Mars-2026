import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Video,
  Sparkles,
  Bell,
  X,
  Trash2,
  Edit2,
  ExternalLink,
  RefreshCw,
  Menu as MenuIcon,
  CheckCircle2,
  Shield,
  Zap,
  Send,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/lib/utils'
import { useCalendarStore, CalendarEvent, EventCategory } from '@/src/stores/calendarStore'
import { useCalendarAI } from '@/src/hooks/useCalendarAI'
import { useConnections } from '@/src/hooks/useConnections'
import { toast } from 'sonner'
import GoogleSyncBanner from '@/src/components/GoogleSyncBanner'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

const categories: {
  id: EventCategory
  label: string
  bg: string
  text: string
  border: string
  dot: string
  pill: string
  bar: string
}[] = [
  {
    id: 'work',
    label: 'Travail',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-700',
    bar: 'bg-blue-500',
  },
  {
    id: 'personal',
    label: 'Personnel',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
  },
  {
    id: 'meeting',
    label: 'Réunion',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    pill: 'bg-purple-100 text-purple-700',
    bar: 'bg-purple-500',
  },
  {
    id: 'urgent',
    label: 'Urgent',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    pill: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500',
  },
]

const catStyle = (id?: EventCategory) => categories.find(c => c.id === id) ?? categories[0]

export default function CalendarPage() {
  const {
    events,
    view,
    currentDate,
    selectedEventId,
    setView,
    setCurrentDate,
    addEvent,
    updateEvent,
    deleteEvent,
    selectEvent,
    getEventsForDate,
    loadFromDB,
  } = useCalendarStore()

  const { processNaturalLanguageCommand, generateDailyBriefing, syncGoogleCalendar, isProcessing, isSyncing } = useCalendarAI()
  const { connections } = useConnections()
  const calendarConnection = connections?.find(c => c.id === 'calendar')
  const isCalendarConnected = calendarConnection?.status === 'connected'

  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(calendarConnection?.lastSync || null)
  const [aiCommand, setAiCommand] = useState('')
  const [dailyBriefing, setDailyBriefing] = useState<string | null>(null)
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [boubaTyping, setBoubaTyping] = useState(false)

  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '', category: 'work', start: '', end: '', location: '', description: '',
  })
  const [isSavingEvent, setIsSavingEvent] = useState(false)

  const [upcomingAlerts, setUpcomingAlerts] = useState<CalendarEvent[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const alertCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const referenceDate = useMemo(() => parseISO(currentDate), [currentDate])

  useEffect(() => {
    loadFromDB()
    if (isCalendarConnected) {
      syncGoogleCalendar().then(res => {
        if (res.success) setLastSync(new Date().toISOString())
        else if (res.error) setSyncError(res.error)
      })
    }
  }, [])

  useEffect(() => {
    const fetchBriefing = async () => {
      setIsBriefingLoading(true)
      setBoubaTyping(true)
      const briefing = await generateDailyBriefing(getEventsForDate(referenceDate))
      setDailyBriefing(briefing)
      setIsBriefingLoading(false)
      setBoubaTyping(false)
    }
    fetchBriefing()
  }, [currentDate])

  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date()
      const soon = events.filter(e => {
        if (dismissedAlerts.has(e.id)) return false
        const diff = (new Date(e.start).getTime() - now.getTime()) / 60000
        return diff > 0 && diff <= 30
      })
      setUpcomingAlerts(soon)
    }
    checkAlerts()
    alertCheckRef.current = setInterval(checkAlerts, 60000)
    return () => { if (alertCheckRef.current) clearInterval(alertCheckRef.current) }
  }, [events, dismissedAlerts])

  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId) || null
  , [events, selectedEventId])

  const toLocalInput = (d: Date | string) => {
    const date = typeof d === 'string' ? parseISO(d) : d
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const openCreateModal = (date: Date, hour?: number) => {
    const start = new Date(date)
    if (hour !== undefined) { start.setHours(hour, 0, 0, 0) }
    const end = new Date(start.getTime() + 3600000)
    setEditingEvent(null)
    setNewEvent({ title: '', category: 'work', start: toLocalInput(start), end: toLocalInput(end), location: '', description: '' })
    setIsEventModalOpen(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      category: event.category,
      start: toLocalInput(event.start),
      end: toLocalInput(event.end),
      location: event.location || '',
      description: event.description || '',
    })
    selectEvent(null)
    setIsEventModalOpen(true)
  }

  const handleCalendarSync = async () => {
    setSyncError(null)
    const res = await syncGoogleCalendar()
    if (res.success) { setLastSync(new Date().toISOString()); toast.success('Agenda synchronisé') }
    else setSyncError(res.error || 'Erreur de synchronisation')
  }

  const handlePrev = () => {
    setCurrentDate(addDays(referenceDate, view === 'month' ? -30 : view === 'week' ? -7 : -1).toISOString())
  }
  const handleNext = () => {
    setCurrentDate(addDays(referenceDate, view === 'month' ? 30 : view === 'week' ? 7 : 1).toISOString())
  }

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return
    setBoubaTyping(true)
    const result = await processNaturalLanguageCommand(aiCommand)
    setBoubaTyping(false)
    if (result.error) { toast.error(result.error); return }
    if (result.boubaMessage) setDailyBriefing(result.boubaMessage)
    const isMutation = result.action === 'create' || result.action === 'delete' || result.action === 'update'
    if (result.action === 'create' && result.eventData) {
      if (result.conflicts?.length) toast.warning(`Conflit avec : ${result.conflicts[0].title}`)
      addEvent(result.eventData)
      toast.success(`Événement "${result.eventData.title}" créé !`)
    } else if (result.action === 'delete' && result.eventId) {
      deleteEvent(result.eventId)
      toast.success(result.boubaMessage || 'Événement supprimé !')
    } else if (result.action === 'update' && result.eventId && result.eventData) {
      updateEvent(result.eventId, result.eventData)
      toast.success(result.boubaMessage || "Événement mis à jour !")
    }
    // Rafraîchir la vue après une action réussie pour refléter ce que
    // l'agent a réellement fait dans Google Calendar (mission 3.3)
    if (isMutation) {
      if (isCalendarConnected) {
        syncGoogleCalendar().then(res => {
          if (res.success) setLastSync(new Date().toISOString())
        })
      } else {
        loadFromDB()
      }
    }
    setAiCommand('')
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title?.trim()) { toast.error('Titre requis'); return }
    if (!newEvent.start) { toast.error('Date de début requise'); return }
    setIsSavingEvent(true)
    try {
      const startDate = new Date(newEvent.start)
      const endDate = newEvent.end ? new Date(newEvent.end) : new Date(startDate.getTime() + 3600000)
      const payload = {
        title: newEvent.title!,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        category: (newEvent.category as EventCategory) || 'work',
        location: newEvent.location,
        description: newEvent.description,
      }
      if (editingEvent) {
        await updateEvent(editingEvent.id, payload)
        toast.success(`Événement "${newEvent.title}" modifié !`)
      } else {
        await addEvent({ ...payload, participants: [] })
        toast.success(`Événement "${newEvent.title}" créé !`)
        setCurrentDate(startDate.toISOString())
      }
      setIsEventModalOpen(false)
      setEditingEvent(null)
      setNewEvent({ title: '', category: 'work', start: '', end: '', location: '', description: '' })
    } finally {
      setIsSavingEvent(false)
    }
  }

  // ─── Month View ──────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const start = startOfMonth(referenceDate)
    const end = endOfMonth(referenceDate)
    const days = eachDayOfInterval({ start: startOfWeek(start, { locale: fr }), end: endOfWeek(end, { locale: fr }) })

    return (
      <div className="grid grid-cols-7 h-full border-t border-gray-200/60">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} className="p-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-r border-gray-200/60 bg-gray-50/50">
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = day.getMonth() === referenceDate.getMonth()
          const today = isToday(day)
          return (
            <motion.div
              key={i}
              whileHover={{ backgroundColor: 'rgba(239,246,255,0.8)' }}
              className={cn(
                "min-h-[110px] p-2 border-b border-r border-gray-200/60 cursor-pointer transition-colors group",
                !isCurrentMonth && "opacity-30 bg-gray-50/40",
                today && "bg-blue-50/40"
              )}
              onClick={() => openCreateModal(day)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={cn(
                  "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                  today
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                    : "text-gray-500 hover:bg-gray-100"
                )}>
                  {format(day, 'd')}
                </span>
                <Plus className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => {
                  const s = catStyle(event.category)
                  return (
                    <div
                      key={event.id}
                      onClick={e => { e.stopPropagation(); selectEvent(event.id) }}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-semibold truncate border-l-2 hover:opacity-80 transition-opacity",
                        s.bg, s.text, s.border
                      )}
                    >
                      {format(parseISO(event.start), 'HH:mm')} {event.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-gray-400 font-bold pl-1">+{dayEvents.length - 3} autres</div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    )
  }

  // ─── Week View ───────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const start = startOfWeek(referenceDate, { locale: fr })
    const days = eachDayOfInterval({ start, end: addDays(start, 6) })
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200/60 bg-gray-50/50">
          <div className="p-3 border-r border-gray-200/60" />
          {days.map(day => {
            const today = isToday(day)
            return (
              <div key={day.toISOString()} className="p-3 text-center border-r border-gray-200/60 last:border-r-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {format(day, 'EEE', { locale: fr })}
                </p>
                <p className={cn(
                  "text-base font-bold w-9 h-9 flex items-center justify-center rounded-full mx-auto transition-all",
                  today
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                    : "text-gray-700 hover:bg-gray-100"
                )}>
                  {format(day, 'd')}
                </p>
              </div>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8 relative">
            <div className="col-span-1 border-r border-gray-200/60">
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-gray-100 flex items-start justify-end pr-3 pt-1">
                  <span className="text-[10px] font-semibold text-gray-400">{hour}:00</span>
                </div>
              ))}
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className="col-span-1 border-r border-gray-200/60 last:border-r-0 relative" style={{ height: `${hours.length * 64}px` }}>
                {hours.map(hour => (
                  <div
                    key={hour}
                    className={cn("h-16 border-b cursor-pointer hover:bg-blue-50/40 transition-colors", hour % 2 === 0 ? "border-gray-100" : "border-gray-50")}
                    onClick={() => openCreateModal(day, hour)}
                  />
                ))}
                {getEventsForDate(day).map(event => {
                  const s = catStyle(event.category)
                  const eStart = parseISO(event.start)
                  const eEnd = parseISO(event.end)
                  const top = eStart.getHours() * 64 + (eStart.getMinutes() / 60) * 64
                  const height = Math.max(((eEnd.getTime() - eStart.getTime()) / 3600000) * 64, 22)
                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.02, zIndex: 20 }}
                      onClick={e => { e.stopPropagation(); selectEvent(event.id) }}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded-lg p-1.5 cursor-pointer border-l-2 shadow-sm z-10 overflow-hidden",
                        s.bg, s.border
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <p className={cn("text-[10px] font-bold leading-tight truncate", s.text)}>{event.title}</p>
                      {height > 36 && (
                        <p className="text-[9px] text-gray-500">{format(eStart, 'HH:mm')} – {format(eEnd, 'HH:mm')}</p>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Not connected ───────────────────────────────────────────────────────────
  if (!isCalendarConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/60 overflow-auto relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-200/25 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full max-w-4xl mx-auto text-center space-y-10"
          >
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-2xl animate-pulse" />
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <CalendarIcon className="w-14 h-14 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-5 py-2 rounded-full">
                <Zap className="w-3.5 h-3.5" />
                Calendrier Intelligent · Bouba IA
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight">
                Votre agenda{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  nouvelle génération
                </span>
              </h1>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Connectez Google Agenda et laissez Bouba gérer votre temps — rappels intelligents, briefings automatiques, commandes naturelles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                { icon: Sparkles, bg: 'from-purple-500 to-purple-700', light: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', title: 'Commandes naturelles', desc: '"Bouba, réunion lundi 10h" — c\'est fait.' },
                { icon: RefreshCw, bg: 'from-blue-500 to-blue-700',   light: 'from-blue-50 to-blue-100/50',   border: 'border-blue-200',   title: 'Sync temps réel',     desc: 'Google Calendar synchronisé instantanément.' },
                { icon: Bell,      bg: 'from-amber-500 to-orange-600', light: 'from-amber-50 to-orange-50',    border: 'border-amber-200',  title: 'Alertes Bouba',      desc: 'Rappels contextuels avec personnalité IA.' },
              ].map(({ icon: Icon, bg, light, border, title, desc }) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={cn("rounded-2xl p-5 border bg-gradient-to-br hover:-translate-y-1 transition-all shadow-sm hover:shadow-md", light, border)}
                >
                  <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-md", bg)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-black text-gray-900 text-sm mb-1">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/settings/connections'}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-blue-500/25 transition-all"
            >
              <CalendarIcon className="w-5 h-5" />
              Connecter Google Agenda
              <ExternalLink className="w-4 h-4" />
            </motion.button>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
              <Shield className="w-3.5 h-3.5 text-green-500" /> OAuth 2.0 sécurisé · Révocable à tout moment
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // ─── Main Calendar ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 overflow-hidden flex-col">
      <GoogleSyncBanner
        service="calendar"
        isConnected={isCalendarConnected}
        isLoading={isProcessing}
        isSyncing={isSyncing}
        lastSync={lastSync}
        error={syncError}
        onSync={handleCalendarSync}
        variant="bar"
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar gauche ── */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto",
          "w-72 flex flex-col border-r border-gray-200/60 bg-gradient-to-b from-white to-blue-50/30 overflow-y-auto shadow-sm",
          "transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="p-5 space-y-4 flex-1 flex flex-col">
            {/* Mobile close */}
            <div className="flex items-center justify-between lg:hidden mb-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Calendrier</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New event */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEventModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouvel événement
            </motion.button>

            {/* Sync */}
            <button
              onClick={handleCalendarSync}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200/60 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-40"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
              {isSyncing ? 'Synchronisation...' : 'Sync Google Calendar'}
            </button>

            {/* ── Bouba Briefing ── */}
            <div className="relative rounded-2xl overflow-hidden border border-purple-200/60 bg-gradient-to-b from-purple-50 to-white shadow-sm">
              <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-md shadow-purple-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-800">Bouba</p>
                    <p className="text-[9px] text-gray-400 font-medium">IA · En ligne</p>
                  </div>
                  {boubaTyping && (
                    <div className="ml-auto flex gap-0.5 items-center">
                      {[0, 0.2, 0.4].map(d => (
                        <motion.div
                          key={d}
                          animate={{ y: [-2, 2, -2] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: d }}
                          className="w-1.5 h-1.5 rounded-full bg-purple-400"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white/80 rounded-xl p-3 border border-purple-100 shadow-sm">
                  {isBriefingLoading ? (
                    <div className="space-y-2">
                      <div className="h-2.5 w-full bg-gray-100 animate-pulse rounded" />
                      <div className="h-2.5 w-3/4 bg-gray-100 animate-pulse rounded" />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 leading-relaxed italic">
                      "{dailyBriefing || 'Tout est calme pour l\'instant. Bonne journée !'}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setAiCommand("Donne-moi mon briefing du jour")}
                  className="text-[10px] font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Actualiser
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Catégories</p>
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30" />
                  <div className={cn("w-2 h-2 rounded-full", cat.dot)} />
                  <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-800 transition-colors">{cat.label}</span>
                </label>
              ))}
            </div>

            {/* Prochain RDV */}
            <div className="mt-auto pt-4 border-t border-gray-200/60">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Prochain RDV</p>
              {(() => {
                const next = events.find(e => new Date(e.start) > new Date())
                if (!next) return <p className="text-xs text-gray-400">Aucun événement à venir</p>
                const s = catStyle(next.category)
                return (
                  <div className={cn("rounded-xl p-3 border shadow-sm", s.bg, s.border)}>
                    <p className={cn("text-xs font-bold truncate", s.text)}>{next.title}</p>
                    <div className={cn("flex items-center gap-1.5 text-[10px] mt-1 font-medium", s.text, "opacity-70")}>
                      <Clock className="w-3 h-3" />
                      <span>{format(parseISO(next.start), 'HH:mm · EEEE d MMM', { locale: fr })}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* ── Zone principale ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-4 lg:px-6 py-3 border-b border-gray-200/60 bg-white/70 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <MenuIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 flex-1">
                <h2 className="text-lg lg:text-2xl font-black text-gray-900 capitalize">
                  {format(referenceDate, 'MMMM yyyy', { locale: fr })}
                </h2>
                {/* Navigation */}
                <div className="flex items-center bg-gray-100 border border-gray-200/60 rounded-xl overflow-hidden">
                  <button onClick={handlePrev} className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date().toISOString())}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 border-x border-gray-200/60 transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button onClick={handleNext} className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View switcher */}
              <div className="flex items-center bg-gray-100 border border-gray-200/60 rounded-xl p-0.5">
                {(['month', 'week', 'day'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      view === v
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/20"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    {v === 'month' ? 'Mois' : v === 'week' ? 'Sem.' : 'Jour'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouba command bar */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-2.5 focus-within:border-blue-300 focus-within:bg-blue-50/30 focus-within:shadow-sm transition-all">
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0 animate-pulse" />
              <input
                type="text"
                value={aiCommand}
                onChange={e => setAiCommand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiCommand()}
                placeholder='Dis quelque chose à Bouba... "Crée une réunion demain 14h"'
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
              />
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <button
                  onClick={handleAiCommand}
                  disabled={!aiCommand.trim()}
                  className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 disabled:opacity-30 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Calendar content */}
          <div className="flex-1 overflow-hidden">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && (
              <div className="h-full overflow-y-auto">
                <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-black text-gray-900 capitalize">
                        {format(referenceDate, 'EEEE', { locale: fr })}
                      </h3>
                      <p className="text-gray-400 font-semibold mt-0.5">
                        {format(referenceDate, 'd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    {isToday(referenceDate) && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-4 py-2 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Aujourd'hui
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {getEventsForDate(referenceDate).length === 0 ? (
                      <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">Aucun événement ce jour.</p>
                        <button
                          onClick={() => setIsEventModalOpen(true)}
                          className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          + Ajouter un événement
                        </button>
                      </div>
                    ) : getEventsForDate(referenceDate).map(event => {
                      const s = catStyle(event.category)
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ x: 4 }}
                          onClick={() => selectEvent(event.id)}
                          className="group flex items-start gap-5 p-5 rounded-2xl border border-gray-200/60 bg-white hover:shadow-md hover:border-blue-200 cursor-pointer transition-all shadow-sm"
                        >
                          <div className="shrink-0 w-20 text-right pt-0.5">
                            <p className="text-lg font-black text-gray-900">{format(parseISO(event.start), 'HH:mm')}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{format(parseISO(event.end), 'HH:mm')}</p>
                          </div>
                          <div className={cn("w-1 self-stretch rounded-full", s.bar)} />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-black text-gray-900 group-hover:text-blue-700 transition-colors">{event.title}</h4>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={e => { e.stopPropagation(); openEditModal(event) }}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteEvent(event.id); toast.success('Événement supprimé') }}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                              {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
                              {event.participants?.length ? <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.participants.length} participants</span> : null}
                              {event.meetingLink && <span className="flex items-center gap-1 text-blue-600 font-semibold"><Video className="w-3 h-3" />Lien visio</span>}
                            </div>
                            {event.description && <p className="text-xs text-gray-400 line-clamp-2">{event.description}</p>}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Event Detail Modal ── */}
      <AnimatePresence>
        {selectedEventId && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-2xl shadow-gray-900/10"
            >
              <div className={cn("h-1.5", catStyle(selectedEvent.category).bar)} />
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={cn("text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest", catStyle(selectedEvent.category).pill)}>
                      {catStyle(selectedEvent.category).label}
                    </span>
                    <h3 className="text-xl font-black text-gray-900 mt-2">{selectedEvent.title}</h3>
                  </div>
                  <button onClick={() => selectEvent(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{format(parseISO(selectedEvent.start), 'EEEE d MMMM', { locale: fr })}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(selectedEvent.start), 'HH:mm')} – {format(parseISO(selectedEvent.end), 'HH:mm')}</p>
                    </div>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm">{selectedEvent.location}</p>
                    </div>
                  )}
                  {selectedEvent.meetingLink && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-blue-600" />
                      </div>
                      <a href={selectedEvent.meetingLink} target="_blank" rel="noreferrer"
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Rejoindre Google Meet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {selectedEvent.participants?.length ? (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedEvent.participants.map(p => (
                          <div key={p} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/60 px-2.5 py-1 rounded-full">
                            <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[9px] flex items-center justify-center font-black">
                              {p[0].toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-500">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedEvent.description && (
                  <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openEditModal(selectedEvent)}
                    className="flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                  <button
                    onClick={() => { deleteEvent(selectedEvent.id); selectEvent(null); toast.success('Événement supprimé') }}
                    className="p-3 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bouba Alerts ── */}
      <AnimatePresence>
        {upcomingAlerts.filter(e => !dismissedAlerts.has(e.id)).map((event, i) => {
          const minutesLeft = Math.round((new Date(event.start).getTime() - Date.now()) / 60000)
          const s = catStyle(event.category)
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ delay: i * 0.1 }}
              className="fixed right-4 z-50 w-80 rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-xl shadow-gray-900/10"
              style={{ bottom: `${16 + i * 110}px` }}
            >
              <div className={cn("h-1", s.bar)} />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-md shadow-purple-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black text-purple-600">Bouba · Rappel</p>
                      <button
                        onClick={() => setDismissedAlerts(prev => new Set([...prev, event.id]))}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 leading-snug">
                      Hé ! <span className="font-black text-gray-900">"{event.title}"</span>{' '}
                      dans <span className={cn("font-black", s.text)}>{minutesLeft} min</span>. T'es prêt·e ? 💪
                    </p>
                    {event.location && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </p>
                    )}
                  </div>
                </div>
                {event.meetingLink && (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 w-full py-2 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5" /> Rejoindre Google Meet
                  </a>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* ── Event Creation Modal ── */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-2xl shadow-gray-900/10"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
                    </h3>
                    <p className="text-white/70 text-xs mt-0.5">
                      {editingEvent ? 'Modifiez les informations de votre rendez-vous' : 'Ajoutez un rendez-vous à votre calendrier'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsEventModalOpen(false); setEditingEvent(null) }}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Titre *</label>
                  <input
                    type="text"
                    value={newEvent.title || ''}
                    onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    placeholder="Réunion avec l'équipe..."
                    className="w-full border border-gray-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Catégorie</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setNewEvent(p => ({ ...p, category: cat.id }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                          newEvent.category === cat.id
                            ? cn(cat.pill, cat.border, "shadow-sm")
                            : "border-gray-200/60 text-gray-400 hover:border-gray-300 hover:text-gray-700"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(['start', 'end'] as const).map((key, idx) => (
                    <div key={key}>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                        {key === 'start' ? 'Début *' : 'Fin'}
                      </label>
                      <input
                        type="datetime-local"
                        value={(newEvent as any)[key] || ''}
                        onChange={e => setNewEvent(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-gray-200/60 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Lieu</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      value={newEvent.location || ''}
                      onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      placeholder="Salle, adresse, lien Meet..."
                      className="w-full border border-gray-200/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
                  <textarea
                    value={newEvent.description || ''}
                    onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                    placeholder="Notes, agenda..."
                    rows={3}
                    className="w-full border border-gray-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setIsEventModalOpen(false)}
                    className="flex-1 py-3 border border-gray-200/60 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl text-sm font-bold transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    disabled={isSavingEvent}
                    className="flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 transition-all"
                  >
                    {isSavingEvent
                      ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : editingEvent ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingEvent ? 'Enregistrer' : 'Créer l\'événement'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
