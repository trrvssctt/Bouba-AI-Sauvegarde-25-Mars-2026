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
  // Plans par défaut avec prix CORRECTS (en euros convertis en centimes pour Stripe)
  const defaultPlans: Plan[] = [
    {
      id: 'free',
      name: 'Bouba Free',
      description: 'Parfait pour découvrir Bouba',
      price: 0, // Gratuit
      currency: 'EUR',
      billing_interval: 'monthly' as const,
      trial_days: 0,
      agents_limit: 1,
      messages_limit: 500,
      features: ['Chat IA (500 messages/mois)', 'Email'],
      limits: { 
        agents: 1, 
        messages: 500,
        emails: 100,
        contacts: 0,
        calendar: false,
        finance: false
      },
      stripe_price_id: undefined,
      popular: false,
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'starter',
      name: 'Bouba Starter',
      description: 'Pour les freelances et petites équipes',
      price: 990, // 9.90€ en centimes pour Stripe
      currency: 'EUR',
      billing_interval: 'monthly' as const,
      trial_days: 7,
      agents_limit: 2,
      messages_limit: 10000,
      features: ['Chat IA (10,000 messages/mois)', 'Email', 'Contacts', 'Calendrier'],
      limits: { 
        agents: 2, 
        messages: 10000,
        emails: 1000,
        contacts: 500,
        calendar: true,
        finance: false
      },
      stripe_price_id: 'price_starter_monthly',
      popular: true,
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'business',
      name: 'Bouba Business',
      description: 'Solution complète pour les entreprises',
      price: 2999, // 29.99€ en centimes pour Stripe
      currency: 'EUR',
      billing_interval: 'monthly' as const,
      trial_days: 14,
      agents_limit: 5,
      messages_limit: -1,
      features: ['Chat IA (illimité)', 'Email', 'Contacts', 'Calendrier', 'Finance avec documents', 'API Access'],
      limits: { 
        agents: 5, 
        messages: -1,
        emails: 5000,
        contacts: 2000,
        calendar: true,
        finance: true,
        api_access: true
      },
      stripe_price_id: 'price_business_monthly',
      popular: false,
      active: true,
      created_at: new Date().toISOString()
    }
  ];
  
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, profile } = useAuth()

  // Fetch available plans via API
  const fetchPlans = async () => {
    try {
      console.log('🔄 usePlans: Fetching plans from API...')
      const response = await apiCall<Plan[]>('/api/data/plans')
      
      console.log('📦 usePlans: API Response:', response)
      
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('✅ usePlans: Setting plans from API:', response.data.length, 'plans')
        console.log('💰 usePlans: First plan price:', response.data[0]?.price)
        setPlans(response.data)
      } else {
        console.warn('⚠️ usePlans: API returned no valid data, keeping default plans')
        // Garder les plans par défaut initiaux
      }
    } catch (error) {
      console.error('❌ usePlans: Error fetching plans:', error)
      toast.error('Erreur lors du chargement des plans')
      // En cas d'erreur, garder les plans par défaut initiaux
    }
  }

  // Select a plan
  const selectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setSelectedPlan(plan)
    }
  }

  // Format price for display - FIXED BUG: some prices are in euros, not cents
  const formatPrice = (price: number): string => {
    console.log('💰 formatPrice called with:', price, typeof price)
    
    if (price === 0) return 'Gratuit'
    
    // Vérifier si le prix est en centimes (généralement > 100) ou en euros
    const isLikelyCents = price > 100 && price % 100 === 0
    const priceInEuros = isLikelyCents ? price / 100 : price
    
    console.log('💰 formatPrice: isLikelyCents:', isLikelyCents, 'priceInEuros:', priceInEuros)
    
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: priceInEuros % 1 === 0 ? 0 : 2
    }).format(priceInEuros)
    
    console.log('💰 formatPrice result:', formatted)
    return formatted
  }

  // Check if user has access to a feature
  const hasFeatureAccess = (feature: string): boolean => {
    console.log('🔍 usePlans: hasFeatureAccess called:', { 
      feature, 
      hasProfile: !!profile,
      profilePlanId: profile?.plan_id,
      plansCount: plans.length
    })
    
    if (!profile) {
      console.log('⚠️ usePlans: No profile, returning false')
      return false
    }

    const currentPlan = plans.find(p => p.id === profile.plan_id)
    console.log('🔍 usePlans: Current plan:', { 
      found: !!currentPlan,
      planId: currentPlan?.id,
      planName: currentPlan?.name
    })
    
    if (!currentPlan) {
      console.log('⚠️ usePlans: No current plan found, returning false')
      return false
    }

    // Vérifier l'accès aux fonctionnalités selon le plan
    let hasAccess = false;
    switch (feature) {
      case 'chat':
        hasAccess = true // Tous les plans ont le chat
        break;
      case 'email':
        hasAccess = true // Tous les plans ont l'email
        break;
      case 'contacts':
        // Free n'a pas de contacts, Starter et Business oui
        hasAccess = currentPlan.id === 'starter' || currentPlan.id === 'business'
        break;
      case 'calendar':
        // Seulement Business a le calendrier
        hasAccess = currentPlan.id === 'business'
        break;
      case 'finance':
        // Seulement Business a la finance
        hasAccess = currentPlan.id === 'business'
        break;
      case 'gmail':
        hasAccess = true // Tous les plans ont Gmail
        break;
      case 'rag':
      case 'vector_store':
      case 'knowledge':
        hasAccess = currentPlan.id === 'business' // Business uniquement
        break;
      case 'search':
      case 'web_search':
        return currentPlan.limits.web_search || false
      case 'api':
        return currentPlan.limits.api_access || false
      case 'whitelabel':
      case 'white_label':
        hasAccess = currentPlan.limits.white_label || false
        break;
      case 'unlimited_memory':
        hasAccess = currentPlan.id === 'business'
        break;
      case 'custom_db':
        hasAccess = currentPlan.id === 'business'
        break;
      default:
        hasAccess = false
    }
    
    console.log('✅ usePlans: hasFeatureAccess result:', { feature, hasAccess, planId: currentPlan?.id })
    return hasAccess
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
        const response = await apiCall('/api/data/subscription', {
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