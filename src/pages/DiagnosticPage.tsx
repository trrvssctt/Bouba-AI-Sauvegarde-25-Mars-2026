import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { usePlans } from '@/src/hooks/usePlans';

const DiagnosticPage: React.FC = () => {
  const { user, profile, loading, initialized } = useAuth();
  const { plans, hasFeatureAccess } = usePlans();
  const navigate = useNavigate();
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshAll = () => {
    setRefreshCount(prev => prev + 1);
    window.location.reload();
  };

  const testFeatureAccess = () => {
    console.log('=== TEST FEATURE ACCESS ===');
    console.log('Profile:', profile);
    console.log('Plans:', plans);
    
    const features = ['chat', 'email', 'contacts', 'calendar', 'finance'];
    features.forEach(feature => {
      const hasAccess = hasFeatureAccess(feature);
      console.log(`${feature}: ${hasAccess ? '✅' : '❌'}`);
    });
  };

  useEffect(() => {
    console.log('=== DIAGNOSTIC PAGE MOUNTED ===');
    console.log('Auth State:', { user: !!user, profile: !!profile, loading, initialized });
    console.log('Profile Data:', profile);
    console.log('Plans Count:', plans.length);
    
    testFeatureAccess();
  }, [refreshCount]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🩺 Diagnostic Bouba'IA</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-3">État Auth</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Loading:</span>
                <span className={loading ? 'text-yellow-600' : 'text-green-600'}>
                  {loading ? '⏳ Oui' : '✅ Non'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Initialized:</span>
                <span className={initialized ? 'text-green-600' : 'text-red-600'}>
                  {initialized ? '✅ Oui' : '❌ Non'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>User:</span>
                <span className={user ? 'text-green-600' : 'text-red-600'}>
                  {user ? `✅ ${user.email}` : '❌ Aucun'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Profile:</span>
                <span className={profile ? 'text-green-600' : 'text-red-600'}>
                  {profile ? `✅ ${profile.plan_id}` : '❌ Aucun'}
                </span>
              </div>
              {profile && (
                <>
                  <div className="flex justify-between">
                    <span>Plan ID:</span>
                    <span className="font-bold">{profile.plan_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Messages:</span>
                    <span>{profile.messages_used} / {profile.messages_limit}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-3">Accès Fonctionnalités</h2>
            <div className="space-y-2">
              {['chat', 'email', 'contacts', 'calendar', 'finance'].map(feature => (
                <div key={feature} className="flex justify-between items-center">
                  <span className="capitalize">{feature}:</span>
                  <span className={hasFeatureAccess(feature) ? 'text-green-600' : 'text-red-600'}>
                    {hasFeatureAccess(feature) ? '✅ Accès' : '❌ Bloqué'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-bold mb-3">Plans Disponibles</h2>
          <div className="space-y-3">
            {plans.map(plan => (
              <div key={plan.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <span className="font-bold">{plan.name}</span>
                  <span>{plan.price === 0 ? 'Gratuit' : `${plan.price}€/mois`}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                <div className="mt-2 text-sm">
                  <span className="font-medium">Limites:</span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Messages: {plan.limits.messages === -1 ? 'Illimité' : plan.limits.messages}</li>
                    <li>Contacts: {plan.limits.contacts === 0 ? 'Non' : plan.limits.contacts}</li>
                    <li>Calendrier: {plan.limits.calendar ? 'Oui' : 'Non'}</li>
                    <li>Finance: {plan.limits.finance ? 'Oui' : 'Non'}</li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-3">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={refreshAll}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Tout recharger
            </button>
            
            <button 
              onClick={testFeatureAccess}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              🧪 Tester accès
            </button>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              📊 Retour Dashboard
            </button>
            
            <button 
              onClick={() => navigate('/settings')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              ⚙️ Aller à Settings
            </button>
            
            <button 
              onClick={() => navigate('/debug-auth')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              🔧 Debug Auth
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-bold text-yellow-800">Problèmes courants :</h3>
            <ul className="list-disc pl-5 text-yellow-700 mt-1 space-y-1">
              <li><strong>Profile null</strong> → useAuth ne charge pas correctement</li>
              <li><strong>Plans vide</strong> → API /api/data/plans ne répond pas</li>
              <li><strong>Accès incorrect</strong> → hasFeatureAccess logique buggée</li>
              <li><strong>État perdu</strong> → Re-renders effacent l'état</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;