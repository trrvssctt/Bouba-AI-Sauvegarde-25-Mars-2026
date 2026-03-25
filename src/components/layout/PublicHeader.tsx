import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '@/src/lib/utils'

const navLinks = [
  { to: '/#features',  label: 'Fonctionnalités', isHash: true },
  { to: '/#pricing',   label: 'Tarifs',          isHash: true },
  { to: '/about',      label: 'À propos',         isHash: false },
  { to: '/blog',       label: 'Blog',             isHash: false },
  { to: '/contact',    label: 'Contact',          isHash: false },
]

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn(
      'fixed top-0 left-0 w-full z-50 transition-all duration-300 px-6 py-4',
      scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">B</div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Bouba'ia</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ to, label, isHash }) =>
            isHash ? (
              <a key={to} href={to} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">{label}</a>
            ) : (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  cn('text-sm font-medium transition-colors', isActive ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600')
                }
              >{label}</NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/login" className="hidden sm:inline-flex text-sm font-medium px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors">
            Se connecter
          </Link>
          <Link to="/signup" className="text-sm font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors">
            Essayer gratuitement
          </Link>
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-lg py-4 px-6 space-y-2">
          {navLinks.map(({ to, label, isHash }) =>
            isHash ? (
              <a key={to} href={to} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium py-2 px-4 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">{label}</a>
            ) : (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn(
                  'block text-sm font-medium py-2 px-4 rounded-xl transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                )}
              >{label}</NavLink>
            )
          )}
          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm font-medium py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Se connecter</Link>
            <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm font-semibold py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Commencer</Link>
          </div>
        </div>
      )}
    </header>
  )
}
