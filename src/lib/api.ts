// Wrapper API qui remplace le client Supabase par des appels REST
// Compatible avec les hooks existants pour faciliter la migration

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Types de base
interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  planId: string
  messagesUsed: number
  messagesLimit: number
  subscriptionStatus: string
  onboardingComplete: boolean
  onboardingStep: number
  preferences: Record<string, any>
}

interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Utilitaire pour les appels API
export async function apiCall<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Pour envoyer les cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` }
    }

    // Si l'API retourne une structure {success: true, data: ...}, on retourne directement data
    if (data.success && data.data !== undefined) {
      return { success: true, data: data.data }
    }

    return { success: true, data }

  } catch (error) {
    console.error('API call error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    }
  }
}

// Simulation de l'interface auth de Supabase
export const auth = {
  // Inscription
  signUp: async (params: {
    email: string
    password: string
    options?: {
      data?: {
        first_name?: string
        last_name?: string
        name?: string
      }
    }
  }) => {
    const result = await apiCall<{ user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        firstName: params.options?.data?.first_name,
        lastName: params.options?.data?.last_name,
        name: params.options?.data?.name,
      }),
    })

    return {
      data: result.success ? { user: result.data?.user } : { user: null },
      error: result.success ? null : { message: result.error }
    }
  },

  // Connexion avec email/mot de passe
  signInWithPassword: async (params: { email: string; password: string }) => {
    const result = await apiCall<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    })

    return {
      data: result.success ? { user: result.data?.user } : { user: null },
      error: result.success ? null : { message: result.error }
    }
  },

  // Déconnexion
  signOut: async () => {
    const result = await apiCall('/auth/logout', {
      method: 'POST',
    })

    return {
      error: result.success ? null : { message: result.error }
    }
  },

  // Récupérer la session courante
  getSession: async () => {
    const result = await apiCall<{ user: User }>('/auth/me')

    return {
      data: {
        session: result.success ? {
          user: result.data?.user,
          access_token: 'cookie-based'
        } : null
      },
      error: result.success ? null : { message: result.error }
    }
  },

  // Récupérer l'utilisateur courant
  getUser: async () => {
    const result = await apiCall<{ user: User }>('/auth/me')

    return {
      data: {
        user: result.success ? result.data?.user : null
      },
      error: result.success ? null : { message: result.error }
    }
  },

  // Simulation des événements d'authentification
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Dans une vraie implémentation, on pourrait utiliser des WebSockets
    // ou des Server-Sent Events pour notifier les changements d'état
    // Pour l'instant, on retourne juste une fonction de nettoyage
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    }
  }
}

// Simulation de l'interface de requête de Supabase
class SupabaseQueryBuilder<T> {
  constructor(
    private table: string,
    private selectFields: string = '*',
    private filters: Array<{ field: string; operator: string; value: any }> = [],
    private orderBy?: { field: string; ascending: boolean },
    private limitValue?: number
  ) {}

  select(fields: string = '*') {
    return new SupabaseQueryBuilder<T>(this.table, fields, this.filters, this.orderBy, this.limitValue)
  }

  eq(field: string, value: any) {
    return new SupabaseQueryBuilder<T>(
      this.table,
      this.selectFields,
      [...this.filters, { field, operator: 'eq', value }],
      this.orderBy,
      this.limitValue
    )
  }

  neq(field: string, value: any) {
    return new SupabaseQueryBuilder<T>(
      this.table,
      this.selectFields,
      [...this.filters, { field, operator: 'neq', value }],
      this.orderBy,
      this.limitValue
    )
  }

  order(field: string, options: { ascending?: boolean } = {}) {
    return new SupabaseQueryBuilder<T>(
      this.table,
      this.selectFields,
      this.filters,
      { field, ascending: options.ascending ?? true },
      this.limitValue
    )
  }

  limit(count: number) {
    return new SupabaseQueryBuilder<T>(
      this.table,
      this.selectFields,
      this.filters,
      this.orderBy,
      count
    )
  }

  async single() {
    // Construire la query et faire l'appel API
    const queryParams = this.buildQueryParams()
    const result = await apiCall<T[]>(`/data/${this.table}?${queryParams.toString()}&limit=1`)
    
    if (!result.success) {
      return { data: null, error: { message: result.error } }
    }

    const data = result.data && result.data.length > 0 ? result.data[0] : null
    return { data, error: null }
  }

  async then(resolve?: (value: { data: T[] | null; error: any }) => any) {
    // Pour supporter les promesses
    const queryParams = this.buildQueryParams()
    const result = await apiCall<T[]>(`/data/${this.table}?${queryParams.toString()}`)
    
    const response = {
      data: result.success ? result.data : null,
      error: result.success ? null : { message: result.error }
    }

    return resolve ? resolve(response) : response
  }

  private buildQueryParams(): URLSearchParams {
    const params = new URLSearchParams()
    
    if (this.selectFields !== '*') {
      params.append('select', this.selectFields)
    }

    this.filters.forEach(filter => {
      params.append(`${filter.field}[${filter.operator}]`, filter.value)
    })

    if (this.orderBy) {
      params.append('order', `${this.orderBy.field}:${this.orderBy.ascending ? 'asc' : 'desc'}`)
    }

    if (this.limitValue) {
      params.append('limit', this.limitValue.toString())
    }

    return params
  }
}

// Simulation de l'interface principale de Supabase
export const supabase = {
  auth,

  from: <T = any>(table: string) => ({
    select: (fields: string = '*') => new SupabaseQueryBuilder<T>(table, fields),

    insert: async (data: any | any[]) => {
      const result = await apiCall<T>(`/data/${table}`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      })

      return {
        data: result.success ? result.data : null,
        error: result.success ? null : { message: result.error }
      }
    },

    update: async (data: any) => {
      // Note: cette méthode nécessiterait plus de contexte pour construire
      // la requête UPDATE avec les bonnes conditions WHERE
      console.warn('Update method called - needs filter context')
      return {
        data: null,
        error: { message: 'Update needs to be called with filters' }
      }
    },

    upsert: async (data: any | any[]) => {
      const result = await apiCall<T>(`/data/${table}/upsert`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      })

      return {
        data: result.success ? result.data : null,
        error: result.success ? null : { message: result.error }
      }
    },

    delete: () => ({
      eq: async (field: string, value: any) => {
        const result = await apiCall(`/data/${table}`, {
          method: 'DELETE',
          body: JSON.stringify({ where: { [field]: value } }),
        })

        return {
          data: result.success ? result.data : null,
          error: result.success ? null : { message: result.error }
        }
      }
    })
  })
}

// Export par défaut pour compatibilité
export default supabase

// Utilitaires supplémentaires
export const createClient = () => supabase

// Types exportés
export type { User, AuthResponse, ApiResponse }