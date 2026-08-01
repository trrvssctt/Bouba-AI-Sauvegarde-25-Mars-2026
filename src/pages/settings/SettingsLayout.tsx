
import { Outlet, NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  User,
  Plug,
  Brain,
  CreditCard,
  Bell,
  Palette,
  Lock,
  Headphones,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { usePlans } from '@/src/hooks/usePlans';

export default function SettingsLayout() {
  const { profile } = useAuth();
  const { hasFeatureAccess } = usePlans();

  const settingsNavItems = [
    {
      to: 'profile',
      icon: User,
      label: 'Profil',
      description: 'Informations personnelles',
      available: true,
    },
    {
      to: 'connections',
      icon: Plug,
      label: 'Connexions',
      description: 'Intégrations tierces',
      available: true,
    },
    {
      to: 'knowledge',
      icon: Brain,
      label: 'Base de connaissances',
      description: 'Documents et données',
      available: hasFeatureAccess('knowledge'),
    },
    {
      to: 'plan',
      icon: CreditCard,
      label: 'Abonnement',
      description: 'Plan et facturation',
      available: true,
    },
    {
      to: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Alertes et rappels',
      available: true,
    },
    {
      to: 'branding',
      icon: Palette,
      label: 'Personnalisation',
      description: 'Thèmes et apparence',
      available: hasFeatureAccess('whitelabel'),
    },
    {
      to: 'support',
      icon: Headphones,
      label: 'Support',
      description: 'Aide & tickets',
      available: true,
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">

      {/* ── Header pleine largeur ────────────────────────────────── */}
      <header className="shrink-0 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm z-20">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-500 hover:text-secondary transition-colors group shrink-0"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline text-sm font-medium">Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden sm:block shrink-0" />
            <motion.h1
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg lg:text-xl font-bold text-secondary truncate"
            >
              Paramètres
            </motion.h1>
          </div>

          {/* Chip utilisateur */}
          <div className="hidden sm:flex items-center gap-2.5 bg-surface hover:bg-gray-100 border border-border rounded-full px-3 py-1.5 transition-colors shrink-0">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {profile?.first_name?.[0] || 'U'}
            </div>
            <div className="text-xs leading-tight">
              <p className="font-semibold text-secondary leading-none">
                {profile?.first_name
                  ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                  : 'Utilisateur'}
              </p>
              <p className="text-gray-400 mt-0.5 leading-none text-[10px]">
                {profile?.subscription_status === 'active' ? 'Compte actif' : 'Compte inactif'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation mobile horizontale ──────── */}
        <div className="lg:hidden flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {settingsNavItems.map((item) => {
            const IconComponent = item.icon;
            if (!item.available) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`
                }
              >
                <IconComponent className="w-3.5 h-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* ── Corps principal ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar desktop sticky ───────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 2xl:w-72 shrink-0 overflow-y-auto border-r border-border bg-surface/80 backdrop-blur-sm">
          <nav className="p-3 xl:p-4 flex-1 space-y-0.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-3 pb-2">
              Navigation
            </p>
            {settingsNavItems.map((item) => {
              const IconComponent = item.icon;

              if (!item.available) {
                return (
                  <div
                    key={item.to + '-locked'}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 opacity-50 cursor-not-allowed select-none"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-none truncate">{item.label}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.description}</p>
                    </div>
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/20'
                            : 'bg-gray-100 group-hover:bg-white group-hover:shadow-sm'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-none truncate">{item.label}</p>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isActive ? 'text-white/70' : 'text-gray-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* ── Contenu principal scrollable ─────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          <div className="p-4 sm:p-6 lg:p-8 xl:p-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
