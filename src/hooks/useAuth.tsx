import { useEffect, useState, createContext, useContext } from 'react'
import type { ReactNode, FC } from 'react'
import { toast } from 'sonner'
import { apiCall } from '@/src/lib/api'

export interface User {
  id: string
  email: string
  email_verified: boolean
  name?: string
  image?: string
  provider: 'google' | 'email' | 'magic_link'
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  role: 'user' | 'admin' | 'superadmin'
  role_id?: string           // UUID de la ligne dans public.roles
  work_type?: string
  timezone?: string
  language?: string
  onboarding_complete: boolean
  plan_id: string
  messages_used: number
  messages_limit: number
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due'
  stripe_customer_id?: string
  avatar_url?: string
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserWithProfile extends User {
  profile?: UserProfile
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  initialized: boolean
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectTo?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>
  refreshProfile: () => Promise<void>
  incrementLocalUsage: () => void
  checkUsageLimit: (agentType?: string) => Promise<boolean>
  incrementUsage: (agentType?: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useAuthState = (): AuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    initialized: false,
  })

  // Fetch current user from API
  // /api/auth/me returns { success: true, user: {...} } — not { success: true, data: {...} }
  const fetchCurrentUser = async (): Promise<UserWithProfile | null> => {
    try {
      const response = await apiCall<any>('/auth/me')
      if (!response.success || !response.data) return null

      // apiCall wraps the raw body in .data when there's no top-level "data" key.
      // Raw body structure: { success: true, user: { id, email, role, onboardingComplete, ... } }
      const raw = response.data
      const userData = raw?.user ?? raw

      if (!userData?.id) return null
      return userData as UserWithProfile
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  }

  // Update profile via API
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authState.user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const response = await apiCall<UserProfile>(`/data/profiles/${authState.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updates })
      })

      if (response.success && response.data) {
        setAuthState(prev => ({ 
          ...prev, 
          profile: response.data 
        }))
        return { success: true }
      } else {
        return { success: false, error: response.error || 'Failed to update profile' }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (!authState.user) return

    try {
      const response = await apiCall<UserProfile>(`/data/profiles/${authState.user.id}`)
      if (response.success && response.data) {
        setAuthState(prev => ({ ...prev, profile: response.data }))
      }
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  // Optimistic local increment — no API call, updates UI instantly
  const incrementLocalUsage = () => {
    setAuthState(prev => {
      if (!prev.profile) return prev
      const limit = prev.profile.messages_limit
      if (limit === -1 || limit === 999999999) return prev // unlimited — nothing to show
      return {
        ...prev,
        profile: {
          ...prev.profile,
          messages_used: (prev.profile.messages_used || 0) + 1,
        },
      }
    })
  }

  // Check if user can make more requests
  const checkUsageLimit = async (_agentType = 'chat'): Promise<boolean> => {
    if (!authState.profile) return false

    const { messages_used, messages_limit } = authState.profile
    
    // Unlimited plan
    if (messages_limit === -1 || messages_limit === 999999999) return true
    
    return messages_used < messages_limit
  }

  // Increment usage count
  const incrementUsage = async (agentType = 'chat'): Promise<boolean> => {
    if (!authState.user) return false

    try {
      const response = await apiCall('/data/usage/increment', {
        method: 'POST',
        body: JSON.stringify({ agent_type: agentType })
      })

      if (response.success) {
        // Refresh profile to get updated usage
        await refreshProfile()
        return true
      }
      return false
    } catch (error) {
      console.error('Error incrementing usage:', error)
      return false
    }
  }

  // Sign up new user
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await apiCall<UserWithProfile>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        })
      })

      if (response.success) {
        toast.success('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
        return { success: true }
      } else {
        return { success: false, error: response.error || 'Signup failed' }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign in user
  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiCall<UserWithProfile>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      if (response.success && response.data) {
        const data = response.data as any
        const profile = data.profile as UserProfile | null
        const role: 'user' | 'admin' | 'superadmin' = data.role || profile?.role || 'user'
        const isAdmin = role === 'admin' || role === 'superadmin'

        // Admins : pas de vérification d'abonnement
        if (!isAdmin && profile) {
          if (profile.subscription_status !== 'active') {
            return {
              success: false,
              error: 'Votre abonnement n\'est pas actif. Veuillez régulariser votre situation.',
              redirectTo: '/settings/plan',
            }
          }
        }

        // Enrichir le profil avec le rôle résolu depuis users
        // Pour les admins sans ligne dans profiles, créer un profil stub minimal
        const enrichedProfile: UserProfile | null = profile
          ? { ...profile, role, role_id: data.role_id }
          : isAdmin
            ? {
                id: data.id,
                role,
                role_id: data.role_id,
                onboarding_complete: true,
                plan_id: 'admin',
                messages_used: 0,
                messages_limit: -1,
                subscription_status: 'active' as const,
                preferences: {},
                created_at: data.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString(),
              } as UserProfile
            : null

        setAuthState({
          user: response.data,
          profile: enrichedProfile,
          loading: false,
          initialized: true,
        })

        toast.success('Connexion réussie !')
        return { success: true }
      } else {
        return { success: false, error: response.error || 'Signin failed', redirectTo: (response as any).redirectTo }
      }
    } catch (error: any) {
      console.error('Signin error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign out user
  const signOut = async () => {
    try {
      console.log('🔓 Début de la déconnexion...')
      
      // Clear local storage first
      const keysToRemove = [
        'onboarding_completed',
        'user_preference', 
        'auth_token',
        'bouba_session'
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      console.log('🧹 Nettoyage du localStorage terminé')
      
      // Sign out via API
      await apiCall('/auth/signout', { method: 'POST' })
      
      console.log('✅ Déconnexion API réussie')

      // Clear state immediately
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
      })

      toast.success('Déconnexion réussie', {
        description: 'À bientôt sur Bouba\'ia !',
        duration: 3000
      })
      console.log('🎉 Déconnexion terminée avec succès')
    } catch (error: any) {
      console.error('❌ Erreur lors de la déconnexion:', error)
      toast.error('Erreur lors de la déconnexion')
      
      // Force clear state even if API signOut fails
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
      })

      console.log('🔄 Forçage du nettoyage de l\'état')
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const userData = await fetchCurrentUser()

        if (userData && mounted) {
          // /api/auth/me returns user fields directly (onboardingComplete, planId, etc.)
          // Reconstruct a UserProfile so downstream components (ProtectedRoute, etc.) work.
          const role = (userData as any).role || 'user'
          const isAdmin = role === 'admin' || role === 'superadmin'

          const builtProfile: UserProfile = {
            id: userData.id,
            role,
            role_id: (userData as any).role_id,
            first_name: (userData as any).firstName,
            last_name: (userData as any).lastName,
            onboarding_complete: isAdmin ? true : ((userData as any).onboardingComplete ?? true),
            plan_id: (userData as any).planId || 'starter',
            messages_used: (userData as any).messagesUsed || 0,
            messages_limit: (userData as any).messagesLimit || 500,
            subscription_status: ((userData as any).subscriptionStatus || 'active') as UserProfile['subscription_status'],
            preferences: (userData as any).preferences || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          setAuthState({
            user: userData,
            profile: (userData as any).profile ?? builtProfile,
            loading: false,
            initialized: true,
          })
        } else if (mounted) {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true,
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false, initialized: true }))
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    incrementLocalUsage,
    checkUsageLimit,
    incrementUsage,
  }
}

// Auth Provider Component
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthState()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}