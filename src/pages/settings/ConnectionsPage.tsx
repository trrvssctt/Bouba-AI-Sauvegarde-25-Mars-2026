import { useState } from 'react'
import { motion } from 'motion/react'
import { Mail, Calendar, Users, Database, CheckCircle2, XCircle, RefreshCw, Plus, Settings, MessageSquare, FileText, Building2, Lock, Sparkles, Globe, Zap, BookOpen } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import { useConnections } from '@/src/hooks/useConnections'
import ConnectionSyncSettings from '@/src/components/connections/ConnectionSyncSettings'
import { toast } from 'sonner'

export default function ConnectionsPage() {
  const { user, profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const { connections, connect, disconnect, refreshConnection, updateSyncSettings, isConnecting } = useConnections()
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [syncSettingsModal, setSyncSettingsModal] = useState<{
    isOpen: boolean
    connectionId: string
    connectionName: string
    currentSettings: any
  } | null>(null)
  
  // Vérifier si le mode simulation est activé (développement)
  const isSimulationMode = import.meta.env.VITE_OAUTH_SIMULATION_MODE === 'true'
  const isDevelopment = import.meta.env.DEV
  
  const connectionIcons = {
    gmail: Mail,
    calendar: Calendar, 
    contacts: Users,
    trello: Database,
    googledrive: FileText,
    onedrive: FileText,
    dropbox: FileText,
    github: Globe,
    gitlab: Globe,
    mailchimp: MessageSquare,
    googlemeet: Sparkles,
    office365: Building2,
    slack: Zap,
    notion: BookOpen,
    hubspot: Globe
  }

  // URLs des vraies images/logos des services
  const connectionImages = {
    gmail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/1280px-Gmail_icon_%282020%29.svg.png',
    calendar: 'https://fonts.gstatic.com/s/i/productlogos/calendar_2020q4/v13/192px.svg',
    contacts: 'https://www.fredzone.org/wp-content/uploads/2024/09/google-contacts-logo.jpg',
    trello: 'https://cdn.worldvectorlogo.com/logos/trello.svg',
    googledrive: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Google_Drive_logo.png',
    onedrive: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Microsoft_OneDrive_logo.svg',
    dropbox: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Dropbox_Icon.svg',
    github: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    gitlab: 'https://about.gitlab.com/images/press/logo/png/gitlab-logo-gray-stacked-rgb.png',
    mailchimp: 'https://cdn.icon-icons.com/icons2/2699/PNG/512/mailchimp_logo_icon_170553.png',
    googlemeet: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Google_Meet_logo.png',
    slack: 'https://assets.mofoprod.net/network/images/slack.original_SS2PtGA.jpg',
    notion: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBYKPer6D47YDt-qdMVIEjaFYJA3mUMIMd-w&s',
    office365: null, // Pas d'image fournie
    hubspot: null // Pas d'image fournie
  }

  // Couleurs spécifiques aux marques
  const connectionColors = {
    gmail: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    calendar: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    contacts: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    trello: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    googledrive: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    onedrive: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    dropbox: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    github: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    gitlab: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    mailchimp: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    googlemeet: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    office365: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    slack: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    notion: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    hubspot: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' }
  }

  // Noms et informations spécifiques aux services
  const serviceInfo = {
    gmail: { name: 'Gmail', company: 'Google', category: 'Communication' },
    calendar: { name: 'Google Calendar', company: 'Google', category: 'Productivité' },
    contacts: { name: 'Google Contacts', company: 'Google', category: 'Communication' },
    trello: { name: 'Trello', company: 'Atlassian', category: 'Productivité' },
    googledrive: { name: 'Google Drive', company: 'Google', category: 'Données' },
    onedrive: { name: 'OneDrive', company: 'Microsoft', category: 'Données' },
    dropbox: { name: 'Dropbox', company: 'Dropbox Inc.', category: 'Données' },
    github: { name: 'GitHub', company: 'GitHub', category: 'Productivité' },
    gitlab: { name: 'GitLab', company: 'GitLab', category: 'Productivité' },
    mailchimp: { name: 'Mailchimp', company: 'Mailchimp', category: 'Communication' },
    googlemeet: { name: 'Google Meet', company: 'Google', category: 'Communication' },
    office365: { name: 'Microsoft 365', company: 'Microsoft', category: 'Productivité' },
    slack: { name: 'Slack', company: 'Slack Technologies', category: 'Communication' },
    notion: { name: 'Notion', company: 'Notion Labs', category: 'Données' },
    hubspot: { name: 'HubSpot CRM', company: 'HubSpot', category: 'Données' }
  }

  const handleSyncSettings = (connectionId: string, connectionName: string, currentSettings: any) => {
    setSyncSettingsModal({
      isOpen: true,
      connectionId,
      connectionName,
      currentSettings: currentSettings || {}
    })
  }

  const handleSaveSyncSettings = async (settings: any) => {
    if (!syncSettingsModal) return
    
    const result = await updateSyncSettings(syncSettingsModal.connectionId, settings)
    
    if (result.success) {
      setSyncSettingsModal(null)
      toast.success('Paramètres de synchronisation sauvegardés')
    } else {
      toast.error(result.error || 'Erreur lors de la sauvegarde')
    }
  }

  const handleCancelSyncSettings = () => {
    setSyncSettingsModal(null)
  }

  const handleConnect = async (connectionId: string) => {
    const access = getConnectionAccess(connectionId)
    if (!access.available) {
      toast.error(`Cette intégration nécessite le plan ${access.requiredPlan} ou supérieur.`)
      return
    }
    await connect(connectionId)
  }

  const handleDisconnect = async (connectionId: string) => {
    const access = getConnectionAccess(connectionId)
    if (!access.available) {
      toast.error(`Action non autorisée pour votre plan actuel.`)
      return
    }
    await disconnect(connectionId)
  }

  const handleRefresh = async (connectionId: string) => {
    setRefreshingId(connectionId)
    await refreshConnection(connectionId)
    setRefreshingId(null)
  }

  // Vérifier l'accès à une connexion spécifique selon le plan
  const getConnectionAccess = (connectionId: string) => {
    switch (connectionId) {
      case 'gmail':
        return { available: true, requiredPlan: 'Starter' } // Tous les plans
      case 'calendar':
      case 'contacts':
      case 'trello':
      case 'googledrive':
      case 'onedrive':
      case 'dropbox':
      case 'github':
      case 'gitlab':
      case 'mailchimp':
      case 'googlemeet':
        // Starter: verrouillé, Pro: disponible
        return { available: hasFeatureAccess('pro'), requiredPlan: 'Pro' }
      case 'office365':
      case 'slack':
      case 'notion':
      case 'hubspot':
        return { available: hasFeatureAccess('whitelabel'), requiredPlan: 'Enterprise' }
      default:
        return { available: false, requiredPlan: 'Enterprise' }
    }
  }

  // Composant pour afficher l'icône ou l'image 
  const ServiceIcon = ({ serviceId, className }: { serviceId: string, className?: string }) => {
    const imageUrl = connectionImages[serviceId as keyof typeof connectionImages]
    const IconComponent = connectionIcons[serviceId as keyof typeof connectionIcons] || Database

    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={serviceInfo[serviceId as keyof typeof serviceInfo]?.name || serviceId}
          className={cn("w-6 h-6 object-contain", className)}
          onError={(e) => {
            // Fallback vers l'icône si l'image ne charge pas
            e.currentTarget.style.display = 'none'
            const fallbackIcon = e.currentTarget.nextElementSibling as HTMLElement
            if (fallbackIcon) fallbackIcon.style.display = 'block'
          }}
        />
      )
    }

    return <IconComponent className={cn("w-6 h-6", className)} />
  }
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">Connexions</h2>
        <p className="text-gray-600">Gérez les intégrations avec vos outils tiers pour une expérience personnalisée.</p>
        
        {/* Plan limitations */}
        {!hasFeatureAccess('calendar') && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800">Fonctionnalités limitées</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Votre plan Starter inclut uniquement Gmail. 
                  <a href="/settings/plan" className="font-semibold underline ml-1">
                    Mettez à niveau vers Pro
                  </a> pour débloquer Calendar, Contacts et Finance.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Bannière Mode Développement */}
      {isDevelopment && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-start space-x-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                🔧 Mode Développement Detecté
                {isSimulationMode && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    Simulation OAuth activée
                  </span>
                )}
              </h3>
              <div className="text-sm text-blue-800 mt-1">
                {isSimulationMode ? (
                  <div className="space-y-1">
                    <p>✅ Les connexions OAuth seront simulées automatiquement (pas de vraies clés requises)</p>
                    <details className="cursor-pointer">
                      <summary className="font-medium hover:text-blue-900">
                        📖 Configurer les vraies clés OAuth (pour production)
                      </summary>
                      <div className="mt-2 pl-4 border-l-2 border-blue-200 text-xs">
                        <p>1. Consultez <code className="bg-blue-100 px-1 rounded">OAUTH_SETUP_GUIDE.md</code></p>
                        <p>2. Obtenez vos clés API auprès de chaque service</p>
                        <p>3. Remplacez les placeholders dans <code className="bg-blue-100 px-1 rounded">.env</code></p>
                        <p>4. Définissez <code className="bg-blue-100 px-1 rounded">VITE_OAUTH_SIMULATION_MODE=false</code></p>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p>⚠️ Certaines connexions peuvent échouer si les clés OAuth ne sont pas configurées</p>
                    <p>
                      💡 <span className="font-medium">Conseil:</span> Activez le mode simulation en définissant{' '}
                      <code className="bg-blue-100 px-1 rounded">VITE_OAUTH_SIMULATION_MODE=true</code> dans .env
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Connectées</p>
              <p className="text-2xl font-bold text-green-800">
                {(connections || []).filter(c => c.status === 'connected' && getConnectionAccess(c.id).available).length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Disponibles</p>
              <p className="text-2xl font-bold text-orange-800">
                {(connections || []).filter(c => getConnectionAccess(c.id).available && c.status !== 'connected').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Verrouillées</p>
              <p className="text-2xl font-bold text-purple-800">
                {(connections || []).filter(c => !getConnectionAccess(c.id).available).length}
              </p>
            </div>
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </motion.div>

      {/* Connections List */}
      <div className="space-y-6">
        {(!connections || connections.length === 0) ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            {/* Connexions recommandées par défaut */}
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Settings className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Configurez vos première connexions</h3>
              <p className="text-gray-600 mb-8">Connectez vos outils favoris pour une expérience personnalisée avec Bouba.</p>
            </div>

            {/* Services recommandés */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['gmail', 'calendar', 'contacts', 'trello', 'googledrive', 'onedrive', 'dropbox', 'github', 'gitlab', 'mailchimp', 'googlemeet', 'slack', 'notion', 'office365', 'hubspot'].map((serviceId) => {
                const access = getConnectionAccess(serviceId)
                const service = serviceInfo[serviceId as keyof typeof serviceInfo]
                const colors = connectionColors[serviceId as keyof typeof connectionColors]
                const isLocked = !access.available

                return (
                  <div 
                    key={serviceId}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      isLocked 
                        ? "bg-gray-50 border-gray-200 opacity-60" 
                        : "bg-white border-gray-200 hover:shadow-md cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "p-2 rounded-lg border flex items-center justify-center",
                        isLocked ? "bg-gray-200 text-gray-400 border-gray-300" : `${colors?.bg} ${colors?.text} ${colors?.border}`
                      )}>
                        <ServiceIcon serviceId={serviceId} className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={cn(
                          "font-semibold text-sm",
                          isLocked ? "text-gray-500" : "text-gray-900"
                        )}>
                          {service?.name}
                        </h4>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-medium",
                          isLocked ? "bg-gray-200 text-gray-500" : `${colors?.bg} ${colors?.text}`
                        )}>
                          {service?.company}
                        </span>
                      </div>
                    </div>
                    
                    {isLocked ? (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Nécessite {access.requiredPlan}+</p>
                        <button 
                          onClick={() => window.location.href = '/settings/plan'}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                        >
                          Mettre à niveau
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleConnect(serviceId)}
                        className={cn(
                          "w-full py-2 px-3 rounded-lg text-xs font-medium text-white transition-colors",
                          serviceId === 'gmail' ? "bg-red-600 hover:bg-red-700" :
                          serviceId === 'calendar' ? "bg-blue-600 hover:bg-blue-700" :
                          serviceId === 'contacts' ? "bg-green-600 hover:bg-green-700" :
                          serviceId === 'airtable' ? "bg-yellow-600 hover:bg-yellow-700" :
                          serviceId === 'slack' ? "bg-purple-600 hover:bg-purple-700" :
                          "bg-gray-700 hover:bg-gray-800"
                        )}
                      >
                        Connecter
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          ['Communication', 'Productivité', 'Données'].map((category, categoryIndex) => {
            const categoryConnections = (connections || []).filter(c => c.category === category)
            if (categoryConnections.length === 0) return null
          
            return (
              <motion.div 
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (categoryIndex * 0.1) }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                {category}
              </h3>
              
              <div className="space-y-4">
                {categoryConnections.map((item, index) => {
                  const connectionAccess = getConnectionAccess(item.id)
                  const isLocked = !connectionAccess.available
                  const brandColors = connectionColors[item.id as keyof typeof connectionColors] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' }
                  const service = serviceInfo[item.id as keyof typeof serviceInfo] || { name: item.name, company: 'Service', category: 'Autre' }
                  
                  return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (index * 0.1) }}
                    className={cn(
                      "rounded-2xl border p-6 shadow-sm transition-all duration-200 relative",
                      isLocked 
                        ? "bg-gray-50 border-gray-200 opacity-60" 
                        : "bg-white border-gray-200/60 hover:shadow-md"
                    )}
                  >
                    {/* Overlay pour les connexions verrouillées */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-orange-100/30 rounded-2xl pointer-events-none" />
                    )}
                    
                    <div className="flex items-center justify-between relative">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "p-3 rounded-xl transition-colors relative border flex items-center justify-center",
                          isLocked
                            ? "bg-gray-200 text-gray-400 border-gray-300"
                            : item.status === 'connected'
                              ? `${brandColors.bg} ${brandColors.text} ${brandColors.border}`
                              : `${brandColors.bg} ${brandColors.text} ${brandColors.border} opacity-60`
                        )}>
                          <ServiceIcon serviceId={item.id} className="w-6 h-6" />
                          {isLocked && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <Lock className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          
                          {/* Indicateur de connexion */}
                          {!isLocked && item.status === 'connected' && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                "text-lg font-semibold",
                                isLocked ? "text-gray-500" : "text-gray-900"
                              )}>
                                {service.name}
                              </h4>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                isLocked ? "bg-gray-200 text-gray-500" : `${brandColors.bg} ${brandColors.text}`
                              )}>
                                {service.company}
                              </span>
                            </div>
                            
                            {isLocked && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                                {connectionAccess.requiredPlan}+
                              </span>
                            )}
                            
                            {!isLocked && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                item.status === 'connected'
                                  ? "bg-green-100 text-green-700"
                                  : item.status === 'error'
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
                              )}>
                                {item.status === 'connected' ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : item.status === 'error' ? (
                                  <XCircle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {item.status === 'connected' ? 'Connecté' : item.status === 'error' ? 'Erreur' : 'Déconnecté'}
                              </div>
                            )}
                          </div>
                          
                          <p className={cn(
                            "text-sm",
                            isLocked ? "text-gray-400" : "text-gray-600"
                          )}>
                            {isLocked ? (
                              `🔒 Nécessite le plan ${connectionAccess.requiredPlan} ou supérieur pour se connecter à ${service.name}.`
                            ) : (
                              <>
                                {item.id === 'gmail' && '✉️ Lecture, envoi et organisation intelligente de vos emails avec IA avancée.'}
                                {item.id === 'calendar' && '📅 Planification intelligente, rappels automatiques et gestion complète de l\'agenda.'}
                                {item.id === 'contacts' && '👥 Synchronisation bidirectionnelle et enrichissement automatique des contacts.'}
                                {item.id === 'trello' && '🗂️ Gestion collaborative des tâches et projets.'}
                                {item.id === 'googledrive' && '☁️ Stockage et synchronisation de fichiers Google Drive.'}
                                {item.id === 'onedrive' && '☁️ Stockage et synchronisation de fichiers OneDrive.'}
                                {item.id === 'dropbox' && '☁️ Stockage et partage de documents Dropbox.'}
                                {item.id === 'github' && '💻 Suivi des projets de développement et notifications GitHub.'}
                                {item.id === 'gitlab' && '💻 Suivi des projets de développement et notifications GitLab.'}
                                {item.id === 'mailchimp' && '📧 Automatisation et gestion des campagnes emailing.'}
                                {item.id === 'googlemeet' && '🎥 Intégration de réunions vidéo Google Meet.'}
                                {item.id === 'office365' && '🏢 Écosystème Microsoft complet : Outlook, Teams, OneDrive et SharePoint.'}
                                {item.id === 'slack' && '⚡ Communication d\'équipe optimisée avec notifications intelligentes.'}
                                {item.id === 'notion' && '📚 Gestion des connaissances et synchronisation avec vos espaces de travail.'}
                                {item.id === 'hubspot' && '🎯 CRM professionnel pour le suivi commercial et la gestion client.'}
                              </>
                            )}
                          </p>
                          
                          {!isLocked && item.email && item.status === 'connected' && (
                            <div className="space-y-1">
                              <p className="text-xs text-blue-600 font-medium">{item.email}</p>
                              {item.lastSync && (
                                <p className="text-xs text-gray-500">
                                  Dernière sync: {new Date(item.lastSync).toLocaleString('fr-FR')}
                                  {item.syncCount !== undefined && ` • ${item.syncCount} éléments`}
                                </p>
                              )}
                            </div>
                          )}
                          {!isLocked && item.status === 'error' && item.errorMessage && (
                            <p className="text-xs text-red-600">Erreur: {item.errorMessage}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <button 
                            onClick={() => window.location.href = '/settings/plan'}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <Lock className="w-4 h-4" />
                            Mettre à niveau
                          </button>
                        ) : item.status === 'connected' ? (
                          <>
                            <button 
                              onClick={() => handleRefresh(item.id)}
                              disabled={refreshingId === item.id}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Synchroniser"
                            >
                              <RefreshCw className={cn(
                                "w-4 h-4",
                                refreshingId === item.id && "animate-spin"
                              )} />
                            </button>
                            <button 
                              onClick={() => handleDisconnect(item.id)}
                              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Déconnecter
                            </button>
                            <button 
                              onClick={() => handleSyncSettings(
                                item.id, 
                                service?.name || item.name, 
                                item.syncSettings
                              )}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Paramètres de synchronisation"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleConnect(item.id)}
                            disabled={isConnecting === item.id}
                            className={cn(
                              "px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white",
                              item.id === 'gmail' ? "bg-red-600 hover:bg-red-700" :
                              item.id === 'calendar' ? "bg-blue-600 hover:bg-blue-700" :
                              item.id === 'contacts' ? "bg-green-600 hover:bg-green-700" :
                              item.id === 'airtable' ? "bg-yellow-600 hover:bg-yellow-700" :
                              item.id === 'office365' ? "bg-blue-700 hover:bg-blue-800" :
                              item.id === 'slack' ? "bg-purple-600 hover:bg-purple-700" :
                              item.id === 'notion' ? "bg-gray-700 hover:bg-gray-800" :
                              item.id === 'hubspot' ? "bg-orange-600 hover:bg-orange-700" :
                              "bg-blue-600 hover:bg-blue-700"
                            )}
                          >
                            {isConnecting === item.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Connexion...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Connecter {service.name}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )
        })
        )}
      </div>

      {/* Modal de paramètres de synchronisation */}
      {syncSettingsModal && (
        <ConnectionSyncSettings
          isOpen={syncSettingsModal.isOpen}
          connectionId={syncSettingsModal.connectionId}
          connectionName={syncSettingsModal.connectionName}
          currentSettings={syncSettingsModal.currentSettings}
          onSave={handleSaveSyncSettings}
          onCancel={handleCancelSyncSettings}
        />
      )}
    </div>
  )
}
