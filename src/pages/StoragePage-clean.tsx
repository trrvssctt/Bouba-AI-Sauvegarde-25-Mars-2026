import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  Folder, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Download,
  Share2,
  Star,
  Trash2,
  Plus,
  BarChart3,
  Users,
  Zap,
  Target
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import LockedFeaturePage from './LockedFeaturePage'

interface StorageFile {
  id: string
  name: string
  type: 'folder' | 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other'
  size: string
  modified: string
  owner: string
  starred: boolean
  shared: boolean
  path: string
}

interface StorageService {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  used: number
  total: number
  files: number
  folders: number
}

export default function StoragePage() {
  const { profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const [files, setFiles] = useState<StorageFile[]>([])
  const [services, setServices] = useState<StorageService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  
  // Vérifier l'accès au plan - dans un useEffect
  useEffect(() => {
    // Toujours exécuter, même si hasFeatureAccess est undefined
    const access = hasFeatureAccess ? hasFeatureAccess('finance') : false
    setHasAccess(access)
    setCheckingAccess(false)
  }, [profile, hasFeatureAccess])
  
  // Simuler le chargement des données - SEULEMENT si accès autorisé
  useEffect(() => {
    if (hasAccess !== true) return // Ne pas charger si pas d'accès
    
    const loadData = async () => {
      setLoading(true)
      try {
        // Simuler un appel API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Données de test
        const mockFiles: StorageFile[] = [
          {
            id: '1',
            name: 'Documents clients',
            type: 'folder',
            size: '2.4 GB',
            modified: '2026-04-14',
            owner: 'Marie Dubois',
            starred: true,
            shared: true,
            path: '/Clients/2026'
          },
          {
            id: '2',
            name: 'Présentation Q2.pdf',
            type: 'document',
            size: '45 MB',
            modified: '2026-04-13',
            owner: 'Jean Martin',
            starred: false,
            shared: true,
            path: '/Présentations'
          },
          {
            id: '3',
            name: 'Logo entreprise.png',
            type: 'image',
            size: '8.2 MB',
            modified: '2026-04-12',
            owner: 'Sophie Bernard',
            starred: true,
            shared: false,
            path: '/Design/Logos'
          },
          {
            id: '4',
            name: 'Démo produit.mp4',
            type: 'video',
            size: '1.2 GB',
            modified: '2026-04-11',
            owner: 'Pierre Laurent',
            starred: false,
            shared: true,
            path: '/Marketing/Vidéos'
          },
          {
            id: '5',
            name: 'Archive backup.zip',
            type: 'archive',
            size: '4.7 GB',
            modified: '2026-04-10',
            owner: 'Admin',
            starred: false,
            shared: false,
            path: '/Backups'
          }
        ]
        
        const mockServices: StorageService[] = [
          {
            id: '1',
            name: 'Google Drive',
            icon: <Folder className="w-5 h-5" />,
            color: 'bg-blue-500',
            used: 42.5,
            total: 100,
            files: 1245,
            folders: 89
          },
          {
            id: '2',
            name: 'Dropbox',
            icon: <Folder className="w-5 h-5" />,
            color: 'bg-blue-600',
            used: 28.3,
            total: 50,
            files: 876,
            folders: 42
          },
          {
            id: '3',
            name: 'OneDrive',
            icon: <Folder className="w-5 h-5" />,
            color: 'bg-blue-700',
            used: 15.7,
            total: 100,
            files: 543,
            folders: 31
          },
          {
            id: '4',
            name: 'Local',
            icon: <Folder className="w-5 h-5" />,
            color: 'bg-gray-500',
            used: 87.2,
            total: 200,
            files: 2104,
            folders: 156
          }
        ]
        
        setFiles(mockFiles)
        setServices(mockServices)
      } catch (error) {
        console.error('Erreur chargement données:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [hasAccess])
  
  // Filtrer les fichiers
  const filteredFiles = files.filter(file => {
    if (selectedType !== 'all' && file.type !== selectedType) return false
    if (selectedService !== 'all') return false // Simplifié pour l'exemple
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  
  // Calculer les totaux
  const totalFiles = files.length
  const totalSize = files.reduce((sum, file) => {
    const sizeNum = parseFloat(file.size)
    return sum + (isNaN(sizeNum) ? 0 : sizeNum)
  }, 0)
  
  const starredCount = files.filter(f => f.starred).length
  const sharedCount = files.filter(f => f.shared).length
  
  // Obtenir l'icône du type
  const getTypeIcon = (type: StorageFile['type']) => {
    switch (type) {
      case 'folder': return <Folder className="w-5 h-5" />
      case 'document': return <File className="w-5 h-5" />
      case 'image': return <ImageIcon className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      case 'audio': return <Music className="w-5 h-5" />
      case 'archive': return <Archive className="w-5 h-5" />
      default: return <File className="w-5 h-5" />
    }
  }
  
  // Obtenir la couleur du type
  const getTypeColor = (type: StorageFile['type']) => {
    switch (type) {
      case 'folder': return 'bg-blue-100 text-blue-800'
      case 'document': return 'bg-green-100 text-green-800'
      case 'image': return 'bg-purple-100 text-purple-800'
      case 'video': return 'bg-red-100 text-red-800'
      case 'audio': return 'bg-yellow-100 text-yellow-800'
      case 'archive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
        featureName="Stockage Cloud (Dropbox/Drive)"
        featureDescription="Stockez, synchronisez et partagez vos fichiers dans le cloud avec Dropbox et Google Drive."
        requiredPlan="premium"
        currentPlan={profile?.plan_id}
        icon={<Folder className="w-12 h-12" />}
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
              <Folder className="inline-block w-8 h-8 mr-3 text-primary" />
              Stockage Cloud
            </h1>
            <p className="text-muted">
              Gérez vos fichiers sur Google Drive, Dropbox et OneDrive
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouveau dossier
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Téléverser
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Fichiers totaux</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{totalFiles}</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Espace utilisé</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{totalSize.toFixed(1)} GB</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Favoris</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{starredCount}</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Partagés</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{sharedCount}</p>
          </div>
        </div>
        
        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Rechercher un fichier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Tous les types</option>
              <option value="folder">Dossiers</option>
              <option value="document">Documents</option>
              <option value="image">Images</option>
              <option value="video">Vidéos</option>
              <option value="audio">Audio</option>
              <option value="archive">Archives</option>
            </select>
            
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Tous les services</option>
              <option value="drive">Google Drive</option>
              <option value="dropbox">Dropbox</option>
              <option value="onedrive">OneDrive</option>
              <option value="local">Local</option>
            </select>
            
            <div className="flex bg-white border rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
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
            {/* Services de stockage */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${service.color}`}>
                      {service.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-secondary">{service.name}</h3>
                      <p className="text-sm text-muted">
                        {service.used} GB / {service.total} GB
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">Utilisation</span>
                      <span className="font-medium">{((service.used / service.total) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${service.color.replace('bg-', 'bg-').split(' ')[0]}`}
                        style={{ width: `${(service.used / service.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">{service.files} fichiers</span>
                    <span className="text-muted">{service.folders} dossiers</span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Fichiers */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-secondary">Fichiers récents</h3>
                  <button className="text-sm text-primary font-medium">Voir tout</button>
                </div>
              </div>
              
              {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-3 px-