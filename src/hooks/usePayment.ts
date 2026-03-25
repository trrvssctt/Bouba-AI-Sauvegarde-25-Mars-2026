import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export interface PaymentRecord {
  id: string
  user_id: string
  subscription_id?: string
  stripe_payment_intent_id?: string
  amount: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  stripe_subscription_id?: string
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing'
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export const usePayment = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { user, refreshProfile } = useAuth()

  // Fetch user payments
  const fetchPayments = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  // Fetch user subscription
  const fetchSubscription = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore "not found" error
      setSubscription(data || null)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  // Check payment status from URL parameters
  const checkPaymentStatusFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    const success = urlParams.get('success')
    const cancelled = urlParams.get('cancelled')

    if (sessionId && success === 'true') {
      verifyPaymentSession(sessionId)
    } else if (cancelled === 'true') {
      toast.error('Paiement annulé')
      clearPaymentStatus()
    }
  }

  // Verify payment session with backend
  const verifyPaymentSession = async (sessionId: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsSuccess(true)
        await refreshProfile()
        await fetchSubscription()
        await fetchPayments()
        
        // Clean up URL
        const url = new URL(window.location.href)
        url.searchParams.delete('session_id')
        url.searchParams.delete('success')
        window.history.replaceState({}, document.title, url.pathname + url.search)
      } else {
        throw new Error(data.error || 'Erreur lors de la vérification du paiement')
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error)
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Create Stripe customer
  const createStripeCustomer = async (email: string, name: string) => {
    try {
      const response = await fetch('/api/create-stripe-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      return data.customerId
    } catch (error: any) {
      console.error('Error creating Stripe customer:', error)
      throw error
    }
  }

  // Cancel subscription
  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!subscription?.stripe_subscription_id) {
      return { success: false, error: 'Aucun abonnement actif trouvé' }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Update local state
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null)
      
      // Refresh data
      await fetchSubscription()
      await refreshProfile()

      toast.success('Abonnement annulé avec succès')
      return { success: true }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error)
      toast.error(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Reactivate subscription
  const reactivateSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!subscription?.stripe_subscription_id) {
      return { success: false, error: 'Aucun abonnement trouvé' }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Update local state
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: false } : null)
      
      // Refresh data
      await fetchSubscription()
      await refreshProfile()

      toast.success('Abonnement réactivé avec succès')
      return { success: true }
    } catch (error: any) {
      console.error('Error reactivating subscription:', error)
      toast.error(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Clear payment status
  const clearPaymentStatus = () => {
    setIsSuccess(false)
    setIsProcessing(false)
  }

  // Get next billing date
  const getNextBillingDate = (): Date | null => {
    if (!subscription?.current_period_end) return null
    return new Date(subscription.current_period_end)
  }

  // Check if subscription is active
  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active' || subscription?.status === 'trialing'
  }

  // Initialize
  useEffect(() => {
    if (user) {
      fetchPayments()
      fetchSubscription()
    }
  }, [user])

  // Check for payment status in URL on mount
  useEffect(() => {
    checkPaymentStatusFromUrl()
  }, [])

  return {
    payments,
    subscription,
    loading,
    isProcessing,
    isSuccess,
    createStripeCustomer,
    cancelSubscription,
    reactivateSubscription,
    clearPaymentStatus,
    getNextBillingDate,
    isSubscriptionActive,
    refreshPayments: fetchPayments,
    refreshSubscription: fetchSubscription,
  }
}