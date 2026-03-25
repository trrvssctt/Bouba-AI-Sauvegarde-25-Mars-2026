import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  Headphones,
  Settings,
  BarChart3,
  ChevronLeft,
  Shield,
  MessageSquare,
  LogOut,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'
import BoubaWidget from '@/src/components/BoubaWidget'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/admin/billing', label: 'Facturation', icon: CreditCard, end: false },
  { to: '/admin/monitoring', label: 'Monitoring IA', icon: Activity, end: false },
  { to: '/admin/support', label: 'Support', icon: Headphones, end: false },
  { to: '/admin/conversations', label: 'Conversations', icon: MessageSquare, end: false },
  { to: '/admin/settings', label: 'Configuration', icon: Settings, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: false },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="w-60 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-secondary text-sm leading-none">BOUBA Admin</p>
              <p className="text-[10px] text-muted uppercase tracking-widest mt-0.5">Backoffice</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:text-secondary hover:bg-background'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-0.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-secondary transition-colors w-full rounded-xl hover:bg-background"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Retour au dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-xs text-danger hover:text-danger transition-colors w-full rounded-xl hover:bg-danger/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Bouba widget — contexte admin pour les tâches de backoffice */}
      <BoubaWidget source="admin" />
    </div>
  )
}
