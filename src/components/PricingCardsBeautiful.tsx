import { Check, Sparkles, Zap, Crown, Star } from 'lucide-react';
import { useState } from 'react';

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // Prix en euros
  priceYearly?: number; // Prix annuel en euros
  currency: string;
  popular: boolean;
  features: PlanFeature[];
  ctaText: string;
  ctaVariant: 'primary' | 'secondary' | 'outline';
  badge?: string;
}

const PricingCardsBeautiful = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Bouba Free',
      description: 'Parfait pour découvrir les capacités de Bouba',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      popular: false,
      features: [
        { text: 'Chat IA intelligent', included: true, highlight: true },
        { text: '500 messages par mois', included: true },
        { text: 'Accès à Gmail', included: true },
        { text: 'Support communauté', included: true },
        { text: 'Mémoire de session', included: true },
        { text: 'Calendrier intégré', included: false },
        { text: 'Gestion des contacts', included: false },
        { text: 'Module Finance', included: false },
        { text: 'Recherche web', included: false },
        { text: 'Base de connaissances', included: false },
      ],
      ctaText: 'Commencer gratuitement',
      ctaVariant: 'outline',
      badge: 'Populaire pour débuter'
    },
    {
      id: 'starter',
      name: 'Bouba Starter',
      description: 'Pour les freelances et petites équipes productives',
      priceMonthly: 9.99,
      priceYearly: 99.99, // ~8.33€/mois
      currency: 'EUR',
      popular: true,
      features: [
        { text: 'Tout dans Free', included: true },
        { text: '10,000 messages par mois', included: true, highlight: true },
        { text: 'Gmail + Contacts', included: true },
        { text: 'Calendrier Google', included: true },
        { text: 'Support email 48h', included: true },
        { text: 'Mémoire 30 jours', included: true },
        { text: 'Module Finance basique', included: true },
        { text: 'Recherche web limitée', included: true },
        { text: 'Base de connaissances', included: false },
        { text: 'API Access', included: false },
      ],
      ctaText: 'Essayer 7 jours gratuit',
      ctaVariant: 'primary',
      badge: 'Meilleure valeur'
    },
    {
      id: 'business',
      name: 'Bouba Business',
      description: 'Solution complète pour les entreprises ambitieuses',
      priceMonthly: 29.99,
      priceYearly: 299.99, // ~25€/mois
      currency: 'EUR',
      popular: false,
      features: [
        { text: 'Tout dans Starter', included: true },
        { text: 'Messages illimités', included: true, highlight: true },
        { text: 'Toutes les intégrations', included: true },
        { text: 'Finance avec documents', included: true },
        { text: 'Base de connaissances avancée', included: true },
        { text: 'Recherche web illimitée', included: true },
        { text: 'Mémoire illimitée', included: true },
        { text: 'Support dédié SLA 4h', included: true },
        { text: 'API Access complète', included: true },
        { text: 'White-label optionnel', included: true },
      ],
      ctaText: 'Contacter les ventes',
      ctaVariant: 'secondary',
      badge: 'Solution entreprise'
    },
  ];

  const getPrice = (plan: PricingPlan) => {
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
    const savings = billingCycle === 'yearly' && plan.priceYearly 
      ? ` (Économisez ${Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)`
      : '';
    
    return `${formattedPrice}${period}${savings}`;
  };

  const getPeriodText = (plan: PricingPlan) => {
    if (plan.priceMonthly === 0) return 'Pour toujours';
    return billingCycle === 'yearly' ? 'Facturation annuelle' : 'Facturation mensuelle';
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      {/* En-tête */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4" />
          Des tarifs transparents, pas de surprises
        </div>
        
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Choisissez votre <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">plan Bouba</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Des fonctionnalités puissantes adaptées à vos besoins. Passez d'un plan à l'autre à tout moment.
        </p>

        {/* Toggle billing */}
        <div className="inline-flex items-center bg-gray-100 rounded-full p-1 mb-12">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Facturation mensuelle
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Facturation annuelle</span>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                -20%
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
              plan.popular
                ? 'border-blue-500 shadow-xl bg-gradient-to-b from-white to-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Badge */}
            {plan.badge && (
              <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold ${
                plan.popular
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-900 text-white'
              }`}>
                {plan.popular && <Star className="inline w-4 h-4 mr-2" />}
                {plan.badge}
              </div>
            )}

            {/* Icône plan */}
            <div className="pt-10 pb-6 px-8 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                plan.id === 'free' ? 'bg-gray-100' :
                plan.id === 'starter' ? 'bg-blue-100' :
                'bg-purple-100'
              }`}>
                {plan.id === 'free' && <Sparkles className="w-8 h-8 text-gray-600" />}
                {plan.id === 'starter' && <Zap className="w-8 h-8 text-blue-600" />}
                {plan.id === 'business' && <Crown className="w-8 h-8 text-purple-600" />}
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-6">{plan.description}</p>

              {/* Prix */}
              <div className="mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {getPrice(plan)}
                </div>
                <div className="text-gray-500 text-sm">
                  {getPeriodText(plan)}
                </div>
              </div>

              {/* Bouton CTA */}
              <button className={`w-full py-4 rounded-xl font-bold text-lg transition-all mb-8 ${
                plan.ctaVariant === 'primary'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  : plan.ctaVariant === 'secondary'
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}>
                {plan.ctaText}
              </button>
            </div>

            {/* Liste des fonctionnalités */}
            <div className="px-8 pb-10">
              <div className="border-t border-gray-200 pt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">
                  Ce qui est inclus :
                </h4>
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                        feature.included
                          ? feature.highlight
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                          : 'bg-gray-100 text-gray-300'
                      }`}>
                        {feature.included ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-xs">×</span>
                        )}
                      </div>
                      <span className={`text-sm ${
                        feature.included
                          ? feature.highlight
                            ? 'text-gray-900 font-semibold'
                            : 'text-gray-700'
                          : 'text-gray-400'
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Note de bas de carte */}
            {plan.id === 'free' && (
              <div className="px-8 pb-6">
                <p className="text-xs text-gray-500 text-center">
                  Aucune carte de crédit requise. Commencez dès maintenant.
                </p>
              </div>
            )}
            
            {plan.id === 'starter' && (
              <div className="px-8 pb-6">
                <p className="text-xs text-gray-500 text-center">
                  Essai gratuit de 7 jours. Annulez à tout moment.
                </p>
              </div>
            )}
            
            {plan.id === 'business' && (
              <div className="px-8 pb-6">
                <p className="text-xs text-gray-500 text-center">
                  Forfait personnalisé disponible pour les grandes équipes.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note générale */}
      <div className="mt-16 text-center">
        <div className="inline-flex flex-col md:flex-row items-center gap-4 bg-gray-50 rounded-2xl px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-semibold text-gray-900">Tous les plans incluent :</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Support technique
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Mises à jour régulières
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Sécurité de niveau bancaire
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Synchronisation en temps réel
            </span>
          </div>
        </div>
        
        <p className="text-gray-500 text-sm mt-8">
          Des questions ? <a href="#" className="text-blue-600 hover:text-blue-800 font-semibold">Contactez notre équipe</a> pour un conseil personnalisé.
        </p>
      </div>
    </div>
  );
};

export default PricingCardsBeautiful;