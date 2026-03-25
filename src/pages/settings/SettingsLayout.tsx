
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
      available: true // Toujours disponible
    },
    { 
      to: 'connections', 
      icon: Plug, 
      label: 'Connexions', 
      description: 'Intégrations tierces',
      available: hasFeatureAccess('calendar') || hasFeatureAccess('contacts') || hasFeatureAccess('finance') // Pro+
    },
    { 
      to: 'knowledge', 
      icon: Brain, 
      label: 'Base de connaissances', 
      description: 'Documents et données',
      available: hasFeatureAccess('knowledge') // Enterprise uniquement
    },
    { 
      to: 'plan', 
      icon: CreditCard, 
      label: 'Abonnement', 
      description: 'Plan et facturation',
      available: true // Toujours disponible
    },
    { 
      to: 'notifications', 
      icon: Bell, 
      label: 'Notifications', 
      description: 'Alertes et rappels',
      available: true // Toujours disponible
    },
    {
      to: 'branding',
      icon: Palette,
      label: 'Personnalisation',
      description: 'Thèmes et apparence',
      available: hasFeatureAccess('whitelabel') // Enterprise seulement
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 lg:space-x-6 min-w-0">
              <Link 
                to="/dashboard" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Retour au dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent"
              >
                Paramètres
              </motion.h1>
            </div>
            
            {/* User info in header - hidden on small mobile */}
            <div className="hidden sm:flex items-center space-x-3 bg-white/60 rounded-full px-4 py-2 border border-gray-200/60">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {profile?.first_name?.[0] || 'U'}
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 truncate">
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Utilisateur'}
                </p>
                <p className="text-xs text-gray-500">
                  {profile?.subscription_status === 'active' ? 'Compte actif' : 'Compte inactif'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Settings Navigation */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-4 lg:p-6 shadow-sm">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 lg:mb-6">
                Navigation
              </h2>
              <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
                {settingsNavItems.map((item, index) => {
                  const IconComponent = item.icon;
                  
                  if (!item.available) {
                    // Item verrouillé
                    return (
                      <motion.div
                        key={item.to + '-locked'}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="relative"
                      >
                        <div className="flex items-center space-x-3 px-4 py-4 rounded-xl text-gray-400 cursor-not-allowed opacity-60 border border-gray-200">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm">{item.label}</h3>
                            <p className="text-xs text-gray-400 truncate">{item.description}</p>
                          </div>
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-orange-100/30 rounded-xl pointer-events-none" />
                      </motion.div>
                    );
                  }
                  
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-200 group ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                              : 'text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                          }`
                        }
                      >
                        <div className={`p-2 rounded-lg transition-colors ${
                          'bg-white shadow-sm group-hover:shadow-md'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{item.label}</h3>
                          <p className="text-xs text-gray-500 truncate">{item.description}</p>
                        </div>
                      </NavLink>
                    </motion.div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-w-0">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden"
            >
              <div className="p-4 lg:p-8">
                <Outlet />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}