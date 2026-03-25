import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Sparkles, Target, Heart, Globe, TrendingUp, Users, Award,
  ArrowRight, Shield, Zap, Brain,
} from 'lucide-react'
import PublicHeader from '@/src/components/layout/PublicHeader'
import PublicFooter from '@/src/components/layout/PublicFooter'

const TEAM = [
  {
    name: 'Seydou Dianka',
    role: 'CEO & Co-fondateur',
    bio: 'Entrepreneur en série, passionné d\'IA et de productivité. Ancien consultant en stratégie digitale pour PME africaines et françaises.',
    initials: 'SD',
    color: 'from-blue-500 to-blue-700',
    linkedin: '#',
  },
  {
    name: 'Aïssatou Bah',
    role: 'CTO & Co-fondatrice',
    bio: 'Ingénieure en machine learning, ex-Google Brain. Spécialisée en NLP et agents IA autonomes. Doctorat Paris-Saclay.',
    initials: 'AB',
    color: 'from-violet-500 to-purple-700',
    linkedin: '#',
  },
  {
    name: 'Mamadou Kouyaté',
    role: 'Head of Product',
    bio: 'Designer UX/UI et product manager. Construit des interfaces que les humains adorent vraiment utiliser depuis 10 ans.',
    initials: 'MK',
    color: 'from-emerald-500 to-green-700',
    linkedin: '#',
  },
  {
    name: 'Fatou Sow',
    role: 'Head of Growth',
    bio: 'Experte en marketing digital B2B. Anciennement chez Qonto et Alan. Accélère la croissance de 0 à 10 000 utilisateurs.',
    initials: 'FS',
    color: 'from-rose-500 to-pink-700',
    linkedin: '#',
  },
]

const MILESTONES = [
  { year: '2024', title: 'Naissance de l\'idée', desc: 'Frustrés par le temps perdu sur des tâches répétitives, Seydou et Aïssatou décident de créer un assistant IA vraiment utile pour les entrepreneurs.' },
  { year: 'Jan 2025', title: 'Prototype & premiers tests', desc: 'Premier prototype testé avec 50 entrepreneurs. Le feedback est clair : les gens veulent un assistant qui agit, pas qui répond.' },
  { year: 'Juin 2025', title: 'Levée de fonds amorçage', desc: '400 000 € levés auprès de business angels pour accélérer le développement produit et recruter l\'équipe technique.' },
  { year: 'Déc 2025', title: 'Lancement bêta privée', desc: '200 entreprises bêta-testeurs. 94 % de satisfaction. Les premiers cas d\'usage concrets sont validés : email, agenda, finance.' },
  { year: 'Mars 2026', title: 'Lancement public', desc: 'Bouba\'ia ouvre ses portes au grand public avec 3 plans adaptés aux solopreneurs, PME et grandes entreprises.' },
]

const VALUES = [
  { icon: Target,  title: 'Impact avant tout',    desc: 'Chaque fonctionnalité doit libérer du temps réel. Si ça n\'aide pas concrètement, on ne le construit pas.',        color: 'text-blue-600',   bg: 'bg-blue-50' },
  { icon: Heart,   title: 'Conçu pour l\'humain', desc: 'La technologie doit s\'adapter à vous, pas l\'inverse. Bouba apprend votre façon de travailler.',                   color: 'text-rose-600',   bg: 'bg-rose-50' },
  { icon: Shield,  title: 'Confiance absolue',    desc: 'Vos données vous appartiennent. Sécurité, transparence et respect de la vie privée ne sont pas négociables.',       color: 'text-green-600',  bg: 'bg-green-50' },
  { icon: Globe,   title: 'Ancré en Afrique',     desc: 'Bouba\'ia est conçu pour les entrepreneurs francophones du monde entier, avec une sensibilité africaine marquée.',  color: 'text-amber-600',  bg: 'bg-amber-50' },
  { icon: Zap,     title: 'Vitesse d\'exécution', desc: 'Nous livrons vite, testons, apprenons. La perfection n\'existe pas, mais l\'amélioration continue, oui.',           color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: Brain,   title: 'IA responsable',        desc: 'Nous utilisons l\'IA pour augmenter les capacités humaines, jamais pour les remplacer ou les tromper.',             color: 'text-cyan-600',   bg: 'bg-cyan-50' },
]

const STATS = [
  { value: '2 000+', label: 'Entrepreneurs actifs' },
  { value: '94 %',   label: 'Taux de satisfaction' },
  { value: '12 h',   label: 'Gagnées par semaine en moyenne' },
  { value: '4',      label: 'Pays couverts' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-violet-50 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-violet-200/30 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Notre histoire
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Nous croyons que les entrepreneurs<br />
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">méritent un vrai assistant</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Bouba'ia est né de la frustration de deux entrepreneurs qui passaient trop de temps sur des emails, des rappels et des tableurs. L'IA était là. Il suffisait de la rendre accessible à tous.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3 block">Notre mission</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Libérer 10 heures par semaine à chaque entrepreneur</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              En France, un entrepreneur passe en moyenne <strong>12 heures par semaine</strong> sur des tâches administratives répétitives : trier des emails, mettre à jour son agenda, relancer des clients, créer des factures.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Bouba'ia automatise tout ça. Pas avec des macros compliquées ou des intégrations à configurer pendant des jours — mais avec une simple conversation en français.
            </p>
            <Link to="/signup" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { emoji: '📧', title: '47 %', sub: 'du temps pro. passé sur les emails' },
              { emoji: '📅', title: '8 réunions', sub: 'en moyenne par semaine à coordonner' },
              { emoji: '🧾', title: '3,5 h', sub: 'par semaine pour la gestion comptable' },
              { emoji: '⚡', title: '94 %', sub: 'des tâches automatisables avec l\'IA' },
            ].map((s) => (
              <div key={s.title} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                <div className="text-3xl mb-2">{s.emoji}</div>
                <p className="text-2xl font-bold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3 block">Notre parcours</span>
            <h2 className="text-3xl font-bold text-gray-900">De l'idée au produit</h2>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-100 hidden sm:block" />
            <div className="space-y-8">
              {MILESTONES.map((m, i) => (
                <motion.div key={m.year}
                  initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="relative flex gap-6 sm:ml-3"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-sm">
                    {m.year.length <= 4 ? m.year : m.year.slice(0, 4)}
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{m.title}</p>
                      <span className="text-xs text-gray-400">{m.year}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3 block">Ce en quoi nous croyons</span>
            <h2 className="text-3xl font-bold text-gray-900">Nos valeurs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon
              return (
                <div key={v.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 ${v.bg} ${v.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3 block">Les visages derrière Bouba</span>
            <h2 className="text-3xl font-bold text-gray-900">Notre équipe</h2>
            <p className="text-gray-600 mt-3">Une équipe franco-africaine passionnée par l'impact de l'IA sur le travail.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member, i) => (
              <motion.div key={member.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center hover:shadow-md transition-shadow"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${member.color} text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md`}>
                  {member.initials}
                </div>
                <h3 className="font-bold text-gray-900 mb-0.5">{member.name}</h3>
                <p className="text-xs text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-gray-600 text-sm mb-4">Vous souhaitez rejoindre l'aventure ?</p>
            <a href="mailto:jobs@bouba-ia.com"
              className="inline-flex items-center gap-2 border border-blue-200 text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Voir nos offres d'emploi <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Investors / Backed by */}
      <section className="py-16 px-6 border-y border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500 mb-8 font-medium uppercase tracking-wider">Soutenu par</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {['Partech Africa', 'Y Combinator Alumni Fund', 'BPI France', 'Station F'].map((backer) => (
              <div key={backer} className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                {backer}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-violet-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <TrendingUp className="w-10 h-10 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Rejoignez 2 000+ entrepreneurs qui travaillent mieux</h2>
          <p className="text-white/80 mb-8 text-lg">Essayez Bouba'ia gratuitement pendant 14 jours. Aucune carte bancaire requise.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-xl">
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-2xl hover:border-white/60 transition-colors">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
