import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Bell, CreditCard, FileText, Users, Settings,
  LogOut, TrendingUp, MessageSquare, Shield, Activity,
  LayoutDashboard, HeadphonesIcon, BarChart2, Menu, X,
} from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import LogoutConfirmModal from '@/src/components/layout/LogoutConfirmModal';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { path: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Utilisateurs', icon: Users },
  { path: '/admin/billing', label: 'Facturation', icon: CreditCard, hasBadge: true },
  { path: '/admin/payments', label: 'Paiements', icon: TrendingUp },
  { path: '/admin/analytics', label: 'Analytiques', icon: BarChart2 },
  { path: '/admin/conversations', label: 'Conversations', icon: MessageSquare },
  { path: '/admin/announcements', label: 'Annonces', icon: Bell },
  { path: '/admin/support', label: 'Support', icon: HeadphonesIcon },
  { path: '/admin/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/admin/settings', label: 'Paramètres', icon: Settings },
];

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, profile } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingUpgradeCount, setPendingUpgradeCount] = useState(0);
  const prevCountRef = useRef<number | null>(null);

  // ── Polling demandes d'upgrade en attente ────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/admin/billing/upgrade-requests', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.data) return;

        const count: number = data.data.filter((r: any) => r.status === 'pending').length;

        // Notifier si de nouvelles demandes arrivent (après le premier poll)
        if (prevCountRef.current !== null && count > prevCountRef.current) {
          const diff = count - prevCountRef.current;
          toast(`🔔 ${diff} nouvelle${diff > 1 ? 's' : ''} demande${diff > 1 ? 's' : ''} d'upgrade en attente !`, {
            description: 'Rendez-vous dans Facturation pour traiter les demandes.',
            duration: 8000,
            action: {
              label: 'Voir',
              onClick: () => navigate('/admin/billing'),
            },
          });
        }

        prevCountRef.current = count;
        setPendingUpgradeCount(count);
      } catch {
        // silently ignore network errors
      }
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
    } finally {
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    }
  };

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
    : (user as any)?.firstName
      ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
      : 'Admin';

  const displayEmail = user?.email ?? 'admin@bouba.ai';
  const initials = displayName.charAt(0).toUpperCase();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentLabel = NAV_ITEMS.find(item =>
    isActive(item.path, item.exact)
  )?.label || 'Administration';

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bouba Admin</h1>
            <p className="text-gray-500 text-xs">Panel d'administration</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            const showBadge = item.hasBadge && pendingUpgradeCount > 0;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 pl-2'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {pendingUpgradeCount > 9 ? '9+' : pendingUpgradeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-bold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Se déconnecter"
            className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sidebar desktop ───────────────────────────────────── */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm flex-col">
        {SidebarContent}
      </div>

      {/* ── Sidebar mobile overlay ────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {SidebarContent}
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="lg:ml-64">

        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{currentLabel}</h2>
                <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Gestion de la plateforme Boubaia</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Bell avec badge dynamique */}
              <button
                onClick={() => navigate('/admin/billing')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={pendingUpgradeCount > 0 ? `${pendingUpgradeCount} demande(s) en attente` : 'Aucune demande en attente'}
              >
                <Bell className={`w-5 h-5 ${pendingUpgradeCount > 0 ? 'text-red-500' : 'text-gray-500'}`} />
                {pendingUpgradeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {pendingUpgradeCount > 9 ? '9+' : pendingUpgradeCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
};

export default AdminLayout;
