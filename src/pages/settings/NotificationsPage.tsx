import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Clock,
  Check,
  Loader2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react'
import { useAuth } from '@/src/hooks/useAuth'
import { useNotificationStore, AppNotification } from '@/src/stores/notificationStore'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'

// ─── Notification Inbox ───────────────────────────────────────────────────────
function NotificationInbox() {
  const { appNotifications, unreadAppNotifications, fetchAppNotifications, markAppNotificationRead, markAllAppNotificationsRead } = useNotificationStore()
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchAppNotifications()
    setLoading(false)
  }, [fetchAppNotifications])

  useEffect(() => { refresh() }, [refresh])

  const handleExpand = async (notif: AppNotification) => {
    const nextId = expandedId === notif.id ? null : notif.id
    setExpandedId(nextId)
    if (!notif.isRead && nextId === notif.id) {
      await markAppNotificationRead(notif.id)
    }
  }

  const TYPE_ICON: Record<string, React.ElementType> = {
    app: Bell,
    broadcast_app: Radio,
    email: Mail,
    broadcast_email: Radio,
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Mes notifications
              {unreadAppNotifications > 0 && (
                <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                  {unreadAppNotifications} nouvelle{unreadAppNotifications > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500">Messages envoyés par l'équipe Bouba'ia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadAppNotifications > 0 && (
            <button
              onClick={markAllAppNotificationsRead}
              className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
            </button>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
          >
            <Loader2 className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {appNotifications.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appNotifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell
            const isExpanded = expandedId === n.id
            return (
              <div
                key={n.id}
                className={cn(
                  'border rounded-xl overflow-hidden transition-colors',
                  n.isRead ? 'border-gray-100 bg-white' : 'border-blue-200 bg-blue-50/40'
                )}
              >
                <button
                  onClick={() => handleExpand(n)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('p-1.5 rounded-lg shrink-0', n.isRead ? 'bg-gray-100' : 'bg-blue-100')}>
                      <Icon className={cn('w-4 h-4', n.isRead ? 'text-gray-400' : 'text-blue-600')} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm leading-snug truncate', n.isRead ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold')}>
                        {n.subject || n.body.slice(0, 80)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(n.sentAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-100">
                        {n.subject && (
                          <p className="text-xs text-gray-500 mt-3 mb-1">
                            <span className="font-semibold">Sujet :</span> {n.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3">
                          {n.body}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const { profile, user } = useAuth()
  const [notifications, setNotifications] = useState({
    email: {
      enabled: true,
      newMessage: true,
      appointments: true,
      billing: true,
      updates: false
    },
    push: {
      enabled: true,
      newMessage: true,
      appointments: true,
      billing: false,
      updates: false
    },
    inApp: {
      enabled: true,
      sound: true,
      desktop: true
    }
  })

  const [quietHours, setQuietHours] = useState({
    enabled: true,
    start: '22:00',
    end: '08:00'
  })

  const handleToggle = (category: string, setting: string) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting]
      }
    }))
  }

  const handleSave = () => {
    toast.success('Préférences de notification sauvegardées !')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent flex items-center">
          <Bell className="w-8 h-8 mr-3 text-blue-600" />
          Notifications
        </h2>
        <p className="text-gray-600">Consultez vos messages et personnalisez vos alertes.</p>
      </motion.div>

      {/* Inbox — notifications envoyées par l'équipe */}
      <NotificationInbox />

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Email</p>
              <p className="text-lg font-bold text-blue-800">{notifications.email.enabled ? 'Activé' : 'Désactivé'}</p>
            </div>
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Push</p>
              <p className="text-lg font-bold text-green-800">{notifications.push.enabled ? 'Activé' : 'Désactivé'}</p>
            </div>
            <Smartphone className="w-6 h-6 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-4 border border-purple-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Bureau</p>
              <p className="text-lg font-bold text-purple-800">{notifications.inApp.desktop ? 'Activé' : 'Désactivé'}</p>
            </div>
            <Monitor className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Mode silence</p>
              <p className="text-lg font-bold text-orange-800">{quietHours.enabled ? 'Activé' : 'Désactivé'}</p>
            </div>
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </motion.div>

      {/* Email Notifications */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifications par email</h3>
              <p className="text-sm text-gray-600">Envoyer à {user?.email || 'votre adresse email'}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.email.enabled}
              onChange={() => handleToggle('email', 'enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="space-y-4 ml-14">
          {[
            { key: 'newMessage', label: 'Nouveaux messages reçus', desc: 'Quand un agent IA vous envoie une réponse' },
            { key: 'appointments', label: 'Rappels de rendez-vous', desc: '15 minutes avant vos événements' },
            { key: 'billing', label: 'Facturation et paiements', desc: 'Factures, renouvellements, échecs de paiement' },
            { key: 'updates', label: 'Mises à jour produit', desc: 'Nouvelles fonctionnalités et améliorations' }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email[item.key]}
                  onChange={() => handleToggle('email', item.key)}
                  disabled={!notifications.email.enabled}
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                  notifications.email.enabled ? 'peer-checked:bg-blue-600' : 'opacity-50'
                }`}></div>
              </label>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Push Notifications */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifications push</h3>
              <p className="text-sm text-gray-600">Alertes sur votre appareil</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.push.enabled}
              onChange={() => handleToggle('push', 'enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div className="space-y-4 ml-14">
          {[
            { key: 'newMessage', label: 'Messages instantanés', desc: 'Notifications push pour les nouveaux messages' },
            { key: 'appointments', label: 'Rappels de calendrier', desc: 'Alertes pour vos rendez-vous' },
            { key: 'billing', label: 'Alertes de paiement', desc: 'Problèmes de facturation urgents' },
            { key: 'updates', label: 'Annonces importantes', desc: 'Nouvelles fonctionnalités majeures' }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push[item.key]}
                  onChange={() => handleToggle('push', item.key)}
                  disabled={!notifications.push.enabled}
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                  notifications.push.enabled ? 'peer-checked:bg-green-600' : 'opacity-50'
                }`}></div>
              </label>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quiet Hours */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mode silence</h3>
              <p className="text-sm text-gray-600">Désactiver les notifications durant certaines heures</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={quietHours.enabled}
              onChange={() => setQuietHours(prev => ({ ...prev, enabled: !prev.enabled }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>
        
        {quietHours.enabled && (
          <div className="ml-14 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Début</label>
              <input
                type="time"
                value={quietHours.start}
                onChange={(e) => setQuietHours(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fin</label>
              <input
                type="time"
                value={quietHours.end}
                onChange={(e) => setQuietHours(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Save Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <button 
          onClick={handleSave}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Check className="w-5 h-5" />
          <span>Sauvegarder les préférences</span>
        </button>
      </motion.div>
    </div>
  )
}
