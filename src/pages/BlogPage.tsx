import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Search, Clock, ArrowRight, Tag, TrendingUp, Sparkles,
  BookOpen, ChevronRight
} from 'lucide-react'
import PublicHeader from '@/src/components/layout/PublicHeader'
import PublicFooter from '@/src/components/layout/PublicFooter'
import { cn } from '@/src/lib/utils'

interface Article {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
  author: { name: string; initials: string; color: string }
  featured?: boolean
  emoji: string
  tags: string[]
}

const ARTICLES: Article[] = [
  {
    id: '1',
    slug: 'ia-executive-assistant-entrepreneurs',
    title: 'Comment l\'IA générative transforme le quotidien des entrepreneurs en 2026',
    excerpt: 'Les entrepreneurs gagnent en moyenne 10 à 15 heures par semaine grâce aux assistants IA. Voici comment les utiliser concrètement pour votre business.',
    category: 'Intelligence Artificielle',
    date: '15 mars 2026',
    readTime: '8 min',
    author: { name: 'Aïssatou Bah', initials: 'AB', color: 'from-violet-500 to-purple-600' },
    featured: true,
    emoji: '🤖',
    tags: ['IA', 'Productivité', 'Entrepreneuriat'],
  },
  {
    id: '2',
    slug: 'gestion-email-ia-bouba',
    title: '5 façons dont Bouba gère vos emails à votre place (avec des exemples réels)',
    excerpt: "De la rédaction automatique à la priorisation intelligente, découvrez comment Bouba'ia transforme votre boîte mail en outil de productivité.",
    category: 'Tutoriels',
    date: '8 mars 2026',
    readTime: '5 min',
    author: { name: 'Mamadou Kouyaté', initials: 'MK', color: 'from-emerald-500 to-green-600' },
    emoji: '📧',
    tags: ['Email', 'Automatisation', 'Gmail'],
  },
  {
    id: '3',
    slug: 'productivite-entrepreneurs-afrique-francophone',
    title: 'Productivité en Afrique francophone : les outils qui changent la donne',
    excerpt: 'Focus sur les entrepreneurs sénégalais, ivoiriens et camerounais qui adoptent les outils IA pour conquérir leurs marchés.',
    category: 'Entrepreneuriat',
    date: '2 mars 2026',
    readTime: '6 min',
    author: { name: 'Seydou Dianka', initials: 'SD', color: 'from-blue-500 to-blue-700' },
    emoji: '🌍',
    tags: ['Afrique', 'Productivité', 'Business'],
  },
  {
    id: '4',
    slug: 'rgpd-ia-entreprises',
    title: 'RGPD et IA : ce que chaque entrepreneur doit savoir en 2026',
    excerpt: 'Utiliser l\'IA pour traiter vos données clients, c\'est possible — à condition de respecter certaines règles. Le guide complet.',
    category: 'Légal & Conformité',
    date: '24 février 2026',
    readTime: '10 min',
    author: { name: 'Fatou Sow', initials: 'FS', color: 'from-rose-500 to-pink-600' },
    emoji: '⚖️',
    tags: ['RGPD', 'Conformité', 'IA'],
  },
  {
    id: '5',
    slug: 'agenda-intelligent-google-calendar-ia',
    title: 'Agenda intelligent : comment Bouba planifie vos rendez-vous en langage naturel',
    excerpt: 'Dites "Planifie une réunion avec Marc mardi après-midi" et c\'est fait. Démonstration pas à pas avec Google Calendar.',
    category: 'Tutoriels',
    date: '17 février 2026',
    readTime: '4 min',
    author: { name: 'Mamadou Kouyaté', initials: 'MK', color: 'from-emerald-500 to-green-600' },
    emoji: '📅',
    tags: ['Agenda', 'Google Calendar', 'Automatisation'],
  },
  {
    id: '6',
    slug: 'facturation-automatique-pme',
    title: 'Facturation automatique pour PME : fini les oublis de relance',
    excerpt: "Comment Bouba'ia génère, envoie et relance vos factures automatiquement, sans aucun logiciel de comptabilité supplémentaire.",
    category: 'Finance',
    date: '10 février 2026',
    readTime: '7 min',
    author: { name: 'Seydou Dianka', initials: 'SD', color: 'from-blue-500 to-blue-700' },
    emoji: '💰',
    tags: ['Facturation', 'Finance', 'PME'],
  },
  {
    id: '7',
    slug: 'crm-contacts-ia-automatise',
    title: 'CRM automatisé : comment ne plus jamais perdre un contact important',
    excerpt: 'Un bon CRM ne devrait pas demander 3h par semaine de saisie manuelle. Découvrez comment Bouba enrichit vos contacts automatiquement.',
    category: 'CRM',
    date: '3 février 2026',
    readTime: '6 min',
    author: { name: 'Fatou Sow', initials: 'FS', color: 'from-rose-500 to-pink-600' },
    emoji: '👥',
    tags: ['CRM', 'Contacts', 'Automatisation'],
  },
  {
    id: '8',
    slug: 'prompt-engineering-assistant-ia',
    title: 'Prompt engineering pour non-téchniques : parler à Bouba comme à un vrai collaborateur',
    excerpt: "Les meilleures pratiques pour formuler vos demandes à Bouba'ia et obtenir des résultats de qualité professionnelle à chaque fois.",
    category: 'Intelligence Artificielle',
    date: '27 janvier 2026',
    readTime: '9 min',
    author: { name: 'Aïssatou Bah', initials: 'AB', color: 'from-violet-500 to-purple-600' },
    emoji: '✍️',
    tags: ['IA', 'Prompt', 'Guide'],
  },
]

const CATEGORIES = ['Tous', 'Intelligence Artificielle', 'Tutoriels', 'Entrepreneuriat', 'Finance', 'CRM', 'Légal & Conformité']

const CATEGORY_COLORS: Record<string, string> = {
  'Intelligence Artificielle': 'bg-violet-100 text-violet-700',
  'Tutoriels':                 'bg-blue-100 text-blue-700',
  'Entrepreneuriat':           'bg-amber-100 text-amber-700',
  'Finance':                   'bg-green-100 text-green-700',
  'CRM':                       'bg-rose-100 text-rose-700',
  'Légal & Conformité':        'bg-gray-100 text-gray-700',
}

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <article className={cn(
      'group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1',
      featured && 'md:col-span-2 md:grid md:grid-cols-2'
    )}>
      {/* Thumbnail */}
      <div className={cn(
        'flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100',
        featured ? 'h-56 md:h-full text-7xl' : 'h-40 text-5xl'
      )}>
        <span>{article.emoji}</span>
      </div>

      {/* Content */}
      <div className={cn('p-6', featured && 'flex flex-col justify-center')}>
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-600')}>
            {article.category}
          </span>
          {featured && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-600 text-white flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> À la une
            </span>
          )}
        </div>

        <h2 className={cn('font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug', featured ? 'text-xl' : 'text-base')}>
          {article.title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">{article.excerpt}</p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${article.author.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
              {article.author.initials}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">{article.author.name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{article.date}</span>
                <span>·</span>
                <Clock className="w-3 h-3" />
                <span>{article.readTime}</span>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:gap-2 transition-all">
            Lire <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tous')

  const filtered = ARTICLES.filter((a) => {
    const matchCat = activeCategory === 'Tous' || a.category === activeCategory
    const matchSearch = !searchQuery
      || a.title.toLowerCase().includes(searchQuery.toLowerCase())
      || a.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      || a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchCat && matchSearch
  })

  const featured = filtered.find(a => a.featured)
  const rest = filtered.filter(a => !a.featured)

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-blue-50 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <BookOpen className="w-3.5 h-3.5" /> Blog Bouba'ia
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Ressources & <span className="text-blue-600">Insights</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
              Productivité, IA, entrepreneuriat : les meilleures pratiques pour travailler moins et accomplir plus.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex-shrink-0 text-xs font-medium px-4 py-2 rounded-xl transition-colors',
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Articles */}
      <main className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-600 font-medium">Aucun article trouvé</p>
              <p className="text-sm text-gray-400 mt-1">Essayez un autre terme ou catégorie</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('Tous') }}
                className="mt-4 text-sm text-blue-600 hover:underline">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <>
              {/* Featured article */}
              {featured && activeCategory === 'Tous' && !searchQuery && (
                <div className="mb-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ArticleCard article={featured} featured />
                  </div>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeCategory !== 'Tous' || searchQuery ? filtered : rest).map((article, i) => (
                  <motion.div key={article.id}
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  >
                    <ArticleCard article={article} />
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* Newsletter CTA */}
          <div className="mt-16 bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-8 sm:p-12 text-white text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-3">Recevez les meilleurs articles</h3>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              Chaque semaine, un article sur la productivité IA, l'entrepreneuriat et les meilleures pratiques. Pas de spam.
            </p>
            <form
              onSubmit={e => { e.preventDefault() }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="votre@email.com"
                required
                className="flex-1 px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
              />
              <button type="submit"
                className="flex items-center justify-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm whitespace-nowrap">
                S'abonner <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Tags cloud */}
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Sujets populaires</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(ARTICLES.flatMap(a => a.tags))).map(tag => (
                <button key={tag}
                  onClick={() => { setSearchQuery(tag); setActiveCategory('Tous') }}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 rounded-full transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Recent articles sidebar hint */}
      <div className="bg-gray-50 border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-blue-600" /> Articles récents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ARTICLES.slice(0, 4).map(a => (
              <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <span className="text-2xl block mb-2">{a.emoji}</span>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-1">{a.title}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{a.readTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
