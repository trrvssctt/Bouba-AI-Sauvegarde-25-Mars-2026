import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-yellow-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

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

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Clock className="h-10 w-10 text-orange-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-5"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement Wave reçu !</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Votre demande d'abonnement a bien été enregistrée.
              Notre équipe va vérifier votre paiement sous <span className="font-semibold text-orange-600">24 heures</span>.
            </p>
          </div>

          {/* Steps */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Compte créé</p>
                <p className="text-xs text-gray-500">Votre compte est en attente d'activation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-orange-400 flex items-center justify-center mt-0.5 shrink-0">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Validation en cours</p>
                <p className="text-xs text-gray-500">Notre équipe vérifie votre paiement Wave</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-400">Activation du compte</p>
                <p className="text-xs text-gray-400">Vous recevrez un email de confirmation</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-left">
            <Mail className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              Un email vous sera envoyé dès que votre compte sera activé. Pensez à vérifier vos spams.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <Link
              to="/login"
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              Vérifier l'état de mon compte
            </Link>

            <a
              href="mailto:support@boubaia.com"
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Un problème ? Contactez support@boubaia.com
            </a>

            <Link
              to="/"
              className="flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
