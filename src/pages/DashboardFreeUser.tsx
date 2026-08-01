import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Mail, Calendar, Users, PiggyBank, 
  Lock, Zap, Sparkles, Battery, Check, X,
  ArrowRight, Bell, Settings, User, Home,
  BarChart3, TrendingUp, Clock, Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';

const DashboardFreeUser = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { plans, formatPrice, getUsageStatus, hasFeatureAccess } = usePlans();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState({
    messagesToday: 0,
    emailsUnread: 0,
    upcomingEvents: 0,
    contactsCount: 0
  });

  const currentPlan = plans.find(p => p.id === profile?.plan_id) || plans[0];
  const usage = getUsageStatus();
  const isFreePlan = currentPlan?.id === 'free';

  // Applications disponibles pour Free
  const freeApps = [
    { 
      id: 'chat', 
      name: 'Chat IA', 
      icon: MessageCircle, 
      color: 'bg-blue-500',
      description: 'Discutez avec Bouba',
      path: '/dashboard/chat',
      available: true,
      limit: '500 messages/mois'
    },
    { 
      id: 'email', 
      name: 'Email', 
      icon: Mail, 
      color: 'bg-red-500',
      description: 'Gérez vos emails',
      path: '/dashboard/email',
      available: true,
      limit: 'Gmail uniquement'
    },
    { 
      id: 'contacts', 
      name: 'Contacts', 
      icon: Users, 
      color: 'bg-green-500',
      description: 'Vos contacts',
      path: '/dashboard/contacts',
      available: false,
      limit: 'Non disponible'
    },
    { 
      id: 'calendar', 
      name: 'Agenda', 
      icon: Calendar, 
      color: 'bg-purple-500',
      description: 'Votre calendrier',
      path: '/dashboard/calendar',
      available: false,
      limit: 'Non disponible'
    },
    { 
      id: 'finance', 
      name: 'Finance', 
      icon: PiggyBank, 
      color: 'bg-amber-500',
      description: 'Gestion financière',
      path: '/dashboard/finance',
      available: false,
      limit: 'Non disponible'
    },
  ];

  // Applications verrouillées (nécessitent upgrade)
  const lockedApps = freeApps.filter(app => !app.available);

  useEffect(() => {
    // Simuler chargement
    setTimeout(() => {
      setQuickStats({
        messagesToday: 0, // Nouveau compte = 0 messages
        emailsUnread: 0,
        upcomingEvents: 0,
        contactsCount: 0
      });
      setLoading(false);
    }, 800);
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      {/* En-tête avec plan Free clairement indiqué */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bonjour, <span className="text-blue-600">{user?.name || 'Utilisateur'}</span> 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Bienvenue sur votre compte <span className="font-semibold text-gray-900">Bouba Free</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
              Plan : <span className="font-bold">Free</span>
            </div>
            <button 
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Bannière d'upgrade pour Free users */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Découvrez Bouba Starter 🚀
              </h3>
              <p className="text-gray-700 mb-3">
                Avec le plan Starter, accédez à <span className="font-semibold">10,000 messages/mois</span>, 
                la gestion des <span className="font-semibold">contacts</span> et de l'<span className="font-semibold">agenda</span>, 
                et bien plus encore !
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium"
                >
                  Voir les plans
                </button>
                <button 
                  onClick={() => navigate('/dashboard/chat')}
                  className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  Essayer le chat gratuit
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{formatPrice(990)}</div>
            <div className="text-gray-600 text-sm">/mois pour Starter</div>
          </div>
        </div>
      </div>

      {/* Usage des messages - ZÉRO pour nouveau compte */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Votre utilisation</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Messages utilisés</span>
              <span>{profile?.messages_used || 0} / {usage.limit === -1 ? '∞' : usage.limit}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {usage.remaining === -1 ? (
              <span className="text-green-600">Messages illimités 🎉</span>
            ) : usage.remaining > 0 ? (
              <span>{usage.remaining} messages restants ce mois</span>
            ) : (
              <span className="text-red-600">Limite atteinte</span>
            )}
          </div>
        </div>

        {/* Applications disponibles */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications disponibles</h3>
          <div className="space-y-4">
            {freeApps.filter(app => app.available).map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(app.path)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${app.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{app.name}</div>
                      <div className="text-xs text-gray-600">{app.limit}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Applications verrouillées */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Débloquez avec un upgrade</h3>
          <div className="space-y-4">
            {lockedApps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{app.name}</div>
                      <div className="text-xs text-gray-600">{app.limit}</div>
                    </div>
                  </div>
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions rapides pour Free users */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Commencez avec Bouba</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => navigate('/dashboard/chat')}
            className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Discutez avec Bouba</h3>
                <p className="text-sm text-gray-600">Testez notre IA gratuitement</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Posez vos premières questions à notre assistant IA. 
              Découvrez comment Bouba peut vous aider au quotidien.
            </p>
            <div className="text-blue-600 text-sm font-medium flex items-center gap-2">
              Commencer une conversation
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/email')}
            className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-red-300 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Connectez Gmail</h3>
                <p className="text-sm text-gray-600">Gérez vos emails</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Connectez votre compte Gmail pour que Bouba puisse 
              vous aider à trier, répondre et organiser vos emails.
            </p>
            <div className="text-blue-600 text-sm font-medium flex items-center gap-2">
              Configurer Gmail
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/pricing')}
            className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Upgrade vers Starter</h3>
                <p className="text-sm text-gray-600">Plus de fonctionnalités</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Passez au plan Starter pour débloquer les contacts, 
              l'agenda, et 20x plus de messages par mois.
            </p>
            <div className="text-blue-600 text-sm font-medium flex items-center gap-2">
              Voir les tarifs
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Statistiques réelles (zéro pour nouveau compte) */}
      <div className="bg-gray-50 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Votre activité</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{quickStats.messagesToday}</div>
            <div className="text-gray-600">Messages aujourd'hui</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{quickStats.emailsUnread}</div>
            <div className="text-gray-600">Emails non lus</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{quickStats.upcomingEvents}</div>
            <div className="text-gray-600">Événements à venir</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{quickStats.contactsCount}</div>
            <div className="text-gray-600">Contacts</div>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-6 text-center">
          Connectez vos services pour voir vos statistiques réelles
        </p>
      </div>

      {/* Note de bienvenue */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bienvenue sur Bouba ! 🎉</h3>
            <p className="text-gray-700 mb-4">
              Vous venez de créer votre compte Free. Explorez le chat IA et connectez votre Gmail 
              pour commencer. N'hésitez pas à passer au plan Starter quand vous serez prêt à 
              débloquer toutes les fonctionnalités de Bouba.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/dashboard/chat')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Tester le chat
              </button>
              <button 
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
              >
                Voir les plans
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFreeUser;