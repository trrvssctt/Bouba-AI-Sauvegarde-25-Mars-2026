import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  MessageCircle,
  Mail,
  Calendar,
  Users,
  PiggyBank,
  Settings,
  LogOut,
  User,
  Bell,
  Sparkles,
  X,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { usePlans } from '@/src/hooks/usePlans'
import { useActiveApps } from '@/src/hooks/useActiveApps';
import { useNotificationStore } from '@/src/stores/notificationStore';
import LogoutConfirmModal from './LogoutConfirmModal';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.getAttribute('data-theme') === 'dark');
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const { signOut, profile } = useAuth();
  const { hasFeatureAccess } = usePlans();
  const { isNavAvailable } = useActiveApps();
  const { unreadEmails, unreadMessages, unreadAppNotifications } = useNotificationStore();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      setShowLogoutModal(false);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      console.error('❌ Erreur de déconnexion depuis Sidebar:', error);
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Close sidebar on mobile when navigating
  const handleNavClick = (item: any, e: React.MouseEvent) => {
    // Si la fonctionnalité n'est pas disponible, empêcher la navigation
    // et rediriger vers la page d'upgrade
    if (item.available === false) {
      e.preventDefault();
      e.stopPropagation();
      
      // Afficher un toast avec le message de verrouillage
      import('sonner').then(({ toast }) => {
        toast.error(item.lockedMessage || 'Upgrade votre plan pour accéder à cette fonctionnalité', {
          action: {
            label: 'Voir les plans',
            onClick: () => navigate('/settings/plan')
          }
        });
      });
      
      // Rediriger vers la page des plans
      navigate('/settings/plan');
      return;
    }
    
    if (onClose) onClose();
  };

  const mainNavItems = [
    // FREE PLAN
    {
      to: '/dashboard',
      icon: Home,
      label: 'Dashboard',
      available: true,
      plan: 'free',
      description: 'Vue d\'ensemble de votre espace',
      lockedMessage: ''
    },
    {
      to: '/dashboard/chat',
      icon: MessageCircle,
      label: 'Chat IA',
      available: true,
      plan: 'free',
      description: 'Assistant IA (500 messages/mois)',
      lockedMessage: 'Upgrade pour plus de messages'
    },
    {
      to: '/dashboard/email',
      icon: Mail,
      label: 'Email',
      available: true,
      plan: 'free',
      description: 'Gestion emails Gmail/Outlook',
      lockedMessage: 'Upgrade pour plus d\'emails'
    },
    
    // STARTER PLAN (Pro)
    {
      to: '/dashboard/contacts',
      icon: Users,
      label: 'Contacts',
      available: hasFeatureAccess('contacts'),
      plan: 'starter',
      description: 'Gestion contacts (500 contacts)',
      lockedMessage: 'Upgrade au plan Starter pour accéder aux Contacts'
    },
    {
      to: '/dashboard/calendar',
      icon: Calendar,
      label: 'Calendrier',
      available: hasFeatureAccess('calendar'),
      plan: 'starter',
      description: 'Google Calendar intégré',
      lockedMessage: 'Upgrade au plan Starter pour accéder au Calendrier'
    },

    // BUSINESS PLAN (Premium)
    {
      to: '/dashboard/finance',
      icon: PiggyBank,
      label: 'Finance',
      available: hasFeatureAccess('finance'),
      plan: 'business',
      description: 'Finance + Documents officiels',
      lockedMessage: 'Upgrade au plan Business pour accéder à la Finance'
    },
    // Masquer les apps désactivées par l'admin ET celles hors du plan de l'utilisateur
  ].filter((item) => item.available !== false && isNavAvailable(item.to));

  const bottomNavItems = [
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const sidebarContent = (
    <div className={`w-64 flex flex-col shadow-sm backdrop-blur-sm h-full border-r ${
      isDark
        ? 'bg-[#1A1730] border-[#2D2B4E]'
        : 'bg-gradient-to-b from-white to-blue-50/30 border-gray-200/60'
    }`}>
      {/* Header */}
      <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-[#2D2B4E]' : 'border-gray-200/60'}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center space-x-3"
        >
          <div className="relative p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
            <Bot className="h-6 w-6 text-white" />
            <div className={`absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 ${isDark ? 'border-[#1A1730]' : 'border-white'}`}></div>
          </div>
          <div>
            <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${isDark ? 'from-[#E2E8F0] to-[#A78BFA]' : 'from-gray-900 to-blue-800'}`}>Bouba'ia</h1>
            <p className={`text-sm flex items-center ${isDark ? 'text-[#64748B]' : 'text-gray-500'}`}>
              <Sparkles className="h-3 w-3 mr-1" />
              Assistant IA
            </p>
          </div>
        </motion.div>
        {/* Close button - mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className={`lg:hidden p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#221E3D]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* FREE PLAN SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Gratuit</span>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Inclus</span>
            </div>
            <div className="space-y-1">
              {mainNavItems
                .filter(item => item.plan === 'free')
                .map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <NavLink
                        to={item.to}
                        end={item.to === '/dashboard'}
                        onClick={(e) => handleNavClick(item, e)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                            isActive
                              ? isDark
                                ? 'bg-[rgba(108,62,244,0.18)] text-[#A78BFA] border border-[rgba(108,62,244,0.35)]'
                                : 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                              : isDark
                                ? 'text-[#CBD5E1] hover:bg-[#221E3D] hover:text-[#F1F5F9]'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                          }`
                        }
                      >
                        <div className={`p-1.5 rounded-lg transition-colors shadow-sm group-hover:shadow-md ${isDark ? 'bg-[#2A2550]' : 'bg-white'}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.label}</span>
                          <p className={`text-xs truncate ${isDark ? 'text-[#64748B]' : 'text-gray-500'}`}>{item.description}</p>
                        </div>
                        {item.label === 'Email' && unreadEmails > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadEmails > 99 ? '99+' : unreadEmails}
                          </span>
                        )}
                        {item.label === 'Chat IA' && unreadMessages > 0 && (
                          <span className="ml-auto bg-primary text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                          </span>
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}
            </div>
          </div>

          {/* PRO PLAN SECTION — masquée si l'utilisateur n'a aucune app pro */}
          {mainNavItems.filter(item => item.plan === 'starter').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Pro</span>
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">À partir de 29€/mois</span>
            </div>
            <div className="space-y-1">
              {mainNavItems
                .filter(item => item.plan === 'starter')
                .map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <NavLink
                        to={item.to}
                        onClick={(e) => handleNavClick(item, e)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                            isActive
                              ? isDark
                                ? 'bg-[rgba(108,62,244,0.18)] text-[#A78BFA] border border-[rgba(108,62,244,0.35)]'
                                : 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                              : isDark
                                ? 'text-[#CBD5E1] hover:bg-[#221E3D] hover:text-[#F1F5F9]'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                          }`
                        }
                      >
                        <div className={`p-1.5 rounded-lg transition-colors shadow-sm group-hover:shadow-md ${isDark ? 'bg-[#2A2550]' : 'bg-white'}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.label}</span>
                          <p className={`text-xs truncate ${isDark ? 'text-[#64748B]' : 'text-gray-500'}`}>{item.description}</p>
                        </div>
                        <ChevronRight className={`w-4 h-4 ml-auto ${isDark ? 'text-[#475569]' : 'text-gray-400'}`} />
                      </NavLink>
                    </motion.div>
                  );
                })}
            </div>
          </div>
          )}

          {/* PREMIUM PLAN SECTION — masquée si l'utilisateur n'a aucune app business */}
          {mainNavItems.filter(item => item.plan === 'business').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Premium</span>
              <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">À partir de 49€/mois</span>
            </div>
            <div className="space-y-1">
              {mainNavItems
                .filter(item => item.plan === 'business')
                .map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <NavLink
                        to={item.to}
                        onClick={(e) => handleNavClick(item, e)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                            isActive
                              ? isDark
                                ? 'bg-[rgba(139,92,246,0.18)] text-[#C4B5FD] border border-[rgba(139,92,246,0.35)]'
                                : 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 shadow-sm border border-purple-200'
                              : isDark
                                ? 'text-[#CBD5E1] hover:bg-[#221E3D] hover:text-[#F1F5F9]'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                          }`
                        }
                      >
                        <div className={`p-1.5 rounded-lg transition-colors shadow-sm group-hover:shadow-md ${isDark ? 'bg-[#2A2550]' : 'bg-white'}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.label}</span>
                          <p className={`text-xs truncate ${isDark ? 'text-[#64748B]' : 'text-gray-500'}`}>{item.description}</p>
                        </div>
                        <ChevronRight className={`w-4 h-4 ml-auto ${isDark ? 'text-[#475569]' : 'text-gray-400'}`} />
                      </NavLink>
                    </motion.div>
                  );
                })}
            </div>
          </div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className={`p-4 border-t ${isDark ? 'border-[#2D2B4E] bg-[#13112A]' : 'border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-blue-50/30'}`}>
        <div className="space-y-2">
          {bottomNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => handleNavClick(item, e)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? isDark
                        ? 'bg-[rgba(108,62,244,0.18)] text-[#A78BFA] border border-[rgba(108,62,244,0.35)]'
                        : 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                      : isDark
                        ? 'text-[#CBD5E1] hover:bg-[#221E3D] hover:text-[#F1F5F9]'
                        : 'text-gray-700 hover:bg-white/70 hover:shadow-sm'
                  }`
                }
              >
                <div className={`p-1.5 rounded-lg shadow-sm group-hover:shadow-md transition-shadow ${isDark ? 'bg-[#2A2550]' : 'bg-white'}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                {unreadAppNotifications > 0 ? (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadAppNotifications > 99 ? '99+' : unreadAppNotifications}
                  </span>
                ) : (
                  <Bell className="h-3 w-3 ml-auto text-orange-400" />
                )}
              </NavLink>
            );
          })}

          {/* User Profile */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className={`rounded-xl p-3 mt-4 border shadow-sm ${
              isDark
                ? 'bg-[#221E3D] border-[#2D2B4E]'
                : 'bg-gradient-to-r from-white to-blue-50 border-gray-200/60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`relative p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-[rgba(108,62,244,0.2)]' : 'bg-gradient-to-br from-blue-100 to-blue-200'}`}>
                <User className={`h-4 w-4 ${isDark ? 'text-[#A78BFA]' : 'text-blue-700'}`} />
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 ${isDark ? 'border-[#221E3D]' : 'border-white'}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-[#F1F5F9]' : 'text-gray-900'}`}>
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Utilisateur'}
                </p>
                <p className={`text-xs truncate flex items-center ${isDark ? 'text-[#64748B]' : 'text-gray-500'}`}>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1.5 flex-shrink-0"></span>
                  Plan {{
                    free: 'Free',
                    starter: 'Starter',
                    pro: 'Pro',
                    business: 'Business',
                    enterprise: 'Enterprise',
                  }[profile?.plan_id || ''] ?? (profile?.plan_id ? profile.plan_id : 'Free')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Logout */}
          <motion.button
            onClick={handleLogoutClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl w-full transition-all duration-300 border border-transparent group mt-2 ${
              isDark
                ? 'text-[#94A3B8] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#F87171] hover:border-[rgba(239,68,68,0.25)]'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-600 hover:border-red-200 hover:shadow-lg'
            }`}
          >
            <div className={`p-1.5 rounded-lg shadow-sm group-hover:shadow-md transition-all ${isDark ? 'bg-[#2A2550] group-hover:bg-[rgba(239,68,68,0.15)]' : 'bg-white group-hover:bg-red-50'}`}>
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-medium text-sm">Déconnexion</span>
          </motion.button>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - always visible on lg+ */}
      <div className="hidden lg:flex h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar - drawer with overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={onClose}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 flex"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
}
