import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  Video, 
  Users, 
  Calendar, 
  Clock, 
  Mic, 
  MessageSquare, 
  MoreVertical,
  Search,
  Filter,
  Plus,
  Play,
  StopCircle,
  Zap,
  Target
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import LockedFeaturePage from './LockedFeaturePage'

interface Meeting {
  id: string
  title: string
  description: string
  date: string
  time: string
  duration: number
  participants: number
  maxParticipants: number
  status: 'scheduled' | 'live' | 'ended'
  platform: 'Zoom' | 'Google Meet' | 'Microsoft Teams'
  recording: boolean
  organizer: string
}

export default function VideoPage() {
  const { profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  
  // Vérifier l'accès au plan - dans un useEffect
  useEffect(() => {
    // Toujours exécuter, même si hasFeatureAccess est undefined
    const access = hasFeatureAccess ? hasFeatureAccess('calendar') : false
    setHasAccess(access)
    setCheckingAccess(false)
  }, [profile, hasFeatureAccess])
  
  // Simuler le chargement des données - SEULEMENT si accès autorisé
  useEffect(() => {
    if (hasAccess !== true) return // Ne pas charger si pas d'accès
    
    const loadData = async () => {
      setLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockMeetings: Meeting[] = [
          {
            id: '1',
            title: 'Revue trimestrielle Q2',
            description: 'Présentation des résultats et planification Q3',
            date: '2026-04-15',
            time: '14:00',
            duration: 90,
            participants: 8,
            maxParticipants: 25,
            status: 'scheduled',
            platform: 'Zoom',
            recording: true,
            organizer: 'Marie Dubois'
          },
          {
            id: '2',
            title: 'Brainstorming produit',
            description: 'Nouvelles fonctionnalités et roadmap',
            date: '2026-04-14',
            time: '10:30',
            duration: 60,
            participants: 12,
            maxParticipants: 50,
            status: 'live',
            platform: 'Google Meet',
            recording: true,
            organizer: 'Jean Martin'
          },
          {
            id: '3',
            title: 'Formation équipe support',
            description: 'Nouveaux outils et procédures',
            date: '2026-04-13',
            time: '09:00',
            duration: 120,
            participants: 24,
            maxParticipants: 30,
            status: 'ended',
            platform: 'Microsoft Teams',
            recording: true,
            organizer: 'Sophie Bernard'
          }
        ]
        
        setMeetings(mockMeetings)
      } catch (error) {
        console.error('Error loading meetings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Filtrer les réunions
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meeting.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || meeting.status === selectedStatus
    const matchesPlatform = selectedPlatform === 'all' || meeting.platform === selectedPlatform
    
    return matchesSearch && matchesStatus && matchesPlatform
  })
  
  // Obtenir la couleur du statut
  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'live': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Obtenir le texte du statut
  const getStatusText = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'Planifiée'
      case 'live': return 'En cours'
      case 'ended': return 'Terminée'
    }
  }
  
  // Obtenir la couleur de la plateforme
  const getPlatformColor = (platform: Meeting['platform']) => {
    switch (platform) {
      case 'Zoom': return 'bg-blue-100 text-blue-800'
      case 'Google Meet': return 'bg-green-100 text-green-800'
      case 'Microsoft Teams': return 'bg-purple-100 text-purple-800'
    }
  }
  
  // Rendu conditionnel
  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (hasAccess === false) {
    return (
      <LockedFeaturePage
        featureName="Visioconférence (Zoom/Meet)"
        featureDescription="Planifiez, gérez et participez à des réunions vidéo avec Zoom, Google Meet et Microsoft Teams."
        requiredPlan="pro"
        currentPlan={profile?.plan_id}
        icon={<Video className="w-12 h-12" />}
      />
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-gray-50 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-secondary mb-2">
              <Video className="inline-block w-8 h-8 mr-3 text-primary" />
              Visioconférence
            </h1>
            <p className="text-muted">
              Gérez vos réunions avec Zoom, Google Meet et Microsoft Teams
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendrier
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle réunion
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Filters */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="glass-card p-6 mb-6">
            <h2 className="text-xl font-display font-bold text-secondary mb-4">Filtres</h2>
            
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Statut</label>
                <div className="space-y-2">
                  {['all', 'scheduled', 'live', 'ended'].map(status => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors',
                        selectedStatus === status
                          ? getStatusColor(status as Meeting['status'])
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {status === 'scheduled' ? <Calendar className="w-4 h-4" /> :
                         status === 'live' ? <Play className="w-4 h-4" /> :
                         status === 'ended' ? <StopCircle className="w-4 h-4" /> :
                         <Filter className="w-4 h-4" />}
                        <span>
                          {status === 'all' ? 'Toutes' : getStatusText(status as Meeting['status'])}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Right Column - Meetings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-display font-bold text-secondary">Réunions</h2>
              
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Rechercher des réunions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted">Chargement des réunions...</p>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-secondary font-medium">Aucune réunion trouvée</p>
                <p className="text-sm text-muted">Essayez de modifier vos filtres de recherche</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 rounded-xl border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-display font-bold text-secondary mb-1">
                              {meeting.title}
                            </h3>
                            <p className="text-sm text-muted mb-2">{meeting.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'px-2 py-1 text-xs rounded-full font-bold',
                              getStatusColor(meeting.status)
                            )}>
                              {getStatusText(meeting.status)}
                            </span>
                            <span className={cn(
                              'px-2 py-1 text-xs rounded-full font-bold',
                              getPlatformColor(meeting.platform)
                            )}>
                              {meeting.platform}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-muted" />
                            <span className="text-secondary">
                              {new Date(meeting.date).toLocaleDateString('fr-FR')} à {meeting.time}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-muted" />
                            <span className="text-secondary">{meeting.duration} min</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-muted" />
                            <span className="text-secondary">
                              {meeting.participants} participants
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {meeting.status === 'scheduled' || meeting.status === 'live' ? (
                          <button className="btn-primary flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Rejoindre
                          </button>
                        ) : meeting.recording ? (
                          <button className="btn-secondary flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Enregistrement
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* AI Features for Premium */}
          {profile?.plan_id === 'premium' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 mt-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-secondary">Assistant IA Réunions</h3>
                  <p className="text-sm text-muted">Exclusif Plan Premium : transcription automatique</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/50 rounded-xl border">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-secondary">Transcription</span>
                  </div>
                  <p className="text-xs text-muted">Transcription automatique des réunions</p>
                </div>
                
                <div className="p-4 bg-white/50 rounded-xl border">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-secondary">Résumé</span>
                  </div>
                  <p className="text-xs text-muted">Synthèse des points clés</p>
                </div>
                
                <div className="p-4 bg-white/50 rounded-xl border">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-secondary">Actions</span>
                  </div>
                  <p className="text-xs text-muted">Détection des tâches assignées</p>
                </div>
              </div>
              
              <button className="w-full mt-4 btn-primary flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Activer l'assistant IA
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
