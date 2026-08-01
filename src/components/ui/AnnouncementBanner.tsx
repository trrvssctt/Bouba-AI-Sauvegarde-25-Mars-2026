import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Megaphone, Zap, Tag, Wrench, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/src/lib/utils'

interface Announcement {
  id: string
  campaignId: string
  title: string
  content: string
  type: string
  metadata?: { announcementType?: string; target?: string } | null
  sentAt: string
  isRead: boolean
}

const TYPE_CONFIG: Record<string, {
  icon: React.ElementType
  bg: string
  border: string
  iconBg: string
  iconColor: string
  textTitle: string
  textBody: string
  label: string
}> = {
  feature: {
    icon: Zap,
    bg: 'bg-gradient-to-r from-violet-600 to-indigo-600',
    border: 'border-violet-400/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textTitle: 'text-white',
    textBody: 'text-white/80',
    label: 'Nouveauté',
  },
  promotion: {
    icon: Tag,
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    border: 'border-emerald-400/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textTitle: 'text-white',
    textBody: 'text-white/80',
    label: 'Promotion',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    border: 'border-amber-400/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textTitle: 'text-white',
    textBody: 'text-white/80',
    label: 'Maintenance',
  },
  info: {
    icon: Info,
    bg: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    border: 'border-blue-400/30',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textTitle: 'text-white',
    textBody: 'text-white/80',
    label: 'Information',
  },
}

const DEFAULT_CONFIG = TYPE_CONFIG.info

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [dismissing, setDismissing] = useState<string | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements', { credentials: 'include' })
      const json = await res.json()
      if (json.success && json.data?.length) {
        setAnnouncements(json.data)
        setCurrentIndex(0)
        setExpanded(false)
      }
    } catch {
      // silencieux — pas critique
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const handleDismiss = async (id: string) => {
    setDismissing(id)
    try {
      await fetch(`/api/announcements/${id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch { /* silencieux */ }

    setAnnouncements(prev => {
      const next = prev.filter(a => a.id !== id)
      // ajuster l'index si on supprime le dernier
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1)
      }
      return next
    })
    setDismissing(null)
    setExpanded(false)
  }

  if (announcements.length === 0) return null

  const ann = announcements[currentIndex]
  const announcementType = ann.metadata?.announcementType || ann.type?.replace('broadcast_app', 'info') || 'info'
  const cfg = TYPE_CONFIG[announcementType] || DEFAULT_CONFIG
  const Icon = cfg.icon
  const hasMultiple = announcements.length > 1
  const isLong = ann.content.length > 100

  return (
    <AnimatePresence>
      <motion.div
        key={ann.id}
        initial={{ opacity: 0, y: -16, scaleY: 0.95 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        exit={{ opacity: 0, y: -16, scaleY: 0.95 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
        className={cn(
          'w-full rounded-2xl border shadow-lg overflow-hidden mb-2',
          cfg.bg,
          cfg.border
        )}
      >
        <div className="px-4 py-3 flex items-start gap-3">
          {/* Icône */}
          <div className={cn('shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center', cfg.iconBg)}>
            <Icon className={cn('w-4 h-4', cfg.iconColor)} />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                {cfg.label}
              </span>
              {hasMultiple && (
                <span className="text-white/50 text-[10px]">
                  {currentIndex + 1} / {announcements.length}
                </span>
              )}
            </div>

            <p className={cn('font-bold text-sm mt-1 leading-snug', cfg.textTitle)}>
              {ann.title}
            </p>

            {/* Corps — tronqué ou complet */}
            <AnimatePresence initial={false}>
              {(!isLong || expanded) ? (
                <motion.p
                  key="full"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn('text-xs mt-1 leading-relaxed', cfg.textBody)}
                >
                  {ann.content}
                </motion.p>
              ) : (
                <p className={cn('text-xs mt-1 leading-relaxed line-clamp-2', cfg.textBody)}>
                  {ann.content}
                </p>
              )}
            </AnimatePresence>

            {/* Voir plus / moins */}
            {isLong && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-white/70 hover:text-white text-[11px] font-semibold mt-1 underline-offset-2 hover:underline transition-colors"
              >
                {expanded ? 'Réduire' : 'Lire la suite'}
              </button>
            )}
          </div>

          {/* Navigation multi-annonces + fermer */}
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {hasMultiple && (
              <>
                <button
                  onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setExpanded(false) }}
                  disabled={currentIndex === 0}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setCurrentIndex(i => Math.min(announcements.length - 1, i + 1)); setExpanded(false) }}
                  disabled={currentIndex === announcements.length - 1}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => handleDismiss(ann.id)}
              disabled={dismissing === ann.id}
              title="Fermer cette annonce"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barre de progression pour plusieurs annonces */}
        {hasMultiple && (
          <div className="flex gap-1 px-4 pb-3">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setExpanded(false) }}
                className={cn(
                  'h-1 rounded-full transition-all',
                  i === currentIndex ? 'bg-white flex-1' : 'bg-white/30 w-4'
                )}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
