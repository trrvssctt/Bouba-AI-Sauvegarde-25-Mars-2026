import { useState } from 'react';
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
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { usePlans } from '@/src/hooks/usePlans';
import { useNotificationStore } from '@/src/stores/notificationStore';
import LogoutConfirmModal from './LogoutConfirmModal';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { signOut, profile } = useAuth();
  const { hasFeatureAccess } = usePlans();
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
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const mainNavItems = [
    {
      to: '/dashboard',
      icon: MessageCircle,
      label: 'Chat',
      available: true
    },
    {
      to: '/dashboard/email',
      icon: Mail,
      label: 'Email',
      available: true
    },
    {
      to: '/dashboard/calendar',
      icon: Calendar,
      label: 'Calendrier',
      available: hasFeatureAccess('calendar')
    },
    {
      to: '/dashboard/contacts',
      icon: Users,
      label: 'Contacts',
      available: hasFeatureAccess('contacts')
    },
    {
      to: '/dashboard/finance',
      icon: PiggyBank,
      label: 'Finance',
      available: hasFeatureAccess('finance')
    },
  ];

  const bottomNavItems = [
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const sidebarContent = (
    <div className="w-64 bg-gradient-to-b from-white to-blue-50/30 border-r border-gray-200/60 flex flex-col shadow-sm backdrop-blur-sm h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/60 flex items-center justify-between">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center space-x-3"
        >
          <div className="relative p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
            <Bot className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">Bouba'ia</h1>
            <p className="text-sm text-gray-500 flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              Assistant IA
            </p>
          </div>
        </motion.div>
        {/* Close button - mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item, index) => {
            const IconComponent = item.icon;

            if (!item.available) {
              return (
                <motion.div
                  key={item.to + '-locked'}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  className="relative"
                >
                  <div className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 cursor-not-allowed opacity-60">
                    <div className="p-1.5 rounded-lg bg-gray-100">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                    <Lock className="w-3 h-3 ml-auto" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-orange-100/30 rounded-xl pointer-events-none" />
                </motion.div>
              );
            }

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
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                    }`
                  }
                >
                  <div className="p-1.5 rounded-lg transition-colors bg-white shadow-sm group-hover:shadow-md">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.label === 'Email' && unreadEmails > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadEmails > 99 ? '99+' : unreadEmails}
                    </span>
                  )}
                  {item.label === 'Chat' && unreadMessages > 0 && (
                    <span className="ml-auto bg-primary text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-blue-50/30">
        <div className="space-y-2">
          {bottomNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200'
                      : 'text-gray-700 hover:bg-white/70 hover:shadow-sm'
                  }`
                }
              >
                <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
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
            className="bg-gradient-to-r from-white to-blue-50 rounded-xl p-3 mt-4 border border-gray-200/60 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="relative p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex-shrink-0">
                <User className="h-4 w-4 text-blue-700" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Utilisateur'}
                </p>
                <p className="text-xs text-gray-500 truncate flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1.5 flex-shrink-0"></span>
                  Plan {profile?.plan_id === 'starter' ? 'Starter' : profile?.plan_id === 'pro' ? 'Pro' : profile?.plan_id === 'enterprise' ? 'Enterprise' : 'Starter'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Logout */}
          <motion.button
            onClick={handleLogoutClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-600 w-full transition-all duration-300 border border-transparent hover:border-red-200 hover:shadow-lg group mt-2"
          >
            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:shadow-md group-hover:bg-red-50 transition-all">
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-medium text-sm">Déconnexion</span>
          </motion.button>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
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
    </>
  );
}
