import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';

const DebugAuthPage: React.FC = () => {
  const { user, profile, loading, initialized, signOut } = useAuth();
  const navigate = useNavigate();
  const [apiData, setApiData] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    // Récupérer les données du localStorage
    const token = localStorage.getItem('bouba_auth_token');
    const userData = localStorage.getItem('bouba_user_data');
    
    setLocalStorageData({
      token,
      userData: userData ? JSON.parse(userData) : null
    });

    // Tester l'API /api/auth/me
    fetch('http://144.91.96.142:3001/api/auth/me')
      .then(res => res.json())
      .then(data => setApiData(data))
      .catch(err => console.error('API error:', err));
  }, []);

  const forceRedirectToDashboard = () => {
    // Forcer la redirection vers le dashboard
    localStorage.setItem('bouba_force_redirect', 'true');
    navigate('/dashboard', { replace: true });
  };

  const fixOnboarding = () => {
    // Forcer onboarding_complete à true
    const userData = localStorage.getItem('bouba_user_data');
    if (userData) {
      const parsed = JSON.parse(userData);
      parsed.onboardingComplete = true;
      if (parsed.profile) {
        parsed.profile.onboarding_complete = true;
      }
      localStorage.setItem('bouba_user_data', JSON.stringify(parsed));
      toast.success('Onboarding forcé à true');
      window.location.reload();
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('bouba_auth_token');
    localStorage.removeItem('bouba_user_data');
    signOut();
    toast.success('Authentification nettoyée');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔧 Débogage Authentification Bouba'IA</h1>
        
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h2 className="font-bold text-yellow-800 mb-2">Instructions :</h2>
          <p className="text-yellow-700">
            1. Teste la connexion normale d'abord<br/>
            2. Si ça ne fonctionne pas, utilise les boutons ci-dessous<br/>
            3. Regarde les données ci-dessous pour diagnostiquer
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-3">État Auth Hook</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-80">
              {JSON.stringify({
                loading,
                initialized,
                hasUser: !!user,
                hasProfile: !!profile,
                user: user ? {
                  id: user.id,
                  email: user.email,
                  role: (user as any).role,
                  onboardingComplete: (user as any).onboardingComplete,
                  planId: (user as any).planId
                } : null,
                profile: profile ? {
                  id: profile.id,
                  role: profile.role,
                  onboarding_complete: profile.onboarding_complete,
                  subscription_status: profile.subscription_status
                } : null
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-3">LocalStorage</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-80">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-bold mb-3">API Response (/api/auth/me)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-80">
            {JSON.stringify(apiData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-3">Actions de Correction</h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={forceRedirectToDashboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🚀 Forcer redirection Dashboard
              </button>
              
              <button 
                onClick={fixOnboarding}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ✅ Forcer onboarding_complete = true
              </button>
              
              <button 
                onClick={clearAuth}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                🗑️ Nettoyer authentification
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                🔄 Recharger la page
              </button>
              
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                🔙 Retour à Login
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">Problèmes courants :</h3>
              <ul className="list-disc pl-5 text-blue-700 space-y-1">
                <li><strong>profile est null</strong> → useAuth ne construit pas correctement le profil</li>
                <li><strong>onboarding_complete est false/undefined</strong> → Données API incomplètes</li>
                <li><strong>Pas de redirection</strong> → useEffect dans LoginPage ne se déclenche pas</li>
                <li><strong>Session perdue au rechargement</strong> → localStorage non configuré</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugAuthPage;