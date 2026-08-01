import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Filter,
  Search,
  Download,
  MoreVertical,
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

interface Transaction {
  id: string
  invoice: string
  customer: string
  amount: number
  currency: string
  date: string
  method: 'Stripe' | 'PayPal' | 'Mobile Money' | 'Bank Transfer'
  status: 'success' | 'pending' | 'failed' | 'refunded'
  description: string
}

interface Subscription {
  id: string
  name: string
  price: number
  currency: string
  interval: 'monthly' | 'yearly'
  status: 'active' | 'canceled' | 'past_due'
  nextBilling: string
  customerCount: number
}

export default function PaymentsPage() {
  const { profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedMethod, setSelectedMethod] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week' | 'today'>('month')
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
        const mockTransactions: Transaction[] = [
          {
            id: '1',
            invoice: 'INV-2026-001',
            customer: 'Acme Corporation',
            amount: 2499.99,
            currency: 'EUR',
            date: '2026-04-14',
            method: 'Stripe',
            status: 'success',
            description: 'Abonnement Premium annuel'
          },
          {
            id: '2',
            invoice: 'INV-2026-002',
            customer: 'TechStart Inc.',
            amount: 499.99,
            currency: 'EUR',
            date: '2026-04-13',
            method: 'PayPal',
            status: 'pending',
            description: 'Formation équipe'
          },
          {
            id: '3',
            invoice: 'INV-2026-003',
            customer: 'Jean Dupont',
            amount: 29.99,
            currency: 'EUR',
            date: '2026-04-12',
            method: 'Mobile Money',
            status: 'success',
            description: 'Abonnement mensuel'
          },
          {
            id: '4',
            invoice: 'INV-2026-004',
            customer: 'Sarah Martin',
            amount: 149.99,
            currency: 'EUR',
            date: '2026-04-11',
            method: 'Bank Transfer',
            status: 'failed',
            description: 'Consultation premium'
          },
          {
            id: '5',
            invoice: 'INV-2026-005',
            customer: 'Global Solutions',
            amount: 9999.99,
            currency: 'EUR',
            date: '2026-04-10',
            method: 'Stripe',
            status: 'refunded',
            description: 'Licence entreprise'
          }
        ]
        
        const mockSubscriptions: Subscription[] = [
          {
            id: '1',
            name: 'Premium Annuel',
            price: 2499.99,
            currency: 'EUR',
            interval: 'yearly',
            status: 'active',
            nextBilling: '2027-04-14',
            customerCount: 42
          },
          {
            id: '2',
            name: 'Pro Mensuel',
            price: 499.99,
            currency: 'EUR',
            interval: 'monthly',
            status: 'active',
            nextBilling: '2026-05-13',
            customerCount: 128
          },
          {
            id: '3',
            name: 'Starter',
            price: 29.99,
            currency: 'EUR',
            interval: 'monthly',
            status: 'active',
            nextBilling: '2026-05-12',
            customerCount: 356
          },
          {
            id: '4',
            name: 'Enterprise',
            price: 9999.99,
            currency: 'EUR',
            interval: 'yearly',
            status: 'past_due',
            nextBilling: '2026-04-20',
            customerCount: 8
          }
        ]
        
        setTransactions(mockTransactions)
        setSubscriptions(mockSubscriptions)
      } catch (error) {
        console.error('Erreur chargement données:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [hasAccess])
  
  // Filtrer les transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (selectedStatus !== 'all' && transaction.status !== selectedStatus) return false
    if (selectedMethod !== 'all' && transaction.method !== selectedMethod) return false
    if (searchQuery && !transaction.customer.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  
  // Calculer les totaux
  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const pendingAmount = filteredTransactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const successCount = filteredTransactions.filter(t => t.status === 'success').length
  const pendingCount = filteredTransactions.filter(t => t.status === 'pending').length
  const failedCount = filteredTransactions.filter(t => t.status === 'failed').length
  
  // Obtenir la couleur du statut
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Obtenir le texte du statut
  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'success': return 'Réussi'
      case 'pending': return 'En attente'
      case 'failed': return 'Échoué'
      case 'refunded': return 'Remboursé'
    }
  }
  
  // Obtenir la couleur de la méthode
  const getMethodColor = (method: Transaction['method']) => {
    switch (method) {
      case 'Stripe': return 'bg-purple-100 text-purple-800'
      case 'PayPal': return 'bg-blue-100 text-blue-800'
      case 'Mobile Money': return 'bg-green-100 text-green-800'
      case 'Bank Transfer': return 'bg-gray-100 text-gray-800'
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
        featureName="Paiements (Stripe/PayPal)"
        featureDescription="Gérez vos paiements, factures, abonnements récurrents et transactions avec Stripe, PayPal et Mobile Money."
        requiredPlan="premium"
        currentPlan={profile?.plan_id}
        icon={<CreditCard className="w-12 h-12" />}
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
              <CreditCard className="inline-block w-8 h-8 mr-3 text-primary" />
              Paiements
            </h1>
            <p className="text-muted">
              Gérez vos transactions, abonnements et factures
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle facture
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Revenu total</span>
            </div>
            <p className="text-2xl font-bold text-secondary">
              {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">En attente</span>
            </div>
            <p className="text-2xl font-bold text-secondary">
              {pendingAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Transactions réussies</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{successCount}</p>
          </div>
          
          <div className="p-4 bg-white/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary">Abonnés actifs</span>
            </div>
            <p className="text-2xl font-bold text-secondary">
              {subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.customerCount, 0)}
            </p>
          </div>
        </div>
        
        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Rechercher un client, une facture..."
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
              <option value="success">Réussis</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoués</option>
              <option value="refunded">Remboursés</option>
            </select>
            
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Toutes les méthodes</option>
              <option value="Stripe">Stripe</option>
              <option value="PayPal">PayPal</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Virement</option>
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="month">Ce mois</option>
              <option value="week">Cette semaine</option>
              <option value="today">Aujourd'hui</option>
              <option value="all">Tout</option>
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
            {/* Transactions récentes */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-secondary">Transactions récentes</h3>
                  <button className="text-sm text-primary font-medium">Voir tout</button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Facture</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Client</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Montant</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Méthode</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Date</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Statut</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-secondary">{transaction.invoice}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-secondary">{transaction.customer}</p>
                            <p className="text-xs text-muted">{transaction.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-secondary">
                            {transaction.amount.toLocaleString('fr