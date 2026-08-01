import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Mail, Calendar, Users, PiggyBank, 
  Settings, LogOut, Bell, User, Home,
  ChevronRight, Check, Lock, Battery, Zap
} from 'lucide-react';

const DashboardMobileRobust = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('utilisateur@example.com');
  const [userPlan, setUserPlan] = useState('Free');

  // Données SIMPLES et STABLES - pas de fetch API compliqué
  const apps = [
    { id: 'chat', name: 'Chat', icon: MessageCircle, color: 'bg-blue-500', path: '/dashboard/chat', available: true },
    { id: 'email', name: 'Email', icon: Mail, color: 'bg-red-500', path: '/dashboard/email', available: true },
    { id: 'calendar', name: 'Agenda', icon: Calendar, color: 'bg-purple-500', path: '/dashboard/calendar', available: userPlan !== 'Free' },
    { id: 'contacts', name: 'Contacts', icon: Users, color: 'bg-green-500', path: '/dashboard/contacts', available: userPlan !== 'Free' },
    { id: 'finance', name: 'Finance', icon: PiggyBank, color: 'bg-amber-500', path: '/dashboard/finance', available: userPlan === 'Business' },
    { id: 'settings', name: 'Paramètres', icon: Settings, color: 'bg-gray-500', path: '/settings', available: true },
  ];

  const stats = {
    messagesToday: 12,
    emailsUnread: 3,
    storageUsed: '45%',
    planLimit: userPlan === 'Free' ? '500' : userPlan === 'Starter' ? '10,000' : 'Illimité'
  };

  useEffect(() => {
    // Simulation de chargement ultra simple
    const timer = setTimeout(() => {
      setLoading(false);
      // Récupérer l'email depuis localStorage ou session
      const storedEmail = localStorage.getItem('user_email') || 'utilisateur@example.com';
      const storedPlan = localStorage.getItem('user_plan') || 'Free';
      setUserEmail(storedEmail);
      setUserPlan(storedPlan);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_plan');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-pb">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-600">{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full bg-gray-100"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Plan Status */}
      <div className="px-4 py-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 text-white">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm opacity-90">Votre plan</p>
              <h3 className="text-xl font-bold">{userPlan}</h3>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              {userPlan === 'Business' ? <Zap className="w-6 h-6" /> :
               userPlan === 'Starter' ? <Battery className="w-6 h-6" /> :
               <Check className="w-6 h-6" />}
            </div>
          </div>
          <p className="text-sm opacity-90 mb-3">
            {userPlan === 'Free' ? '500 messages/mois' :
             userPlan === 'Starter' ? '10,000 messages/mois' :
             'Messages illimités'}
          </p>
          <button 
            onClick={() => navigate('/pricing')}
            className="w-full bg-white text-blue-600 py-2 rounded-lg font-semibold text-sm"
          >
            {userPlan === 'Free' ? 'Passer à Starter' :
             userPlan === 'Starter' ? 'Passer à Business' :
             'Plan maximal'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Aujourd'hui</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.messagesToday}</div>
            <div className="text-sm text-gray-600">Messages</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.emailsUnread}</div>
            <div className="text-sm text-gray-600">Emails</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.storageUsed}</div>
            <div className="text-sm text-gray-600">Stockage</div>
          </div>
        </div>
      </div>

      {/* Applications Grid */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Vos applications</h2>
        <div className="grid grid-cols-3 gap-3">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => app.available && navigate(app.path)}
              disabled={!app.available}
              className={`flex flex-col items-center justify-center p-4 rounded-xl ${
                app.available 
                  ? 'bg-white hover:bg-gray-50 active:bg-gray-100' 
                  : 'bg-gray-100 opacity-60'
              }`}
            >
              <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center mb-2`}>
                <app.icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-gray-900 text-sm">{app.name}</span>
              {!app.available && (
                <Lock className="w-4 h-4 text-gray-400 mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Actions rapides</h2>
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/dashboard/chat')}
            className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Nouvelle conversation</div>
                <div className="text-sm text-gray-600">Discutez avec Bouba</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => navigate('/dashboard/email')}
            className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Vérifier emails</div>
                <div className="text-sm text-gray-600">{stats.emailsUnread} non lus</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 mb-20">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Activité récente</h2>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Connexion réussie</div>
                <div className="text-sm text-gray-600">Il y a 2 minutes</div>
              </div>
            </div>
          </div>
          <div className="text-center text-gray-500 text-sm">
            Bienvenue sur Bouba ! Explorez vos applications.
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-b flex justify-around">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center p-2 text-blue-600"
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">Accueil</span>
        </button>
        <button 
          onClick={() => navigate('/dashboard/chat')}
          className="flex flex-col items-center p-2 text-gray-600"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs mt-1">Chat</span>
        </button>
        <button 
          onClick={() => navigate('/dashboard/email')}
          className="flex flex-col items-center p-2 text-gray-600"
        >
          <Mail className="w-6 h-6" />
          <span className="text-xs mt-1">Email</span>
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center p-2 text-gray-600"
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs mt-1">Paramètres</span>
        </button>
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardMobileRobust;