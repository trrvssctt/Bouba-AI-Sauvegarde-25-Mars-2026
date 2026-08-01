import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

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

// VERSION STATIQUE - PAS DE FETCH API, PAS DE BUG !
export const usePlansStatic = () => {
  // Plans HARDCODÉS - JAMAIS modifiés par l'API
  const staticPlans: Plan[] = [
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
      price: 990, // 9.90€ en centimes
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
      price: 2999, // 29.99€ en centimes
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
  
  const [plans] = useState<Plan[]>(staticPlans) // TOUJOURS les mêmes plans
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const { profile } = useAuth()

  // Select a plan
  const selectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setSelectedPlan(plan)
    }
  }

  // Format price for display - SIMPLE et FIABLE
  const formatPrice = (price: number): string => {
    if (price === 0) return 'Gratuit'
    
    // Convertir les centimes en euros
    const priceInEuros = price / 100
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: priceInEuros % 1 === 0 ? 0 : 2
    }).format(priceInEuros)
  }

  // Check if user has access to a feature
  const hasFeatureAccess = (feature: string): boolean => {
    if (!profile) return false

    const currentPlan = plans.find(p => p.id === profile.plan_id)
    if (!currentPlan) return false

    switch (feature) {
      case 'chat':
        return true
      case 'email':
        return true
      case 'contacts':
        return currentPlan.id === 'starter' || currentPlan.id === 'business'
      case 'calendar':
        return currentPlan.id === 'business'
      case 'finance':
        return currentPlan.id === 'business'
      default:
        return false
    }
  }

  // Get usage status
  const getUsageStatus = () => {
    if (!profile) return { percentage: 0, remaining: 0, limit: 0 }

    const { messages_used, messages_limit } = profile
    if (messages_limit === -1) {
      return { percentage: 0, remaining: -1, limit: -1 }
    }

    const percentage = Math.round((messages_used / messages_limit) * 100)
    const remaining = messages_limit - messages_used

    return { percentage, remaining, limit: messages_limit }
  }

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
    plans, // TOUJOURS les plans hardcodés
    selectedPlan,
    selectPlan,
    formatPrice,
    hasFeatureAccess,
    getUsageStatus,
    // PAS de refreshPlans, PAS de fetch API !
  }
}