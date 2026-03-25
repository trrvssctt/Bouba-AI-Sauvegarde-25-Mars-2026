import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, profile, loading: authLoading } = useAuth();

  const stripeSuccess = searchParams.get('stripe_success') === 'true';
  const signupSuccess = searchParams.get('message') === 'signup_success';

  // Redirect selon le rôle dès que l'état auth est résolu
  useEffect(() => {
    if (!user || authLoading) return

    // Le rôle peut venir de profile (si existant) ou directement de l'objet user
    const role = profile?.role || (user as any).role

    if (role === 'admin' || role === 'superadmin') {
      // Admins → backoffice directement, sans vérification d'abonnement ni de profil
      navigate('/admin', { replace: true })
      return
    }

    // Pour les utilisateurs normaux, attendre que le profil soit chargé
    if (!profile) return

    // Abonnement inactif ou en attente → ne pas rediriger (le serveur bloque la connexion)
    if (profile.subscription_status === 'inactive' || profile.subscription_status === 'pending') {
      return
    }

    // Abonnement actif → onboarding ou dashboard
    if (profile.onboarding_complete) {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/onboarding', { replace: true })
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Vérifier que signIn est disponible
    if (typeof signIn !== 'function') {
      console.error('signIn is not a function:', typeof signIn);
      toast.error('Erreur d\'initialisation. Veuillez recharger la page.');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signIn(email.trim(), password);
      
      if (result.success) {
        // La navigation est gérée par le useEffect ci-dessus (rôle → route)
      } else {
        toast.error(result.error || 'Erreur lors de la connexion')
        // Redirection différée si abonnement inactif
        if (result.redirectTo) {
          setTimeout(() => navigate(result.redirectTo!), 2500)
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erreur inattendue lors de la connexion');
    }
    
    setIsLoading(false);
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-violet-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <img src="/avatar-bouba.png" alt="Bouba" className="w-16 h-16 rounded-2xl mx-auto animate-pulse" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-violet-50 to-blue-50 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/60">
        {/* Header with Bouba avatar */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative mx-auto w-fit mb-4"
          >
            <img
              src="/avatar-bouba.png"
              alt="Bouba"
              className="w-24 h-24 rounded-3xl object-cover shadow-xl shadow-primary/20"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-success rounded-full border-2 border-white shadow" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-2xl font-bold text-gray-900">Bouba<span className="text-blue-600">'ia</span></h1>
            <p className="text-gray-500 mt-1 text-sm">Connectez-vous à votre assistant IA</p>
          </motion.div>
        </div>

        {/* Banners de retour Stripe / Signup */}
        {stripeSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-2"
          >
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-green-700">
              <span className="font-semibold">Paiement confirmé !</span> Votre compte est prêt. Connectez-vous ci-dessous.
            </p>
          </motion.div>
        )}
        {signupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2"
          >
            <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Compte créé avec succès !</span> Connectez-vous pour continuer.
            </p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="votre@email.com"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="h-4 w-4 inline mr-2" />
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-3">
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 block text-sm font-medium">
            Pas encore de compte ? <span className="font-bold">S'inscrire gratuitement</span>
          </Link>
          <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}