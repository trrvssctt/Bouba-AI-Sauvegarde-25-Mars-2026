#!/bin/bash
# Script pour corriger les erreurs React Hooks dans toutes les pages

echo "🔧 Correction des erreurs React Hooks..."
echo "=========================================="

PAGES=("VideoPage.tsx" "PaymentsPage.tsx" "StoragePage.tsx")

for page in "${PAGES[@]}"; do
    echo ""
    echo "📝 Correction de $page..."
    
    # Vérifier si le fichier existe
    if [ ! -f "src/pages/$page" ]; then
        echo "   ❌ Fichier non trouvé: src/pages/$page"
        continue
    fi
    
    # Créer une copie de sauvegarde
    cp "src/pages/$page" "src/pages/${page}.backup"
    
    # Extraire le nom du composant (sans .tsx)
    COMPONENT_NAME=$(echo "$page" | sed 's/\.tsx$//')
    
    # Créer le fichier corrigé
    cat > "src/pages/${page}.fixed" << 'EOF'
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
            title: 'Formation équipe commerciale',
            description: 'Nouveaux produits et techniques de vente',
            date: '2026-04-16',
            time: '10:00',
            duration: 120,
            participants: 15,
            maxParticipants: 30,
            status: 'scheduled',
            platform: 'Google Meet',
            recording: false,
            organizer: 'Jean Martin'
          },
          {
            id: '3',
            title: 'Réunion technique',
            description: 'Architecture microservices et déploiement',
            date: '2026-04-14',
            time: '16:00',
            duration: 60,
            participants: 6,
            maxParticipants: 10,
            status: 'ended',
            platform: 'Microsoft Teams',
            recording: true,
            organizer: 'Sophie Bernard'
          }
        ]
        
        setMeetings(mockMeetings)
      } catch (error) {
        console.error('Erreur chargement données:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [hasAccess])
  
  // Filtrer les réunions
  const filteredMeetings = meetings.filter(meeting => {
    if (selectedStatus !== 'all' && meeting.status !== selectedStatus) return false
    if (selectedPlatform !== 'all' && meeting.platform !== selectedPlatform) return false
    if (searchQuery && !meeting.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  
  // Obtenir le texte du statut
  const getStatusText = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'Planifiée'
      case 'live': return 'En direct'
      case 'ended': return 'Terminée'
    }
  }
  
  // Obtenir la couleur du statut
  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'live': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
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
              Gérez vos réunions Zoom, Google Meet et Microsoft Teams
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle réunion
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Play className="w-4 h-4" />
              Démarrer maintenant
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Réunions ce mois</span>
            </div>
            <p className="text-2xl font-bold text-secondary">12</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Heures totales</span>
            </div>
            <p className="text-2xl font-bold text-secondary">18.5h</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Participants moyens</span>
            </div>
            <p className="text-2xl font-bold text-secondary">9.2</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Enregistrements</span>
            </div>
            <p className="text-2xl font-bold text-secondary">8</p>
          </div>
        </div>
        
        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Rechercher une réunion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Tous les statuts</option>
              <option value="scheduled">Planifiées</option>
              <option value="live">En direct</option>
              <option value="ended">Terminées</option>
            </select>
            
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Toutes les plateformes</option>
              <option value="Zoom">Zoom</option>
              <option value="Google Meet">Google Meet</option>
              <option value="Microsoft Teams">Teams</option>
            </select>
            
            <button className="px-4 py-2.5 bg-white border rounded-xl hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Plus de filtres
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Contenu */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Liste des réunions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-secondary mb-1">{meeting.title}</h3>
                        <p className="text-sm text-muted line-clamp-2">{meeting.description}</p>
                      </div>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="w-4 h-4 text-muted" />
                      </button>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted" />
                        <span className="text-sm text-secondary">
                          {meeting.date} à {meeting.time} ({meeting.duration} min)
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted" />
                        <span className="text-sm text-secondary">
                          {meeting.participants}/{meeting.maxParticipants} participants
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(meeting.platform)}`}>
                          {meeting.platform}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                          {getStatusText(meeting.status)}
                        </span>
                        {meeting.recording && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Enregistrée
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Organisateur: {meeting.organizer}</span>
                      <button className="btn-primary text-sm py-1.5 px-4">
                        {meeting.status === 'scheduled' ? 'Rejoindre' : 'Voir détails'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Statistiques avancées */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-secondary">Analytique des réunions</h3>
                <button className="text-sm text-primary font-medium flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Optimiser
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-secondary">Engagement moyen</span>
                  </div>
                  <p className="text-xs text-muted">74% des participants restent jusqu'à la fin</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-secondary">Interactions</span>
                  </div>
                  <p className="text-xs text-muted">23 questions posées en moyenne par réunion</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <StopCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-secondary">Ponctualité</span>
                  </div>
                  <p className="text-xs text-muted">92% des réunions commencent à l'heure</p>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
EOF
    
    # Remplacer le fichier original
    mv "src/pages/${