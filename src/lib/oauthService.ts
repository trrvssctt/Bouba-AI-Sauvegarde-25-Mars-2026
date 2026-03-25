// Service OAuth pour les connexions d'outils tiers
export interface OAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scopes: string[]
}

export interface OAuthResult {
  success: boolean
  tokens?: OAuthTokens
  userInfo?: {
    email: string
    name?: string
    id: string
  }
  error?: string
}

class OAuthService {
  // Mode développement - permet de simuler les connexions
  private isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'
  
  private configs: Record<string, OAuthConfig> = {
    gmail: {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    calendar: {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    contacts: {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    airtable: {
      clientId: import.meta.env.VITE_AIRTABLE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/airtable/callback`,
      scopes: ['data.records:read', 'data.records:write', 'schema.bases:read'],
      authUrl: 'https://airtable.com/oauth2/v1/authorize',
      tokenUrl: 'https://airtable.com/oauth2/v1/token'
    },
    slack: {
      clientId: import.meta.env.VITE_SLACK_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/slack/callback`,
      scopes: ['channels:read', 'channels:history', 'users:read', 'users:read.email'],
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access'
    },
    notion: {
      clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/notion/callback`,
      scopes: ['read_content'],
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token'
    },
    office365: {
      clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/microsoft/callback`,
      scopes: [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Contacts.Read',
        'https://graph.microsoft.com/User.Read'
      ],
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    },
    hubspot: {
      clientId: import.meta.env.VITE_HUBSPOT_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/hubspot/callback`,
      scopes: ['contacts', 'content'],
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token'
    }
  }

  /**
   * Initie le flux OAuth via popup
   */
  async startOAuthFlow(serviceId: string): Promise<OAuthResult> {
    const config = this.configs[serviceId]
    if (!config) {
      return { success: false, error: `Service ${serviceId} non configuré` }
    }

    if (!config.clientId) {
      const errorMessage = this.isDevelopment 
        ? `🔧 Mode Développement: Clé API manquante pour ${serviceId}.\n\n` +
          `Pour configurer:\n` +
          `1. Ajoutez la variable dans .env: VITE_${this.getEnvVariableName(serviceId)}_CLIENT_ID=votre-clé\n` +
          `2. Consultez OAUTH_SETUP_GUIDE.md pour obtenir la clé\n` +
          `3. Redémarrez le serveur de développement\n\n` +
          `💡 Alternative: Utilisez N8N qui gère l'authentification côté serveur.`
        : `Clé API manquante pour ${serviceId}. Contactez l'administrateur.`
      
      return { 
        success: false, 
        error: errorMessage
      }
    }

    // En mode développement, vérifier si nous avons des placeholders
    if (this.isDevelopment && this.isPlaceholderKey(config.clientId)) {
      return {
        success: false,
        error: `🔧 Mode Développement: La clé API pour ${serviceId} est encore un placeholder.\n\n` +
               `Remplacez "your-${serviceId.toLowerCase()}-client-id" dans .env par votre vraie clé API.\n` +
               `Consultez OAUTH_SETUP_GUIDE.md pour les instructions détaillées.`
      }
    }

    try {
      // Construire l'URL d'autorisation
      const state = this.generateState()
      const authUrl = this.buildAuthUrl(config, state)
      
      // Ouvrir popup OAuth
      const result = await this.openOAuthPopup(authUrl, serviceId)
      
      if (result.success && result.code) {
        // Échanger le code contre des tokens
        const tokens = await this.exchangeCodeForTokens(serviceId, result.code, state)
        
        if (tokens.success && tokens.tokens) {
          // Récupérer les infos utilisateur
          const userInfo = await this.getUserInfo(serviceId, tokens.tokens.accessToken)
          
          return {
            success: true,
            tokens: tokens.tokens,
            userInfo: userInfo.success ? userInfo.user : undefined
          }
        } else {
          return { success: false, error: tokens.error || 'Échec de l\'échange des tokens' }
        }
      } else {
        return { success: false, error: result.error || 'Autorisation refusée' }
      }
    } catch (error) {
      console.error('Erreur OAuth:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de l\'authentification' 
      }
    }
  }

  /**
   * Vérifie si une clé est un placeholder de développement
   */
  private isPlaceholderKey(clientId: string): boolean {
    const placeholders = [
      'your-google-client-id',
      'your-airtable-client-id', 
      'your-microsoft-client-id',
      'your-slack-client-id',
      'your-notion-client-id',
      'your-hubspot-client-id'
    ]
    return placeholders.some(placeholder => clientId.includes(placeholder))
  }

  /**
   * Obtient le nom de la variable d'environnement pour un service
   */
  private getEnvVariableName(serviceId: string): string {
    const mapping: Record<string, string> = {
      gmail: 'GOOGLE',
      calendar: 'GOOGLE', 
      contacts: 'GOOGLE',
      airtable: 'AIRTABLE',
      office365: 'MICROSOFT',
      slack: 'SLACK',
      notion: 'NOTION',
      hubspot: 'HUBSPOT'
    }
    return mapping[serviceId] || serviceId.toUpperCase()
  }

  /**
   * Mode simulation pour le développement
   * Permet de tester les connexions sans configurer les vraies clés OAuth
   */
  async simulateOAuthSuccess(serviceId: string): Promise<OAuthResult> {
    if (!this.isDevelopment) {
      return { success: false, error: 'Mode simulation disponible uniquement en développement' }
    }

    // Simuler un délai d'authentification
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockUserInfo = {
      gmail: { email: 'dev@example.com', name: 'Développeur Gmail', id: 'dev-gmail-123' },
      calendar: { email: 'dev@example.com', name: 'Développeur Calendar', id: 'dev-calendar-123' },
      contacts: { email: 'dev@example.com', name: 'Développeur Contacts', id: 'dev-contacts-123' },
      airtable: { email: 'dev@airtable.com', name: 'Développeur Airtable', id: 'dev-airtable-123' },
      slack: { email: 'dev@slack.com', name: 'Développeur Slack', id: 'dev-slack-123' },
      notion: { email: 'dev@notion.com', name: 'Développeur Notion', id: 'dev-notion-123' },
      office365: { email: 'dev@microsoft.com', name: 'Développeur Office365', id: 'dev-office365-123' },
      hubspot: { email: 'dev@hubspot.com', name: 'Développeur HubSpot', id: 'dev-hubspot-123' }
    }

    return {
      success: true,
      tokens: {
        accessToken: `mock-access-token-${serviceId}-${Date.now()}`,
        refreshToken: `mock-refresh-token-${serviceId}-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        scopes: this.configs[serviceId]?.scopes || []
      },
      userInfo: mockUserInfo[serviceId as keyof typeof mockUserInfo] || {
        email: `dev-${serviceId}@example.com`,
        name: `Développeur ${serviceId}`,
        id: `dev-${serviceId}-123`
      }
    }
  }

  /**
   * Vérifie si le mode simulation est activé
   */
  isSimulationMode(): boolean {
    return this.isDevelopment && (
      import.meta.env.VITE_OAUTH_SIMULATION_MODE === 'true' ||
      import.meta.env.VITE_OAUTH_SIMULATION_MODE === '1'
    )
  }

  /**
   * Rafraîchit un token d'accès
   */
  async refreshToken(serviceId: string, refreshToken: string): Promise<{ success: boolean; tokens?: OAuthTokens; error?: string }> {
    const config = this.configs[serviceId]
    if (!config) {
      return { success: false, error: `Service ${serviceId} non configuré` }
    }

    try {
      const response = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: serviceId,
          refresh_token: refreshToken
        })
      })

      const data = await response.json()
      
      if (data.success) {
        return {
          success: true,
          tokens: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
            scopes: config.scopes
          }
        }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du rafraîchissement' 
      }
    }
  }

  /**
   * Révoque un token d'accès
   */
  async revokeToken(serviceId: string, accessToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: serviceId,
          token: accessToken
        })
      })

      const data = await response.json()
      return { success: data.success, error: data.error }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la révocation' 
      }
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  private buildAuthUrl(config: OAuthConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    })

    return `${config.authUrl}?${params.toString()}`
  }

  private async openOAuthPopup(authUrl: string, serviceId: string): Promise<{ success: boolean; code?: string; error?: string }> {
    return new Promise((resolve) => {
      const popup = window.open(
        authUrl,
        `oauth-${serviceId}`,
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
      )

      if (!popup) {
        resolve({ success: false, error: 'Impossible d\'ouvrir la fenêtre de connexion. Vérifiez que les popups sont autorisées.' })
        return
      }

      // Écouter les messages du popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'OAUTH_SUCCESS') {
          window.removeEventListener('message', messageListener)
          popup.close()
          resolve({ success: true, code: event.data.code })
        } else if (event.data.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', messageListener)
          popup.close()
          resolve({ success: false, error: event.data.error })
        }
      }

      window.addEventListener('message', messageListener)

      // Vérifier si le popup est fermé manuellement
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
          resolve({ success: false, error: 'Autorisation annulée par l\'utilisateur' })
        }
      }, 1000)
    })
  }

  private async exchangeCodeForTokens(serviceId: string, code: string, state: string): Promise<{ success: boolean; tokens?: OAuthTokens; error?: string }> {
    try {
      const response = await fetch('/api/oauth/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: serviceId,
          code: code,
          state: state
        })
      })

      const data = await response.json()
      
      if (data.success) {
        return {
          success: true,
          tokens: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
            scopes: data.scope ? data.scope.split(' ') : this.configs[serviceId].scopes
          }
        }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de l\'échange des tokens' 
      }
    }
  }

  private async getUserInfo(serviceId: string, accessToken: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch('/api/oauth/userinfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: serviceId,
          access_token: accessToken
        })
      })

      const data = await response.json()
      return { success: data.success, user: data.user, error: data.error }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des informations utilisateur' 
      }
    }
  }

  /**
   * Teste si un token est encore valide
   */
  async validateToken(serviceId: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('/api/oauth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: serviceId,
          token: accessToken
        })
      })

      const data = await response.json()
      return data.valid === true
    } catch (error) {
      console.error('Erreur validation token:', error)
      return false
    }
  }
}

export const oauthService = new OAuthService()