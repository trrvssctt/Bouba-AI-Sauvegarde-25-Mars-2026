import { useState } from 'react'
import { AlertTriangle, Clock, X, CreditCard, Smartphone } from 'lucide-react'
import { usePayment } from '@/src/hooks/usePayment'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import { cn } from '@/src/lib/utils'
import PaymentModal from './PaymentModal'

export default function RenewalBanner() {
  const { subscription } = usePayment()
  const { profile } = useAuth()
  const { plans } = usePlans()
  const [dismissed, setDismissed] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  if (dismissed) return null
  if (!subscription?.current_period_end) return null
  if (!profile?.plan_id || profile.plan_id === 'free') return null

  const endDate = new Date(subscription.current_period_end)
  const now = new Date()
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft > 5) return null

  const isExpired = daysLeft <= 0
  const isUrgent = daysLeft <= 2

  const currentPlan = plans.find((p) => p.id === profile.plan_id)
  const planName = currentPlan?.name || profile.plan_id
  const amount = currentPlan?.price ? String(currentPlan.price) : '?'

  const formattedDate = endDate.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-b shrink-0',
        isExpired
          ? 'bg-danger/10 border-danger/20 text-danger'
          : isUrgent
          ? 'bg-warning/10 border-warning/20 text-warning'
          : 'bg-primary/8 border-primary/20 text-primary'
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpired
            ? <AlertTriangle className="w-4 h-4 shrink-0" />
            : <Clock className="w-4 h-4 shrink-0" />
          }
          <span className="truncate">
            {isExpired
              ? `Votre abonnement ${planName} a expiré le ${formattedDate}.`
              : `Votre abonnement ${planName} se termine ${daysLeft === 1 ? 'demain' : `dans ${daysLeft} jours`} (${formattedDate}).`
            }
            {' '}Renouvelez maintenant pour ne pas perdre l'accès.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPayment(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
              isExpired
                ? 'bg-danger text-white border-danger hover:bg-danger/80'
                : 'bg-current/10 border-current/30 hover:bg-current/20'
            )}
            style={!isExpired ? { color: 'inherit', backgroundColor: 'rgba(255,255,255,0.3)' } : {}}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Carte</span>
          </button>

          <button
            onClick={() => setShowPayment(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
              isExpired
                ? 'bg-white/20 text-danger border-danger/40 hover:bg-white/30'
                : 'bg-white/20 border-current/30 hover:bg-white/30'
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wave</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity ml-1"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        planName={planName}
        amount={amount}
        planId={profile.plan_id}
        onPaymentSuccess={() => setShowPayment(false)}
      />
    </>
  )
}
