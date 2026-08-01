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

export default function StoragePage() {
  const { profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedType, setSelectedType] = useState<string>('all')
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
        await new Promise(resolve => setTimeout(resolve, 1000))
        
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
          }
        ]
        
        setFiles(mockFiles)
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
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  
  // Obtenir l'icône du type
  const getTypeIcon = (type: StorageFile['type']) => {
    switch (type) {
      case 'folder': return <Folder className="w-5 h-5" />
      case 'document': return <File className="w-5 h-5" />
      case 'image': return <ImageIcon className="w-5 h-5" />
      default: return <File className="w-5 h-5" />
    }
  }
  
  // Obtenir la couleur du type
  const getTypeColor = (type: StorageFile['type']) => {
    switch (type) {
      case 'folder': return 'bg-blue-100 text-blue-800'
      case 'document': return 'bg-green-100 text-green-800'
      case 'image': return 'bg-purple-100 text-purple-800'
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
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="text-lg font-bold text-secondary mb-4">Fichiers récents</h3>
            
            {viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Nom</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Type</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Taille</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Modifié</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Propriétaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(file.type)}
                            <span className="font-medium text-secondary">{file.name}</span>
                            {file.starred && <Star className="w-4 h-4 text-yellow-500" />}
                            {file.shared && <Share2 className="w-4 h-4 text-blue-500" />}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(file.type)}`}>
                            {file.type === 'folder' ? 'Dossier' : 
                             file.type === 'document' ? 'Document' : 'Image'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-secondary">{file.size}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-secondary">{file.modified}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-secondary">{file.owner}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="border rounded-xl p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(file.type).split(' ')[0]}`}>
                        {getTypeIcon(file.type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-secondary">{file.name}</h4>
                        <p className="text-sm text-muted">{file.path}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>{file.size}</span>
                      <span>{file.modified}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {filteredFiles.length === 0 && (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun fichier trouvé</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}