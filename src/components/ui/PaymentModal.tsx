import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, QrCode, Clock, CheckCircle2, CreditCard, Smartphone, Loader2, CalendarDays, ChevronRight, Shield, Zap, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/src/hooks/useAuth'
import { cn } from '@/src/lib/utils'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  planName: string
  amount: string
  planId?: string
  onPaymentSuccess?: () => void
}

type Tab = 'wave' | 'card'

const MONTH_OPTIONS = [1, 2, 3, 4]

// Barème de réductions selon la durée d'engagement
const DISCOUNTS: Record<number, { pct: number; label: string; badge?: string }> = {
  1: { pct: 0,  label: 'Sans réduction' },
  2: { pct: 5,  label: '5% de réduction', badge: 'Économique' },
  3: { pct: 10, label: '10% de réduction', badge: 'Populaire' },
  4: { pct: 15, label: '15% de réduction', badge: 'Meilleure offre' },
}

function getPaymentTimeline(months: number) {
  const today = new Date()
  const paid: Date[] = []
  for (let i = 0; i < months; i++) {
    paid.push(new Date(today.getFullYear(), today.getMonth() + i, today.getDate()))
  }
  const next = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())
  return { paid, next }
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

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
  const [proofFile, setProofFile] = useState<File | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [countdown, setCountdown] = useState(600)
  const [isProcessing, setIsProcessing] = useState(false)
  const [months, setMonths] = useState(1)
  const { user } = useAuth()

  const monthlyAmount = parseInt(amount) || 0
  const discount = DISCOUNTS[months] ?? { pct: 0, label: 'Sans réduction' }
  const baseTotal = monthlyAmount * months
  const savings = Math.round(baseTotal * discount.pct / 100)
  const totalAmount = baseTotal - savings
  const { paid: paidDates, next: nextDate } = getPaymentTimeline(months)

  useEffect(() => {
    if (isOpen) {
      setPaymentReference('')
      setProofFile(null)
      setCountdown(600)
      setTab('wave')
      setMonths(1)
    }
  }, [isOpen])

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

  const handleWaveSubmit = async () => {
    if (!paymentReference.trim()) {
      toast.error('Veuillez saisir la référence Wave de votre paiement')
      return
    }
    if (!proofFile) {
      toast.error('Veuillez joindre la preuve de votre paiement (capture Wave)')
      return
    }
    if (!user || !planId) {
      toast.error('Session invalide — veuillez vous reconnecter')
      return
    }
    setIsProcessing(true)
    try {
      // FormData : la preuve de paiement part en pièce jointe de la demande
      const form = new FormData()
      form.append('toPlan', planId)
      form.append('paymentMethod', 'wave')
      form.append('paymentReference', paymentReference.trim())
      form.append('amount', String(totalAmount * 100))
      form.append('months', String(months))
      form.append('nextPaymentDate', nextDate.toISOString())
      form.append('proofFile', proofFile)

      const res = await fetch('/api/upgrade-requests', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const data = await res.json()
      if (res.status === 409) {
        toast.info('Une demande pour ce plan est déjà en attente de validation.')
        onClose()
        return
      }
      if (!data.success) throw new Error(data.error || 'Erreur serveur')
      toast.success(data.message || 'Demande envoyée ! Vous recevrez un email — votre plan actuel reste actif en attendant la validation.', { duration: 6000 })
      onPaymentSuccess?.()
      setTimeout(onClose, 1500)
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi de la demande')
    } finally {
      setIsProcessing(false)
    }
  }

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
          months,
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

        {/* Modal — large 2-column layout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 32 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
          className="relative bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-3xl z-10 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 hover:bg-black/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          <div className="flex flex-col md:flex-row min-h-0">
            {/* ── LEFT PANEL ──────────────────────────────────────── */}
            <div className="md:w-[44%] bg-gradient-to-b from-secondary to-primary p-6 text-white flex flex-col gap-5">
              {/* Plan title */}
              <div>
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Abonnement</p>
                <h3 className="text-2xl font-black">Plan {planName}</h3>
                <p className="text-white/60 text-sm mt-0.5">{monthlyAmount} €&nbsp;/&nbsp;mois</p>
              </div>

              {/* Duration selector avec réductions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Durée du paiement</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {MONTH_OPTIONS.map(m => {
                    const d = DISCOUNTS[m]
                    const isActive = months === m
                    return (
                      <button
                        key={m}
                        onClick={() => setMonths(m)}
                        className={cn(
                          'relative py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col gap-0.5',
                          isActive
                            ? 'bg-white text-secondary border-white shadow-lg'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        )}
                      >
                        {d.badge && (
                          <span className={cn(
                            'absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full',
                            isActive ? 'bg-primary text-white' : 'bg-white/30 text-white'
                          )}>
                            {d.badge}
                          </span>
                        )}
                        <span className="font-black">{m} mois</span>
                        {d.pct > 0
                          ? <span className={cn('text-[10px] font-semibold', isActive ? 'text-primary' : 'text-white/60')}>-{d.pct}%</span>
                          : <span className={cn('text-[10px]', isActive ? 'text-gray-400' : 'text-white/40')}>Plein tarif</span>
                        }
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Total avec réduction */}
              <div className="bg-white/10 rounded-2xl px-4 py-3 space-y-2">
                {savings > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50 line-through">{baseTotal} €</span>
                    <span className="flex items-center gap-1 bg-emerald-400/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                      <Tag className="w-3 h-3" /> -{savings} €
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Total à payer</p>
                    <p className="text-xs text-white/60 mt-0.5">
                      {months > 1 ? `${months} mois — ${discount.label}` : '1 mois'}
                    </p>
                  </div>
                  <span className="text-3xl font-black">{totalAmount} <span className="text-lg font-normal text-white/60">€</span></span>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-white/50" />
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Périodes couvertes</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {paidDates.map((d, i) => (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[9px] font-bold text-white/70 whitespace-nowrap">{formatShortDate(d)}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/30 mb-3 shrink-0" />
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white/60" />
                    </div>
                    <span className="text-[9px] font-bold text-white/80 whitespace-nowrap">{formatShortDate(nextDate)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/50">
                  Prochain : <span className="text-white/80 font-semibold">{formatFullDate(nextDate)}</span>
                </p>
              </div>

              {/* Countdown — Wave only */}
              {tab === 'wave' && (
                <div className="mt-auto flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    <Clock className="h-3.5 w-3.5" /> Session expire dans
                  </div>
                  <span className="font-mono text-base font-bold">{formatTime(countdown)}</span>
                </div>
              )}

              {/* Security badge */}
              <div className="flex items-center gap-2 text-white/40 text-[10px] mt-auto">
                <Shield className="w-3.5 h-3.5" />
                Paiement sécurisé — données chiffrées
              </div>
            </div>

            {/* ── RIGHT PANEL ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Tabs */}
              <div className="flex border-b border-border bg-background">
                <button
                  onClick={() => setTab('wave')}
                  className={cn(
                    'flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2',
                    tab === 'wave' ? 'border-primary text-primary bg-surface' : 'border-transparent text-muted hover:text-secondary'
                  )}
                >
                  <Smartphone className="w-4 h-4" /> Wave Mobile
                </button>
                <button
                  onClick={() => setTab('card')}
                  className={cn(
                    'flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2',
                    tab === 'card' ? 'border-primary text-primary bg-surface' : 'border-transparent text-muted hover:text-secondary'
                  )}
                >
                  <CreditCard className="w-4 h-4" /> Carte bancaire
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* ── WAVE ── */}
                {tab === 'wave' && (
                  <div className="space-y-4 h-full flex flex-col">
                    {/* Bandeau réduction si applicable */}
                    {savings > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold">
                          <Tag className="w-4 h-4" />
                          {discount.label} appliquée
                        </div>
                        <span className="text-emerald-600 font-black text-sm">-{savings} € économisés</span>
                      </motion.div>
                    )}

                    {/* QR + instructions — side by side */}
                    <div className="flex gap-5 items-start">
                      {/* QR Code */}
                      <div className="shrink-0 w-36 h-36 bg-white border-4 border-gray-100 rounded-2xl overflow-hidden shadow-md">
                        <img
                          src="/qr_code_marchant_wave.png"
                          alt="QR Code Wave"
                          className="w-full h-full object-contain"
                          onError={e => {
                            const el = e.currentTarget
                            el.style.display = 'none'
                            el.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden w-full h-full flex-col items-center justify-center gap-2 text-muted">
                          <QrCode className="w-10 h-10" />
                          <p className="text-[10px]">QR Code Wave</p>
                        </div>
                      </div>

                      {/* Steps */}
                      <ol className="space-y-2.5 flex-1">
                        {[
                          'Ouvrez votre application Wave',
                          'Scannez le QR code',
                          <>Payez <span className="font-bold text-secondary">{totalAmount} €</span>{savings > 0 && <span className="text-emerald-600 font-semibold"> (au lieu de {baseTotal} €)</span>}</>,
                          'Copiez la référence ci-dessous',
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-xs leading-relaxed text-muted">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Reference input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest">
                        Référence Wave *
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        placeholder="Ex : WAV-123456789"
                        className="w-full input-field font-mono text-center"
                      />
                      <p className="text-[11px] text-muted text-center">
                        Visible dans votre reçu Wave après le paiement
                      </p>
                    </div>

                    {/* Preuve de paiement (capture) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted uppercase tracking-widest">
                        Preuve de paiement (capture, reçu) *
                      </label>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={e => {
                          const f = e.target.files?.[0] || null
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast.error('Fichier trop volumineux (max 5 Mo)')
                            e.target.value = ''
                            return
                          }
                          setProofFile(f)
                        }}
                        className="hidden"
                      />
                      {proofFile ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          <span className="text-xs text-emerald-800 truncate">📎 {proofFile.name} ({(proofFile.size / 1024).toFixed(0)} Ko)</span>
                          <button
                            onClick={() => { setProofFile(null); if (proofInputRef.current) proofInputRef.current.value = '' }}
                            className="text-emerald-600 hover:text-red-500 text-xs font-bold shrink-0 ml-2"
                          >
                            Retirer
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => proofInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-border rounded-xl py-3 text-xs text-muted hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          📷 Joindre la capture de votre paiement Wave
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-xs text-muted">
                      ⏳ Vérification sous 24 h — vous recevrez un email de confirmation.
                      <span className="font-semibold text-secondary"> Votre plan actuel reste actif</span> en attendant.
                    </div>

                    <div className="mt-auto space-y-2">
                      <button
                        onClick={handleWaveSubmit}
                        disabled={isProcessing || !paymentReference.trim() || !proofFile}
                        className="w-full bg-primary text-white py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                        ) : (
                          <><CheckCircle2 className="w-5 h-5" /> Soumettre ma demande — {totalAmount} €</>
                        )}
                      </button>
                      <button onClick={onClose} className="w-full text-muted text-sm py-1.5 hover:text-secondary transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* ── CARD ── */}
                {tab === 'card' && (
                  <div className="space-y-4 h-full flex flex-col">
                    {/* Bandeau réduction si applicable */}
                    {savings > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold">
                          <Tag className="w-4 h-4" />
                          {discount.label} appliquée
                        </div>
                        <span className="text-emerald-600 font-black text-sm">-{savings} € économisés</span>
                      </motion.div>
                    )}

                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 bg-success/10 text-success border border-success/20 rounded-2xl px-4 py-2 text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Paiement sécurisé Stripe
                      </div>
                      <p className="text-sm text-muted">
                        Vous serez redirigé vers Stripe pour régler{' '}
                        <span className="font-bold text-secondary">{totalAmount} €</span>
                        {savings > 0 && <span className="text-emerald-600 font-semibold"> (au lieu de {baseTotal} €)</span>}
                        {months > 1
                          ? <span className="text-muted"> — {months} mois</span>
                          : <span className="text-muted"> /mois</span>
                        }.
                      </p>
                    </div>

                    {/* Card logos */}
                    <div className="flex justify-center gap-3">
                      {[
                        { label: 'VISA', bg: 'bg-blue-600' },
                        { label: 'MC', bg: 'bg-red-500' },
                        { label: 'AMEX', bg: 'bg-blue-400' },
                      ].map(c => (
                        <div key={c.label} className={cn('px-3 py-1.5 rounded-lg text-white text-xs font-bold', c.bg)}>
                          {c.label}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2.5 bg-background rounded-2xl p-4">
                      {[
                        'Activation immédiate après paiement confirmé',
                        'Abonnement mensuel — résiliable à tout moment',
                        'Données sécurisées, aucune carte stockée chez nous',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-muted">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 justify-center text-xs text-muted">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Accès instantané dès validation du paiement
                    </div>

                    <div className="mt-auto space-y-2">
                      <button
                        onClick={handleCardPayment}
                        disabled={isProcessing}
                        className="w-full bg-primary text-white py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Redirection…</>
                        ) : (
                          <><CreditCard className="w-5 h-5" /> Payer {totalAmount} € avec Stripe</>
                        )}
                      </button>
                      <button onClick={onClose} className="w-full text-muted text-sm py-1.5 hover:text-secondary transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
