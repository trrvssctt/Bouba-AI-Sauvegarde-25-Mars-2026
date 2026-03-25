import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, LogIn, Mail, ArrowLeft } from 'lucide-react';

type Status = 'checking' | 'ready' | 'timeout' | 'error';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<Status>('checking');
  const [email, setEmail] = useState('');
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 15; // 30 secondes max (15 × 2s)

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(`/api/stripe/check-session?sessionId=${sessionId}`);
        const data = await res.json();

        if (data.email) setEmail(data.email);

        if (data.accountReady) {
          setStatus('ready');
          return;
        }

        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) {
            setStatus('timeout');
          }
          return next;
        });
      } catch {
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) setStatus('timeout');
          return next;
        });
      }
    };

    check();
    const interval = setInterval(() => {
      setAttempts(prev => {
        if (prev >= MAX_ATTEMPTS) {
          clearInterval(interval);
          return prev;
        }
        return prev;
      });
      check();
    }, 2000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Stop polling when ready or timeout
  useEffect(() => {
    if (status === 'ready' || status === 'timeout') return;
  }, [status]);

  const progress = Math.min((attempts / MAX_ATTEMPTS) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/60 text-center"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img
            src="/avatar-bouba.png"
            alt="Bouba'ia"
            className="w-10 h-10 rounded-xl object-cover shadow"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="text-xl font-bold text-gray-900">Bouba<span className="text-blue-600">'ia</span></span>
        </div>

        <AnimatePresence mode="wait">

          {/* CHECKING — compte en cours de création */}
          {status === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
                <p className="text-gray-500 text-sm">Création de votre compte en cours…</p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: '5%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-xs text-gray-400">Cela prend généralement quelques secondes…</p>
            </motion.div>
          )}

          {/* READY — compte créé */}
          {status === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Votre compte est prêt !</h1>
                <p className="text-gray-500 text-sm">
                  Bienvenue sur Bouba'ia 🎉<br />
                  {email && <span className="font-medium text-gray-700">{email}</span>}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-left space-y-1">
                <p className="font-semibold">✓ Paiement confirmé</p>
                <p className="font-semibold">✓ Compte activé</p>
                <p className="text-green-600">Un reçu a été envoyé à votre email.</p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <LogIn className="h-5 w-5" />
                Se connecter à mon compte
              </button>
            </motion.div>
          )}

          {/* TIMEOUT — webhook pas encore arrivé */}
          {status === 'timeout' && (
            <motion.div
              key="timeout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-10 w-10 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Activation en cours…</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Votre paiement a bien été reçu. L'activation de votre compte peut prendre
                  encore quelques minutes. Vous recevrez un email de confirmation.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-left">
                <p className="font-semibold mb-1">✓ Paiement confirmé par Stripe</p>
                <p>Essayez de vous connecter dans 2 minutes. Si votre compte n'est pas encore actif,
                  contactez <a href="mailto:support@boubaia.com" className="underline font-medium">support@boubaia.com</a>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Aller à la connexion
                </button>
                <button
                  onClick={() => { setStatus('checking'); setAttempts(0); }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Vérifier à nouveau
                </button>
              </div>
            </motion.div>
          )}

          {/* ERROR — pas de session ID */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
                <p className="text-gray-500 text-sm">Ce lien de confirmation n'est pas valide ou a expiré.</p>
              </div>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
