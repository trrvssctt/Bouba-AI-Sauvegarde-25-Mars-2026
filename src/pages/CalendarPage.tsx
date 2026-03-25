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
  Menu as MenuIcon
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

const categories: { id: EventCategory; label: string; color: string }[] = [
  { id: 'work', label: 'Travail', color: 'bg-primary' },
  { id: 'personal', label: 'Personnel', color: 'bg-success' },
  { id: 'meeting', label: 'Réunion', color: 'bg-indigo-500' },
  { id: 'urgent', label: 'Urgent', color: 'bg-danger' },
]

export default function CalendarPage() {
  const { 
    events, 
    view, 
    currentDate, 
    selectedEventId,
    setView, 
    setCurrentDate, 
    addEvent,
    deleteEvent,
    selectEvent,
    getEventsForDate,
    loadFromDB
  } = useCalendarStore()

  const { processNaturalLanguageCommand, generateDailyBriefing, syncGoogleCalendar, isProcessing, isSyncing } = useCalendarAI()
  const { connections } = useConnections()
  const calendarConnection = connections.find(c => c.id === 'calendar')
  const isCalendarConnected = calendarConnection?.status === 'connected'

  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(calendarConnection?.lastSync || null)
  const [aiCommand, setAiCommand] = useState('')
  const [dailyBriefing, setDailyBriefing] = useState<string | null>(null)
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Event creation form
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '', category: 'work', start: '', end: '', location: '', description: ''
  })
  const [isSavingEvent, setIsSavingEvent] = useState(false)

  // Upcoming event alerts
  const [upcomingAlerts, setUpcomingAlerts] = useState<CalendarEvent[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const alertCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const referenceDate = useMemo(() => parseISO(currentDate), [currentDate])

  // Load events from DB on mount, then auto-sync from Google if connected
  useEffect(() => {
    loadFromDB()
    if (isCalendarConnected) {
      syncGoogleCalendar().then(res => {
        if (res.success) setLastSync(new Date().toISOString())
        else if (res.error) setSyncError(res.error)
      })
    }
  }, [])

  const handleCalendarSync = async () => {
    setSyncError(null)
    const res = await syncGoogleCalendar()
    if (res.success) {
      setLastSync(new Date().toISOString())
      toast.success('Agenda synchronisé')
    } else {
      setSyncError(res.error || 'Erreur de synchronisation')
    }
  }

  // Generate briefing on mount
  useEffect(() => {
    const fetchBriefing = async () => {
      setIsBriefingLoading(true)
      const todayEvents = getEventsForDate(referenceDate)
      const briefing = await generateDailyBriefing(todayEvents)
      setDailyBriefing(briefing)
      setIsBriefingLoading(false)
    }
    fetchBriefing()
  }, [currentDate])

  // Check for upcoming events every minute
  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date()
      const soon = events.filter(e => {
        if (dismissedAlerts.has(e.id)) return false
        const start = new Date(e.start)
        const diff = (start.getTime() - now.getTime()) / 60000 // minutes
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

  const handlePrev = () => {
    const delta = view === 'month' ? -30 : view === 'week' ? -7 : -1
    setCurrentDate(addDays(referenceDate, delta).toISOString())
  }

  const handleNext = () => {
    const delta = view === 'month' ? 30 : view === 'week' ? 7 : 1
    setCurrentDate(addDays(referenceDate, delta).toISOString())
  }

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return
    const result = await processNaturalLanguageCommand(aiCommand)

    if (result.error) {
      toast.error(result.error)
      return
    }

    // Show Bouba's natural-language response in the briefing section
    if (result.boubaMessage) {
      setDailyBriefing(result.boubaMessage)
    }

    if (result.action === 'create' && result.eventData) {
      if (result.conflicts && result.conflicts.length > 0) {
        toast.warning(`Conflit détecté avec: ${result.conflicts[0].title}. Création tout de même.`)
      }
      addEvent(result.eventData)
      toast.success(`Événement "${result.eventData.title}" créé !`)
      setAiCommand('')
    } else if (result.action === 'briefing' || result.action === 'message') {
      setAiCommand('')
      toast.success('Bouba a répondu')
    } else if (result.action === 'delete') {
      toast.success('Bouba a traité la suppression')
      setAiCommand('')
    } else if (result.action === 'update') {
      toast.success('Bouba a mis à jour l\'événement')
      setAiCommand('')
    } else {
      setAiCommand('')
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title?.trim()) { toast.error('Titre requis'); return }
    if (!newEvent.start) { toast.error('Date de début requise'); return }
    setIsSavingEvent(true)
    try {
      const startDate = new Date(newEvent.start)
      const endDate = newEvent.end
        ? new Date(newEvent.end)
        : new Date(startDate.getTime() + 60 * 60 * 1000) // +1h default

      await addEvent({
        title: newEvent.title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        category: (newEvent.category as EventCategory) || 'work',
        location: newEvent.location,
        description: newEvent.description,
        participants: [],
      })
      toast.success(`Événement "${newEvent.title}" créé !`)
      setIsEventModalOpen(false)
      setNewEvent({ title: '', category: 'work', start: '', end: '', location: '', description: '' })
      setCurrentDate(startDate.toISOString())
    } finally {
      setIsSavingEvent(false)
    }
  }

  const renderMonthView = () => {
    const start = startOfMonth(referenceDate)
    const end = endOfMonth(referenceDate)
    const days = eachDayOfInterval({ start: startOfWeek(start, { locale: fr }), end: endOfWeek(end, { locale: fr }) })

    return (
      <div className="grid grid-cols-7 h-full border-t border-border">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} className="p-4 text-center text-[10px] font-bold text-muted uppercase tracking-widest border-r border-b border-border bg-surface/30">
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = day.getMonth() === referenceDate.getMonth()
          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[120px] p-2 border-r border-b border-border transition-colors hover:bg-background/50 cursor-pointer",
                !isCurrentMonth && "opacity-30 bg-surface/10",
                isToday(day) && "bg-primary/5"
              )}
              onClick={() => {
                setCurrentDate(day.toISOString())
                setView('day')
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={cn(
                  "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                  isToday(day) ? "bg-primary text-white" : "text-secondary"
                )}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted font-medium">{dayEvents.length} RDV</span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate font-medium",
                      categories.find(c => c.id === event.category)?.color.replace('bg-', 'bg-opacity-10 text-').replace('indigo-500', 'indigo-600'),
                      "border-l-" + categories.find(c => c.id === event.category)?.color.split('-')[1]
                    )}
                  >
                    {format(parseISO(event.start), 'HH:mm')} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-muted font-bold pl-1">
                    + {dayEvents.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const start = startOfWeek(referenceDate, { locale: fr })
    const days = eachDayOfInterval({ start, end: addDays(start, 6) })
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-8 border-b border-border bg-surface/30">
          <div className="p-4 border-r border-border" />
          {days.map(day => (
            <div key={day.toISOString()} className="p-4 text-center border-r border-border last:border-r-0">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{format(day, 'EEE', { locale: fr })}</p>
              <p className={cn(
                "text-lg font-display font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto",
                isToday(day) ? "bg-primary text-white shadow-violet" : "text-secondary"
              )}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8 relative">
            {/* Time Column */}
            <div className="col-span-1 border-r border-border">
              {hours.map(hour => (
                <div key={hour} className="h-20 border-b border-border/50 p-2 text-[10px] font-bold text-muted text-right pr-4">
                  {hour}:00
                </div>
              ))}
            </div>
            {/* Day Columns */}
            {days.map(day => (
              <div key={day.toISOString()} className="col-span-1 border-r border-border last:border-r-0 relative h-[1920px]">
                {hours.map(hour => (
                  <div key={hour} className="h-20 border-b border-border/50" />
                ))}
                {getEventsForDate(day).map(event => {
                  const start = parseISO(event.start)
                  const end = parseISO(event.end)
                  const top = start.getHours() * 80 + (start.getMinutes() / 60) * 80
                  const height = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 80
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => selectEvent(event.id)}
                      className={cn(
                        "absolute left-1 right-1 rounded-xl p-2 border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] z-10",
                        categories.find(c => c.id === event.category)?.color,
                        "bg-opacity-10 border-" + categories.find(c => c.id === event.category)?.color.split('-')[1]
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <p className="text-[10px] font-bold text-secondary leading-tight truncate">{event.title}</p>
                      <p className="text-[9px] text-muted font-medium">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</p>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isCalendarConnected) {
    return (
      <div className="flex h-full bg-background">
        <GoogleSyncBanner
          service="calendar"
          isConnected={false}
          isLoading={false}
          variant="empty"
          onSync={handleCalendarSync}
          onConnect={() => window.location.href = '/settings/connections'}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background overflow-hidden flex-col">
      {/* Google Calendar Sync Banner */}
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
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar - Briefing & Filters */}
      <div className={`
        fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto
        w-72 lg:w-80 border-r border-border flex flex-col p-5 lg:p-6 space-y-6 lg:space-y-8 bg-surface overflow-y-auto
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-sm font-bold text-secondary">Calendrier</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-background text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setIsEventModalOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Plus className="w-5 h-5" />
          Nouvel événement
        </button>
        <button
          onClick={syncGoogleCalendar}
          disabled={isSyncing}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-border rounded-xl text-sm font-medium text-secondary hover:bg-background transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronisation...' : 'Sync Google Calendar'}
        </button>

        {/* AI Briefing */}
        <div className="bg-primary/5 rounded-3xl p-5 border border-primary/10 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Briefing de Bouba</span>
          </div>
          {isBriefingLoading ? (
            <div className="space-y-2">
              <div className="h-3 w-full bg-primary/10 animate-pulse rounded" />
              <div className="h-3 w-3/4 bg-primary/10 animate-pulse rounded" />
            </div>
          ) : (
            <p className="text-sm text-secondary italic leading-relaxed">
              "{dailyBriefing}"
            </p>
          )}
          <div className="pt-2">
            <button 
              onClick={() => setAiCommand("Donne-moi mon briefing du jour")}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Actualiser le briefing
            </button>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Catégories</h3>
          <div className="space-y-2">
            {categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-background cursor-pointer transition-colors group">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                <span className="text-sm font-medium text-muted group-hover:text-secondary">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mini Calendar Placeholder */}
        <div className="mt-auto pt-6 border-t border-border">
          <div className="bg-background rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Prochain RDV</p>
            {events.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-secondary truncate">{events[0].title}</p>
                <div className="flex items-center justify-center gap-2 text-[10px] text-muted">
                  <Clock className="w-3 h-3" />
                  <span>Dans 2 heures</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Aucun RDV proche</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col bg-surface">
        {/* Header */}
        <div className="p-3 lg:p-6 border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-2 mb-2 lg:mb-0">
            <div className="flex items-center gap-2 lg:gap-6">
              {/* Hamburger for sidebar on mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-background rounded-lg text-muted"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              <h2 className="text-base lg:text-2xl font-display font-bold text-secondary capitalize">
                {format(referenceDate, 'MMMM yyyy', { locale: fr })}
              </h2>
              <div className="flex items-center bg-background rounded-xl p-0.5 lg:p-1 border border-border">
                <button onClick={handlePrev} className="p-1 lg:p-1.5 hover:bg-surface rounded-lg text-muted transition-colors">
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date().toISOString())}
                  className="px-2 lg:px-4 py-1 lg:py-1.5 text-xs font-bold text-secondary hover:bg-surface rounded-lg transition-colors"
                >
                  Auj.
                </button>
                <button onClick={handleNext} className="p-1 lg:p-1.5 hover:bg-surface rounded-lg text-muted transition-colors">
                  <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center bg-background rounded-xl p-0.5 lg:p-1 border border-border">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-2 lg:px-4 py-1 lg:py-1.5 text-xs font-bold rounded-lg transition-all",
                    view === v ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-surface"
                  )}
                >
                  {v === 'month' ? 'Mois' : v === 'week' ? 'Sem.' : 'Jour'}
                </button>
              ))}
            </div>
          </div>

          {/* AI Command Bar - full width below on all screens */}
          <div className="relative mt-2 lg:mt-3">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <input
              type="text"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiCommand()}
              placeholder="Bouba, crée une réunion demain à 14h..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
            {isProcessing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Clock className="w-4 h-4 text-primary animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden relative">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && (
            <div className="h-full flex flex-col">
              <div className="p-8 max-w-4xl mx-auto w-full space-y-8 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-display font-bold text-secondary">
                    {format(referenceDate, 'EEEE d MMMM', { locale: fr })}
                  </h3>
                  <div className="flex items-center gap-2 text-muted">
                    <CalendarIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Aujourd'hui</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {getEventsForDate(referenceDate).length === 0 ? (
                    <div className="text-center py-20 bg-surface/50 rounded-3xl border border-dashed border-border">
                      <CalendarIcon className="w-12 h-12 text-muted mx-auto mb-4 opacity-20" />
                      <p className="text-muted">Aucun événement prévu pour cette journée.</p>
                      <button 
                        onClick={() => setIsEventModalOpen(true)}
                        className="mt-4 text-primary font-bold hover:underline"
                      >
                        Ajouter un rendez-vous
                      </button>
                    </div>
                  ) : (
                    getEventsForDate(referenceDate).map(event => (
                      <div 
                        key={event.id}
                        onClick={() => selectEvent(event.id)}
                        className="group bg-white border border-border rounded-3xl p-6 hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer flex items-start gap-6"
                      >
                        <div className="w-24 shrink-0 pt-1">
                          <p className="text-lg font-display font-bold text-secondary">{format(parseISO(event.start), 'HH:mm')}</p>
                          <p className="text-xs text-muted">{format(parseISO(event.end), 'HH:mm')}</p>
                        </div>
                        <div className={cn("w-1 self-stretch rounded-full", categories.find(c => c.id === event.category)?.color)} />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="text-xl font-bold text-secondary group-hover:text-primary transition-colors">{event.title}</h4>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 hover:bg-background rounded-lg text-muted"><Edit2 className="w-4 h-4" /></button>
                              <button className="p-2 hover:bg-background rounded-lg text-danger"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted">
                            {event.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.participants && (
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{event.participants.length} participants</span>
                              </div>
                            )}
                            {event.meetingLink && (
                              <div className="flex items-center gap-1.5 text-primary font-medium">
                                <Video className="w-4 h-4" />
                                <span>Lien visio</span>
                              </div>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted line-clamp-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEventId && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className={cn("h-3", categories.find(c => c.id === selectedEvent.category)?.color)} />
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
                      categories.find(c => c.id === selectedEvent.category)?.color.replace('bg-', 'bg-opacity-10 text-')
                    )}>
                      {categories.find(c => c.id === selectedEvent.category)?.label}
                    </span>
                    <h3 className="text-2xl font-display font-bold text-secondary">{selectedEvent.title}</h3>
                  </div>
                  <button 
                    onClick={() => selectEvent(null)}
                    className="p-2 hover:bg-background rounded-lg text-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-secondary">
                    <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-primary">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{format(parseISO(selectedEvent.start), 'EEEE d MMMM', { locale: fr })}</p>
                      <p className="text-xs text-muted">{format(parseISO(selectedEvent.start), 'HH:mm')} - {format(parseISO(selectedEvent.end), 'HH:mm')}</p>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-center gap-4 text-secondary">
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-primary">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium">{selectedEvent.location}</p>
                    </div>
                  )}

                  {selectedEvent.meetingLink && (
                    <div className="flex items-center gap-4 text-secondary">
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-primary">
                        <Video className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <p className="text-sm font-medium">Google Meet</p>
                        <a 
                          href={selectedEvent.meetingLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Rejoindre <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedEvent.participants && (
                    <div className="flex items-start gap-4 text-secondary">
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-primary shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-bold">Participants</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.participants.map(p => (
                            <div key={p} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border border-border">
                              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                                {p[0].toUpperCase()}
                              </div>
                              <span className="text-xs text-muted">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="bg-background rounded-2xl p-4 border border-border">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Description</p>
                    <p className="text-sm text-secondary leading-relaxed">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <button className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                  <button 
                    onClick={() => {
                      deleteEvent(selectedEvent.id)
                      selectEvent(null)
                      toast.success("Événement supprimé")
                    }}
                    className="p-3 border border-danger/20 text-danger hover:bg-danger/5 rounded-2xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upcoming Event Alerts */}
      <AnimatePresence>
        {upcomingAlerts.filter(e => !dismissedAlerts.has(e.id)).map((event, i) => {
          const minutesLeft = Math.round((new Date(event.start).getTime() - Date.now()) / 60000)
          const cat = categories.find(c => c.id === event.category)
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ delay: i * 0.1 }}
              className="fixed right-4 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden border border-border bg-surface"
              style={{ bottom: `${5 + i * 104}px` }}
            >
              <div className={`h-1 w-full ${cat?.color || 'bg-primary'}`} />
              <div className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10`}>
                  <Bell className="w-5 h-5 text-primary animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">
                    Dans {minutesLeft} min
                  </p>
                  <p className="text-sm font-bold text-secondary truncate">{event.title}</p>
                  {event.location && (
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {event.location}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDismissedAlerts(prev => new Set([...prev, event.id]))}
                  className="p-1 hover:bg-background rounded-lg text-muted shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {event.meetingLink && (
                <div className="px-4 pb-3">
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-1.5 rounded-xl"
                  >
                    <Video className="w-3.5 h-3.5" /> Rejoindre Google Meet
                  </a>
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Event Creation Modal */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-primary to-violet-600 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-display font-bold">Nouvel événement</h3>
                    <p className="text-white/70 text-sm mt-0.5">Ajoutez un rendez-vous à votre calendrier</p>
                  </div>
                  <button
                    onClick={() => setIsEventModalOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1.5 block">Titre *</label>
                  <input
                    type="text"
                    value={newEvent.title || ''}
                    onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Réunion avec l'équipe marketing"
                    className="w-full input-field"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1.5 block">Catégorie</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setNewEvent(p => ({ ...p, category: cat.id }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                          newEvent.category === cat.id
                            ? `${cat.color} text-white border-transparent`
                            : "border-border text-muted hover:border-primary/30"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1.5 block">Début *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.start || ''}
                      onChange={e => setNewEvent(p => ({ ...p, start: e.target.value }))}
                      className="w-full input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1.5 block">Fin</label>
                    <input
                      type="datetime-local"
                      value={newEvent.end || ''}
                      onChange={e => setNewEvent(p => ({ ...p, end: e.target.value }))}
                      className="w-full input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1.5 block">Lieu</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={newEvent.location || ''}
                      onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      placeholder="Salle, adresse, lien Meet..."
                      className="w-full input-field pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-widest mb-1.5 block">Description</label>
                  <textarea
                    value={newEvent.description || ''}
                    onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                    placeholder="Notes, agenda, participants..."
                    rows={3}
                    className="w-full input-field resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsEventModalOpen(false)} className="flex-1 btn-secondary py-3">
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    disabled={isSavingEvent}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    {isSavingEvent
                      ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Plus className="w-4 h-4" />}
                    Créer l'événement
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
