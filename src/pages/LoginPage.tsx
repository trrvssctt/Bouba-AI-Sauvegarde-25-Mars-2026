import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2, Sparkles, Eye, EyeOff, Bot, Ban, Clock, AlertTriangle, MailCheck, XCircle } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'motion/react';

function ResendVerificationButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('Entrez votre email dans le champ ci-dessous puis réessayez.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setSent(true);
      toast.success('Email de vérification renvoyé !');
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return <p className="text-sm text-blue-700 mt-1 font-medium">Email renvoyé !</p>;

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={loading}
      className="text-sm font-semibold text-blue-700 hover:text-blue-900 underline mt-1 inline-flex items-center gap-1"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
      Renvoyer l'email de vérification →
    </button>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, profile, loading: authLoading } = useAuth();

  const stripeSuccess = searchParams.get('stripe_success') === 'true';
  const signupSuccess = searchParams.get('message') === 'signup_success';
  const verifyEmail = searchParams.get('message') === 'verify_email';
  const emailVerified = searchParams.get('message') === 'email_verified';
  const invalidToken = searchParams.get('message') === 'invalid_token';
  const tokenExpired = searchParams.get('message') === 'token_expired';

  // Redirect selon le rôle dès que l'état auth est résolu
  useEffect(() => {
    console.log('🔄 LoginPage useEffect triggered:', { 
      user: !!user, 
      userData: user,
      authLoading, 
      profile: !!profile,
      profileData: profile,
      profileOnboardingComplete: profile?.onboarding_complete,
      userOnboardingComplete: (user as any)?.onboardingComplete
    })
    
    if (!user || authLoading) {
      console.log('⏳ LoginPage - En attente: pas de user ou authLoading')
      return
    }

    const role = profile?.role || (user as any).role
    console.log('🔍 LoginPage - Redirection check:', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      role,
      subscription_status: profile?.subscription_status,
      onboarding_complete: profile?.onboarding_complete
    })

    if (role === 'admin' || role === 'superadmin') {
      console.log('🚀 LoginPage - Redirige admin vers /admin')
      navigate('/admin', { replace: true })
      return
    }

    // Pour les utilisateurs normaux, attendre que le profil soit chargé
    if (!profile) {
      console.log('⏳ LoginPage - En attente: pas de profil')
      return
    }

    // Si pas de profil, attendre ou rediriger vers onboarding
    if (!profile) {
      console.log('⚠️ LoginPage - Pas de profil, redirection vers onboarding par défaut')
      navigate('/onboarding', { replace: true })
      return
    }

    // Abonnement inactif ou en attente → ne pas rediriger
    if (profile.subscription_status === 'inactive' || profile.subscription_status === 'pending') {
      console.log('⚠️ LoginPage - Abonnement inactif/pending:', profile.subscription_status)
      return
    }

    // Abonnement actif → onboarding ou dashboard
    if (profile.onboarding_complete) {
      console.log('✅ LoginPage - Redirige vers /dashboard')
      navigate('/dashboard', { replace: true })
    } else {
      console.log('✅ LoginPage - Redirige vers /onboarding')
      navigate('/onboarding', { replace: true })
    }
  }, [user, profile, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    try {
      const result = await signIn(email, password);

      if (result.success) {
        toast.success('Connexion réussie !');
      } else {
        const code = (result as any).code || 'ERROR';
        if (code === 'PLAN_EXPIRED' && result.redirectTo) {
          // Abonnement expiré → page de renouvellement Wave (QR code)
          toast.error(result.error || 'Votre abonnement a expiré.');
          navigate(result.redirectTo);
          return;
        }
        if (code === 'ACCOUNT_SUSPENDED' || code === 'PAYMENT_PENDING' || code === 'SUBSCRIPTION_INACTIVE' || code === 'EMAIL_NOT_VERIFIED' || code === 'QUOTA_EXHAUSTED') {
          setLoginError({ code, message: result.error || 'Accès refusé.' });
        } else {
          toast.error(result.error || 'Échec de la connexion');
        }
        if (result.redirectTo && code === 'SUBSCRIPTION_INACTIVE') {
          navigate(result.redirectTo);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Échec de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Retour à l'accueil</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo et titre */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg"
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-display font-bold text-gray-900 mb-2"
            >
              Bienvenue sur Bouba'IA
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600"
            >
              Connectez-vous à votre assistant IA personnel
            </motion.p>
          </div>

          {/* Erreur de connexion — compte suspendu / paiement en attente */}
          {loginError && (
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                loginError.code === 'ACCOUNT_SUSPENDED'
                  ? 'bg-red-50 border-red-200'
                  : loginError.code === 'PAYMENT_PENDING'
                  ? 'bg-amber-50 border-amber-200'
                  : loginError.code === 'EMAIL_NOT_VERIFIED'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              {loginError.code === 'ACCOUNT_SUSPENDED'
                ? <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                : loginError.code === 'PAYMENT_PENDING'
                ? <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                : loginError.code === 'EMAIL_NOT_VERIFIED'
                ? <MailCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-bold text-sm ${
                  loginError.code === 'ACCOUNT_SUSPENDED' ? 'text-red-800'
                  : loginError.code === 'PAYMENT_PENDING' ? 'text-amber-800'
                  : loginError.code === 'EMAIL_NOT_VERIFIED' ? 'text-blue-800'
                  : 'text-orange-800'
                }`}>
                  {loginError.code === 'ACCOUNT_SUSPENDED' ? 'Compte suspendu'
                   : loginError.code === 'PAYMENT_PENDING' ? 'Paiement en cours de validation'
                   : loginError.code === 'EMAIL_NOT_VERIFIED' ? 'Email non vérifié'
                   : 'Abonnement inactif'}
                </p>
                <p className={`text-sm mt-0.5 ${
                  loginError.code === 'ACCOUNT_SUSPENDED' ? 'text-red-700'
                  : loginError.code === 'PAYMENT_PENDING' ? 'text-amber-700'
                  : loginError.code === 'EMAIL_NOT_VERIFIED' ? 'text-blue-700'
                  : 'text-orange-700'
                }`}>
                  {loginError.message}
                </p>
                {loginError.code === 'ACCOUNT_SUSPENDED' && (
                  <Link to="/contact" className="text-sm font-semibold text-red-700 hover:text-red-900 underline mt-1 inline-block">
                    Contacter le support →
                  </Link>
                )}
                {loginError.code === 'EMAIL_NOT_VERIFIED' && (
                  <ResendVerificationButton email={email} />
                )}
              </div>
            </motion.div>
          )}

          {/* Messages de succès */}
          {stripeSuccess && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Paiement réussi !</p>
                  <p className="text-sm text-green-600 mt-1">
                    Votre abonnement a été activé. Vous pouvez maintenant vous connecter.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {signupSuccess && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Compte créé avec succès !</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Votre compte a été créé. Connectez-vous pour commencer.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {verifyEmail && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <MailCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Vérifiez votre email !</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Un lien d'activation a été envoyé à votre adresse email. Cliquez dessus pour activer votre compte, puis connectez-vous.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {emailVerified && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Email vérifié avec succès !</p>
                  <p className="text-sm text-green-600 mt-1">
                    Votre adresse email a été confirmée. Vous pouvez maintenant vous connecter.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {(invalidToken || tokenExpired) && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">
                    {tokenExpired ? 'Lien expiré' : 'Lien invalide'}
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    {tokenExpired
                      ? 'Ce lien de vérification a expiré. Entrez votre email pour en recevoir un nouveau.'
                      : 'Ce lien de vérification est invalide. Vérifiez votre email ou demandez un nouveau lien.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Formulaire */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="form-label">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="votre@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="form-label">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Afficher
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pr-12"
                    placeholder="Votre mot de passe"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-gray-600">
                Pas encore de compte ?{' '}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                  S'inscrire gratuitement
                </Link>
              </p>
            </div>

            {/* Options de connexion rapide */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Ou continuer avec</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toast.info('Bientôt disponible !')}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toast.info('Bientôt disponible !')}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              En vous connectant, vous acceptez nos{' '}
              <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                Conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
                Politique de confidentialité
              </Link>
            </p>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
              <Bot className="h-4 w-4" />
              <span className="text-sm">Bouba'IA - Assistant IA © 2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}