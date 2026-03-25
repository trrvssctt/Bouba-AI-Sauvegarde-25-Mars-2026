import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Check, CreditCard, Download, Zap, ArrowUpRight, Clock, DollarSign,
  Crown, Sparkles, AlertTriangle, X,
  CheckCircle2, MessageSquare, Info, Hourglass, XCircle, RefreshCw, ExternalLink,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import { usePayment } from '@/src/hooks/usePayment'
import { toast } from 'sonner'
import PaymentModal from '@/src/components/ui/PaymentModal'

const CANCEL_REASONS = [
  "Trop cher pour mon budget",
  "Je n'utilise pas assez les fonctionnalités",
  "Les fonctionnalités ne correspondent pas à mes besoins",
  "J'ai trouvé une meilleure alternative",
  "Problèmes techniques trop fréquents",
  "Autre raison"
]

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
})

export default function PlanPage() {
  const { profile, user, updateProfile } = useAuth()
  const { plans, loading: plansLoading } = usePlans()
  const { payments, subscription, cancelSubscription, loading: paymentLoading } = usePayment()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOtherText, setCancelOtherText] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<{ toPlan: string; createdAt: string } | null>(null)

  // Check for Stripe success return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_success') === 'true') {
      toast.success('Paiement Stripe confirmé ! Votre plan est en cours d\'activation.')
      window.history.replaceState({}, '', '/settings/plan')
    }
    if (params.get('cancelled') === 'true') {
      toast.info('Paiement annulé.')
      window.history.replaceState({}, '', '/settings/plan')
    }
  }, [])

  // Check for pending upgrade request
  useEffect(() => {
    fetch('/api/upgrade-requests/status', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.data?.status === 'pending') {
          setPendingRequest({ toPlan: j.data.toPlan, createdAt: j.data.createdAt })
        }
      })
      .catch(() => {})
  }, [])

  const handleOpenBillingPortal = async () => {
    if (!user?.id) return
    setIsOpeningPortal(true)
    try {
      const res = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.portalUrl) {
        window.location.href = data.portalUrl
      } else {
        toast.error(data.error || 'Impossible d\'ouvrir le portail de paiement')
      }
    } catch {
      toast.error('Erreur lors de l\'ouverture du portail')
    } finally {
      setIsOpeningPortal(false)
    }
  }

  const getPlanName = () => {
    switch (profile?.plan_id) {
      case 'starter': return 'Bouba Starter'
      case 'pro': return 'Bouba Pro'
      case 'enterprise': return 'Bouba Enterprise'
      default: return 'Bouba Starter'
    }
  }

  const getPlanPrice = () => {
    switch (profile?.plan_id) {
      case 'starter': return '0'
      case 'pro': return '29'
      case 'enterprise': return '99'
      default: return '0'
    }
  }

  const getMessagesLimit = () => {
    if (!profile?.messages_limit || profile.messages_limit >= 999999999) return null
    return profile.messages_limit
  }

  const getMessagesUsed = () => profile?.messages_used || 0

  const getUsagePercentage = () => {
    const limit = getMessagesLimit()
    if (!limit) return 0
    return Math.min((getMessagesUsed() / limit) * 100, 100)
  }

  const getMessagesRemaining = () => {
    const limit = getMessagesLimit()
    if (!limit) return null
    return Math.max(limit - getMessagesUsed(), 0)
  }

  const getNextPaymentDate = () => {
    const end = subscription?.current_period_end
    if (end) {
      return new Date(end).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    }
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return nextMonth.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const getDaysUntilNextPayment = () => {
    const end = subscription?.current_period_end
    const target = end ? new Date(end) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  }

  const isPlanCurrent = (planId: string) => planId === profile?.plan_id
  const getCurrentPlan = () => plans.find(p => p.id === profile?.plan_id) || plans.find(p => p.id === 'starter')
  const isPlanUpgrade = (price: number) => price > (getCurrentPlan()?.price || 0)

  const handlePlanChange = async (plan: any) => {
    if (isPlanCurrent(plan.id)) { toast.info('Vous êtes déjà sur ce plan'); return }
    if (plan.price === 0) {
      setShowCancelModal(true)
    } else {
      setSelectedPlanForUpgrade(plan)
      setShowPaymentModal(true)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason) { toast.error('Veuillez sélectionner une raison'); return }
    setIsCancelling(true)
    try {
      if (subscription?.status === 'active') await cancelSubscription()
      if (updateProfile) {
        await updateProfile({ plan_id: 'starter', subscription_status: 'cancelled' })
      }
      toast.success('Abonnement résilié. Vous êtes passé au plan Starter.')
      setShowCancelModal(false)
      setTimeout(() => window.location.reload(), 1500)
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la résiliation')
    } finally {
      setIsCancelling(false)
    }
  }

  const usagePct = getUsagePercentage()
  const remaining = getMessagesRemaining()
  const limit = getMessagesLimit()

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-3xl font-display font-bold text-secondary">Plan & Facturation</h2>
        <p className="text-muted">Gérez votre abonnement, vos paiements et votre consommation.</p>
      </motion.div>

      {/* Pending upgrade banner */}
      {pendingRequest && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/25 rounded-2xl"
        >
          <Hourglass className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-warning">Demande d'upgrade en attente de validation</p>
            <p className="text-xs text-muted mt-0.5">
              Votre demande de passage au plan <span className="font-bold capitalize">{pendingRequest.toPlan}</span> est en cours d'examen par notre équipe.
              Vous recevrez un email dès qu'une décision aura été prise.
            </p>
          </div>
        </motion.div>
      )}

      {/* Current Plan Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-secondary via-secondary to-primary rounded-3xl p-8 text-white relative overflow-hidden shadow-xl"
      >
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-white/20 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/30">
                Plan actuel
              </span>
              <span className={cn(
                "text-xs font-bold px-3 py-1 rounded-full",
                profile?.subscription_status === 'active' ? "bg-success/30 text-green-200" : "bg-white/10 text-white/70"
              )}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300 mr-1.5 align-middle" />
                {profile?.subscription_status === 'active' ? 'Actif' : profile?.subscription_status || 'Actif'}
              </span>
            </div>

            <div>
              <h3 className="text-4xl font-display font-bold mb-2">{getPlanName()}</h3>
              <p className="text-white/70 max-w-sm leading-relaxed">
                {profile?.plan_id === 'enterprise'
                  ? 'Solution complète pour les équipes avec support prioritaire et fonctionnalités illimitées.'
                  : profile?.plan_id === 'pro'
                  ? 'Toutes les fonctionnalités avancées pour maximiser votre productivité.'
                  : 'Fonctionnalités essentielles pour découvrir Bouba. Gratuit pour toujours.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Montant
                </p>
                <p className="text-2xl font-bold">
                  {getPlanPrice() === '0' ? 'Gratuit' : `${getPlanPrice()}€`}
                  {getPlanPrice() !== '0' && <span className="text-sm font-normal text-white/60"> /mois</span>}
                </p>
              </div>

              {profile?.plan_id !== 'starter' && (
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Prochain paiement
                  </p>
                  <p className="text-sm font-bold">{getNextPaymentDate()}</p>
                  <p className="text-xs text-white/50">dans {getDaysUntilNextPayment()} jours</p>
                </div>
              )}

              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Messages
                </p>
                <p className="text-2xl font-bold">{getMessagesUsed()}</p>
                <p className="text-xs text-white/50">
                  {limit ? `/ ${limit} ce mois` : 'illimités'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 justify-center">
            {profile?.plan_id !== 'starter' && (
              <>
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={isOpeningPortal}
                  className="w-full bg-white text-secondary font-bold py-3 px-5 rounded-2xl hover:bg-white/90 transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                >
                  {isOpeningPortal
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Gérer ma carte & factures
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-white/50 text-xs font-medium hover:text-white/80 transition-colors py-1 text-center"
                >
                  Résilier l'abonnement
                </button>
              </>
            )}
            {profile?.plan_id === 'starter' && (
              <button
                onClick={() => { const proPlan = plans.find(p => p.id === 'pro'); if (proPlan) handlePlanChange(proPlan) }}
                className="w-full bg-white text-secondary font-bold py-3 px-5 rounded-2xl hover:bg-white/90 transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <Crown className="w-4 h-4" /> Passer à Pro
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Background decoration */}
        <Zap className="absolute -right-16 -bottom-16 w-72 h-72 text-white/5 -rotate-12 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
      </motion.div>

      {/* Message Quota */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Quota de messages
            </h3>
            <p className="text-sm text-muted mt-0.5">Requêtes IA utilisées ce mois-ci</p>
          </div>
          {remaining !== null && (
            <div className={cn(
              "px-4 py-2 rounded-2xl text-sm font-bold",
              remaining < 50 ? "bg-danger/10 text-danger" : remaining < 100 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            )}>
              {remaining} restants
            </div>
          )}
        </div>

        {limit ? (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">{getMessagesUsed()} utilisés</span>
              <span className="font-bold text-secondary">{limit} total</span>
            </div>
            <div className="h-4 bg-surface rounded-full overflow-hidden border border-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                className={cn(
                  "h-full rounded-full transition-all",
                  usagePct > 90 ? "bg-danger" : usagePct > 70 ? "bg-warning" : "bg-primary"
                )}
              />
            </div>
            <p className="text-xs text-muted mt-2">{usagePct.toFixed(0)}% utilisé</p>
            {usagePct > 80 && (
              <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-warning">Quota bientôt épuisé</p>
                  <p className="text-xs text-muted mt-0.5">Il vous reste {remaining} messages. Passez au plan Pro pour des messages illimités.</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium text-secondary">Messages <span className="font-bold text-primary">illimités</span> sur votre plan</p>
          </div>
        )}
      </motion.div>

      {/* Plans Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Plans disponibles
          </h3>
          <p className="text-sm text-muted">Changez à tout moment</p>
        </div>

        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-surface rounded-3xl animate-pulse border border-border" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                className={cn(
                  "relative rounded-3xl border-2 p-6 flex flex-col transition-all duration-200 hover:shadow-xl",
                  isPlanCurrent(plan.id)
                    ? "border-primary bg-primary/5 shadow-primary/10 shadow-lg"
                    : plan.popular
                    ? "border-violet-500 shadow-violet-100 shadow-md"
                    : "border-border bg-surface hover:border-primary/30"
                )}
              >
                {isPlanCurrent(plan.id) && (
                  <div className="absolute -top-3 left-5">
                    <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Plan actuel
                    </span>
                  </div>
                )}
                {plan.popular && !isPlanCurrent(plan.id) && (
                  <div className="absolute -top-3 left-5">
                    <span className="bg-gradient-to-r from-violet-600 to-primary text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" /> Populaire
                    </span>
                  </div>
                )}

                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-xl font-display font-bold text-secondary">{plan.name}</h4>
                    <p className="text-sm text-muted mt-1">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-4xl font-bold text-secondary">
                        {plan.price === 0 ? 'Gratuit' : `${Math.floor(plan.price / 100)}€`}
                      </span>
                      {plan.price > 0 && <span className="text-muted">/mois</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      plan.limits.messages === -1 ? 'Messages IA illimités' : `${plan.limits.messages} messages/mois`,
                      plan.limits.agents === -1 ? 'Agents illimités' : `${plan.limits.agents} agents IA`,
                      plan.limits.memory_days === -1 ? 'Mémoire illimitée' : `${plan.limits.memory_days} jours de mémoire`,
                      ...(plan.features || []).slice(0, 3)
                    ].map((feat, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span className="text-secondary">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-border">
                  {isPlanCurrent(plan.id) ? (
                    <button disabled className="w-full py-3 rounded-2xl text-sm font-bold bg-primary/10 text-primary cursor-not-allowed">
                      Plan actuel
                    </button>
                  ) : plan.price === 0 ? (
                    <button onClick={() => handlePlanChange(plan)} disabled={paymentLoading}
                      className="w-full py-3 rounded-2xl text-sm font-bold border border-border text-muted hover:bg-surface transition-all disabled:opacity-50">
                      Rétrograder
                    </button>
                  ) : isPlanUpgrade(plan.price) ? (
                    <button onClick={() => handlePlanChange(plan)} disabled={paymentLoading}
                      className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      Passer à {plan.name} <ArrowUpRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => handlePlanChange(plan)} disabled={paymentLoading}
                      className="w-full py-3 rounded-2xl text-sm font-bold border border-warning text-warning hover:bg-warning/5 transition-all disabled:opacity-50">
                      Changer de plan
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Invoices — real data from payments table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Historique des paiements
          </h3>
          {profile?.plan_id !== 'starter' && (
            <button
              onClick={handleOpenBillingPortal}
              disabled={isOpeningPortal}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {isOpeningPortal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              Voir toutes les factures Stripe
            </button>
          )}
        </div>

        {paymentLoading ? (
          <div className="glass-card p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-surface rounded-xl animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-muted" />
            </div>
            <p className="font-semibold text-secondary">Aucun paiement enregistré</p>
            <p className="text-sm text-muted max-w-xs">
              Vos paiements Stripe apparaîtront ici automatiquement dès le premier prélèvement.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {['Date', 'Plan', 'Montant', 'Statut', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((pmt, i) => {
                  const planLabel = pmt.metadata?.plan_id
                    ? `Bouba ${String(pmt.metadata.plan_id).charAt(0).toUpperCase() + String(pmt.metadata.plan_id).slice(1)}`
                    : getPlanName()
                  const amountLabel = pmt.amount
                    ? `${(pmt.amount / 100).toFixed(2).replace('.', ',')} ${(pmt.currency || 'EUR').toUpperCase()}`
                    : '—'
                  const dateLabel = new Date(pmt.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                  const isSucceeded = pmt.status === 'succeeded'
                  const isFailed = pmt.status === 'failed'

                  return (
                    <motion.tr
                      key={pmt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="hover:bg-surface/50"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-secondary whitespace-nowrap">{dateLabel}</td>
                      <td className="px-5 py-3 text-sm text-muted">{planLabel}</td>
                      <td className="px-5 py-3 text-sm font-bold text-secondary">{amountLabel}</td>
                      <td className="px-5 py-3">
                        {isSucceeded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Payé
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-danger/10 text-danger uppercase">
                            <XCircle className="w-3 h-3" /> Échoué
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning uppercase">
                            <Clock className="w-3 h-3" /> {pmt.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={handleOpenBillingPortal}
                          disabled={isOpeningPortal}
                          title="Télécharger la facture via le portail Stripe"
                          className="p-2 hover:bg-surface rounded-xl text-muted hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setSelectedPlanForUpgrade(null) }}
        planName={selectedPlanForUpgrade?.name || getPlanName()}
        amount={selectedPlanForUpgrade ? String(Math.floor(selectedPlanForUpgrade.price / 100)) : getPlanPrice()}
        planId={selectedPlanForUpgrade?.id}
        onPaymentSuccess={() => {
          setPendingRequest({ toPlan: selectedPlanForUpgrade?.id || '', createdAt: new Date().toISOString() })
          setShowPaymentModal(false)
          setSelectedPlanForUpgrade(null)
        }}
      />

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-secondary">Résilier l'abonnement</h3>
                  <p className="text-sm text-muted mt-0.5">Votre accès restera actif jusqu'à fin du mois</p>
                </div>
                <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-background rounded-xl text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm font-bold text-secondary">Pourquoi souhaitez-vous résilier ?</p>
                <div className="space-y-2">
                  {CANCEL_REASONS.map(reason => (
                    <button key={reason} onClick={() => setCancelReason(reason)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-2xl border text-sm transition-all",
                        cancelReason === reason
                          ? "border-primary bg-primary/5 text-secondary font-medium"
                          : "border-border text-muted hover:border-primary/30 hover:bg-surface"
                      )}>
                      {reason}
                    </button>
                  ))}
                </div>
                {cancelReason === 'Autre raison' && (
                  <textarea
                    value={cancelOtherText}
                    onChange={e => setCancelOtherText(e.target.value)}
                    placeholder="Décrivez votre raison..."
                    rows={3}
                    className="w-full input-field resize-none text-sm"
                  />
                )}
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-2xl flex gap-2">
                  <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-muted">Vous passez au plan Gratuit (Starter). Vos données sont conservées.</p>
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setShowCancelModal(false)} className="flex-1 btn-secondary py-3">
                  Annuler
                </button>
                <button onClick={handleConfirmCancel} disabled={!cancelReason || isCancelling}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold bg-danger text-white hover:bg-danger/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCancelling ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                  Confirmer la résiliation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
