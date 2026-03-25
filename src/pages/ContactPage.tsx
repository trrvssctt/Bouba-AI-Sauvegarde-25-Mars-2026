import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mail, Phone, MapPin, Clock, Send, CheckCircle2,
  MessageCircle, HelpCircle, Building2, Sparkles,
  ChevronDown, ChevronUp, ExternalLink, ArrowRight,
  Twitter, Linkedin,
} from 'lucide-react'
import PublicHeader from '@/src/components/layout/PublicHeader'
import PublicFooter from '@/src/components/layout/PublicFooter'
import { cn } from '@/src/lib/utils'

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: 'Support technique',
    desc: 'Problème avec votre compte ou le service ?',
    value: 'support@bouba-ia.com',
    href: 'mailto:support@bouba-ia.com',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    delay: '24h',
  },
  {
    icon: Building2,
    title: 'Questions commerciales',
    desc: 'Tarifs, Enterprise, partenariats',
    value: 'sales@bouba-ia.com',
    href: 'mailto:sales@bouba-ia.com',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    delay: '4h',
  },
  {
    icon: HelpCircle,
    title: 'Légal & Conformité',
    desc: 'RGPD, demandes de données, signalements',
    value: 'legal@bouba-ia.com',
    href: 'mailto:legal@bouba-ia.com',
    color: 'text-green-600',
    bg: 'bg-green-50',
    delay: '48h',
  },
  {
    icon: Sparkles,
    title: 'Presse & Médias',
    desc: 'Interviews, articles, partenariats presse',
    value: 'presse@bouba-ia.com',
    href: 'mailto:presse@bouba-ia.com',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    delay: '24h',
  },
]

const FAQ = [
  {
    q: 'Combien de temps pour une réponse ?',
    a: 'Support technique : sous 24h en jours ouvrés. Commercial : sous 4h. Urgences sécurité : sous 2h. Pour les clients Enterprise, un SLA personnalisé est disponible.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Vous pouvez annuler directement depuis Paramètres → Plan dans votre compte. L\'annulation prend effet à la fin de la période en cours. Aucun remboursement prorata, sauf cas exceptionnel.',
  },
  {
    q: 'Bouba\'ia est-il disponible en anglais ?',
    a: 'Bouba\'ia est principalement conçu pour les entrepreneurs francophones. L\'interface est en français. Cependant, l\'assistant IA peut comprendre et répondre en anglais, arabe et d\'autres langues sur demande.',
  },
  {
    q: 'Puis-je utiliser Bouba\'ia pour mon équipe ?',
    a: 'Le plan Enterprise permet plusieurs utilisateurs au sein d\'une même organisation. Contactez-nous à sales@bouba-ia.com pour un devis adapté à votre taille d\'équipe.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Toutes les données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Nous sommes conformes RGPD. Vos emails et contacts ne sont jamais utilisés pour entraîner des modèles d\'IA.',
  },
  {
    q: 'Comment connecter Gmail à Bouba ?',
    a: 'Allez dans Paramètres → Connexions → Gmail, puis cliquez sur "Connecter avec Google". Vous serez redirigé vers Google pour autoriser l\'accès. Vous pouvez révoquer cet accès à tout moment.',
  },
  {
    q: 'Y a-t-il une version gratuite ?',
    a: 'Oui, le plan Starter inclut 100 messages par mois et l\'accès au chat IA de base. C\'est amplement suffisant pour découvrir Bouba\'ia. Aucune carte bancaire requise pour l\'inscription.',
  },
  {
    q: 'Puis-je tester avant de payer ?',
    a: 'Absolument. Chaque nouveau compte bénéficie de 14 jours d\'accès au plan Pro sans aucun engagement. Après cette période, vous choisissez librement votre plan.',
  },
]

const SUBJECTS = [
  'Support technique',
  'Question sur un plan / tarif',
  'Partenariat / Revendeur',
  'Demande presse / média',
  'Signalement de bug',
  'Demande RGPD',
  'Autre',
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-4 p-5">
        <span className="font-semibold text-gray-900 text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

export default function ContactPage() {
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.email || !formState.message || !formState.subject) {
      setError('Merci de remplir tous les champs obligatoires.')
      return
    }
    setSending(true)
    setError('')

    // Simulate sending (replace with real API call)
    await new Promise(r => setTimeout(r, 1200))

    // Open mail client as fallback
    const subject = encodeURIComponent(`[Bouba'ia Contact] ${formState.subject}`)
    const body = encodeURIComponent(
      `Prénom: ${formState.firstName}\nNom: ${formState.lastName}\nEmail: ${formState.email}\nEntreprise: ${formState.company}\n\n${formState.message}`
    )
    window.open(`mailto:contact@bouba-ia.com?subject=${subject}&body=${body}`)

    setSending(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-blue-50 to-violet-50 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <MessageCircle className="w-3.5 h-3.5" /> Nous contacter
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              On est là pour vous <span className="text-blue-600">aider</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Une question, un problème, une idée ? Notre équipe répond généralement en moins de 24h. Pour les urgences, c'est encore plus rapide.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact channels */}
      <section className="py-12 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTACT_CHANNELS.map((ch, i) => {
              const Icon = ch.icon
              return (
                <motion.a key={ch.title}
                  href={ch.href}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 text-left"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', ch.bg, ch.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{ch.title}</h3>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">{ch.desc}</p>
                  <p className={cn('text-xs font-medium group-hover:underline', ch.color)}>{ch.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">Réponse sous {ch.delay}</span>
                  </div>
                </motion.a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main: Form + Info */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Envoyer un message</h2>
            <p className="text-gray-500 text-sm mb-8">Décrivez votre besoin et nous vous répondrons rapidement.</p>

            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 bg-green-50 rounded-2xl border border-green-100"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message envoyé !</h3>
                  <p className="text-gray-600 text-sm mb-6 max-w-xs mx-auto">
                    Merci {formState.firstName}. Notre équipe vous répondra dans les prochaines heures.
                  </p>
                  <button
                    onClick={() => { setSent(false); setFormState({ firstName: '', lastName: '', email: '', company: '', subject: '', message: '' }) }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Envoyer un autre message
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom <span className="text-red-500">*</span></label>
                      <input
                        type="text" required
                        value={formState.firstName}
                        onChange={e => setFormState(s => ({ ...s, firstName: e.target.value }))}
                        placeholder="Seydou"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                      <input
                        type="text"
                        value={formState.lastName}
                        onChange={e => setFormState(s => ({ ...s, lastName: e.target.value }))}
                        placeholder="Dianka"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email" required
                        value={formState.email}
                        onChange={e => setFormState(s => ({ ...s, email: e.target.value }))}
                        placeholder="vous@entreprise.com"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Entreprise</label>
                      <input
                        type="text"
                        value={formState.company}
                        onChange={e => setFormState(s => ({ ...s, company: e.target.value }))}
                        placeholder="Mon Entreprise SAS"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={formState.subject}
                      onChange={e => setFormState(s => ({ ...s, subject: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                    >
                      <option value="">Choisir un sujet...</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">({formState.message.length}/1000)</span>
                    </label>
                    <textarea
                      required
                      maxLength={1000}
                      rows={5}
                      value={formState.message}
                      onChange={e => setFormState(s => ({ ...s, message: e.target.value }))}
                      placeholder="Décrivez votre question ou problème en détail..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors shadow-sm"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer le message
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    En envoyant ce formulaire, vous acceptez notre{' '}
                    <a href="/legal#confidentialite" className="text-blue-600 hover:underline">politique de confidentialité</a>.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" /> Siège social
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">BOUBA'IA SAS</p>
                    <p>75008 Paris, France</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>+33 (0)1 XX XX XX XX</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href="mailto:contact@bouba-ia.com" className="text-blue-600 hover:underline">contact@bouba-ia.com</a>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Horaires de support
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { day: 'Lundi — Vendredi', hours: '9h — 18h (Paris)', available: true },
                  { day: 'Samedi', hours: '10h — 14h (urgences)', available: true },
                  { day: 'Dimanche', hours: 'Fermé', available: false },
                ].map((h) => (
                  <div key={h.day} className="flex items-center justify-between">
                    <span className="text-gray-600">{h.day}</span>
                    <span className={cn('font-medium', h.available ? 'text-gray-900' : 'text-gray-400')}>{h.hours}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Équipe disponible maintenant</span>
              </div>
            </div>

            {/* Social */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Suivez-nous</h3>
              <div className="flex flex-col gap-2">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all text-sm text-gray-700 hover:text-blue-600">
                  <Twitter className="w-4 h-4" />
                  <span>@boubaia_fr</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-gray-300" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all text-sm text-gray-700 hover:text-blue-600">
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn — Bouba'ia</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-gray-300" />
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-600" /> Liens rapides
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Documentation', href: '#' },
                  { label: 'FAQ complète', href: '#faq' },
                  { label: 'Status du service', href: '#' },
                  { label: 'Signaler une faille de sécurité', href: 'mailto:security@bouba-ia.com' },
                ].map(link => (
                  <a key={link.label} href={link.href}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-blue-100 text-sm text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-colors group">
                    <span>{link.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3 block">Questions fréquentes</span>
            <h2 className="text-3xl font-bold text-gray-900">Tout ce que vous voulez savoir</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-gray-600 text-sm mb-3">Vous n'avez pas trouvé votre réponse ?</p>
            <a href="mailto:support@bouba-ia.com"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
              Contacter le support <Send className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
