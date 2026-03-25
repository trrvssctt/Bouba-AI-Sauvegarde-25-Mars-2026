// API endpoints pour les connexions OAuth et synchronisation des données
// À ajouter dans le serveur API (api/server.ts ou routes séparées)

import express from 'express'
import { query, queryOne } from './lib/db'
import { authenticate } from './auth'

const router = express.Router()

// ==========================================
// ENDPOINTS OAUTH 
// ==========================================

/**
 * POST /api/oauth/exchange
 * Échange le code OAuth contre des tokens d'accès
 */
router.post('/oauth/exchange', authenticate, async (req: any, res) => {
  try {
    const { service, code, state } = req.body

    if (!service || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Service et code requis' 
      })
    }

    let tokenResponse
    let userInfo

    switch (service) {
      case 'gmail':
      case 'calendar':
      case 'contacts':
        // Google OAuth
        tokenResponse = await exchangeGoogleCode(code, service)
        if (tokenResponse.access_token) {
          userInfo = await getGoogleUserInfo(tokenResponse.access_token)
        }
        break

      case 'airtable':
        tokenResponse = await exchangeAirtableCode(code)
        if (tokenResponse.access_token) {
          userInfo = await getAirtableUserInfo(tokenResponse.access_token)
        }
        break

      case 'slack':
        tokenResponse = await exchangeSlackCode(code)
        if (tokenResponse.access_token) {
          userInfo = await getSlackUserInfo(tokenResponse.access_token)
        }
        break

      case 'notion':
        tokenResponse = await exchangeNotionCode(code)
        if (tokenResponse.access_token) {
          userInfo = await getNotionUserInfo(tokenResponse.access_token)
        }
        break

      case 'office365':
        tokenResponse = await exchangeMicrosoftCode(code)
        if (tokenResponse.access_token) {
          userInfo = await getMicrosoftUserInfo(tokenResponse.access_token)
        }
        break

      case 'hubspot':
        tokenResponse = await exchangeHubSpotCode(code)
        if (tokenResponse.access_token) {
          userInfo = await getHubSpotUserInfo(tokenResponse.access_token)
        }
        break

      default:
        return res.status(400).json({ 
          success: false, 
          error: `Service ${service} non supporté` 
        })
    }

    if (tokenResponse.error) {
      return res.status(400).json({
        success: false,
        error: tokenResponse.error
      })
    }

    res.json({
      success: true,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      user: userInfo
    })

  } catch (error) {
    console.error('OAuth exchange error:', error)
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur lors de l'échange OAuth"
    })
  }
})

/**
 * POST /api/oauth/refresh
 * Rafraîchit un token d'accès
 */
router.post('/oauth/refresh', authenticate, async (req: any, res) => {
  try {
    const { service, refresh_token } = req.body

    if (!service || !refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Service et refresh_token requis'
      })
    }

    let tokenResponse

    switch (service) {
      case 'gmail':
      case 'calendar':  
      case 'contacts':
        tokenResponse = await refreshGoogleToken(refresh_token)
        break

      case 'airtable':
        // Airtable ne supporte pas le refresh, tokens longue durée
        return res.status(400).json({
          success: false,
          error: 'Airtable ne supporte pas le rafraîchissement des tokens'
        })

      case 'slack':
        tokenResponse = await refreshSlackToken(refresh_token)
        break

      case 'notion':
        // Notion tokens n'expirent pas
        return res.status(400).json({
          success: false,
          error: "Les tokens Notion n'expirent pas"
        })

      case 'office365':
        tokenResponse = await refreshMicrosoftToken(refresh_token)
        break

      case 'hubspot':
        tokenResponse = await refreshHubSpotToken(refresh_token)
        break

      default:
        return res.status(400).json({
          success: false,
          error: `Service ${service} non supporté`
        })
    }

    if (tokenResponse.error) {
      return res.status(400).json({
        success: false,
        error: tokenResponse.error
      })
    }

    res.json({
      success: true,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || refresh_token,
      expires_in: tokenResponse.expires_in
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du rafraîchissement'
    })
  }
})

/**
 * POST /api/oauth/revoke
 * Révoque un token d'accès
 */
router.post('/oauth/revoke', authenticate, async (req: any, res) => {
  try {
    const { service, token } = req.body

    if (!service || !token) {
      return res.status(400).json({
        success: false,
        error: 'Service et token requis'
      })
    }

    let revokeResponse

    switch (service) {
      case 'gmail':
      case 'calendar':
      case 'contacts':
        revokeResponse = await revokeGoogleToken(token)
        break

      case 'airtable':
        // Airtable n'a pas d'endpoint de révocation officiel
        revokeResponse = { success: true }
        break

      case 'slack':
        revokeResponse = await revokeSlackToken(token)
        break

      case 'notion':
        revokeResponse = await revokeNotionToken(token)
        break

      case 'office365':
        revokeResponse = await revokeMicrosoftToken(token)
        break

      case 'hubspot':
        revokeResponse = await revokeHubSpotToken(token)
        break

      default:
        return res.status(400).json({
          success: false,
          error: `Service ${service} non supporté`
        })
    }

    res.json({
      success: revokeResponse.success,
      error: revokeResponse.error
    })

  } catch (error) {
    console.error('Token revocation error:', error)
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la révocation'
    })
  }
})

/**
 * POST /api/oauth/validate
 * Valide un token d'accès
 */
router.post('/oauth/validate', authenticate, async (req: any, res) => {
  try {
    const { service, token } = req.body

    if (!service || !token) {
      return res.status(400).json({ valid: false })
    }

    let isValid = false

    switch (service) {
      case 'gmail':
      case 'calendar':
      case 'contacts':
        isValid = await validateGoogleToken(token)
        break

      case 'airtable':
        isValid = await validateAirtableToken(token)
        break

      case 'slack':
        isValid = await validateSlackToken(token)
        break

      case 'notion':
        isValid = await validateNotionToken(token)
        break

      case 'office365':
        isValid = await validateMicrosoftToken(token)
        break

      case 'hubspot':
        isValid = await validateHubSpotToken(token)
        break
    }

    res.json({ valid: isValid })

  } catch (error) {
    console.error('Token validation error:', error)
    res.json({ valid: false })
  }
})

// ==========================================
// ENDPOINTS SYNCHRONISATION DES DONNÉES
// ==========================================

/**
 * POST /api/sync/data
 * Synchronise les données d'un service
 */
router.post('/sync/data', authenticate, async (req: any, res) => {
  try {
    const { connectionId } = req.body
    const userId = req.user.id // Use authenticated user's ID, not body (prevents IDOR)

    if (!connectionId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'ConnectionId et userId requis'
      })
    }

    // Récupérer les informations de connexion
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', userId)
      .eq('connection_id', connectionId)
      .single()

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connexion non trouvée'
      })
    }

    if (connection.status !== 'connected' || !connection.access_token) {
      return res.status(400).json({
        success: false,
        error: 'Connexion non active ou token manquant'
      })
    }

    let syncResult

    switch (connectionId) {
      case 'gmail':
        syncResult = await syncGmailData(connection)
        break

      case 'calendar':
        syncResult = await syncCalendarData(connection)
        break

      case 'contacts':
        syncResult = await syncContactsData(connection)
        break

      case 'airtable':
        syncResult = await syncAirtableData(connection)
        break

      case 'slack':
        syncResult = await syncSlackData(connection)
        break

      case 'notion':
        syncResult = await syncNotionData(connection)
        break

      case 'office365':
        syncResult = await syncOffice365Data(connection)
        break

      case 'hubspot':
        syncResult = await syncHubSpotData(connection)
        break

      default:
        return res.status(400).json({
          success: false,
          error: `Synchronisation ${connectionId} non supportée`
        })
    }

    // Logger la synchronisation
    await supabase.rpc('log_sync_operation', {
      p_connection_uuid: connection.id,
      p_sync_type: 'manual',
      p_status: syncResult.success ? 'success' : 'error',
      p_items_processed: syncResult.itemsProcessed || 0,
      p_items_added: syncResult.itemsAdded || 0,
      p_items_updated: syncResult.itemsUpdated || 0,
      p_items_deleted: syncResult.itemsDeleted || 0,
      p_error_details: syncResult.error ? { error: syncResult.error } : null,
      p_duration_ms: syncResult.durationMs || null
    })

    res.json(syncResult)

  } catch (error) {
    console.error('Data sync error:', error)
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la synchronisation'
    })
  }
})

export default router

// ==========================================
// FONCTIONS D'AIDE GOOGLE OAUTH
// ==========================================

async function exchangeGoogleCode(code: string, service: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const frontendUrl = process.env.FRONTEND_URL

  if (!clientId || !clientSecret) {
    return { error: 'Missing Google client credentials on server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).'}
  }

  if (!frontendUrl) {
    return { error: 'Missing FRONTEND_URL env on server. Set FRONTEND_URL to your frontend origin.' }
  }

  const redirectUri = `${frontendUrl.replace(/\/$/, '')}/oauth/google/callback`

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    const tokens = await response.json()
    
    if (!response.ok) {
      console.error('[API][oauth/exchange] Google token endpoint error:', tokens)
      return { error: tokens.error_description || tokens.error || `Google token endpoint returned ${response.status}` }
    }

    if (tokens.error) {
      return { error: tokens.error_description || tokens.error }
    }

    return tokens
  } catch (error) {
    console.error('[API][oauth/exchange] Exception exchanging Google code:', error)
    return { error: 'Erreur lors de l\'échange du code Google' }
  }
}

async function getGoogleUserInfo(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    const userInfo = await response.json()
    
    if (userInfo.error) {
      return null
    }

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    }
  } catch (error) {
    console.error('Error fetching Google user info:', error)
    return null
  }
}

async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    const tokens = await response.json()
    
    if (tokens.error) {
      return { error: tokens.error_description || tokens.error }
    }

    return tokens
  } catch (error) {
    return { error: 'Erreur lors du rafraîchissement du token Google' }
  }
}

async function revokeGoogleToken(token: string) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST'
    })

    return { success: response.ok }
  } catch (error) {
    return { success: false, error: 'Erreur lors de la révocation du token Google' }
  }
}

async function validateGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
    const tokenInfo = await response.json()
    
    return !tokenInfo.error && tokenInfo.expires_in > 0
  } catch (error) {
    return false
  }
}

// ==========================================
// FONCTIONS DE SYNCHRONISATION DES DONNÉES
// ==========================================

async function syncGmailData(connection: any) {
  const startTime = Date.now()
  
  try {
    // Récupérer les paramètres de synchronisation
    const syncSettings = connection.sync_settings || {}
    const syncOptions = syncSettings.syncOptions || {}

    let itemsProcessed = 0
    let itemsAdded = 0
    let itemsUpdated = 0

    if (syncOptions.emails !== false) {
      // Synchroniser les emails selon les paramètres
      const emailResult = await fetchGmailEmails(connection.access_token, syncOptions)
      
      for (const email of emailResult.emails) {
        // Sauvegarder dans connection_data
        await supabase.rpc('save_connection_data', {
          p_connection_uuid: connection.id,
          p_external_id: email.id,
          p_data_type: 'email',
          p_title: email.subject,
          p_content: {
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.body,
            thread_id: email.threadId,
            labels: email.labels
          },
          p_metadata: {
            unread: email.unread,
            important: email.important,
            labels: email.labels
          },
          p_external_created_at: email.date,
          p_external_updated_at: email.date
        })

        itemsProcessed++
        // Compter comme ajouté ou mis à jour selon le résultat de save_connection_data
        itemsAdded++
      }
    }

    return {
      success: true,
      itemsProcessed,
      itemsAdded,
      itemsUpdated,
      itemsDeleted: 0,
      durationMs: Date.now() - startTime
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de synchronisation Gmail',
      itemsProcessed: 0,
      durationMs: Date.now() - startTime
    }
  }
}

async function fetchGmailEmails(accessToken: string, options: any) {
  // Implementation de l'API Gmail
  // Récupérer les emails selon les options de synchronisation
  const query = buildGmailQuery(options)
  
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.message)
  }

  const emails = []
  
  // Récupérer les détails de chaque email
  for (const message of data.messages || []) {
    const emailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    const emailData = await emailResponse.json()
    
    emails.push(parseGmailMessage(emailData))
  }

  return { emails }
}

function buildGmailQuery(options: any): string {
  const queries = []
  
  if (options['emails.inbox'] !== false) {
    queries.push('in:inbox')
  }
  
  if (options['emails.sent'] === true) {
    queries.push('in:sent')
  }
  
  if (options['emails.drafts'] === true) {
    queries.push('in:drafts')
  }
  
  // Limiter aux 30 derniers jours par défaut
  queries.push('newer_than:30d')
  
  return queries.join(' OR ')
}

function parseGmailMessage(messageData: any) {
  const headers = messageData.payload?.headers || []
  
  return {
    id: messageData.id,
    threadId: messageData.threadId,
    subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
    from: headers.find((h: any) => h.name === 'From')?.value || '',
    to: headers.find((h: any) => h.name === 'To')?.value || '',
    date: new Date(parseInt(messageData.internalDate)),
    body: extractMessageBody(messageData.payload),
    labels: messageData.labelIds || [],
    unread: messageData.labelIds?.includes('UNREAD') || false,
    important: messageData.labelIds?.includes('IMPORTANT') || false
  }
}

function extractMessageBody(payload: any): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString()
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString()
      }
    }
  }
  
  return ''
}

// Ajouter d'autres fonctions de synchronisation pour les autres services...
// syncCalendarData, syncContactsData, syncAirtableData, etc.