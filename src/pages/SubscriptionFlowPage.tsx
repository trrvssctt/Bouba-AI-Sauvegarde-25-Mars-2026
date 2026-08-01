import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Users, Building, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '@/src/lib/api';

const SubscriptionFlowPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<'plan' | 'signup' | 'payment' | 'pending'>('plan');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const plans = [
    {
      id: 'free',
      name: 'Bouba Free',
      price: 0,
      currency: 'XOF',
      icon: Zap,
      features: ['500 messages/mois', 'Email', 'Support basique'],
      description: 'Parfait pour découvrir'
    },
    {
      id: 'starter',
      name: 'Bouba Starter',
      price: 6500,
      currency: 'XOF',
      icon: Users,
      features: ['10,000 messages/mois', 'Email + Contacts', 'Support prioritaire'],
      description: 'Pour freelances'
    },
    {
      id: 'business',
      name: 'Bouba Business',
      price: 19900,
      currency: 'XOF',
      icon: Building,
      features: ['Messages illimités', 'Toutes les apps', 'Support 24/7', 'Documents officiels'],
      description: 'Solution entreprise'
    }
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    toast.success(`Plan ${planId === 'free' ? 'Free' : planId === 'starter' ? 'Starter' : 'Business'} sélectionné`);
    setStep('signup');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      const subscriptionStatus = selectedPlan === 'free' ? 'active' : 'pending';
      const response = await apiCall('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          plan_id: selectedPlan || 'free',
          subscription_status: subscriptionStatus,
        }),
      });

      if (!response.success) {
        toast.error((response as any).error || 'Erreur lors de la création du compte');
        return;
      }

      if (selectedPlan === 'free') {
        toast.success('Compte créé ! Vérifiez votre email pour activer votre compte.');
        navigate('/login?message=verify_email');
      } else {
        toast.success('Compte créé ! Procédez au paiement pour activer votre abonnement.');
        setStep('payment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    toast.info('Paiement enregistré. Attente validation admin sous 24h.');
    navigate('/payment/pending');
  };

  // Render functions
  const renderPlanSelection = () => (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Choisissez votre plan Bouba
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div key={plan.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="text-3xl font-bold text-gray-900">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString()} ${plan.currency}`}
                  </div>
                  {plan.price > 0 && <p className="text-gray-500 text-sm">/mois</p>}
                </div>
                
                <ul className="space-y-2 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full py-3 rounded-lg font-semibold ${
                    plan.id === 'free' 
                      ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Choisir ce plan
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSignupForm = () => (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Créer votre compte</h2>
          <p className="text-gray-600 mb-8">
            Plan: <span className="font-semibold text-blue-600">
              {selectedPlan === 'free' ? 'Bouba Free' : 
               selectedPlan === 'starter' ? 'Bouba Starter' : 
               'Bouba Business'}
            </span>
          </p>
          
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Votre prénom"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Votre nom"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="vous@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 mt-6 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>
          
          <button
            onClick={() => setStep('plan')}
            className="mt-6 text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Retour au choix du plan
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentPage = () => (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Paiement Wave</h2>
          <p className="text-gray-600 mb-8">
            Scannez le QR code avec l'application Wave pour payer{' '}
            <span className="font-bold">
              {selectedPlan === 'starter' ? '6,500 XOF' : '19,900 XOF'}
            </span>
          </p>
          
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center mb-8">
            <div className="w-48 h-48 bg-white border-4 border-gray-800 flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="text-3xl mb-2">📱</div>
                <div className="text-sm text-gray-600">QR Code Wave</div>
              </div>
            </div>
            
            <p className="text-gray-600 text-center text-sm">
              <strong>Instructions :</strong><br />
              1. Ouvrez Wave<br />
              2. Cliquez sur "Payer"<br />
              3. Scannez le QR code<br />
              4. Confirmez
            </p>
          </div>
          
          <button
            onClick={handlePaymentComplete}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
          >
            J'ai effectué le paiement
          </button>
          
          <button
            onClick={() => setStep('signup')}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Retour
          </button>
        </div>
      </div>
    </div>
  );

  const renderPendingPage = () => (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Paiement enregistré !
          </h1>
          
          <p className="text-gray-600 mb-6">
            Votre paiement est en attente de validation par notre équipe administrative.
            Vous recevrez un email de confirmation sous 24h.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <span className="text-yellow-800 font-semibold">⏳ Statut : En attente</span>
            </div>
          </div>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );

  switch (step) {
    case 'plan':
      return renderPlanSelection();
    case 'signup':
      return renderSignupForm();
    case 'payment':
      return renderPaymentPage();
    case 'pending':
      return renderPendingPage();
    default:
      return renderPlanSelection();
  }
};

export default SubscriptionFlowPage;