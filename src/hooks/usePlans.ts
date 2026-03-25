import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { apiCall } from '@/src/lib/api'

export interface Plan {
  id: string
  name: string
  description: string
  price: number // Prix en centimes
  currency: string
  billing_interval: 'monthly' | 'yearly'
  trial_days: number
  agents_limit: number // -1 pour illimité
  messages_limit: number // -1 pour illimité
  features: string[]
  limits: Record<string, any>
  stripe_price_id?: string
  popular: boolean
  active: boolean
  created_at: string
}

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, profile } = useAuth()

  // Fetch available plans via API
  const fetchPlans = async () => {
    try {
      const response = await apiCall<Plan[]>('/data/plans')
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setPlans(response.data)
      } else {
        console.log('API response not an array:', response)
        // Si pas de données, utiliser des plans par défaut pour le développement
        const defaultPlans: Plan[] = [
          {
            id: 'starter',
            name: 'Bouba Starter',
            description: 'Parfait pour découvrir Bouba et commencer votre productivité',
            price: 0,
            currency: 'EUR',
            billing_interval: 'monthly',
            trial_days: 0,
            agents_limit: 1,
            messages_limit: 500,
            features: [
              'Gmail uniquement',
              'Mémoire session',
              'Support communauté'
            ],
            limits: {
              rag: false,
              web_search: false,
              finance: false,
              api_access: false,
              white_label: false
            },
            popular: false,
            active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'pro',
            name: 'Bouba Pro',
            description: 'Fonctionnalités avancées pour les professionnels et équipes',
            price: 2900, // 29.00€ en centimes
            currency: 'EUR',
            billing_interval: 'monthly',
            trial_days: 7,
            agents_limit: 4,
            messages_limit: 10000,
            features: [
              'Gmail + Calendar + Contacts',
              'Finance Airtable',
              'RAG Pinecone',
              'Recherche web Tavily',
              'Mémoire 30 jours',
              'Support email 48h'
            ],
            limits: {
              rag: false,
              web_search: true,
              finance: true,
              api_access: false,
              white_label: false
            },
            stripe_price_id: 'price_pro_monthly',
            popular: true,
            active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'enterprise',
            name: 'Bouba Enterprise',
            description: 'Solution complète pour les grandes équipes et entreprises',
            price: 9900, // 99.00€ en centimes
            currency: 'EUR',
            billing_interval: 'monthly',
            trial_days: 14,
            agents_limit: -1,
            messages_limit: -1,
            features: [
              'Toutes les intégrations',
              'Finance custom DB',
              'RAG custom',
              'Mémoire illimitée',
              'Support dédié SLA 4h',
              'API Access',
              'White-label'
            ],
            limits: {
              rag: true,
              web_search: true,
              finance: true,
              api_access: true,
              white_label: true
            },
            stripe_price_id: 'price_enterprise_monthly',
            popular: false,
            active: true,
            created_at: new Date().toISOString()
          }
        ]
        setPlans(defaultPlans)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Erreur lors du chargement des plans')
      
      // Mettre des plans par défaut même en cas d'erreur pour éviter les bugs
      const defaultPlans: Plan[] = [
        {
          id: 'starter',
          name: 'Bouba Starter',
          description: 'Parfait pour découvrir Bouba',
          price: 0,
          currency: 'EUR',
          billing_interval: 'monthly',
          trial_days: 0,
          agents_limit: 1,
          messages_limit: 500,
          features: ['Gmail', 'Support'],
          limits: { rag: false, web_search: false, finance: false, api_access: false, white_label: false },
          popular: false,
          active: true,
          created_at: new Date().toISOString()
        }
      ]
      setPlans(defaultPlans)
    }
  }

  // Select a plan
  const selectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setSelectedPlan(plan)
    }
  }

  // Format price for display
  const formatPrice = (priceInCents: number): string => {
    if (priceInCents === 0) return 'Gratuit'
    return `${(priceInCents / 100).toFixed(0)}€`
  }

  // Check if user has access to a feature
  const hasFeatureAccess = (feature: string): boolean => {
    if (!profile) return false

    const currentPlan = plans.find(p => p.id === profile.plan_id)
    if (!currentPlan) return false

    // Check specific features based on plan limits
    switch (feature) {
      case 'gmail':
        return true // All plans have Gmail
      case 'calendar':
      case 'contacts':
        return currentPlan.id !== 'starter'
      case 'finance':
        return currentPlan.limits.finance || false
      case 'rag':
      case 'vector_store':
      case 'knowledge':
        return currentPlan.id === 'enterprise' // Enterprise uniquement
      case 'search':
      case 'web_search':
        return currentPlan.limits.web_search || false
      case 'api':
        return currentPlan.limits.api_access || false
      case 'whitelabel':
      case 'white_label':
        return currentPlan.limits.white_label || false
      case 'unlimited_memory':
        return currentPlan.id === 'enterprise'
      case 'custom_db':
        return currentPlan.id === 'enterprise'
      default:
        return false
    }
  }

  // Get usage status
  const getUsageStatus = () => {
    if (!profile) return { percentage: 0, remaining: 0, limit: 0 }

    const { messages_used, messages_limit } = profile
    if (messages_limit === -1 || messages_limit === 999999999) {
      return { percentage: 0, remaining: -1, limit: -1 } // Unlimited
    }

    const percentage = Math.round((messages_used / messages_limit) * 100)
    const remaining = messages_limit - messages_used

    return { percentage, remaining, limit: messages_limit }
  }

  // Subscribe to a plan
  const subscribeToPlan = async (planId: string): Promise<{ success: boolean; error?: string; checkoutUrl?: string }> => {
    if (!user) {
      return { success: false, error: 'Utilisateur non connecté' }
    }

    const plan = plans.find(p => p.id === planId)
    if (!plan) {
      return { success: false, error: 'Plan introuvable' }
    }

    if (plan.price === 0) {
      // Free plan - update directly via API
      try {
        const response = await apiCall('/data/subscription', {
          method: 'POST',
          body: JSON.stringify({
            plan_id: planId,
            status: 'active'
          })
        })

        if (response.success) {
          toast.success('Plan mis à jour avec succès !')
          return { success: true }
        } else {
          return { success: false, error: response.error || 'Erreur lors de la mise à jour' }
        }
      } catch (error: any) {
        console.error('Error updating to free plan:', error)
        return { success: false, error: error.message }
      }
    } else {
      // Paid plan - create Stripe checkout session via API
      setLoading(true)
      try {
        const response = await apiCall<{ url: string }>('/payments/checkout', {
          method: 'POST',
          body: JSON.stringify({ planId })
        })

        if (response.success && response.data?.url) {
          // Redirect to Stripe Checkout
          window.location.href = response.data.url
          return { success: true, checkoutUrl: response.data.url }
        } else {
          return { success: false, error: response.error || 'Erreur lors de la création de la session de paiement' }
        }
      } catch (error: any) {
        console.error('Error creating checkout session:', error)
        toast.error(error.message)
        return { success: false, error: error.message }
      } finally {
        setLoading(false)
      }
    }
  }

  // Initialize plans
  useEffect(() => {
    fetchPlans()
  }, [])

  // Set current plan as selected if user has one
  useEffect(() => {
    if (profile && plans.length > 0 && !selectedPlan) {
      const currentPlan = plans.find(p => p.id === profile.plan_id)
      if (currentPlan) {
        setSelectedPlan(currentPlan)
      }
    }
  }, [profile, plans, selectedPlan])

  return {
    plans,
    selectedPlan,
    loading,
    selectPlan,
    subscribeToPlan,
    formatPrice,
    hasFeatureAccess,
    getUsageStatus,
    refreshPlans: fetchPlans,
  }
}