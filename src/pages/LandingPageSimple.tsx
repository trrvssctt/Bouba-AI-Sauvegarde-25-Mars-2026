import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Zap, Shield, Check, ArrowRight, 
  MessageCircle, Mail, Calendar, Users, PiggyBank,
  Star, Crown, TrendingUp, Lock, Globe
} from 'lucide-react';

const LandingPageSimple = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Plans HARDCODÉS - pas de fetch API, pas de bug !
  const plans = [
    {
      id: 'free',
      name: 'Bouba Free',
      description: 'Parfait pour découvrir',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      popular: false,
      features: [
        'Chat IA (500 messages/mois)',
        'Accès à Gmail',
        'Support communauté',
        'Mémoire de session'
      ],
      ctaText: 'Commencer gratuitement',
      ctaVariant: 'outline'
    },
    {
      id: 'starter',
      name: 'Bouba Starter',
      description: 'Pour freelances & petites équipes',
      priceMonthly: 9.99,
      priceYearly: 99.99,
      currency: 'EUR',
      popular: true,
      features: [
        'Chat IA (10,000 messages/mois)',
        'Gmail + Contacts + Calendar',
        'Support email 48h',
        'Mémoire 30 jours',
        'Module Finance basique'
      ],
      ctaText: 'Essayer 7 jours gratuit',
      ctaVariant: 'primary'
    },
    {
      id: 'business',
      name: 'Bouba Business',
      description: 'Solution complète entreprise',
      priceMonthly: 29.99,
      priceYearly: 299.99,
      currency: 'EUR',
      popular: false,
      features: [
        'Messages illimités',
        'Toutes les intégrations',
        'Finance avec documents',
        'Base de connaissances',
        'Support dédié SLA 4h',
        'API Access complète'
      ],
      ctaText: 'Contacter les ventes',
      ctaVariant: 'secondary'
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    const price = billingCycle === 'yearly' && plan.priceYearly !== undefined 
      ? plan.priceYearly 
      : plan.priceMonthly;
    
    if (price === 0) return 'Gratuit';
    
    const formattedPrice = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: plan.currency,
      minimumFractionDigits: price % 1 === 0 ? 0 : 2
    }).format(price);
    
    const period = billingCycle === 'yearly' ? '/an' : '/mois';
    return `${formattedPrice}${period}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full text-sm font-semibold text-gray-700 mb-8">
            <Sparkles className="w-4 h-4" />
            L'assistant IA qui booste votre productivité
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Bouba IA : Votre <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">assistant personnel</span> pour tout gérer
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Email, calendrier, contacts, finance, projets... Bouba s'occupe de tout.
            Concentrez-vous sur ce qui compte vraiment.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              Voir les tarifs
            </button>
          </div>
        </div>
      </div>

      {/* Applications */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Tout ce dont vous avez besoin, en un seul endroit
          </h2>
          <p className="text-gray-600">
            Bouba intègre toutes vos applications préférées
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { icon: MessageCircle, name: 'Chat IA', color: 'bg-blue-500', desc: 'Discutez avec notre IA' },
            { icon: Mail, name: 'Email', color: 'bg-red-500', desc: 'Gérez vos emails' },
            { icon: Calendar, name: 'Agenda', color: 'bg-purple-500', desc: 'Votre calendrier' },
            { icon: Users, name: 'Contacts', color: 'bg-green-500', desc: 'Vos contacts' },
            { icon: PiggyBank, name: 'Finance', color: 'bg-amber-500', desc: 'Gestion financière' },
          ].map((app, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <app.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{app.name}</h3>
              <p className="text-sm text-gray-600">{app.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section - SIMPLE et SANS BUG */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Des tarifs simples et transparents
          </h2>
          <p className="text-gray-600">
            Choisissez le plan qui correspond à vos besoins
          </p>
        </div>

        {/* Toggle billing */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-full text-sm font-semibold ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 rounded-full text-sm font-semibold ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600'
              }`}
            >
              Annuel (-20%)
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border-2 p-6 ${
                plan.popular
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  <Star className="w-4 h-4" />
                  Meilleure valeur
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-6">{plan.description}</p>

              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900">
                  {getPrice(plan)}
                </div>
              </div>

              <button
                onClick={() => navigate('/signup')}
                className={`w-full py-3 rounded-lg font-bold mb-6 ${
                  plan.ctaVariant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : plan.ctaVariant === 'secondary'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {plan.ctaText}
              </button>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Final */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Prêt à transformer votre productivité ?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Rejoignez des milliers d'utilisateurs qui ont déjà choisi Bouba.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Commencer gratuitement
          </button>
          <p className="text-gray-500 text-sm mt-8">
            <Shield className="inline w-4 h-4 mr-2" />
            Sécurisé par chiffrement de bout en bout
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPageSimple;