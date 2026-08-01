import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mail, Phone, MapPin, Clock, Send, CheckCircle2,
  MessageCircle, HelpCircle, Building2, Sparkles,
  ChevronDown, ChevronUp, ExternalLink,
  Twitter, Linkedin, Shield, FileText, Zap,
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
    border: 'border-blue-100 hover:border-blue-300',
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
    border: 'border-violet-100 hover:border-violet-300',
    delay: '4h',
  },
  {
    icon: HelpCircle,
    title: 'Légal & Conformité',
    desc: 'RGPD, demandes de données, signalements',
    value: 'legal@bouba-ia.com',
    href: 'mailto:legal@bouba-ia.com',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100 hover:border-emerald-300',
    delay: '48h',
  },
  {
    icon: Sparkles,
    title: 'Presse & Médias',
    desc: 'Interviews, articles, partenariats',
    value: 'presse@bouba-ia.com',
    href: 'mailto:presse@bouba-ia.com',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100 hover:border-amber-300',
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
    a: 'Bouba\'ia est principalement conçu pour les entrepreneurs francophones. L\'interface est en français, mais l\'assistant IA peut comprendre et répondre en anglais, arabe et d\'autres langues.',
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
    a: 'Oui, le plan Free inclut 500 messages par mois et l\'accès au chat IA de base. C\'est idéal pour découvrir Bouba\'ia. Aucune carte bancaire requise pour l\'inscription.',
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
      className="w-full text-left bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-blue-100 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-4 p-5">
        <span className="font-semibold text-gray-900 text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
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
    await new Promise(r => setTimeout(r, 1200))
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

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-6 relative overflow-hidden">
        {/* subtle grid bg */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
              <MessageCircle className="w-3.5 h-3.5" /> Nous contacter
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              On est là pour vous{' '}
              <span className="text-blue-400">aider</span>
            </h1>
            <p className="text-blue-200/80 text-lg max-w-xl mx-auto leading-relaxed">
              Une question, un problème, une idée ? Notre équipe répond en moins de 24h. Pour les urgences, encore plus vite.
            </p>
          </motion.div>

          {/* Response time chips */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
          >
            {[
              { icon: Zap, label: 'Urgences : < 2h' },
              { icon: Mail, label: 'Support : < 24h' },
              { icon: Shield, label: 'Données sécurisées' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/70 text-xs px-3 py-1.5 rounded-full">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Contact channels ── */}
      <section className="py-14 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTACT_CHANNELS.map((ch, i) => {
              const Icon = ch.icon
              return (
                <motion.a
                  key={ch.title}
                  href={ch.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={cn(
                    'group bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 text-left',
                    ch.border
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', ch.bg)}>
                    <Icon className={cn('w-5 h-5', ch.color)} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{ch.title}</h3>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">{ch.desc}</p>
                  <p className={cn('text-xs font-medium group-hover:underline truncate', ch.color)}>{ch.value}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">Réponse sous {ch.delay}</span>
                  </div>
                </motion.a>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Main: Form + Info ── */}
      <section className="py-20 px-6 bg-gradient-to-b from-white via-slate-50/50 to-white">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 text-sm font-semibold px-5 py-2 rounded-full mb-4"
            >
              <MessageCircle className="w-4 h-4" />
              Parlez-nous
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Une question ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Nous sommes là</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Remplissez le formulaire ci-dessous et notre équipe vous répondra sous 24h ouvrées.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">

            {/* Form - Larger and more prominent */}
            <div className="lg:col-span-3 xl:col-span-3">

            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  className="flex flex-col items-center text-center py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl border border-green-200 shadow-lg shadow-green-500/10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-green-500/30"
                  >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé !</h3>
                  <p className="text-gray-500 text-base mb-8 max-w-md">
                    Merci <span className="font-semibold text-gray-700">{formState.firstName}</span>.
                    Notre équipe vous répondra dans les prochaines heures.
                  </p>
                  <button
                    onClick={() => { setSent(false); setFormState({ firstName: '', lastName: '', email: '', company: '', subject: '', message: '' }) }}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer un autre message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleSubmit}
                  className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required
                        value={formState.firstName}
                        onChange={e => setFormState(s => ({ ...s, firstName: e.target.value }))}
                        placeholder="Seydou"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                      <input
                        type="text"
                        value={formState.lastName}
                        onChange={e => setFormState(s => ({ ...s, lastName: e.target.value }))}
                        placeholder="Dianka"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email" required
                        value={formState.email}
                        onChange={e => setFormState(s => ({ ...s, email: e.target.value }))}
                        placeholder="vous@entreprise.com"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Entreprise</label>
                      <input
                        type="text"
                        value={formState.company}
                        onChange={e => setFormState(s => ({ ...s, company: e.target.value }))}
                        placeholder="Mon Entreprise SAS"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sujet <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formState.subject}
                      onChange={e => setFormState(s => ({ ...s, subject: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                    >
                      <option value="">Choisir un sujet…</option>
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
                      placeholder="Décrivez votre question ou problème en détail…"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm text-sm"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours…
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

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-5">
            {/* Address */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
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
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" /> Horaires support
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { day: 'Lundi — Vendredi', hours: '9h — 18h', ok: true },
                  { day: 'Samedi', hours: '10h — 14h (urgences)', ok: true },
                  { day: 'Dimanche', hours: 'Fermé', ok: false },
                ].map(h => (
                  <div key={h.day} className="flex items-center justify-between">
                    <span className="text-gray-500">{h.day}</span>
                    <span className={cn('font-medium text-xs', h.ok ? 'text-gray-800' : 'text-gray-400')}>{h.hours}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-2.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Équipe disponible maintenant</span>
              </div>
            </div>

            {/* Social */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Suivez-nous</h3>
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
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Liens rapides</h3>
              <div className="space-y-2">
                {[
                  { label: 'Documentation', href: '#', icon: FileText },
                  { label: 'FAQ complète', href: '#faq', icon: HelpCircle },
                  { label: 'Status du service', href: '#', icon: Zap },
                  { label: 'Signaler une faille', href: 'mailto:security@bouba-ia.com', icon: Shield },
                ].map(link => {
                  const Icon = link.icon
                  return (
                    <a key={link.label} href={link.href}
                      className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-blue-100 text-sm text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-colors group">
                      <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                      <span>{link.label}</span>
                      <ChevronDown className="w-3 h-3 -rotate-90 text-gray-300 ml-auto group-hover:text-blue-400 transition-colors" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-16 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-blue-600 font-semibold text-xs uppercase tracking-widest mb-3 block">FAQ</span>
            <h2 className="text-3xl font-bold text-gray-900">Tout ce que vous voulez savoir</h2>
            <p className="text-gray-500 text-sm mt-2">Les questions les plus fréquentes de nos utilisateurs.</p>
          </div>
          <div className="space-y-2.5">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-gray-500 text-sm mb-4">Vous n'avez pas trouvé votre réponse ?</p>
            <a
              href="mailto:support@bouba-ia.com"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
            >
              Contacter le support <Send className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
