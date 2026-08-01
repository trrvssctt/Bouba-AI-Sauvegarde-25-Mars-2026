import { useEffect, useState, createContext, useContext } from 'react'
import type { ReactNode, FC } from 'react'
import { toast } from 'sonner'
import { apiCall } from '@/src/lib/api'

// Clés pour localStorage
const AUTH_TOKEN_KEY = 'bouba_auth_token'
const USER_DATA_KEY = 'bouba_user_data'

// Helper pour gérer le localStorage
const storage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_TOKEN_KEY)
  },
  
  setToken: (token: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  },
  
  removeToken: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(AUTH_TOKEN_KEY)
  },
  
  getUser: (): any => {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(USER_DATA_KEY)
    return data ? JSON.parse(data) : null
  },
  
  setUser: (user: any): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
  },
  
  removeUser: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(USER_DATA_KEY)
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
  }
}

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
      const token = storage.getToken()
      if (!token) {
        storage.removeUser()
        return null
      }

      const response = await apiCall<any>('/api/auth/me')
      if (!response.success || !response.data) {
        storage.removeToken()
        storage.removeUser()
        return null
      }

      // apiCall wraps the raw body in .data when there's no top-level "data" key.
      // Raw body structure: { success: true, user: { id, email, role, onboardingComplete, ... } }
      const raw = response.data
      const userData = raw?.user ?? raw

      if (!userData?.id) {
        storage.removeToken()
        storage.removeUser()
        return null
      }

      // Sauvegarder les données utilisateur
      storage.setUser(userData)
      
      return userData as UserWithProfile
    } catch (error) {
      console.error('Error fetching current user:', error)
      storage.removeToken()
      storage.removeUser()
      return null
    }
  }

  // Update profile via API
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authState.user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const response = await apiCall<UserProfile>('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
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
      const response = await apiCall('/api/data/usage/increment', {
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

  // Sign up new user — ne connecte PAS l'utilisateur (vérification email requise)
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await apiCall<UserWithProfile>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        })
      })

      if (response.success) {
        return { success: true }
      } else {
        return { success: false, error: (response as any).error || 'Signup failed' }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign in user
  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiCall<UserWithProfile>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      if (response.success && response.data) {
        const data = response.data as any
        const profile = data.profile as UserProfile | null
        const role: 'user' | 'admin' | 'superadmin' = data.role || profile?.role || 'user'
        const isAdmin = role === 'admin' || role === 'superadmin'

        // Sauvegarder les données utilisateur dans localStorage
        const userData = {
          id: data.id,
          email: data.email,
          role: role,
          firstName: data.firstName,
          lastName: data.lastName,
          onboardingComplete: data.onboardingComplete,
          planId: data.planId,
          messagesUsed: data.messagesUsed,
          messagesLimit: data.messagesLimit,
          subscriptionStatus: data.subscriptionStatus,
          preferences: data.preferences,
          profile: profile
        }
        
        storage.setToken(data.token || 'bouba_session_token_' + Date.now())
        storage.setUser(userData)

        // Admins : pas de vérification d'abonnement
        // Pour le développement, on ne vérifie PAS le statut d'abonnement
        // if (!isAdmin && profile) {
        //   if (profile.subscription_status !== 'active') {
        //     return {
        //       success: false,
        //       error: 'Votre abonnement n\'est pas actif. Veuillez régulariser votre situation.',
        //       redirectTo: '/settings/plan',
        //     }
        //   }
        // }

        // Toujours créer un profil, même si l'API n'en retourne pas
        const enrichedProfile: UserProfile = profile
          ? { ...profile, role, role_id: data.role_id }
          : {
              id: data.id,
              role,
              role_id: data.role_id,
              first_name: data.firstName || data.first_name,
              last_name: data.lastName || data.last_name,
              email: data.email,
              onboarding_complete: data.onboardingComplete || data.onboarding_complete || true,
              plan_id: data.planId || data.plan_id || 'free',
              messages_used: data.messagesUsed || data.messages_used || 0,
              messages_limit: data.messagesLimit || data.messages_limit || 500,
              subscription_status: (data.subscriptionStatus || data.subscription_status || 'active') as UserProfile['subscription_status'],
              preferences: data.preferences || {},
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
            } as UserProfile

        setAuthState({
          user: response.data,
          profile: enrichedProfile,
          loading: false,
          initialized: true,
        })

        toast.success('Connexion réussie !')
        return { success: true }
      } else {
        return {
          success: false,
          error: response.error || 'Signin failed',
          redirectTo: (response as any).redirectTo,
          code: (response as any).code,
        } as { success: boolean; error?: string; redirectTo?: string; code?: string }
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
      storage.clear()
      
      const keysToRemove = [
        'onboarding_completed',
        'user_preference',
        'auth_token',
        'bouba_session',
        'bouba-branding-v1',  // thème propre à chaque compte
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      console.log('🧹 Nettoyage du localStorage terminé')
      
      // Sign out via API
      await apiCall('/api/auth/signout', { method: 'POST' })
      
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
      console.log('🔄 useAuth: initializeAuth called')
      try {
        const userData = await fetchCurrentUser()
        console.log('🔄 useAuth: fetchCurrentUser result:', { 
          hasUserData: !!userData,
          userData: userData ? { id: userData.id, email: userData.email, planId: (userData as any).planId } : null
        })

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
            plan_id: (userData as any).planId || 'free',
            messages_used: (userData as any).messagesUsed || 0,
            messages_limit: (userData as any).messagesLimit || 500,
            subscription_status: ((userData as any).subscriptionStatus || 'active') as UserProfile['subscription_status'],
            preferences: (userData as any).preferences || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          console.log('✅ useAuth: Setting auth state with profile:', { 
            plan_id: builtProfile.plan_id,
            onboarding_complete: builtProfile.onboarding_complete
          })

          setAuthState({
            user: userData,
            profile: (userData as any).profile ?? builtProfile,
            loading: false,
            initialized: true,
          })
        } else if (mounted) {
          console.log('⚠️ useAuth: No user data, setting null state')
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