import { useState, useEffect, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/src/hooks/useAuth'
import { useGmailAPI } from '@/src/hooks/useGmailAPI'
import { oauthService } from '@/src/lib/oauthService'

const authHeader = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
})

async function manageConnection(payload: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/connections/manage', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload)
    })
    return await res.json()
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export interface Connection {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'expired'
  email?: string
  category: 'Communication' | 'Productivité' | 'Données'
  lastSync?: string
  syncCount?: number
  errorMessage?: string
  syncSettings?: any
  hasValidToken?: boolean
}

interface ConnectionsContextType {
  connections: Connection[]
  connect: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  refreshConnection: (connectionId: string) => Promise<void>
  updateSyncSettings: (connectionId: string, settings: any) => Promise<{ success: boolean; error?: string }>
  syncData: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  getConnectionByid: (connectionId: string) => Connection | undefined
  isConnecting: string | null
}

const ConnectionsContext = createContext<ConnectionsContextType>({} as ConnectionsContextType)

export const useConnections = () => {
  const context = useContext(ConnectionsContext)
  if (!context) {
    throw new Error('useConnections must be used within ConnectionsProvider')
  }
  return context
}

// Default connections template
const DEFAULT_CONNECTIONS: Connection[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    status: 'disconnected',
    category: 'Communication'
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    status: 'disconnected',
    category: 'Productivité'
  },
  {
    id: 'contacts',
    name: 'Google Contacts',
    status: 'disconnected',
    category: 'Communication'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    status: 'disconnected',
    category: 'Données'
  },
  {
    id: 'office365',
    name: 'Office 365',
    status: 'disconnected',
    category: 'Productivité'
  },
  {
    id: 'slack',
    name: 'Slack',
    status: 'disconnected',
    category: 'Communication'
  },
  {
    id: 'notion',
    name: 'Notion',
    status: 'disconnected',
    category: 'Données'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    status: 'disconnected',
    category: 'Données'
  }
]

export const ConnectionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const { syncGmailEmails } = useGmailAPI()
  const [connections, setConnections] = useState<Connection[]>(DEFAULT_CONNECTIONS)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  // Load connections from database
  const loadConnections = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/connections', { headers: authHeader() })
      if (!response.ok) return

      const result = await response.json()
      if (result.success && result.data) {
        const mergedConnections = DEFAULT_CONNECTIONS.map(defaultConn => {
          const saved = result.data.find((c: any) => c.id === defaultConn.id)
          return saved
            ? { ...defaultConn, ...saved, id: defaultConn.id, status: saved.status || defaultConn.status }
            : defaultConn
        })
        setConnections(mergedConnections)
      }
    } catch (error) {
      console.error('Error loading connections:', error)
    }
  }

  // Load connections when user changes
  useEffect(() => {
    if (user) {
      loadConnections()
    } else {
      // Reset to default when user logs out
      setConnections(DEFAULT_CONNECTIONS)
    }
  }, [user])

  const connect = async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    setIsConnecting(connectionId)
    
    try {
      // Utiliser le vrai service OAuth pour toutes les connexions
      console.log(`🔐 Démarrage OAuth pour ${connectionId}`)
      let oauthResult = await oauthService.startOAuthFlow(connectionId)
      
      // Si OAuth échoue à cause de clés manquantes ET que nous sommes en développement,
      // proposer le mode simulation
      if (!oauthResult.success && oauthResult.error?.includes('Clé API manquante') && oauthService.isSimulationMode()) {
        console.log(`🔧 Mode simulation activé pour ${connectionId}`)
        toast.info(`Mode simulation: Connexion ${connectionId} simulée pour le développement`, {
          description: 'Configurer les vraies clés OAuth pour la production'
        })
        oauthResult = await oauthService.simulateOAuthSuccess(connectionId)
      }
      
      let response: { success: boolean; email?: string; error?: string }
      if (oauthResult.success) {
        response = {
          success: true,
          email: oauthResult.userInfo?.email
        }
      } else {
        response = {
          success: false,
          error: oauthResult.error
        }
      }
      
      if (response.success) {
        // Find connection info
        const connectionInfo = DEFAULT_CONNECTIONS.find(c => c.id === connectionId)
        if (!connectionInfo) {
          throw new Error('Connection not found')
        }

        // Save to database via backend API
        const saveResult = await manageConnection({
          connectionId,
          connectionName: connectionInfo.name,
          action: 'connect',
          status: 'connected',
          category: connectionInfo.category,
          email: response.email,
          accessToken: oauthResult.tokens?.accessToken,
          refreshToken: oauthResult.tokens?.refreshToken,
          tokenExpiresAt: oauthResult.tokens?.expiresAt?.toISOString(),
          scopes: oauthResult.tokens?.scopes,
          connectionData: oauthResult.userInfo || {},
          syncSettings: { syncFrequency: 'hourly', autoSync: true, syncOptions: {} }
        })

        if (saveResult.success) {
          // Update local state first
          setConnections(prev => prev.map(conn => 
            conn.id === connectionId 
              ? { 
                  ...conn, 
                  status: 'connected' as const,
                  email: response.email,
                  lastSync: new Date().toISOString(),
                  syncCount: (conn.syncCount || 0) + 1
                }
              : conn
          ))

          // If connecting to Gmail, sync emails immediately
          if (connectionId === 'gmail') {
            try {
              toast.info('Synchronisation des emails Gmail en cours...')
              await syncGmailEmails(connectionId)
              
              // Update sync count after successful email sync
              setConnections(prev => prev.map(conn => 
                conn.id === connectionId 
                  ? { 
                      ...conn, 
                      lastSync: new Date().toISOString(),
                      syncCount: (conn.syncCount || 0) + 1
                    }
                  : conn
              ))
            } catch (syncError) {
              console.warn('Gmail sync failed but connection succeeded:', syncError)
              toast.warning('Connexion Gmail réussie, mais la synchronisation des emails a échoué. Vous pouvez réessayer manuellement.')
            }
          }
          
          toast.success(`${connectionInfo.name} connecté avec succès`)
          return { success: true }
        } else {
          throw new Error('Failed to save connection')
        }
      } else {
        // User denied access or OAuth failed - persist error state in DB
        const connectionInfo = DEFAULT_CONNECTIONS.find(c => c.id === connectionId)
        await manageConnection({
          connectionId,
          connectionName: connectionInfo?.name || connectionId,
          action: 'error',
          category: connectionInfo?.category || 'Communication',
          connectionData: { error: response.error || 'Access denied by user' }
        }).catch(() => {/* non-critical */})

        setConnections(prev => prev.map(conn =>
          conn.id === connectionId
            ? { ...conn, status: 'error', errorMessage: response.error || 'Accès refusé par l\'utilisateur' }
            : conn
        ))

        toast.error(response.error || 'Accès refusé par l\'utilisateur')
        return { success: false, error: response.error }
      }
    } catch (error) {
      console.error('Connection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la connexion'

      // Persist error state
      const connectionInfo = DEFAULT_CONNECTIONS.find(c => c.id === connectionId)
      await manageConnection({
        connectionId,
        connectionName: connectionInfo?.name || connectionId,
        action: 'error',
        category: connectionInfo?.category || 'Communication',
        connectionData: { error: errorMessage }
      }).catch(() => {/* non-critical */})

      // Update local state to reflect error
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'error', errorMessage }
          : conn
      ))

      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsConnecting(null)
    }
  }

  const disconnect = async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const result = await manageConnection({ connectionId, action: 'disconnect' })

      if (!result.success) throw new Error(result.error || 'Failed to disconnect')

      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, status: 'disconnected' as const, email: undefined, lastSync: undefined, syncCount: undefined }
          : conn
      ))

      const connectionName = connections.find(c => c.id === connectionId)?.name || connectionId
      toast.success(`Déconnexion de ${connectionName} réussie !`)
      return { success: true }
    } catch (error) {
      console.error('Disconnection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la déconnexion'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateSyncSettings = async (connectionId: string, settings: any): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const result = await manageConnection({ connectionId, action: 'update', syncSettings: settings })

      if (!result.success) throw new Error(result.error || 'Failed to update sync settings')

      setConnections(prev => prev.map(conn =>
        conn.id === connectionId ? { ...conn, syncSettings: settings } : conn
      ))
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour des paramètres'
      return { success: false, error: errorMessage }
    }
  }

  const syncData = async (connectionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      console.log(`🔄 Synchronisation des données pour ${connectionId}`)
      
      // Mettre à jour le statut de la connexion
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'connecting' }
          : conn
      ))

      // Appeler l'API de synchronisation selon le service
      let syncResult
      
      if (connectionId === 'gmail') {
        syncResult = await syncGmailEmails(connectionId)
      } else {
        // Appeler l'API de synchronisation générique
        const response = await fetch('/api/sync/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            connectionId, 
            userId: user.id 
          })
        })
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`)
        }
        
        syncResult = await response.json()
      }

      if (syncResult.success) {
        await manageConnection({ connectionId, action: 'refresh' }).catch(() => {/* non-critical */})
        setConnections(prev => prev.map(conn =>
          conn.id === connectionId
            ? { ...conn, status: 'connected', lastSync: new Date().toISOString(), syncCount: (conn.syncCount || 0) + 1 }
            : conn
        ))
        
        toast.success(`Synchronisation ${connectionId} terminée: ${syncResult.itemsProcessed || 0} éléments`)
        return { success: true }
      } else {
        throw new Error(syncResult.error || 'Erreur de synchronisation')
      }
    } catch (error) {
      console.error('Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la synchronisation'
      
      // Mettre à jour le statut d'erreur
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'error', errorMessage }
          : conn
      ))
      
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const refreshConnection = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (!connection || connection.status !== 'connected' || !user) return

    try {
      // Appeler directement la fonction syncData 
      const syncResult = await syncData(connectionId)
      
      if (syncResult.success) {
        toast.success(`Synchronisation ${connection.name} réussie`)
      } else {
        toast.error(`Erreur de synchronisation ${connection.name}: ${syncResult.error}`)
      }
    } catch (error) {
      console.error('Refresh connection error:', error)
      toast.error(`Erreur de synchronisation ${connection.name}`)
    }
  }

  const getConnectionByid = (connectionId: string): Connection | undefined => {
    return connections.find(conn => conn.id === connectionId)
  }

  return (
    <ConnectionsContext.Provider value={{
      connections,
      connect,
      disconnect,
      refreshConnection,
      updateSyncSettings,
      syncData,
      getConnectionByid,
      isConnecting
    }}>
      {children}
    </ConnectionsContext.Provider>
  )
}

// Fonctions d'aide pour les vraies APIs OAuth
export async function validateConnectionToken(connectionId: string, accessToken: string): Promise<boolean> {
  try {
    return await oauthService.validateToken(connectionId, accessToken)
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}

export async function refreshConnectionToken(connectionId: string, refreshToken: string) {
  try {
    return await oauthService.refreshToken(connectionId, refreshToken)
  } catch (error) {
    console.error('Token refresh error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur de rafraîchissement' }
  }
}

export async function revokeConnectionToken(connectionId: string, accessToken: string) {
  try {
    return await oauthService.revokeToken(connectionId, accessToken)
  } catch (error) {
    console.error('Token revocation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur de révocation' }
  }
}