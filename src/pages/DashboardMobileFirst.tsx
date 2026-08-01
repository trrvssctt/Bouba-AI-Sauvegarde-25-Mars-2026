import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Mail, Users, Calendar, PiggyBank,
  Zap, Bell, Settings, User, Sparkles, Lock,
  ChevronRight, BarChart, CreditCard, HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';

const DashboardMobileFirst = () => {
  const { user, profile } = useAuth();
  const { plans, formatPrice } = usePlans();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('apps');
  const [notifications, setNotifications] = useState(3);
  
  const currentPlan = plans.find(p => p.id === profile?.plan_id);
  const isFree = currentPlan?.id === 'free';
  const isStarter = currentPlan?.id === 'starter';
  const isBusiness = currentPlan?.id === 'business';

  // Applications selon le plan
  const availableApps = [
    { 
      id: 'chat', 
      name: 'Chat IA', 
      icon: MessageCircle, 
      color: 'from-blue-500 to-cyan-500',
      description: 'Discutez avec Bouba',
      path: '/dashboard/chat',
      available: true
    },
    { 
      id: 'email', 
      name: 'Email', 
      icon: Mail, 
      color: 'from-red-500 to-orange-500',
      description: 'Gérez vos emails',
      path: '/dashboard/email',
      available: true
    },
    { 
      id: 'contacts', 
      name: 'Contacts', 
      icon: Users, 
      color: 'from-green-500 to-emerald-500',
      description: 'Vos contacts',
      path: '/dashboard/contacts',
      available: isStarter || isBusiness
    },
    { 
      id: 'calendar', 
      name: 'Agenda', 
      icon: Calendar, 
      color: 'from-purple-500 to-pink-500',
      description: 'Calendrier intégré',
      path: '/dashboard/calendar',
      available: isStarter || isBusiness
    },
    { 
      id: 'finance', 
      name: 'Finance', 
      icon: PiggyBank, 
      color: 'from-yellow-500 to-amber-500',
      description: 'Gestion financière',
      path: '/dashboard/finance',
      available: isBusiness
    },
  ];

  // Quick stats
  const quickStats = [
    { label: 'Messages', value: '12', unit: 'aujourd\'hui', icon: MessageCircle, color: 'text-blue-500' },
    { label: 'Emails', value: '3', unit: 'non lus', icon: Mail, color: 'text-red-500' },
    { label: 'Stockage', value: '45', unit: '% utilisé', icon: BarChart, color: 'text-green-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      {/* Header mobile */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs text-gray-500">Bienvenue, {user?.name?.split(' ')[0] || 'Utilisateur'} 👋</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/dashboard/notifications')}
              className="relative p-2"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/dashboard/settings')}
              className="p-2"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Plan actuel */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-gray-600">Votre plan</div>
              <div className="text-xl font-bold text-gray-900">
                {currentPlan?.name || 'Bouba Free'}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isFree ? 'bg-blue-100 text-blue-700' :
              isStarter ? 'bg-green-100 text-green-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {isFree ? 'Gratuit' : isStarter ? 'Pro' : 'Premium'}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(currentPlan?.price || 0)}
              </div>
              <div className="text-sm text-gray-600">/mois</div>
            </div>
            
            {isFree && (
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Upgrade
              </button>
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span>{currentPlan?.messages_limit === -1 ? 'Messages illimités' : `${currentPlan?.messages_limit || 500} messages/mois`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Aujourd'hui</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickStats.map((stat, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
              <div className="text-xs text-gray-500">{stat.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-4">
          {[
            { id: 'apps', label: 'Applications', icon: Sparkles },
            { id: 'stats', label: 'Statistiques', icon: BarChart },
            { id: 'account', label: 'Compte', icon: User }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg flex flex-col items-center gap-1 ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu selon l'onglet */}
      <div className="px-4 py-3">
        {activeTab === 'apps' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Vos applications</h2>
            <div className="space-y-3">
              {availableApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => app.available ? navigate(app.path) : null}
                  className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
                    app.available 
                      ? 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer' 
                      : 'border-gray-100 opacity-60'
                  }`}
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${app.color} rounded-xl flex items-center justify-center`}>
                    <app.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{app.name}</h3>
                      {!app.available && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{app.description}</p>
                  </div>
                  
                  <div className="flex items-center">
                    {app.available ? (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/pricing');
                        }}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Statistiques</h2>
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-3">Utilisation ce mois</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">Messages IA</span>
                      <span className="font-medium">12 / {currentPlan?.messages_limit || 500}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, (12 / (currentPlan?.messages_limit || 500)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">Stockage</span>
                      <span className="font-medium">45%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                        style={{ width: '45%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Votre compte</h2>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{user?.name || 'Utilisateur'}</h3>
                    <p className="text-sm text-gray-600">{user?.email || 'Non défini'}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate('/dashboard/settings/profile')}
                    className="w-full py-3 border border-gray-200 rounded-lg text-left px-4 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-gray-900">Profil</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button 
                    onClick={() => navigate('/dashboard/settings/plan')}
                    className="w-full py-3 border border-gray-200 rounded-lg text-left px-4 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-gray-900">Abonnement</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button 
                    onClick={() => navigate('/dashboard/settings/billing')}
                    className="w-full py-3 border border-gray-200 rounded-lg text-left px-4 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-gray-900">Facturation</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {[
            { id: 'home', label: 'Accueil', icon: Sparkles, path: '/dashboard' },
            { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/dashboard/chat' },
            { id: 'email', label: 'Email', icon: Mail, path: '/dashboard/email' },
            { id: 'more', label: 'Plus', icon: Settings, path: '/dashboard/settings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 py-2"
            >
              <div className={`p-2 rounded-lg ${
                window.location.pathname === item.path 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600'
              }`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardMobileFirst;