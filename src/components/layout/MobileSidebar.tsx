import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  MessageCircle,
  Mail,
  Calendar,
  Users,
  PiggyBank,
  CheckSquare,
  Video,
  CreditCard,
  Folder,
  X,
  User,
  Bell,
  LogOut,
  Home,
  Settings,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { usePlans } from '@/src/hooks/usePlans'
import { useActiveApps } from '@/src/hooks/useActiveApps';
import { useNotificationStore } from '@/src/stores/notificationStore';
import LogoutConfirmModal from './LogoutConfirmModal';
import { useState } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { profile, signOut } = useAuth();
  const { hasFeatureAccess } = usePlans();
  const { isNavAvailable } = useActiveApps();
  const { unreadEmails, unreadMessages, unreadAppNotifications } = useNotificationStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      setShowLogoutModal(false);
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleNavClick = () => {
    onClose();
  };

  const navItems = [
    // FREE
    {
      to: '/dashboard',
      icon: MessageCircle,
      label: 'Chat',
      available: true,
      plan: 'free',
      notification: unreadMessages > 0 ? unreadMessages : undefined,
    },
    {
      to: '/dashboard/email',
      icon: Mail,
      label: 'Email',
      available: true,
      plan: 'free',
      notification: unreadEmails > 0 ? unreadEmails : undefined,
    },
    // PRO
    {
      to: '/dashboard/calendar',
      icon: Calendar,
      label: 'Agenda',
      available: hasFeatureAccess('calendar'),
      plan: 'pro',
    },
    {
      to: '/dashboard/contacts',
      icon: Users,
      label: 'Contacts',
      available: hasFeatureAccess('contacts'),
      plan: 'pro',
    },
    {
      to: '/dashboard/trello',
      icon: CheckSquare,
      label: 'Projets',
      available: hasFeatureAccess('calendar'),
      plan: 'pro',
    },
    {
      to: '/dashboard/video',
      icon: Video,
      label: 'Visioconférence',
      available: hasFeatureAccess('calendar'),
      plan: 'pro',
    },
    // PREMIUM
    {
      to: '/dashboard/finance',
      icon: PiggyBank,
      label: 'Finance',
      available: hasFeatureAccess('finance'),
      plan: 'premium',
    },
    {
      to: '/dashboard/payments',
      icon: CreditCard,
      label: 'Paiements',
      available: hasFeatureAccess('finance'),
      plan: 'premium',
    },
    {
      to: '/dashboard/storage',
      icon: Folder,
      label: 'Stockage',
      available: hasFeatureAccess('finance'),
      plan: 'premium',
    },
    // Masquer les apps désactivées par l'admin ET celles hors du plan
  ].filter((item) => item.available !== false && isNavAvailable(item.to));

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        exit={{ x: -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Bouba'IA</h2>
              <p className="text-xs text-gray-500">Assistant IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 touch-target"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAvailable = item.available;
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${!isAvailable ? 'opacity-50 pointer-events-none' : ''}`
                }
              >
                <div className={`p-2 rounded-lg ${
                  item.plan === 'free' ? 'bg-blue-100 text-blue-600' :
                  item.plan === 'pro' ? 'bg-purple-100 text-purple-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    {!isAvailable && (
                      <Lock className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.plan === 'free' ? 'bg-blue-50 text-blue-700' :
                      item.plan === 'pro' ? 'bg-purple-50 text-purple-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {item.plan === 'free' ? 'Gratuit' : item.plan === 'pro' ? 'Pro' : 'Premium'}
                    </span>
                    {item.notification && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {item.notification}
                      </span>
                    )}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <User className="h-5 w-5 text-blue-700" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 truncate">
                {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Utilisateur'}
              </p>
              <p className="text-sm text-gray-500 truncate">
                Plan {{
                  free: 'Free',
                  starter: 'Starter',
                  pro: 'Pro',
                  business: 'Business',
                  enterprise: 'Enterprise',
                }[profile?.plan_id || ''] ?? (profile?.plan_id ? profile.plan_id : 'Free')}
              </p>
            </div>
            {unreadAppNotifications > 0 && (
              <button className="relative p-2">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadAppNotifications}
                </span>
              </button>
            )}
          </div>

          <button
            onClick={handleLogoutClick}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors touch-target"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </motion.div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
}