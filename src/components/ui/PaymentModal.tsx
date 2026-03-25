import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, QrCode, Clock, CheckCircle2, CreditCard, Smartphone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/src/hooks/useAuth'
import { cn } from '@/src/lib/utils'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  planName: string
  amount: string        // montant affiché (ex: "29")
  planId?: string       // ex: 'pro' | 'enterprise'
  onPaymentSuccess?: () => void
}

type Tab = 'wave' | 'card'

export default function PaymentModal({
  isOpen,
  onClose,
  planName,
  amount,
  planId,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [tab, setTab] = useState<Tab>('wave')
  const [paymentReference, setPaymentReference] = useState('')
  const [countdown, setCountdown] = useState(600)
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()

  // Réinitialiser à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setPaymentReference('')
      setCountdown(600)
      setTab('wave')
    }
  }, [isOpen])

  // Compte à rebours
  useEffect(() => {
    if (!isOpen || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          toast.error('Session expirée. Veuillez réessayer.')
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, onClose])

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Wave payment → soumet une demande en attente ──────────────────────────
  const handleWaveSubmit = async () => {
    if (!paymentReference.trim()) {
      toast.error('Veuillez saisir la référence Wave de votre paiement')
      return
    }
    if (!user || !planId) {
      toast.error('Session invalide — veuillez vous reconnecter')
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch('/api/upgrade-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPlan: planId,
          paymentMethod: 'wave',
          paymentReference: paymentReference.trim(),
          amount: parseInt(amount) * 100,
        }),
      })
      const data = await res.json()

      if (res.status === 409) {
        toast.info('Une demande pour ce plan est déjà en attente de validation.')
        onClose()
        return
      }
      if (!data.success) throw new Error(data.error || 'Erreur serveur')

      toast.success('Demande envoyée ! Votre paiement est en cours de validation par notre équipe.')
      onPaymentSuccess?.()
      setTimeout(onClose, 1500)
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi de la demande')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Carte bancaire → Stripe Checkout ─────────────────────────────────────
  const handleCardPayment = async () => {
    if (!user || !planId) {
      toast.error('Session invalide — veuillez vous reconnecter')
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          userId: user.id,
          userEmail: user.email,
          successPath: '/settings/plan?stripe_success=true',
          cancelPath: '/settings/plan?cancelled=true',
        }),
      })
      const data = await res.json()

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error(data.error || 'Impossible de créer la session de paiement')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur Stripe')
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-lg"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
          className="relative bg-surface rounded-3xl shadow-2xl border border-border max-w-md w-full z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold">Passer au plan {planName}</h3>
            <p className="text-white/70 text-sm mt-0.5">{amount} €/mois</p>

            {/* Countdown (Wave seulement) */}
            {tab === 'wave' && (
              <div className="mt-4 flex items-center justify-between bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" /> Session expire dans
                </div>
                <span className="font-mono text-lg font-bold">{formatTime(countdown)}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex bg-background border-b border-border">
            <button
              onClick={() => setTab('wave')}
              className={cn(
                'flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2',
                tab === 'wave'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-secondary'
              )}
            >
              <Smartphone className="w-4 h-4" /> Wave Mobile
            </button>
            <button
              onClick={() => setTab('card')}
              className={cn(
                'flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2',
                tab === 'card'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-secondary'
              )}
            >
              <CreditCard className="w-4 h-4" /> Carte bancaire
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* ── ONGLET WAVE ── */}
            {tab === 'wave' && (
              <>
                {/* QR Code */}
                <div className="text-center space-y-3">
                  <div className="mx-auto w-44 h-44 bg-white border-4 border-gray-100 rounded-2xl overflow-hidden shadow-md">
                    <img
                      src="/assets/qr_code_marchant_wave.png"
                      alt="QR Code Wave"
                      className="w-full h-full object-contain"
                      onError={e => {
                        const el = e.currentTarget
                        el.style.display = 'none'
                        el.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden w-full h-full flex-col items-center justify-center gap-2 text-muted">
                      <QrCode className="w-12 h-12" />
                      <p className="text-xs">QR Code Wave</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted">
                    Scannez avec votre app <span className="font-bold text-secondary">Wave</span> et payez <span className="font-bold text-primary">{amount} €</span>
                  </p>
                </div>

                {/* Instructions numérotées */}
                <ol className="space-y-2 text-sm text-muted">
                  {[
                    'Ouvrez votre application Wave',
                    'Scannez le QR code ci-dessus',
                    `Effectuez le paiement de ${amount} €`,
                    'Copiez la référence Wave et collez-la ci-dessous',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Référence */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">
                    Référence Wave *
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="Ex : WAV-123456789"
                    className="w-full input-field font-mono text-center"
                  />
                  <p className="text-xs text-muted text-center">
                    La référence apparaît dans votre reçu Wave après le paiement
                  </p>
                </div>

                <div className="p-3 bg-warning/10 border border-warning/20 rounded-2xl text-xs text-muted">
                  ⏳ Votre demande sera vérifiée par notre équipe. Vous serez notifié par email dès validation.
                </div>

                <button
                  onClick={handleWaveSubmit}
                  disabled={isProcessing || !paymentReference.trim()}
                  className="w-full bg-primary text-white py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Soumettre ma demande</>
                  )}
                </button>
              </>
            )}

            {/* ── ONGLET CARTE ── */}
            {tab === 'card' && (
              <>
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 bg-success/10 text-success border border-success/20 rounded-2xl px-4 py-2 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Paiement sécurisé Stripe
                  </div>
                  <p className="text-sm text-muted">
                    Vous allez être redirigé vers la page de paiement Stripe pour régler <span className="font-bold text-secondary">{amount} €/mois</span>.
                  </p>
                </div>

                {/* Logos cartes */}
                <div className="flex justify-center gap-3">
                  {[
                    { label: 'VISA', bg: 'bg-blue-600' },
                    { label: 'MC', bg: 'bg-red-500' },
                    { label: 'AMEX', bg: 'bg-blue-400' },
                  ].map(c => (
                    <div key={c.label} className={cn('px-2.5 py-1 rounded text-white text-xs font-bold', c.bg)}>
                      {c.label}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 text-sm text-muted">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    Activation immédiate après paiement confirmé
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    Abonnement mensuel — résiliable à tout moment
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    Données sécurisées, aucune carte stockée chez nous
                  </div>
                </div>

                <button
                  onClick={handleCardPayment}
                  disabled={isProcessing}
                  className="w-full bg-primary text-white py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Redirection…</>
                  ) : (
                    <><CreditCard className="w-5 h-5" /> Payer {amount} € avec Stripe</>
                  )}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="w-full text-muted text-sm py-1 hover:text-secondary transition-colors"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
