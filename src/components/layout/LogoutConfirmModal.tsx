import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { LogOut, X, ShieldCheck, Sparkles } from 'lucide-react'
import AvatarBouba from '@/src/components/AvatarBouba'
import { useAuth } from '@/src/hooks/useAuth'

interface LogoutConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function LogoutConfirmModal({ isOpen, onConfirm, onCancel }: LogoutConfirmModalProps) {
  const [confirming, setConfirming] = useState(false)
  const { profile, user } = useAuth()

  const handleConfirm = async () => {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 600)) // small delay for visual feedback
    onConfirm()
  }

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : user?.email?.split('@')[0] || 'Utilisateur'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-secondary/50 backdrop-blur-md"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative bg-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden z-10 border border-border"
          >
            {/* Close */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 hover:bg-background rounded-xl transition-colors text-muted hover:text-secondary z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Gradient top strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-primary" />

            {/* Header with avatar */}
            <div className="relative pt-8 pb-6 px-6 text-center bg-gradient-to-b from-primary/5 to-transparent">
              {/* Decorative glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-col items-center gap-3">
                <AvatarBouba animation="shy" size={72} className="rounded-2xl shadow-lg border-2 border-white/60" autoIdle={false} />
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">Au revoir,</p>
                  <h3 className="text-xl font-display font-bold text-secondary mt-0.5">{displayName}</h3>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 space-y-4">
              <p className="text-center text-sm text-muted leading-relaxed">
                Souhaitez-vous vraiment vous déconnecter de Bouba&nbsp;?
              </p>

              {/* Info chips */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-3 bg-success/8 border border-success/20 rounded-2xl">
                  <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                  <p className="text-xs font-medium text-secondary">Vos données sont sauvegardées automatiquement</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-primary/6 border border-primary/15 rounded-2xl">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-secondary">Bouba vous attend à votre prochaine connexion</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onCancel}
                  disabled={confirming}
                  className="flex-1 btn-secondary py-3 text-sm font-bold rounded-2xl"
                >
                  Rester connecté
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold bg-danger text-white hover:bg-danger/80 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-danger/20"
                >
                  {confirming ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  {confirming ? 'Déconnexion…' : 'Se déconnecter'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
