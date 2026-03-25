import { useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Menu, MessageCircle, Mail, Calendar, Users, PiggyBank, Bot } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ConnectionsProvider } from './hooks/useConnections';
import Sidebar from './components/layout/Sidebar';
import ChatInterface from './components/chat/ChatInterface';
import EmailPage from './pages/EmailPage';
import CalendarPage from './pages/CalendarPage';
import ContactsPage from './pages/ContactsPage';
import FinancePage from './pages/FinancePage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import LegalPage from './pages/LegalPage';
import AboutPage from './pages/AboutPage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import AdminPage from './pages/AdminPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminBillingPage from './pages/admin/AdminBillingPage';
import AdminMonitoringPage from './pages/admin/AdminMonitoringPage';
import AdminSupportPage from './pages/admin/AdminSupportPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminConversationsPage from './pages/admin/AdminConversationsPage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentCancelPage from './pages/payment/PaymentCancelPage';
import PaymentPendingPage from './pages/payment/PaymentPendingPage';
import SettingsLayout from './pages/settings/SettingsLayout';
import ProfilePage from './pages/settings/ProfilePage';
import ConnectionsPage from './pages/settings/ConnectionsPage';
import KnowledgePage from './pages/settings/KnowledgePage';
import PlanPage from './pages/settings/PlanPage';
import NotificationsPage from './pages/settings/NotificationsPage';
import BrandingPage from './pages/settings/BrandingPage';
import SupportPage from './pages/settings/SupportPage';
import CookieBanner from './components/layout/CookieBanner';
import BoubaWidget from './components/BoubaWidget';
import GoogleCallback from './pages/oauth/GoogleCallback';
import { usePlans } from './hooks/usePlans';
import { useNotificationStore } from './stores/notificationStore';
import { useNotificationSetup } from './hooks/useNotificationSetup';

// Spinner de chargement partagé
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Protected Route Component — utilisateurs authentifiés avec onboarding
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const role = profile?.role || (user as any).role;
  const isAdmin = role === 'admin' || role === 'superadmin';
  const onboardingDone =
    isAdmin ||
    profile?.onboarding_complete ||
    (user as any).onboardingComplete;

  if (!onboardingDone) {
    // Abonnement inactif → accès direct à /settings/plan autorisé (paiement à finaliser)
    // Les autres pages protégées redirigent vers /settings/plan au lieu d'onboarding
    if (profile?.subscription_status === 'inactive') {
      if (location.pathname.startsWith('/settings/plan')) return <>{children}</>;
      return <Navigate to="/settings/plan" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Admin Route Component — réservé aux rôles admin / superadmin
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  // Le rôle peut venir du profil ou directement de l'objet user (admin sans ligne profiles)
  const role = profile?.role || (user as any).role;
  if (role !== 'admin' && role !== 'superadmin') {
    // Utilisateur connecté mais sans droits admin → dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Onboarding Route Component
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Mobile Bottom Navigation
function MobileBottomNav() {
  const { hasFeatureAccess } = usePlans();
  const { unreadEmails, unreadMessages } = useNotificationStore();

  const navItems = [
    { to: '/dashboard', icon: MessageCircle, label: 'Chat', end: true },
    { to: '/dashboard/email', icon: Mail, label: 'Email', end: false },
    { to: '/dashboard/calendar', icon: Calendar, label: 'Agenda', end: false, locked: !hasFeatureAccess('calendar') },
    { to: '/dashboard/contacts', icon: Users, label: 'Contacts', end: false, locked: !hasFeatureAccess('contacts') },
    { to: '/dashboard/finance', icon: PiggyBank, label: 'Finance', end: false, locked: !hasFeatureAccess('finance') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.locked) {
            return (
              <div key={item.to} className="flex flex-col items-center py-2 px-3 opacity-40 pointer-events-none">
                <Icon className="h-5 w-5 text-gray-400" />
                <span className="text-[10px] mt-0.5 text-gray-400">{item.label}</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-colors relative ${isActive ? 'bg-blue-100' : ''}`}>
                    <Icon className="h-5 w-5" />
                    {item.label === 'Email' && unreadEmails > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-[14px]">
                        {unreadEmails > 99 ? '99+' : unreadEmails}
                      </span>
                    )}
                    {item.label === 'Chat' && unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-[14px]">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

// Dashboard Layout Component
function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const showWidget = location.pathname !== '/dashboard' && location.pathname !== '/dashboard/';

  // Set up email polling + browser notification permission
  useNotificationSetup();

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 z-10 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-base">Bouba'ia</span>
            </div>
            {/* Spacer to center logo */}
            <div className="w-9" />
          </header>

          {/* Main content - add pb-16 on mobile for bottom nav */}
          <main className="flex-1 relative overflow-hidden pb-0 lg:pb-0">
            <div className="h-full overflow-auto pb-16 lg:pb-0">
              <Routes>
                <Route index element={<ChatInterface />} />
                <Route path="email" element={<EmailPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Bouba AI Widget (hidden on main chat page) */}
      {showWidget && <BoubaWidget />}
    </ProtectedRoute>
  );
}

// Main App Component
function AppContent() {
  return (
    <>
      <Toaster position="top-right" expand={false} richColors />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/oauth/google/callback" element={<GoogleCallback />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        } />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/cancel" element={<PaymentCancelPage />} />
        <Route path="/payment/pending" element={<PaymentPendingPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/dashboard/*" element={<DashboardLayout />} />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="billing" element={<AdminBillingPage />} />
          <Route path="monitoring" element={<AdminMonitoringPage />} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="conversations" element={<AdminConversationsPage />} />
        </Route>
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <CookieBanner />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConnectionsProvider>
        <AppContent />
      </ConnectionsProvider>
    </AuthProvider>
  );
}

export default App;
