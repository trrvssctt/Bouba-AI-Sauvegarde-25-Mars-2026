import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  CheckSquare, 
  Clock, 
  Users, 
  Target, 
  BarChart3, 
  Calendar, 
  Filter, 
  Search, 
  Plus, 
  MoreVertical,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  Edit3,
  Trash2,
  ArrowUpRight,
  Download,
  Share2
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import LockedFeaturePage from './LockedFeaturePage'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee: string
  dueDate: string
  tags: string[]
  progress: number
}

interface Project {
  id: string
  name: string
  description: string
  color: string
  taskCount: number
  completedTasks: number
  members: number
  deadline: string
}

export default function TrelloPage() {
  const { profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
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
        // Simuler un appel API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Données de test
        const mockTasks: Task[] = [
          {
            id: '1',
            title: 'Refonte de la page d\'accueil',
            description: 'Design responsive avec Tailwind CSS',
            status: 'in_progress',
            priority: 'high',
            assignee: 'Marie Dubois',
            dueDate: '2026-04-20',
            tags: ['Design', 'Frontend'],
            progress: 65
          },
          {
            id: '2',
            title: 'API Stripe intégration',
            description: 'Paiements récurrents et factures',
            status: 'todo',
            priority: 'critical',
            assignee: 'Jean Martin',
            dueDate: '2026-04-18',
            tags: ['Backend', 'Finance'],
            progress: 0
          },
          {
            id: '3',
            title: 'Tests unitaires',
            description: 'Couverture > 80% pour les composants critiques',
            status: 'review',
            priority: 'medium',
            assignee: 'Sophie Bernard',
            dueDate: '2026-04-22',
            tags: ['Testing', 'Quality'],
            progress: 100
          },
          {
            id: '4',
            title: 'Documentation API',
            description: 'Swagger et exemples d\'utilisation',
            status: 'done',
            priority: 'low',
            assignee: 'Thomas Leroy',
            dueDate: '2026-04-15',
            tags: ['Documentation'],
            progress: 100
          },
          {
            id: '5',
            title: 'Optimisation des performances',
            description: 'Réduction du temps de chargement',
            status: 'in_progress',
            priority: 'medium',
            assignee: 'Lucas Petit',
            dueDate: '2026-04-25',
            tags: ['Performance', 'Frontend'],
            progress: 40
          }
        ]
        
        const mockProjects: Project[] = [
          {
            id: '1',
            name: 'Bouba AI V2',
            description: 'Nouvelle version avec IA avancée',
            color: '#3B82F6',
            taskCount: 24,
            completedTasks: 18,
            members: 5,
            deadline: '2026-05-15'
          },
          {
            id: '2',
            name: 'Marketing Digital',
            description: 'Campagne Q2 2026',
            color: '#10B981',
            taskCount: 12,
            completedTasks: 8,
            members: 3,
            deadline: '2026-04-30'
          },
          {
            id: '3',
            name: 'Mobile App',
            description: 'Application iOS/Android',
            color: '#8B5CF6',
            taskCount: 32,
            completedTasks: 15,
            members: 7,
            deadline: '2026-06-30'
          },
          {
            id: '4',
            name: 'Infrastructure',
            description: 'Migration vers Kubernetes',
            color: '#F59E0B',
            taskCount: 18,
            completedTasks: 10,
            members: 4,
            deadline: '2026-05-30'
          }
        ]
        
        setTasks(mockTasks)
        setProjects(mockProjects)
      } catch (error) {
        console.error('Error loading tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Filtrer les tâches
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority
    
    return matchesSearch && matchesStatus && matchesPriority
  })
  
  // Obtenir l'icône de statut
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo': return <Clock className="w-4 h-4 text-gray-500" />
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-blue-500" />
      case 'review': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />
    }
  }
  
  // Obtenir la couleur de priorité
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
    }
  }
  
  // Obtenir le texte de priorité
  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'Basse'
      case 'medium': return 'Moyenne'
      case 'high': return 'Haute'
      case 'critical': return 'Critique'
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
        featureName="Gestion de Projets (Trello/Asana)"
        featureDescription="Planifiez, suivez et collaborez sur vos projets avec des tableaux Kanban, des échéances et des assignations d'équipe."
        requiredPlan="pro"
        currentPlan={profile?.plan_id}
        icon={<CheckSquare className="w-12 h-12" />}
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
              <CheckSquare className="inline-block w-8 h-8 mr-3 text-primary" />
              Gestion de Projets
            </h1>
            <p className="text-muted">
              Gérez vos tâches, projets et équipes avec des tableaux Kanban
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Partager
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouveau projet
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Tâches totales</p>
                <p className="text-2xl font-bold text-secondary">{tasks.length}</p>
              </div>
              <CheckSquare className="w-8 h-8 text-primary/30" />
            </div>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">En cours</p>
                <p className="text-2xl font-bold text-secondary">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <PlayCircle className="w-8 h-8 text-blue-500/30" />
            </div>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Terminées</p>
                <p className="text-2xl font-bold text-secondary">
                  {tasks.filter(t => t.status === 'done').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500/30" />
            </div>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Projets actifs</p>
                <p className="text-2xl font-bold text-secondary">{projects.length}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500/30" />
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Projects */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="glass-card p-6 mb-6">
            <h2 className="text-xl font-display font-bold text-secondary mb-4">Projets</h2>
            
            <div className="space-y-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="p-4 rounded-xl border hover:border-primary/30 transition-colors cursor-pointer group"
                  style={{ borderLeftColor: project.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold text-secondary group-hover:text-primary">
                        {project.name}
                      </h3>
                      <p className="text-sm text-muted mt-1">{project.description}</p>
                    </div>
                    <MoreVertical className="w-5 h-5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted" />
                        <span className="text-sm text-muted">{project.members}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckSquare className="w-4 h-4 text-muted" />
                        <span className="text-sm text-muted">
                          {project.completedTasks}/{project.taskCount}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted">
                      <Calendar className="inline-block w-3 h-3 mr-1" />
                      {new Date(project.deadline).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${(project.completedTasks / project.taskCount) * 100}%`,
                          backgroundColor: project.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-xl text-muted hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un projet
            </button>
          </div>
          
          {/* Filters */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-display font-bold text-secondary mb-4">Filtres</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'todo', 'in_progress', 'review', 'done'].map(status => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-colors',
                        selectedStatus === status
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {status === 'all' ? 'Tous' : 
                       status === 'todo' ? 'À faire' :
                       status === 'in_progress' ? 'En cours' :
                       status === 'review' ? 'En revue' : 'Terminé'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Priorité</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'low', 'medium', 'high', 'critical'].map(priority => (
                    <button
                      key={priority}
                      onClick={() => setSelectedPriority(priority)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-colors',
                        selectedPriority === priority
                          ? getPriorityColor(priority as Task['priority'])
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {priority === 'all' ? 'Toutes' : getPriorityText(priority as Task['priority'])}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Right Column - Tasks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-display font-bold text-secondary">Tâches</h2>
              
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Rechercher des tâches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                
                <button className="btn-secondary flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres
                </button>
              </div>
            </div>
            
            {/* Tasks Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Tâche</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Priorité</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Assigné à</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Échéance</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Progression</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-secondary">{task.title}</div>
                          <div className="text-sm text-muted mt-1">{task.description}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map(tag => (
                              <span 
                                key={tag} 
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-sm">
                            {task.status === 'todo' ? 'À faire' :
                             task.status === 'in_progress' ? 'En cours' :
                             task.status === 'review' ? 'En revue' : 'Terminé'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-secondary">{task.assignee}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-secondary">
                          {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted mt-1 text-center">{task.progress}%</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <Edit3 className="w-4 h-4 text-muted" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <Trash2 className="w-4 h-4 text-muted" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <ArrowUpRight className="w-4 h-4 text-muted" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary mb-2">Aucune tâche trouvée</h3>
                <p className="text-muted">Essayez de modifier vos filtres de recherche</p>
              </div>
            )}
          </div>
          
          {/* AI Assistant Section */}
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
                <h3 className="font-display font-bold text-secondary">Assistant IA Projets</h3>
                <p className="text-sm text-muted">Exclusif Plan Premium : analyse automatique des délais et suggestions</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/50 rounded-xl border">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-secondary">Analyse des délais</span>
                </div>
                <p className="text-xs text-muted">3 tâches risquent d'être en retard</p>
              </div>
              
              <div className="p-4 bg-white/50 rounded-xl border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-secondary">Optimisation équipe</span>
                </div>
                <p className="text-xs text-muted">Rééquilibrage suggéré pour 2 membres</p>
              </div>
              
              <div className="p-4 bg-white/50 rounded-xl border">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-secondary">Prédictions</span>
                </div>
                <p className="text-xs text-muted">87% de chances de respecter les délais</p>
              </div>
            </div>
            
            <button className="w-full mt-4 btn-primary flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Lancer l'analyse IA complète
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
