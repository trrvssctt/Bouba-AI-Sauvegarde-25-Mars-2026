import { Link } from 'react-router-dom'
import { Mail, Twitter, Linkedin, Github } from 'lucide-react'

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4 md:col-span-1">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">B</div>
            <span className="font-bold text-white text-xl">Bouba'ia</span>
          </Link>
          <p className="text-sm leading-relaxed">
            L'assistant IA exécutif qui redonne du temps aux entrepreneurs.
          </p>
          <div className="flex gap-3">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
              className="p-2 bg-gray-800 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
              className="p-2 bg-gray-800 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="mailto:contact@bouba-ia.com"
              className="p-2 bg-gray-800 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Produit */}
        <div>
          <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Produit</h4>
          <ul className="space-y-3 text-sm">
            <li><a href="/#features" className="hover:text-blue-400 transition-colors">Fonctionnalités</a></li>
            <li><a href="/#pricing" className="hover:text-blue-400 transition-colors">Tarifs</a></li>
            <li><Link to="/dashboard" className="hover:text-blue-400 transition-colors">Tableau de bord</Link></li>
            <li><Link to="/signup" className="hover:text-blue-400 transition-colors">Essai gratuit</Link></li>
          </ul>
        </div>

        {/* Entreprise */}
        <div>
          <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Entreprise</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/about" className="hover:text-blue-400 transition-colors">À propos</Link></li>
            <li><Link to="/blog" className="hover:text-blue-400 transition-colors">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
            <li><a href="mailto:jobs@bouba-ia.com" className="hover:text-blue-400 transition-colors">Carrières</a></li>
          </ul>
        </div>

        {/* Légal */}
        <div>
          <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Légal</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/legal#confidentialite" className="hover:text-blue-400 transition-colors">Confidentialité</Link></li>
            <li><Link to="/legal#cgu" className="hover:text-blue-400 transition-colors">CGU</Link></li>
            <li><Link to="/legal#cookies" className="hover:text-blue-400 transition-colors">Cookies</Link></li>
            <li><Link to="/legal#mentions" className="hover:text-blue-400 transition-colors">Mentions légales</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
        <p>© 2026 BOUBA'IA SAS — Tous droits réservés. Fait avec ❤️ à Paris.</p>
        <div className="flex gap-4">
          <Link to="/legal#mentions" className="hover:text-blue-400 transition-colors">Mentions légales</Link>
          <Link to="/contact" className="hover:text-blue-400 transition-colors">Support</Link>
        </div>
      </div>
    </footer>
  )
}
