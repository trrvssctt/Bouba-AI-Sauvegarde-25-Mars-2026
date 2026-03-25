import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, queryOne, User, Profile } from './lib/db'

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
      plan_id = 'starter',
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

    // Créer une subscription si plan payant
    if (plan_id !== 'starter' && subscription_status === 'active') {
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

    // Générer le token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        provider: user.provider 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Définir le cookie httpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    })

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

    // Cookie httpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
        planId: profile?.plan_id || 'starter',
        messagesUsed: profile?.messages_used || 0,
        messagesLimit: profile?.messages_limit || 500,
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
 * Middleware pour vérifier l'authentification
 */
export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.cookies.auth_token

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

export default router