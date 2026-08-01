import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Mail, Users, Calendar, PiggyBank,
  Lock, Check, X, Sparkles, Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';

const DashboardFreeUserUltraClear = () => {
  const { user, profile } = useAuth();
  const { plans, formatPrice } = usePlans();
  const navigate = useNavigate();

  const currentPlan = plans.find(p => p.id === profile?.plan_id);
  
  // Plans disponibles
  const freePlan = plans.find(p => p.id === 'free');
  const starterPlan = plans.find(p => p.id === 'starter');
  const businessPlan = plans.find(p => p.id === 'business');

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* En-tête ULTRA CLAIR */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          👋 Bonjour {user?.name || 'Utilisateur'} !
        </h1>
        <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl text-lg font-bold mt-4">
          VOTRE PLAN : <span className="text-yellow-300">BOUBA FREE</span>
        </div>
        <p className="text-gray-600 mt-4 text-xl">
          Prix : <span className="font-bold text-green-600">GRATUIT</span> • Messages : 500/mois
        </p>
      </div>

      {/* Comparaison des plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Plan Free (ACTUEL) */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-6 transform scale-105 shadow-lg">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold">
              VOTRE PLAN ACTUEL
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {freePlan?.name || 'Bouba Free'}
          </h3>
          <div className="text-4xl font-bold text-gray-900 text-center mb-4">
            {formatPrice(freePlan?.price || 0)}
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Chat IA (500 messages/mois)</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Accès à Gmail</span>
            </div>
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-gray-500">Gestion des contacts</span>
            </div>
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-gray-500">Agenda intégré</span>
            </div>
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-gray-500">Module Finance</span>
            </div>
          </div>
        </div>

        {/* Plan Starter */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-full text-sm font-bold">
              RECOMMANDÉ
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {starterPlan?.name || 'Bouba Starter'}
          </h3>
          <div className="text-4xl font-bold text-gray-900 text-center mb-4">
            {formatPrice(starterPlan?.price || 990)}
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Chat IA (10,000 messages/mois)</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Gmail + Contacts + Agenda</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Module Finance basique</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Support email 48h</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-bold"
          >
            <Zap className="inline w-5 h-5 mr-2" />
            Upgrade vers Starter
          </button>
        </div>

        {/* Plan Business */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {businessPlan?.name || 'Bouba Business'}
          </h3>
          <div className="text-4xl font-bold text-gray-900 text-center mb-4">
            {formatPrice(businessPlan?.price || 2999)}
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Messages illimités</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Toutes les intégrations</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Finance avec documents</span>
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">Support dédié 4h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Applications disponibles */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Vos applications disponibles avec le plan Free
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chat IA */}
          <div 
            onClick={() => navigate('/dashboard/chat')}
            className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Chat IA</h3>
                <p className="text-gray-600">Discutez avec Bouba</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Posez vos questions à notre assistant IA. Testez gratuitement avec 500 messages par mois.
            </p>
            <div className="text-blue-600 font-medium flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Disponible avec votre plan Free
            </div>
          </div>

          {/* Email */}
          <div 
            onClick={() => navigate('/dashboard/email')}
            className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Email</h3>
                <p className="text-gray-600">Gérez vos emails Gmail</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Connectez votre Gmail pour lire, envoyer et organiser vos emails directement depuis Bouba.
            </p>
            <div className="text-blue-600 font-medium flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Disponible avec votre plan Free
            </div>
          </div>
        </div>
      </div>

      {/* Applications verrouillées */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-300 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Applications verrouillées - Upgrade requis
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Contacts */}
          <div className="bg-white border border-gray-300 rounded-2xl p-6 opacity-70">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Contacts</h3>
                <p className="text-gray-600">Gestion des contacts</p>
              </div>
              <Lock className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              Disponible avec les plans Starter et Business
            </p>
          </div>

          {/* Calendar */}
          <div className="bg-white border border-gray-300 rounded-2xl p-6 opacity-70">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Agenda</h3>
                <p className="text-gray-600">Calendrier intégré</p>
              </div>
              <Lock className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              Disponible avec les plans Starter et Business
            </p>
          </div>

          {/* Finance */}
          <div className="bg-white border border-gray-300 rounded-2xl p-6 opacity-70">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-2xl flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Finance</h3>
                <p className="text-gray-600">Gestion financière</p>
              </div>
              <Lock className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              Disponible avec le plan Business
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFreeUserUltraClear;