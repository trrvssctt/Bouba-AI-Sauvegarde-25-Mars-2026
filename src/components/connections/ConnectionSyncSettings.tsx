import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  Check, 
  Settings, 
  Clock, 
  Calendar, 
  Mail, 
  Users, 
  FileText, 
  Tag, 
  Building2, 
  Zap,
  Save,
  X
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'

interface SyncOption {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  enabled: boolean
  required?: boolean
  subOptions?: SyncOption[]
}

interface ConnectionSyncSettingsProps {
  connectionId: string
  connectionName: string
  currentSettings: any
  onSave: (settings: any) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

export default function ConnectionSyncSettings({
  connectionId,
  connectionName, 
  currentSettings,
  onSave,
  onCancel,
  isOpen
}: ConnectionSyncSettingsProps) {
  const [syncSettings, setSyncSettings] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  // Configurations par service
  const getServiceSyncOptions = (serviceId: string): SyncOption[] => {
    switch (serviceId) {
      case 'gmail':
        return [
          {
            id: 'emails',
            label: 'Emails',
            description: 'Synchroniser tous les emails',
            icon: Mail,
            enabled: true,
            required: true,
            subOptions: [
              {
                id: 'inbox',
                label: 'Boîte de réception',
                description: 'Emails entrants non lus et importants',
                icon: Mail,
                enabled: true,
                required: true
              },
              {
                id: 'sent',
                label: 'Emails envoyés',
                description: 'Historique des emails envoyés',
                icon: Mail,
                enabled: true
              },
              {
                id: 'drafts',
                label: 'Brouillons',
                description: 'Emails en cours de rédaction',
                icon: FileText,
                enabled: false
              },
              {
                id: 'labels',
                label: 'Libellés Gmail',
                description: 'Catégories et étiquettes personnalisées',
                icon: Tag,
                enabled: true
              }
            ]
          },
          {
            id: 'contacts',
            label: 'Contacts Gmail',
            description: 'Contacts extraits des emails',
            icon: Users,
            enabled: true
          }
        ]

      case 'calendar':
        return [
          {
            id: 'events',
            label: 'Événements',
            description: 'Tous les événements du calendrier',
            icon: Calendar,
            enabled: true,
            required: true,
            subOptions: [
              {
                id: 'upcoming',
                label: 'Événements à venir',
                description: 'Les 30 prochains jours',
                icon: Calendar,
                enabled: true,
                required: true
              },
              {
                id: 'past',
                label: 'Historique',
                description: 'Événements des 90 derniers jours',
                icon: Clock,
                enabled: false
              },
              {
                id: 'recurring',
                label: 'Événements récurrents',
                description: 'Inclure les répétitions',
                icon: Calendar,
                enabled: true
              }
            ]
          },
          {
            id: 'calendars',
            label: 'Calendriers multiples',
            description: 'Synchroniser plusieurs calendriers',
            icon: Calendar,
            enabled: true
          }
        ]

      case 'contacts':
        return [
          {
            id: 'all_contacts',
            label: 'Tous les contacts',
            description: 'Carnet d\'adresses complet',
            icon: Users,
            enabled: true,
            required: true,
            subOptions: [
              {
                id: 'basic_info',
                label: 'Informations de base',
                description: 'Nom, email, téléphone',
                icon: Users,
                enabled: true,
                required: true
              },
              {
                id: 'social_profiles',
                label: 'Profils sociaux',
                description: 'LinkedIn, Twitter, etc.',
                icon: Users,
                enabled: true
              },
              {
                id: 'companies',
                label: 'Entreprises',
                description: 'Informations professionnelles',
                icon: Building2,
                enabled: true
              }
            ]
          }
        ]

      case 'airtable':
        return [
          {
            id: 'bases',
            label: 'Bases de données',
            description: 'Sélectionner les bases à synchroniser',
            icon: FileText,
            enabled: true,
            required: true
          },
          {
            id: 'records',
            label: 'Enregistrements',
            description: 'Données des tables sélectionnées',
            icon: FileText,
            enabled: true
          }
        ]

      case 'slack':
        return [
          {
            id: 'channels',
            label: 'Canaux',
            description: 'Messages des canaux publics',
            icon: Zap,
            enabled: true,
            subOptions: [
              {
                id: 'public_channels',
                label: 'Canaux publics',
                description: 'Historique des discussions publiques',
                icon: Zap,
                enabled: true
              },
              {
                id: 'direct_messages',
                label: 'Messages directs',
                description: 'Conversations privées',
                icon: Mail,
                enabled: false
              }
            ]
          }
        ]

      default:
        return [
          {
            id: 'default_sync',
            label: 'Synchronisation complète',
            description: 'Synchroniser toutes les données disponibles',
            icon: Settings,
            enabled: true,
            required: true
          }
        ]
    }
  }

  const [availableOptions, setAvailableOptions] = useState<SyncOption[]>([])

  useEffect(() => {
    const options = getServiceSyncOptions(connectionId)
    setAvailableOptions(options)
    
    // Initialiser les settings avec les valeurs actuelles ou par défaut
    const defaultSettings = {
      syncFrequency: currentSettings?.syncFrequency || 'hourly',
      autoSync: currentSettings?.autoSync !== false,
      syncOptions: currentSettings?.syncOptions || {},
      ...currentSettings
    }
    
    // S'assurer que toutes les options ont une valeur par défaut
    options.forEach(option => {
      if (defaultSettings.syncOptions[option.id] === undefined) {
        defaultSettings.syncOptions[option.id] = option.enabled
      }
      
      if (option.subOptions) {
        option.subOptions.forEach(subOption => {
          if (defaultSettings.syncOptions[`${option.id}.${subOption.id}`] === undefined) {
            defaultSettings.syncOptions[`${option.id}.${subOption.id}`] = subOption.enabled
          }
        })
      }
    })
    
    setSyncSettings(defaultSettings)
  }, [connectionId, currentSettings])

  const handleOptionToggle = (optionId: string, subOptionId?: string) => {
    const key = subOptionId ? `${optionId}.${subOptionId}` : optionId
    const isRequired = subOptionId 
      ? availableOptions.find(o => o.id === optionId)?.subOptions?.find(s => s.id === subOptionId)?.required
      : availableOptions.find(o => o.id === optionId)?.required
    
    if (isRequired) {
      toast.warning('Cette option est requise et ne peut pas être désactivée')
      return
    }
    
    setSyncSettings(prev => ({
      ...prev,
      syncOptions: {
        ...prev.syncOptions,
        [key]: !prev.syncOptions[key]
      }
    }))
  }

  const handleFrequencyChange = (frequency: string) => {
    setSyncSettings(prev => ({
      ...prev,
      syncFrequency: frequency
    }))
  }

  const handleAutoSyncToggle = () => {
    setSyncSettings(prev => ({
      ...prev,
      autoSync: !prev.autoSync
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(syncSettings)
      toast.success('Paramètres de synchronisation sauvegardés')
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde des paramètres')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Paramètres de synchronisation
            </h2>
            <p className="text-gray-600 mt-1">
              Configuration pour {connectionName}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fréquence de synchronisation */}
        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Fréquence de synchronisation
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'realtime', label: 'Temps réel', desc: 'Instantané' },
              { value: 'hourly', label: 'Horaire', desc: 'Chaque heure' },
              { value: 'daily', label: 'Quotidien', desc: 'Une fois/jour' },
              { value: 'manual', label: 'Manuel', desc: 'Sur demande' }
            ].map(freq => (
              <button
                key={freq.value}
                onClick={() => handleFrequencyChange(freq.value)}
                className={cn(
                  'p-3 rounded-lg text-sm text-center transition-all',
                  syncSettings.syncFrequency === freq.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 hover:border-blue-300'
                )}
              >
                <div className="font-medium">{freq.label}</div>
                <div className={cn(
                  'text-xs',
                  syncSettings.syncFrequency === freq.value 
                    ? 'text-blue-100' 
                    : 'text-gray-500'
                )}>
                  {freq.desc}
                </div>
              </button>
            ))}
          </div>
          
          {/* Toggle auto-sync */}
          <div className="mt-4 flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
            <div>
              <div className="font-medium text-gray-900">Synchronisation automatique</div>
              <div className="text-sm text-gray-600">
                Synchronise automatiquement selon la fréquence choisie
              </div>
            </div>
            <button
              onClick={handleAutoSyncToggle}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                syncSettings.autoSync ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5',
                syncSettings.autoSync ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>

        {/* Options de synchronisation */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Données à synchroniser
          </h3>
          
          {availableOptions.map(option => {
            const OptionIcon = option.icon
            const isOptionEnabled = syncSettings.syncOptions?.[option.id]
            
            return (
              <div key={option.id} className="space-y-3">
                {/* Option principale */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      isOptionEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                    )}>
                      <OptionIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        {option.label}
                        {option.required && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            Requis
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOptionToggle(option.id)}
                    disabled={option.required}
                    className={cn(
                      'w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
                      isOptionEnabled 
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-gray-400',
                      option.required && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isOptionEnabled && <Check className="w-4 h-4" />}
                  </button>
                </div>

                {/* Sous-options */}
                {option.subOptions && isOptionEnabled && (
                  <div className="ml-8 space-y-2">
                    {option.subOptions.map(subOption => {
                      const SubIcon = subOption.icon
                      const isSubOptionEnabled = syncSettings.syncOptions?.[`${option.id}.${subOption.id}`]
                      
                      return (
                        <div key={subOption.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-start space-x-3">
                            <div className={cn(
                              'p-1.5 rounded',
                              isSubOptionEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                            )}>
                              <SubIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900 flex items-center">
                                {subOption.label}
                                {subOption.required && (
                                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                                    Requis
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {subOption.description}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOptionToggle(option.id, subOption.id)}
                            disabled={subOption.required}
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                              isSubOptionEnabled 
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-300 hover:border-gray-400',
                              subOption.required && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {isSubOptionEnabled && <Check className="w-3 h-3" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sauvegarde...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}