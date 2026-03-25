/**
 * GoogleSyncBanner — Reusable component showing Google connection status
 * and real-time sync controls for Gmail / Calendar / Contacts.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RefreshCw, AlertCircle, CheckCircle2, Wifi, WifiOff, ExternalLink, X, Loader2 } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface GoogleSyncBannerProps {
  service: 'gmail' | 'calendar' | 'contacts'
  isConnected: boolean
  isLoading: boolean
  isSyncing?: boolean
  lastSync?: string | null
  error?: string | null
  onSync: () => void
  onConnect?: () => void
  /** Show as inline bar (default) or as a full-screen empty-state */
  variant?: 'bar' | 'empty'
}

const SERVICE_META = {
  gmail: {
    label: 'Gmail',
    icon: '📧',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    connectText: 'Connecter Gmail',
  },
  calendar: {
    label: 'Google Agenda',
    icon: '📅',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    connectText: 'Connecter Google Agenda',
  },
  contacts: {
    label: 'Google Contacts',
    icon: '👥',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    connectText: 'Connecter Google Contacts',
  },
}

export default function GoogleSyncBanner({
  service,
  isConnected,
  isLoading,
  isSyncing = false,
  lastSync,
  error,
  onSync,
  onConnect,
  variant = 'bar',
}: GoogleSyncBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const meta = SERVICE_META[service]

  if (dismissed && isConnected && !error) return null

  const lastSyncLabel = lastSync
    ? `Dernière sync : ${format(new Date(lastSync), 'HH:mm', { locale: fr })}`
    : 'Jamais synchronisé'

  // ── Empty state (not connected) ──────────────────────────────────────────
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full py-20 px-6 text-center"
      >
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-violet-100 flex items-center justify-center shadow-xl">
            <span className="text-4xl">{meta.icon}</span>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-danger rounded-full flex items-center justify-center shadow"
          >
            <WifiOff className="w-4 h-4 text-white" />
          </motion.div>
        </div>

        <h3 className="text-2xl font-display font-bold text-secondary mb-2">
          {meta.label} non connecté
        </h3>
        <p className="text-muted max-w-sm text-sm leading-relaxed mb-8">
          Connectez votre compte Google pour accéder à vos données en temps réel et interagir
          directement depuis Bouba.
        </p>

        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={onConnect || (() => window.location.href = '/settings/connections')}
            className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            {meta.connectText}
          </button>
          <p className="text-xs text-muted">
            Sécurisé via OAuth 2.0 · Révocable à tout moment
          </p>
        </div>
      </motion.div>
    )
  }

  // ── Bar (connected, optional status) ────────────────────────────────────
  if (variant === 'bar' && !error) {
    return (
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-success/8 border-b border-success/20 text-xs"
          >
            <div className="flex items-center gap-2 text-success font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{meta.label} connecté — {lastSyncLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onSync}
                disabled={isLoading || isSyncing}
                className="flex items-center gap-1 text-primary font-bold hover:underline disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3 h-3', (isLoading || isSyncing) && 'animate-spin')} />
                Actualiser
              </button>
              <button onClick={() => setDismissed(true)} className="text-muted hover:text-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // ── Error bar ────────────────────────────────────────────────────────────
  if (error) {
    const isTokenError = error === 'TOKEN_EXPIRED'
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-warning/10 border-b border-warning/20 text-xs"
      >
        <div className="flex items-center gap-2 text-warning font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isTokenError
              ? `Session ${meta.label} expirée — reconnexion nécessaire`
              : `Erreur de synchronisation ${meta.label}`}
          </span>
        </div>
        <button
          onClick={isTokenError
            ? () => window.location.href = '/settings/connections'
            : onSync}
          className="text-primary font-bold hover:underline whitespace-nowrap"
        >
          {isTokenError ? 'Reconnecter' : 'Réessayer'}
        </button>
      </motion.div>
    )
  }

  return null
}

// ── Floating sync fab ────────────────────────────────────────────────────────

export function SyncFab({
  isLoading,
  isSyncing,
  lastSync,
  onSync,
}: {
  isLoading: boolean
  isSyncing: boolean
  lastSync?: string | null
  onSync: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onSync}
      disabled={isLoading || isSyncing}
      title={lastSync ? `Dernière sync: ${format(new Date(lastSync), 'HH:mm')}` : 'Synchroniser'}
      className="fixed bottom-24 right-4 lg:bottom-10 lg:right-24 z-30 w-11 h-11 bg-primary text-white rounded-full shadow-xl flex items-center justify-center disabled:opacity-50 hover:bg-primary-dark transition-colors"
    >
      {isLoading || isSyncing
        ? <Loader2 className="w-5 h-5 animate-spin" />
        : <RefreshCw className="w-5 h-5" />}
    </motion.button>
  )
}
