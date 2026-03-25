import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { XCircle, RotateCcw, ArrowLeft, MessageCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-100/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

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
          className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <XCircle className="h-10 w-10 text-red-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <h1 className="text-2xl font-bold text-gray-900">Paiement annulé</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Votre paiement a été annulé. <span className="font-medium text-gray-700">Aucun montant n'a été débité</span> de votre compte.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 text-left space-y-2">
            <p>Vous pouvez réessayer à tout moment. Si vous rencontrez un problème, notre équipe est disponible pour vous aider.</p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => navigate('/signup?step=3')}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw className="h-5 w-5" />
              Réessayer le paiement
            </button>

            <a
              href="mailto:support@boubaia.com"
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Contacter le support
            </a>

            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
