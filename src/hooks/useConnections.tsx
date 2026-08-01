import { useState, useEffect, createContext, useContext } from 'react'
import { apiCall } from '@/src/lib/api'
import { oauthService } from '@/src/lib/oauthService'
import { useAuth } from './useAuth'
import { usePlans } from './usePlans'

const GOOGLE_SERVICES = ['gmail', 'calendar', 'contacts']

export interface Connection {
  id: string
  name: string
  icon: string
  type: string
  plan: string
  category?: string
  status: 'connected' | 'available' | 'pending' | 'disconnected' | 'error'
  description: string
  email?: string
  lastSync?: string
  syncCount?: number
  errorMessage?: string
  syncSettings?: any
}

interface ConnectionsContextType {
  connections: Connection[] | null
  loading: boolean
  error: string | null
  connect: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  refreshConnection: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  updateSyncSettings: (connectionId: string, settings: any) => Promise<{ success: boolean; error?: string }>
  isConnecting: string | null
}

const ConnectionsContext = createContext<ConnectionsContextType>({} as ConnectionsContextType)

export const useConnections = () => {
  const context = useContext(ConnectionsContext)
  if (!context) {
    throw new Error('useConnections must be used within a ConnectionsProvider')
  }
  return context
}

export const ConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const { user } = useAuth()
  const { hasFeatureAccess } = usePlans()

  // Fetch connections from API
  const fetchConnections = async () => {
    console.log('🔄 useConnections: fetchConnections called', { hasUser: !!user })
    
    if (!user) {
      console.log('⚠️ useConnections: No user, setting connections to null')
      setConnections(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('📡 useConnections: Fetching from /api/connections')
      
      const response = await apiCall<any>('/api/connections')
      console.log('📡 useConnections: API response:', { 
        success: response.success, 
        dataCount: response.data?.length,
        userPlan: response.userPlan,
        responseKeys: Object.keys(response),
        fullResponse: response
      })
      
      if (response.success && response.data) {
        // Récupérer le plan de l'utilisateur depuis la réponse API
        const userPlan = response.userPlan || 'free'
        console.log('🔍 useConnections: User plan from API:', userPlan)
        
        // Transformer les données du backend vers le format frontend
        const transformedConnections: Connection[] = response.data.map(conn => ({
          id: conn.id,
          name: conn.name || conn.id,
          icon: conn.icon || '',
          type: conn.type || 'oauth',
          plan: conn.plan || 'free',
          category: conn.category || 'Communication',
          // conn.status vient directement de la DB ('connected' | 'disconnected' | etc.)
          status: (conn.status as Connection['status']) || 'available',
          description: conn.description || `${conn.name || conn.id} integration`,
          email: conn.email || undefined,
          lastSync: conn.last_sync || undefined,
          syncCount: conn.sync_count || undefined,
          errorMessage: conn.error_message || undefined,
        }))
        
        console.log('🔄 useConnections: Transformed connections:', transformedConnections)
        
        // Filtrer les connexions selon le plan de l'utilisateur (nouveaux plans)
        const filteredConnections = transformedConnections.filter(connection => {
          // Si le plan de la connexion est 'free', toujours disponible
          if (connection.plan === 'free') {
            console.log(`✅ ${connection.name}: free plan - accessible`)
            return true
          }
          
          // Vérifier l'accès selon le plan utilisateur
          if (connection.plan === 'starter') {
            const hasAccess = ['starter', 'pro', 'business', 'enterprise'].includes(userPlan)
            console.log(`🔍 ${connection.name}: starter plan - userPlan=${userPlan}, hasAccess=${hasAccess}`)
            return hasAccess
          }

          if (connection.plan === 'business') {
            const hasAccess = ['business', 'enterprise'].includes(userPlan)
            console.log(`🔍 ${connection.name}: business plan - userPlan=${userPlan}, hasAccess=${hasAccess}`)
            return hasAccess
          }
          
          console.log(`❓ ${connection.name}: unknown plan ${connection.plan} - allowing by default`)
          return true
        })
        
        console.log('✅ useConnections: Filtered connections:', filteredConnections)
        setConnections(filteredConnections)
      } else {
        console.log('⚠️ useConnections: No data in response, setting empty array')
        setConnections([])
      }
    } catch (err: any) {
      console.error('❌ useConnections: Error fetching connections:', err)
      setError(err.message)
      setConnections([])
    } finally {
      setLoading(false)
      console.log('🏁 useConnections: fetchConnections completed')
    }
  }

  // Connect to a service via OAuth or API
  const connect = async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
    setIsConnecting(connectionId)
    try {
      let email: string | undefined
      let accessToken: string | undefined
      let refreshToken: string | undefined
      let tokenExpiresAt: string | undefined
      let scopes: string[] | undefined

      if (GOOGLE_SERVICES.includes(connectionId)) {
        const result = await oauthService.startOAuthFlow(connectionId)
        if (!result.success) {
          return { success: false, error: result.error }
        }
        email = result.userInfo?.email
        accessToken = result.tokens?.accessToken
        refreshToken = result.tokens?.refreshToken
        tokenExpiresAt = result.tokens?.expiresAt?.toISOString()
        scopes = result.tokens?.scopes
      }

      const res = await apiCall('/api/connections/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          connectionName: connectionId,
          action: 'connect',
          status: 'connected',
          category: 'Communication',
          email,
          accessToken,
          refreshToken,
          tokenExpiresAt,
          scopes,
        }),
      })

      if (!res.success) {
        return { success: false, error: res.error }
      }

      setConnections(prev =>
        prev?.map(conn =>
          conn.id === connectionId
            ? { ...conn, status: 'connected' as const, email }
            : conn
        ) || null
      )

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsConnecting(null)
    }
  }

  // Disconnect from a service
  const disconnect = async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiCall('/api/connections/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, action: 'disconnect' }),
      })

      if (!res.success) {
        return { success: false, error: res.error }
      }

      setConnections(prev =>
        prev?.map(conn =>
          conn.id === connectionId
            ? { ...conn, status: 'disconnected' as const, email: undefined }
            : conn
        ) || null
      )

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // Refresh connection data
  const refreshConnection = async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiCall('/api/connections/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, action: 'refresh' }),
      })

      if (!res.success) {
        return { success: false, error: res.error }
      }

      setConnections(prev =>
        prev?.map(conn =>
          conn.id === connectionId
            ? { ...conn, lastSync: new Date().toISOString() }
            : conn
        ) || null
      )

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // Update sync settings
  const updateSyncSettings = async (connectionId: string, settings: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiCall('/api/connections/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, action: 'update', syncSettings: settings }),
      })
      return { success: res.success, error: res.error }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // Initial fetch
  useEffect(() => {
    console.log('🔄 useConnections: useEffect triggered', { 
      hasUser: !!user,
      userChanged: true
    })
    
    if (user) {
      fetchConnections()
    } else {
      console.log('⚠️ useConnections: No user, clearing connections')
      setConnections(null)
      setLoading(false)
    }
  }, [user])

  return (
    <ConnectionsContext.Provider
      value={{
        connections,
        loading,
        error,
        connect,
        disconnect,
        refreshConnection,
        updateSyncSettings,
        isConnecting
      }}
    >
      {children}
    </ConnectionsContext.Provider>
  )
}