import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Mail,
  Calendar,
  Users,
  CircleDollarSign,
  ArrowRight,
  Check,
  Play,
  Star,
  Zap,
  Shield,
  ChevronRight,
  Loader2,
  Menu,
  X
} from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/src/lib/utils'
import { usePlans } from '@/src/hooks/usePlans'
import AvatarBouba, { useAvatarAnimation, AvatarAnimation } from '@/src/components/AvatarBouba'

const features = [
  { icon: Mail, title: 'Email IA', desc: 'Bouba lit, trie et pré-rédige vos réponses pour vous faire gagner des heures chaque jour.' },
  { icon: Calendar, title: 'Agenda Intelligent', desc: 'Planifiez vos rendez-vous en langage naturel. Bouba gère les conflits et les rappels.' },
  { icon: Users, title: 'CRM Automatisé', desc: 'Vos contacts sont toujours à jour. Bouba enrichit les profils avec les dernières interactions.' },
  { icon: CircleDollarSign, title: 'Finance & Rapports', desc: 'Suivez vos revenus et dépenses. Bouba génère des rapports financiers clairs et précis.' },
  { icon: Zap, title: 'Recherche Web', desc: 'Besoin d\'une info ? Bouba parcourt le web pour vous fournir des réponses sourcées.' },
  { icon: Shield, title: 'Mémoire Sécurisée', desc: 'Bouba apprend de vos documents pour devenir votre second cerveau, en toute sécurité.' },
]

const steps = [
  { num: '01', title: 'Connectez vos outils', desc: 'Liez vos comptes Google et Airtable en 2 clics.' },
  { num: '02', title: 'Parlez à Bouba', desc: 'Utilisez le langage naturel pour donner vos instructions.' },
  { num: '03', title: 'Bouba agit', desc: 'Votre assistant exécute les tâches et vous rend compte.' },
]

// ── Animated hero avatar (cycles through showcase animations) ──────────────

const SHOWCASE_ANIMS: { anim: AvatarAnimation; label: string }[] = [
  { anim: 'idle',      label: 'Disponible' },
  { anim: 'wave',      label: 'Bonjour ! 👋' },
  { anim: 'thinking',  label: 'Je réfléchis…' },
  { anim: 'talking',   label: 'Je vous explique' },
  { anim: 'happy',     label: 'Super !' },
  { anim: 'celebrate', label: 'Objectif atteint !' },
  { anim: 'love',      label: 'Avec plaisir ❤️' },
  { anim: 'excited',   label: 'Génial !' },
]

function LandingAvatar() {
  const [idx, setIdx] = useState(0)
  const { animation, play } = useAvatarAnimation('arrive')

  useEffect(() => {
    // Start with arrive animation then cycle
    setTimeout(() => {
      play(SHOWCASE_ANIMS[0].anim)
      const interval = setInterval(() => {
        setIdx(i => {
          const next = (i + 1) % SHOWCASE_ANIMS.length
          play(SHOWCASE_ANIMS[next].anim)
          return next
        })
      }, 2800)
      return () => clearInterval(interval)
    }, 1000)
  }, [])

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 12 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/25 rounded-3xl blur-3xl scale-110 pointer-events-none" />
        <AvatarBouba
          animation={animation}
          size={112}
          autoIdle={false}
          className="relative rounded-3xl border-4 border-white/60 shadow-2xl shadow-primary/30"
          label={SHOWCASE_ANIMS[idx].label}
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute -top-3 -right-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
        >
          IA ✨
        </motion.div>
      </div>
      {/* Mini animation dots */}
      <div className="flex gap-1.5">
        {SHOWCASE_ANIMS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); play(SHOWCASE_ANIMS[i].anim) }}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all',
              i === idx ? 'bg-primary w-4' : 'bg-primary/30 hover:bg-primary/60'
            )}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ── Interactive animation picker (added to "How it works" section) ──────────

function AnimationShowcase() {
  const { animation, play } = useAvatarAnimation('idle')
  const [active, setActive] = useState<AvatarAnimation>('idle')

  const items: { anim: AvatarAnimation; emoji: string; label: string }[] = [
    { anim: 'idle',      emoji: '😊', label: 'Attente' },
    { anim: 'wave',      emoji: '👋', label: 'Salut' },
    { anim: 'thinking',  emoji: '🤔', label: 'Réfléchit' },
    { anim: 'talking',   emoji: '🗣️', label: 'Parle' },
    { anim: 'walking',   emoji: '🚶', label: 'Se déplace' },
    { anim: 'happy',     emoji: '😄', label: 'Heureux' },
    { anim: 'celebrate', emoji: '🎉', label: 'Fête' },
    { anim: 'sleeping',  emoji: '😴', label: 'Dort' },
    { anim: 'surprised', emoji: '😲', label: 'Surpris' },
    { anim: 'confused',  emoji: '😕', label: 'Confus' },
    { anim: 'loading',   emoji: '⏳', label: 'Charge' },
    { anim: 'nod',       emoji: '✅', label: 'Oui' },
    { anim: 'shake',     emoji: '❌', label: 'Non' },
    { anim: 'excited',   emoji: '⚡', label: 'Excité' },
    { anim: 'shy',       emoji: '🙈', label: 'Timide' },
    { anim: 'angry',     emoji: '😠', label: 'En colère' },
    { anim: 'love',      emoji: '❤️', label: 'Amour' },
    { anim: 'typing',    emoji: '⌨️', label: 'Tape' },
    { anim: 'search',    emoji: '🔍', label: 'Cherche' },
    { anim: 'arrive',    emoji: '🚀', label: 'Arrive' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-center">
        <AvatarBouba animation={animation} size={120} autoIdle={false} className="rounded-3xl border-4 border-primary/20 shadow-xl" />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {items.map(item => (
          <button
            key={item.anim}
            onClick={() => { setActive(item.anim); play(item.anim) }}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-2xl border text-xs font-medium transition-all',
              active === item.anim
                ? 'bg-primary text-white border-primary shadow-violet'
                : 'bg-surface border-border text-muted hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="truncate w-full text-center text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const { plans, loading: plansLoading } = usePlans()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300 px-6 py-4",
        isScrolled ? "bg-surface/80 backdrop-blur-md border-b border-border py-3" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/avatar-bouba.png" alt="Bouba" className="w-9 h-9 rounded-xl object-cover shadow-lg"
              onError={e => { const el = e.target as HTMLImageElement; el.style.display='none'; el.nextElementSibling?.classList.remove('hidden') }} />
            <div className="w-9 h-9 bg-primary text-white rounded-xl hidden items-center justify-center font-bold text-lg shadow-lg">B</div>
            <span className="font-display font-bold text-xl tracking-tight text-secondary">BOUBA</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-muted hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="text-sm font-bold text-muted hover:text-primary transition-colors">Tarifs</a>
            <Link to="/about" className="text-sm font-bold text-muted hover:text-primary transition-colors">À propos</Link>
            <Link to="/blog" className="text-sm font-bold text-muted hover:text-primary transition-colors">Blog</Link>
            <Link to="/contact" className="text-sm font-bold text-muted hover:text-primary transition-colors">Contact</Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/login" className="hidden sm:inline-flex btn-ghost text-sm py-2 px-4">Se connecter</Link>
            <Link to="/signup" className="btn-primary text-xs sm:text-sm py-2 px-4 sm:px-6">
              <span className="hidden sm:inline">Essayer gratuitement</span>
              <span className="sm:hidden">Commencer</span>
            </Link>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-xl hover:bg-primary/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-secondary" /> : <Menu className="w-5 h-5 text-secondary" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-surface/95 backdrop-blur-md border-b border-border shadow-lg">
            <div className="flex flex-col p-4 gap-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-secondary py-2 px-4 rounded-xl hover:bg-primary/10 transition-colors">Fonctionnalités</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-secondary py-2 px-4 rounded-xl hover:bg-primary/10 transition-colors">Tarifs</a>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-secondary py-2 px-4 rounded-xl hover:bg-primary/10 transition-colors">À propos</Link>
              <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-secondary py-2 px-4 rounded-xl hover:bg-primary/10 transition-colors">Blog</Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-secondary py-2 px-4 rounded-xl hover:bg-primary/10 transition-colors">Contact</Link>
              <div className="border-t border-border pt-3">
                <Link to="/login" className="block text-center btn-ghost text-sm py-2 px-4 mb-2">Se connecter</Link>
                <Link to="/signup" className="block text-center btn-primary text-sm py-2 px-4">Essayer gratuitement</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Bouba Avatar with live animations */}
            <LandingAvatar />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
            >
              <Sparkles className="w-4 h-4" />
              L'assistant exécutif du futur est ici
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl lg:text-8xl font-display font-extrabold text-secondary leading-[0.9] tracking-tighter"
            >
              Ton assistant exécutif <span className="text-primary">IA</span> personnel.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted max-w-2xl mx-auto leading-relaxed"
            >
              Bouba orchestre vos emails, votre agenda et vos finances pour vous libérer du temps. Parlez-lui comme à un vrai collaborateur.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link to="/signup" className="btn-primary text-lg px-10 py-5 w-full sm:w-auto flex items-center justify-center gap-2">
                Démarrer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="btn-ghost text-lg px-10 py-5 w-full sm:w-auto flex items-center justify-center gap-2 border border-border">
                <Play className="w-5 h-5 fill-primary text-primary" />
                Voir la démo
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-12 flex flex-wrap justify-center items-center gap-8 opacity-50 grayscale"
            >
              <span className="font-display font-bold text-2xl">TechFlow</span>
              <span className="font-display font-bold text-2xl">StartupX</span>
              <span className="font-display font-bold text-2xl">GlobalCorp</span>
              <span className="font-display font-bold text-2xl">DesignCo</span>
            </motion.div>
          </div>
        </div>

        {/* Hero Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[120px]" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-secondary">Tout ce dont vous avez besoin.</h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">Une suite complète d'outils IA pour gérer votre quotidien professionnel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 space-y-4 hover:border-primary transition-all group"
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-secondary">{feature.title}</h3>
                <p className="text-muted leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-display font-bold text-secondary leading-tight">
                  Parlez, Bouba s'occupe du reste.
                </h2>
                <p className="text-xl text-muted">Plus besoin de naviguer entre 10 onglets. Une seule interface pour tout piloter.</p>
              </div>

              <div className="space-y-8">
                {steps.map((step) => (
                  <div key={step.num} className="flex gap-6">
                    <span className="text-4xl font-display font-bold text-primary/20">{step.num}</span>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-secondary">{step.title}</h3>
                      <p className="text-muted">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="glass-card p-4 shadow-2xl rotate-2 scale-105 bg-white">
                <img 
                  src="https://picsum.photos/seed/bouba-demo/1200/800" 
                  alt="Interface Bouba" 
                  className="rounded-xl shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary rounded-full blur-3xl opacity-20" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary rounded-full blur-3xl opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* Animation Showcase Section */}
      <section className="py-24 bg-gradient-to-b from-surface to-background overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> 20 expressions
            </div>
            <h2 className="text-4xl font-display font-bold text-secondary">Bouba est vivant.</h2>
            <p className="text-muted max-w-xl mx-auto">Cliquez sur une émotion pour voir Bouba l'exprimer. Il réagit, parle, marche, dort, célèbre…</p>
          </motion.div>
          <AnimationShowcase />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-secondary">Des tarifs transparents.</h2>
            <p className="text-xl text-muted">Choisissez le plan qui vous convient, sans engagement.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plansLoading ? (
              <div className="col-span-full flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted">Chargement des plans...</span>
              </div>
            ) : (
              (Array.isArray(plans) ? plans : []).map((plan) => (
                <div key={plan.id} className={cn(
                  "glass-card p-8 flex flex-col relative",
                  plan.popular ? "ring-2 ring-primary shadow-violet scale-105 z-10" : "opacity-80"
                )}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Le plus populaire
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-secondary">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-display font-bold text-secondary">
                        {Math.floor(plan.price / 100)}€
                      </span>
                      <span className="text-muted text-sm">/ mois</span>
                    </div>
                    <p className="text-sm text-muted mt-2">{plan.description}</p>
                  </div>
                  <div className="flex-1 space-y-4">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-3 text-sm text-secondary">
                        <Check className="w-4 h-4 text-success" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <Link 
                    to={`/signup?plan=${plan.id}`} 
                    className={cn(
                      "w-full mt-8 py-3 rounded-xl font-bold text-center transition-all",
                      plan.popular ? "bg-primary text-white shadow-violet" : "bg-background text-secondary hover:bg-border"
                    )}
                  >
                    Choisir ce plan
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-primary to-secondary rounded-[40px] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl lg:text-6xl font-display font-bold leading-tight">
                Prêt à déléguer votre administratif à l'IA ?
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Rejoignez plus de 500 entrepreneurs qui ont déjà choisi Bouba pour booster leur productivité.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/signup" className="bg-white text-primary px-10 py-5 rounded-full text-lg font-bold hover:bg-white/90 transition-all shadow-lg">
                  Essayer gratuitement
                </Link>
                <button className="text-white font-bold flex items-center gap-2 group">
                  Contacter l'équipe
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <Sparkles className="absolute -right-20 -bottom-20 w-96 h-96 text-white/5 -rotate-12" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-lg">B</div>
              <span className="font-display font-bold text-xl tracking-tight text-secondary">BOUBA</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              L'assistant exécutif IA qui redonne du temps aux entrepreneurs.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-secondary mb-6">Produit</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">Fonctionnalités</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Tarifs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-secondary mb-6">Entreprise</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><Link to="/about" className="hover:text-primary transition-colors">À propos</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-secondary mb-6">Légal</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><Link to="/legal#confidentialite" className="hover:text-primary transition-colors">Confidentialité</Link></li>
              <li><Link to="/legal#cgu" className="hover:text-primary transition-colors">CGU</Link></li>
              <li><Link to="/legal#cookies" className="hover:text-primary transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted font-medium">
          <p>© 2026 BOUBA. Tous droits réservés.</p>
          <div className="flex gap-6">
            <span>Fait avec ❤️ à Paris</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition-colors">Twitter</a>
              <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
