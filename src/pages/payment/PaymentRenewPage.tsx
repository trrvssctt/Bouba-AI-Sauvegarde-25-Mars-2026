import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Smartphone, CheckCircle2, ArrowLeft, Mail } from 'lucide-react'

/**
 * Page de renouvellement d'abonnement expiré (paiement Wave par QR code).
 * L'utilisateur bloqué au login (code PLAN_EXPIRED) est redirigé ici.
 */
export default function PaymentRenewPage() {
  const [params] = useSearchParams()
  const email = params.get('email')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8 space-y-6">
          {/* En-tête */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
            <h1 className="text-2xl font-display font-bold text-secondary">Votre abonnement a expiré</h1>
            <p className="text-sm text-muted leading-relaxed">
              {email ? <>Le plan du compte <strong className="text-secondary">{email}</strong> est arrivé à échéance.</> : 'Votre plan est arrivé à échéance.'}{' '}
              Pour retrouver l'accès à Bouba'ia, renouvelez votre abonnement en scannant le QR code Wave ci-dessous.
            </p>
          </div>

          {/* QR Wave */}
          <div className="bg-white border-2 border-dashed border-primary/30 rounded-2xl p-6 text-center space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-widest flex items-center justify-center gap-2">
              <Smartphone className="w-4 h-4" /> Paiement Wave
            </p>
            <img
              src="/qr_code_marchant_wave.png"
              alt="QR code marchand Wave — Bouba'ia"
              className="w-48 h-48 mx-auto rounded-xl"
            />
            <p className="text-xs text-muted">Scannez avec l'application Wave pour payer le marchand Bouba'ia.</p>
          </div>

          {/* Étapes */}
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Comment renouveler</p>
            {[
              'Ouvrez l\'application Wave et scannez le QR code',
              'Payez le montant de votre plan (Starter 9,90 € ≈ 6 500 XOF · Business 49 € ≈ 19 900 XOF)',
              'Envoyez la capture du reçu à contact.boubaia@realtechprint.com',
              'Votre compte est réactivé sous 24 h après vérification',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-secondary leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <a
              href={`mailto:contact.boubaia@realtechprint.com?subject=${encodeURIComponent('Renouvellement abonnement Bouba\'ia')}${email ? encodeURIComponent(` — ${email}`) : ''}`}
              className="btn-primary flex items-center justify-center gap-2 text-sm w-full sm:flex-1"
            >
              <Mail className="w-4 h-4" /> Envoyer ma preuve de paiement
            </a>
            <Link to="/login" className="btn-ghost border border-border flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" /> Retour à la connexion
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Une question ? Contactez le support : contact.boubaia@realtechprint.com
        </p>
      </div>
    </div>
  )
}
