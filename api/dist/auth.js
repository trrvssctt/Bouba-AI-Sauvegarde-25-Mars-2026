"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./lib/db");
const email_1 = require("./lib/email");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bouba-secret-key-123';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    console.error('CRITICAL: JWT_SECRET is weak or missing in production! Set a strong JWT_SECRET environment variable.');
    process.exit(1); // Refuse to start with a weak secret in production
}
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d');
// In-memory rate limiter for auth endpoints
const _loginAttempts = new Map();
function authRateLimit(req, res, next) {
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown');
    const now = Date.now();
    const entry = _loginAttempts.get(ip);
    if (!entry || now - entry.firstAttempt > 15 * 60 * 1000) {
        _loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return next();
    }
    if (entry.count >= 10) {
        return res.status(429).json({ success: false, error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });
    }
    entry.count++;
    next();
}
/**
 * POST /api/auth/signup
 * Inscription d'un nouvel utilisateur
 */
router.post('/signup', authRateLimit, async (req, res) => {
    try {
        const { email, password, name, firstName, lastName, provider = 'email', providerId, plan_id = 'free', subscription_status = 'active', company, phone, website } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email requis' });
        }
        if (provider === 'email' && !password) {
            return res.status(400).json({ error: 'Mot de passe requis pour l\'inscription par email' });
        }
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await (0, db_1.queryOne)('SELECT id FROM public.users WHERE email = $1', [email]);
        if (existingUser) {
            return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
        }
        // Hasher le mot de passe si fourni
        let passwordHash = null;
        if (password) {
            passwordHash = await bcryptjs_1.default.hash(password, 12);
        }
        // Récupérer l'UUID du rôle 'user' par défaut
        const defaultRole = await (0, db_1.queryOne)('SELECT id FROM public.roles WHERE name = $1', ['user']);
        // Créer l'utilisateur avec son role_id
        const user = await (0, db_1.queryOne)(`INSERT INTO public.users (email, name, provider, provider_id, password_hash, email_verified, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, provider, created_at`, [email, name, provider, providerId, passwordHash, provider === 'google', defaultRole?.id]);
        if (!user) {
            throw new Error('Erreur lors de la création de l\'utilisateur');
        }
        // Créer le profil associé avec les informations fournies
        await (0, db_1.query)(`INSERT INTO public.profiles 
       (id, first_name, last_name, plan_id, subscription_status, company, phone, website, work_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            user.id,
            firstName,
            lastName,
            plan_id,
            subscription_status,
            company || null,
            phone || null,
            website || null,
            'entrepreneur' // Valeur par défaut
        ]);
        // Créer une subscription si plan payant
        if (plan_id !== 'free' && subscription_status === 'active') {
            await (0, db_1.query)(`INSERT INTO public.subscriptions 
         (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5)`, [
                user.id,
                plan_id,
                'active',
                new Date(),
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
            ]);
        }
        // Générer le token JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            provider: user.provider
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Cookie de session (expire à la fermeture du navigateur)
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        // Email de bienvenue (non bloquant)
        (0, email_1.sendWelcomeEmail)(email, firstName).catch(err => console.warn('[EMAIL] sendWelcomeEmail failed:', err));
        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                provider: user.provider
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});
/**
 * POST /api/auth/signin
 * Connexion d'un utilisateur (alias pour login)
 */
router.post('/signin', authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
        }
        // Récupérer l'utilisateur avec son rôle résolu (JOIN roles)
        const user = await (0, db_1.queryOne)(`SELECT u.id, u.email, u.name, u.provider, u.password_hash,
              u.email_verified, u.created_at, u.updated_at,
              u.role_id, r.name AS role_name
       FROM public.users u
       JOIN public.roles r ON r.id = u.role_id
       WHERE u.email = $1`, [email]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
        }
        // Vérifier le mot de passe pour les utilisateurs email
        if (user.provider === 'email') {
            if (!user.password_hash) {
                return res.status(401).json({ success: false, error: 'Compte non configuré pour la connexion par email' });
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
            }
        }
        const roleName = (user.role_name || 'user');
        const isAdmin = roleName === 'admin' || roleName === 'superadmin';
        // Récupérer le profil
        const profile = await (0, db_1.queryOne)('SELECT * FROM public.profiles WHERE id = $1', [user.id]);
        // Vérification abonnement — admins exemptés
        if (!isAdmin && profile) {
            if (profile.subscription_status === 'suspended') {
                return res.status(403).json({
                    success: false,
                    error: 'Votre compte a été suspendu. Veuillez contacter le support pour plus d\'informations.',
                    code: 'ACCOUNT_SUSPENDED',
                    redirectTo: '/login',
                    role: roleName,
                });
            }
            if (profile.subscription_status === 'pending') {
                return res.status(403).json({
                    success: false,
                    error: 'Votre paiement Wave est en cours de validation par notre équipe. Vous serez notifié par email sous 24h.',
                    code: 'PAYMENT_PENDING',
                    redirectTo: '/login',
                    role: roleName,
                });
            }
            if (profile.subscription_status !== 'active') {
                return res.status(403).json({
                    success: false,
                    error: 'Votre abonnement n\'est pas actif. Veuillez finaliser votre paiement.',
                    code: 'SUBSCRIPTION_INACTIVE',
                    redirectTo: '/settings/plan',
                    role: roleName,
                });
            }
        }
        // Générer le token JWT avec role_id + role_name
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: roleName,
            role_id: user.role_id,
            planId: profile?.plan_id || 'starter',
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Mettre à jour la dernière activité
        await (0, db_1.query)('UPDATE public.profiles SET last_active_at = NOW() WHERE id = $1', [user.id]);
        // Cookie de session (expire à la fermeture du navigateur)
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
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
        });
    }
    catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur lors de la connexion' });
    }
});
/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }
        // Récupérer l'utilisateur
        const user = await (0, db_1.queryOne)('SELECT id, email, name, provider, password_hash FROM public.users WHERE email = $1', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        // Vérifier le mot de passe pour les utilisateurs email
        if (user.provider === 'email') {
            if (!user.password_hash) {
                return res.status(401).json({ error: 'Compte non configuré pour la connexion par email' });
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Identifiants incorrects' });
            }
        }
        // Récupérer le profil
        const profile = await (0, db_1.queryOne)('SELECT * FROM public.profiles WHERE id = $1', [user.id]);
        // Générer le token JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: profile?.role || 'user',
            planId: profile?.plan_id || 'starter'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Mettre à jour la dernière activité
        await (0, db_1.query)('UPDATE public.profiles SET last_active_at = NOW() WHERE id = $1', [user.id]);
        // Définir le cookie httpOnly
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
        });
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
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});
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
        });
        res.json({ success: true, data: { message: 'Déconnexion réussie' } });
    }
    catch (error) {
        console.error('Signout error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur lors de la déconnexion' });
    }
});
/**
 * GET /api/auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Token manquant' });
        }
        // Vérifier et décoder le token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded.userId) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        // Récupérer l'utilisateur avec son rôle résolu
        const user = await (0, db_1.queryOne)(`SELECT u.id, u.email, u.name, u.provider, u.role_id, r.name AS role_name
       FROM public.users u
       JOIN public.roles r ON r.id = u.role_id
       WHERE u.id = $1`, [decoded.userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const roleName = (user.role_name || decoded.role || 'user');
        const profile = await (0, db_1.queryOne)(`SELECT role, plan_id, messages_used, messages_limit, subscription_status,
       onboarding_complete, onboarding_step, preferences, first_name, last_name
       FROM public.profiles WHERE id = $1`, [user.id]);
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
        });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        console.error('Me endpoint error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
/**
 * POST /api/auth/forgot-password
 * Génère un token de réinitialisation et envoie l'email
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email requis' });
        }
        const user = await (0, db_1.queryOne)('SELECT id, email FROM public.users WHERE email = $1', [email]);
        // Répondre toujours avec succès pour éviter l'enumération d'emails
        if (!user) {
            return res.json({ success: true });
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
        await (0, db_1.query)(`INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`, [user.id, token, expiresAt]);
        await (0, email_1.sendPasswordResetEmail)(email, token).catch(err => console.warn('[EMAIL] sendPasswordResetEmail failed:', err));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
/**
 * POST /api/auth/reset-password
 * Vérifie le token et met à jour le mot de passe
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
        }
        const row = await (0, db_1.queryOne)('SELECT user_id, expires_at FROM public.password_reset_tokens WHERE token = $1', [token]);
        if (!row) {
            return res.status(400).json({ error: 'Token invalide ou expiré' });
        }
        if (new Date() > new Date(row.expires_at)) {
            return res.status(400).json({ error: 'Ce lien de réinitialisation a expiré. Recommencez la procédure.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        await (0, db_1.query)('UPDATE public.users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
        // Invalider le token après utilisation
        await (0, db_1.query)('DELETE FROM public.password_reset_tokens WHERE user_id = $1', [row.user_id]);
        res.json({ success: true, message: 'Mot de passe mis à jour avec succès' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
const authenticate = async (req, res, next) => {
    try {
        // Accept token from cookie OR Authorization: Bearer header
        let token = req.cookies.auth_token;
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.slice(7);
            }
        }
        if (!token) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded.userId) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        // Ajouter les informations utilisateur à la requête
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role || 'user',
            planId: decoded.planId || 'starter'
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
exports.authenticate = authenticate;
/**
 * PUT /api/auth/profile
 * Mettre à jour le profil de l'utilisateur connecté (onboarding, préférences, etc.)
 */
router.put('/profile', exports.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Non authentifié' });
        }
        const { onboarding_complete, work_type, timezone, language, first_name, last_name, preferences, company_info, } = req.body;
        const setClauses = [];
        const values = [];
        let idx = 1;
        if (onboarding_complete !== undefined) {
            setClauses.push(`onboarding_complete = $${idx++}`);
            values.push(onboarding_complete);
        }
        if (work_type !== undefined) {
            setClauses.push(`work_type = $${idx++}`);
            values.push(work_type);
        }
        if (timezone !== undefined) {
            setClauses.push(`timezone = $${idx++}`);
            values.push(timezone);
        }
        if (language !== undefined) {
            setClauses.push(`language = $${idx++}`);
            values.push(language);
        }
        if (first_name !== undefined) {
            setClauses.push(`first_name = $${idx++}`);
            values.push(first_name);
        }
        if (last_name !== undefined) {
            setClauses.push(`last_name = $${idx++}`);
            values.push(last_name);
        }
        // Merge preferences keys instead of full replace — combines preferences object + company_info
        const preferencesUpdate = {};
        if (preferences !== undefined && typeof preferences === 'object')
            Object.assign(preferencesUpdate, preferences);
        if (company_info !== undefined)
            preferencesUpdate.company_info = company_info;
        if (Object.keys(preferencesUpdate).length > 0) {
            setClauses.push(`preferences = COALESCE(preferences, '{}'::jsonb) || $${idx++}::jsonb`);
            values.push(JSON.stringify(preferencesUpdate));
        }
        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
        }
        setClauses.push(`updated_at = NOW()`);
        values.push(userId);
        const updated = await (0, db_1.queryOne)(`UPDATE public.profiles SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Profil introuvable' });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map