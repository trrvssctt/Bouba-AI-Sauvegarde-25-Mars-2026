import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query, queryOne, User, Profile } from './lib/db'
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail } from './lib/email'
import { getProfileWithFreshQuota, isQuotaExhausted } from './lib/quota'

/**
 * Un plan payant est « expiré » quand la période du dernier abonnement actif
 * est échue (subscriptions.current_period_end < NOW()). Les plans gratuits
 * et les comptes sans abonnement enregistré ne sont jamais considérés expirés.
 */
async function isPlanExpired(userId: string, planId?: string | null): Promise<boolean> {
  try {
    const planRow = await queryOne<{ price: number }>(
      'SELECT price FROM public.plans WHERE id = $1', [planId || 'free']
    )
    if ((planRow?.price ?? 0) <= 0) return false

    const sub = await queryOne<{ current_period_end: string }>(
      `SELECT current_period_end FROM public.subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY current_period_end DESC LIMIT 1`,
      [userId]
    )
    if (!sub?.current_period_end) return false
    return new Date(sub.current_period_end).getTime() < Date.now()
  } catch (err) {
    console.warn('[AUTH] Vérification expiration plan impossible:', (err as Error).message)
    return false
  }
}

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'bouba-secret-key-123'
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('CRITICAL: JWT_SECRET is weak or missing in production! Set a strong JWT_SECRET environment variable.')
  process.exit(1) // Refuse to start with a weak secret in production
}
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as `${number}${'s'|'m'|'h'|'d'|'w'|'y'}` | number

// In-memory rate limiter for auth endpoints
const _loginAttempts = new Map<string, { count: number; firstAttempt: number }>()

function authRateLimit(req: any, res: any, next: any) {
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown') as string
  const now = Date.now()
  const entry = _loginAttempts.get(ip)
  if (!entry || now - entry.firstAttempt > 15 * 60 * 1000) {
    _loginAttempts.set(ip, { count: 1, firstAttempt: now })
    return next()
  }
  if (entry.count >= 10) {
    return res.status(429).json({ success: false, error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' })
  }
  entry.count++
  next()
}

// Types pour les requêtes
interface SignupRequest {
  email: string
  password?: string
  name?: string
  firstName?: string
  lastName?: string
  provider?: 'google' | 'email'
  providerId?: string
  plan_id?: string
  subscription_status?: 'active' | 'inactive' | 'pending'
  company?: string
  phone?: string
  website?: string
}

interface LoginRequest {
  email: string
  password: string
}

/**
 * POST /api/auth/signup
 * Inscription d'un nouvel utilisateur
 */
router.post('/signup', authRateLimit, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name, 
      firstName, 
      lastName, 
      provider = 'email', 
      providerId,
      plan_id = 'free',
      subscription_status = 'active',
      company,
      phone,
      website
    }: SignupRequest = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email requis' })
    }

    if (provider === 'email' && !password) {
      return res.status(400).json({ error: 'Mot de passe requis pour l\'inscription par email' })
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await queryOne<User>(
      'SELECT id FROM public.users WHERE email = $1',
      [email]
    )

    if (existingUser) {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' })
    }

    // Hasher le mot de passe si fourni
    let passwordHash = null
    if (password) {
      passwordHash = await bcrypt.hash(password, 12)
    }

    // Récupérer l'UUID du rôle 'user' par défaut
    const defaultRole = await queryOne<{ id: string }>(
      'SELECT id FROM public.roles WHERE name = $1',
      ['user']
    )

    // Créer l'utilisateur avec son role_id
    const user = await queryOne<User>(
      `INSERT INTO public.users (email, name, provider, provider_id, password_hash, email_verified, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, provider, created_at`,
      [email, name, provider, providerId, passwordHash, provider === 'google', defaultRole?.id]
    )

    if (!user) {
      throw new Error('Erreur lors de la création de l\'utilisateur')
    }

    // Créer le profil associé avec les informations fournies
    await query(
      `INSERT INTO public.profiles 
       (id, first_name, last_name, plan_id, subscription_status, company, phone, website, work_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id, 
        firstName, 
        lastName, 
        plan_id, 
        subscription_status,
        company || null,
        phone || null,
        website || null,
        'entrepreneur' // Valeur par défaut
      ]
    )

    // Créer une subscription si plan payant avec statut actif (admin créé ou plan gratuit)
    if (plan_id !== 'free' && subscription_status === 'active') {
      await query(
        `INSERT INTO public.subscriptions
         (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          plan_id,
          'active',
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
        ]
      )
    }

    // Vérification email : générer un token et l'envoyer
    // Si pas de service email configuré, marquer directement comme vérifié
    if (!process.env.RESEND_API_KEY) {
      await query(
        'UPDATE public.users SET email_verified = true WHERE id = $1',
        [user.id]
      )
    } else {
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

      await query(
        `INSERT INTO public.email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
        [user.id, verificationToken, verificationExpires]
      )

      sendVerificationEmail(email, firstName, verificationToken).catch(err =>
        console.warn('[EMAIL] sendVerificationEmail failed:', err)
      )
    }

    // Pas de cookie — l'utilisateur doit d'abord vérifier son email puis se connecter
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider
      }
    })

  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' })
  }
})

/**
 * POST /api/auth/signin
 * Connexion d'un utilisateur (alias pour login)
 */
router.post('/signin', authRateLimit, async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' })
    }

    // Récupérer l'utilisateur avec son rôle résolu (JOIN roles)
    const user = await queryOne<User & { role_name: string }>(
      `SELECT u.id, u.email, u.name, u.provider, u.password_hash,
              u.email_verified, u.created_at, u.updated_at,
              u.role_id, r.name AS role_name
       FROM public.users u
       JOIN public.roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [email]
    )

    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' })
    }

    // Vérifier le mot de passe pour les utilisateurs email
    if (user.provider === 'email') {
      if (!user.password_hash) {
        return res.status(401).json({ success: false, error: 'Compte non configuré pour la connexion par email' })
      }
      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Identifiants incorrects' })
      }
    }

    const roleName = (user.role_name || 'user') as 'user' | 'admin' | 'superadmin'
    const isAdmin = roleName === 'admin' || roleName === 'superadmin'

    // Bloquer la connexion si l'email n'est pas vérifié (admins exemptés)
    if (!isAdmin && !user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte de réception.',
        code: 'EMAIL_NOT_VERIFIED',
        redirectTo: '/login',
      })
    }

    // Récupérer le profil
    const profile = await queryOne<Profile>(
      'SELECT * FROM public.profiles WHERE id = $1',
      [user.id]
    )

    // Vérification abonnement — admins exemptés
    if (!isAdmin && profile) {
      if (profile.subscription_status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'Votre compte a été suspendu. Veuillez contacter le support pour plus d\'informations.',
          code: 'ACCOUNT_SUSPENDED',
          redirectTo: '/login',
          role: roleName,
        })
      }
      if (profile.subscription_status === 'pending') {
        return res.status(403).json({
          success: false,
          error: 'Votre paiement Wave est en cours de validation par notre équipe. Vous serez notifié par email sous 24h.',
          code: 'PAYMENT_PENDING',
          redirectTo: '/login',
          role: roleName,
        })
      }
      if (profile.subscription_status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Votre abonnement n\'est pas actif. Veuillez finaliser votre paiement.',
          code: 'SUBSCRIPTION_INACTIVE',
          redirectTo: '/settings/plan',
          role: roleName,
        })
      }

      // Plan payant expiré (période d'abonnement échue) → blocage automatique
      // et redirection vers la page de renouvellement par QR code Wave.
      if (await isPlanExpired(user.id, profile.plan_id)) {
        return res.status(403).json({
          success: false,
          error: 'Votre abonnement a expiré. Renouvelez votre paiement pour retrouver l\'accès à Bouba\'ia.',
          code: 'PLAN_EXPIRED',
          redirectTo: `/payment/renew?email=${encodeURIComponent(user.email)}`,
          role: roleName,
        })
      }

      // Quota mensuel épuisé → connexion refusée jusqu'au mois suivant ou
      // upgrade. Le reset paresseux remet le compteur à zéro au premier
      // login d'un nouveau mois — on ne bloque donc jamais indéfiniment.
      const quotaProfile = await getProfileWithFreshQuota(user.id)
      if (quotaProfile && isQuotaExhausted(quotaProfile)) {
        return res.status(403).json({
          success: false,
          error: 'Votre quota mensuel de messages est épuisé. Mettez à niveau votre plan pour continuer à utiliser Bouba\'ia — votre quota sera réinitialisé au début du mois prochain.',
          code: 'QUOTA_EXHAUSTED',
          redirectTo: '/pricing',
          role: roleName,
        })
      }
    }

    // Générer le token JWT avec role_id + role_name
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: roleName,
        role_id: user.role_id,
        planId: profile?.plan_id || 'starter',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Mettre à jour la dernière activité
    await query(
      'UPDATE public.profiles SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    )

    // Cookie de session (expire à la fermeture du navigateur)
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified || false,
        provider: user.provider,
        role: roleName,
        role_id: user.role_id,
        created_at: user.created_at,
        updated_at: user.updated_at,
        profile: profile ? { ...profile, role: roleName } : null,
        token,
      },
    })

  } catch (error) {
    console.error('Signin error:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la connexion' })
  }
})

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    // Récupérer l'utilisateur
    const user = await queryOne<User>(
      'SELECT id, email, name, provider, password_hash FROM public.users WHERE email = $1',
      [email]
    )

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }

    // Vérifier le mot de passe pour les utilisateurs email
    if (user.provider === 'email') {
      if (!user.password_hash) {
        return res.status(401).json({ error: 'Compte non configuré pour la connexion par email' })
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Identifiants incorrects' })
      }
    }

    // Récupérer le profil
    const profile = await queryOne<Profile>(
      'SELECT * FROM public.profiles WHERE id = $1',
      [user.id]
    )

    // Mêmes contrôles que /signin — cette route legacy ne doit pas être une
    // porte de contournement (abonnement + quota mensuel épuisé)
    const legacyRole = profile?.role || 'user'
    const legacyIsAdmin = legacyRole === 'admin' || legacyRole === 'superadmin'
    if (!legacyIsAdmin && profile) {
      if (profile.subscription_status === 'suspended') {
        return res.status(403).json({ error: 'Votre compte a été suspendu. Veuillez contacter le support.', code: 'ACCOUNT_SUSPENDED' })
      }
      if (profile.subscription_status && profile.subscription_status !== 'active') {
        return res.status(403).json({ error: 'Votre abonnement n\'est pas actif. Veuillez finaliser votre paiement.', code: 'SUBSCRIPTION_INACTIVE' })
      }
      if (await isPlanExpired(user.id, profile.plan_id)) {
        return res.status(403).json({
          error: 'Votre abonnement a expiré. Renouvelez votre paiement pour retrouver l\'accès à Bouba\'ia.',
          code: 'PLAN_EXPIRED',
          redirectTo: `/payment/renew?email=${encodeURIComponent(user.email)}`,
        })
      }
      const quotaProfile = await getProfileWithFreshQuota(user.id)
      if (quotaProfile && isQuotaExhausted(quotaProfile)) {
        return res.status(403).json({
          error: 'Votre quota mensuel de messages est épuisé. Mettez à niveau votre plan pour continuer — votre quota sera réinitialisé au début du mois prochain.',
          code: 'QUOTA_EXHAUSTED',
        })
      }
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: profile?.role || 'user',
        planId: profile?.plan_id || 'starter'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Mettre à jour la dernière activité
    await query(
      'UPDATE public.profiles SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    )

    // Définir le cookie httpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified || false,
        provider: user.provider,
        created_at: user.created_at,
        updated_at: user.updated_at,
        profile: profile
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' })
  }
})

/**
 * POST /api/auth/signout
 * Déconnexion d'un utilisateur (alias pour logout)
 */
router.post('/signout', (req, res) => {
  try {
    // Supprimer le cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })

    res.json({ success: true, data: { message: 'Déconnexion réussie' } })

  } catch (error) {
    console.error('Signout error:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la déconnexion' })
  }
})

/**
 * GET /api/auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.auth_token

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' })
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded.userId) {
      return res.status(401).json({ error: 'Token invalide' })
    }

    // Récupérer l'utilisateur avec son rôle résolu
    const user = await queryOne<User & { role_name: string }>(
      `SELECT u.id, u.email, u.name, u.provider, u.role_id, r.name AS role_name
       FROM public.users u
       JOIN public.roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [decoded.userId]
    )

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    const roleName = (user.role_name || decoded.role || 'user') as 'user' | 'admin' | 'superadmin'

    const profile = await queryOne<Profile>(
      `SELECT role, plan_id, messages_used, messages_limit, subscription_status,
       onboarding_complete, onboarding_step, preferences, first_name, last_name
       FROM public.profiles WHERE id = $1`,
      [user.id]
    )

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        role: roleName,
        role_id: user.role_id,
        planId: profile?.plan_id || 'free',
        messagesUsed: profile?.messages_used || 0,
        messagesLimit: profile?.messages_limit ?? 500,
        subscriptionStatus: profile?.subscription_status || 'active',
        onboardingComplete: profile?.onboarding_complete || false,
        onboardingStep: profile?.onboarding_step || 0,
        preferences: profile?.preferences || {},
      },
    })

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token invalide' })
    }
    
    console.error('Me endpoint error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/**
 * POST /api/auth/forgot-password
 * Génère un token de réinitialisation et envoie l'email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email requis' })
    }

    const user = await queryOne<User>(
      'SELECT id, email FROM public.users WHERE email = $1',
      [email]
    )

    // Répondre toujours avec succès pour éviter l'enumération d'emails
    if (!user) {
      return res.json({ success: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    await query(
      `INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [user.id, token, expiresAt]
    )

    await sendPasswordResetEmail(email, token).catch(err =>
      console.warn('[EMAIL] sendPasswordResetEmail failed:', err)
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/**
 * POST /api/auth/reset-password
 * Vérifie le token et met à jour le mot de passe
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' })
    }

    const row = await queryOne<{ user_id: string; expires_at: Date }>(
      'SELECT user_id, expires_at FROM public.password_reset_tokens WHERE token = $1',
      [token]
    )

    if (!row) {
      return res.status(400).json({ error: 'Token invalide ou expiré' })
    }
    if (new Date() > new Date(row.expires_at)) {
      return res.status(400).json({ error: 'Ce lien de réinitialisation a expiré. Recommencez la procédure.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await query(
      'UPDATE public.users SET password_hash = $1 WHERE id = $2',
      [passwordHash, row.user_id]
    )

    // Invalider le token après utilisation
    await query(
      'DELETE FROM public.password_reset_tokens WHERE user_id = $1',
      [row.user_id]
    )

    res.json({ success: true, message: 'Mot de passe mis à jour avec succès' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    // Accept token from cookie OR Authorization: Bearer header
    let token = req.cookies.auth_token
    if (!token) {
      const authHeader = req.headers['authorization'] as string | undefined
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded.userId) {
      return res.status(401).json({ error: 'Token invalide' })
    }

    // Ajouter les informations utilisateur à la requête
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      planId: decoded.planId || 'starter'
    }

    next()

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token invalide' })
    }
    
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

/**
 * PUT /api/auth/profile
 * Mettre à jour le profil de l'utilisateur connecté (onboarding, préférences, etc.)
 */
router.put('/profile', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non authentifié' })
    }

    const {
      onboarding_complete,
      work_type,
      timezone,
      language,
      first_name,
      last_name,
      preferences,
      company_info,
    } = req.body

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 1

    if (onboarding_complete !== undefined) { setClauses.push(`onboarding_complete = $${idx++}`); values.push(onboarding_complete) }
    if (work_type !== undefined)           { setClauses.push(`work_type = $${idx++}`);           values.push(work_type) }
    if (timezone !== undefined)            { setClauses.push(`timezone = $${idx++}`);            values.push(timezone) }
    if (language !== undefined)            { setClauses.push(`language = $${idx++}`);            values.push(language) }
    if (first_name !== undefined)          { setClauses.push(`first_name = $${idx++}`);          values.push(first_name) }
    if (last_name !== undefined)           { setClauses.push(`last_name = $${idx++}`);           values.push(last_name) }

    // Merge preferences keys instead of full replace — combines preferences object + company_info
    const preferencesUpdate: Record<string, any> = {}
    if (preferences !== undefined && typeof preferences === 'object') Object.assign(preferencesUpdate, preferences)
    if (company_info !== undefined) preferencesUpdate.company_info = company_info
    if (Object.keys(preferencesUpdate).length > 0) {
      setClauses.push(`preferences = COALESCE(preferences, '{}'::jsonb) || $${idx++}::jsonb`)
      values.push(JSON.stringify(preferencesUpdate))
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' })
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(userId)

    const updated = await queryOne<Profile>(
      `UPDATE public.profiles SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Profil introuvable' })
    }

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

/**
 * GET /api/auth/verify-email?token=xxx
 * Vérifie l'adresse email à partir du token reçu par email
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query as { token?: string }
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

    if (!token) {
      return res.redirect(`${FRONTEND_URL}/login?message=invalid_token`)
    }

    const row = await queryOne<{ user_id: string; expires_at: Date }>(
      'SELECT user_id, expires_at FROM public.email_verification_tokens WHERE token = $1',
      [token]
    )

    if (!row) {
      return res.redirect(`${FRONTEND_URL}/login?message=invalid_token`)
    }

    if (new Date() > new Date(row.expires_at)) {
      await query('DELETE FROM public.email_verification_tokens WHERE user_id = $1', [row.user_id])
      return res.redirect(`${FRONTEND_URL}/login?message=token_expired`)
    }

    // Marquer l'email comme vérifié
    await query('UPDATE public.users SET email_verified = true WHERE id = $1', [row.user_id])
    await query('DELETE FROM public.email_verification_tokens WHERE user_id = $1', [row.user_id])

    // Envoyer l'email de bienvenue maintenant que l'email est vérifié
    const verifiedUser = await queryOne<{ email: string; first_name?: string }>(
      `SELECT u.email, p.first_name
       FROM public.users u
       LEFT JOIN public.profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [row.user_id]
    )
    if (verifiedUser) {
      sendWelcomeEmail(verifiedUser.email, verifiedUser.first_name).catch(err =>
        console.warn('[EMAIL] sendWelcomeEmail failed:', err)
      )
    }

    return res.redirect(`${FRONTEND_URL}/login?message=email_verified`)
  } catch (error) {
    console.error('Verify email error:', error)
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
    return res.redirect(`${FRONTEND_URL}/login?message=invalid_token`)
  }
})

/**
 * POST /api/auth/resend-verification
 * Renvoie l'email de vérification
 */
router.post('/resend-verification', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' })
    }

    const user = await queryOne<User>(
      'SELECT id, email, email_verified, provider FROM public.users WHERE email = $1',
      [email]
    )

    if (!user || user.email_verified) {
      // Répondre avec succès même si l'utilisateur n'existe pas (sécurité)
      return res.json({ success: true })
    }

    const profile = await queryOne<{ first_name?: string }>(
      'SELECT first_name FROM public.profiles WHERE id = $1',
      [user.id]
    )

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await query(
      `INSERT INTO public.email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [user.id, verificationToken, verificationExpires]
    )

    sendVerificationEmail(user.email, profile?.first_name, verificationToken).catch(err =>
      console.warn('[EMAIL] sendVerificationEmail failed:', err)
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

export default router