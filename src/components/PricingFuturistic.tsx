import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Zap, Crown, Star, Check, Shield, 
  Globe, Lock, Battery, TrendingUp, Rocket,
  MessageCircle, Mail, Calendar, Users, PiggyBank
} from 'lucide-react';
import { usePlansStatic } from '../hooks/usePlansStatic';

const PricingFuturistic = () => {
  const { formatPrice } = usePlansStatic();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  // Plans avec prix FIXES - utilisent formatPrice de usePlansStatic
  const plans = [
    {
      id: 'free',
      name: 'Bouba Free',
      tagline: 'Découvrez la puissance de Bouba',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'EUR',
      popular: false,
      badge: 'Parfait pour débuter',
      icon: Sparkles,
      gradient: 'from-gray-100 to-gray-200',
      features: [
        { text: 'Chat IA intelligent', included: true, highlight: true },
        { text: '500 messages par mois', included: true },
        { text: 'Accès à Gmail', included: true },
        { text: 'Support communauté', included: true },
        { text: 'Mémoire de session', included: true },
        { text: 'Calendrier intégré', included: false },
        { text: 'Gestion des contacts', included: false },
        { text: 'Module Finance', included: false },
      ],
      ctaText: 'Commencer gratuitement',
      ctaVariant: 'outline'
    },
    {
      id: 'starter',
      name: 'Bouba Starter',
      tagline: 'Pour les productifs ambitieux',
      priceMonthly: 9.99,
      priceYearly: 99.99,
      currency: 'EUR',
      popular: true,
      badge: 'Meilleure valeur',
      icon: Zap,
      gradient: 'from-blue-100 to-purple-100',
      features: [
        { text: 'Tout dans Free', included: true },
        { text: '10,000 messages par mois', included: true, highlight: true },
        { text: 'Gmail + Contacts + Calendar', included: true },
        { text: 'Support email 48h', included: true },
        { text: 'Mémoire 30 jours', included: true },
        { text: 'Module Finance basique', included: true },
        { text: 'Recherche web limitée', included: true },
        { text: 'Base de connaissances', included: false },
      ],
      ctaText: 'Essayer 7 jours gratuit',
      ctaVariant: 'primary'
    },
    {
      id: 'business',
      name: 'Bouba Business',
      tagline: 'Solution complète entreprise',
      priceMonthly: 29.99,
      priceYearly: 299.99,
      currency: 'EUR',
      popular: false,
      badge: 'Solution pro',
      icon: Crown,
      gradient: 'from-purple-100 to-pink-100',
      features: [
        { text: 'Tout dans Starter', included: true },
        { text: 'Messages illimités', included: true, highlight: true },
        { text: 'Toutes les intégrations', included: true },
        { text: 'Finance avec documents', included: true },
        { text: 'Base de connaissances avancée', included: true },
        { text: 'Recherche web illimitée', included: true },
        { text: 'Mémoire illimitée', included: true },
        { text: 'Support dédié SLA 4h', included: true },
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
    
    // Utiliser formatPrice de usePlansStatic pour la cohérence
    const formattedPrice = formatPrice(price * 100); // Convertir euros en centimes
    
    const period = billingCycle === 'yearly' ? '/an' : '/mois';
    const savings = billingCycle === 'yearly' && plan.priceYearly 
      ? ` (Économisez ${Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)`
      : '';
    
    return `${formattedPrice}${period}${savings}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      {/* En-tête futuriste */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/50 px-4 py-2 rounded-full text-sm font-semibold text-blue-700 mb-6">
          <Sparkles className="w-4 h-4" />
          Des tarifs transparents, pas de surprises
        </div>
        
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Choisissez votre <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">avenir productif</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Des fonctionnalités puissantes qui évoluent avec vous. 
          Passez d'un plan à l'autre à tout moment, sans engagement.
        </p>

        {/* Toggle billing futuriste */}
        <div className="inline-flex items-center bg-gray-900/5 backdrop-blur-sm rounded-full p-1 mb-12 border border-gray-200/50">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Facturation mensuelle
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Facturation annuelle</span>
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                -20%
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Grille des plans futuristes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isHovered = hoveredPlan === plan.id;
          
          return (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              className={`relative rounded-3xl border-2 transition-all duration-500 ${
                plan.popular
                  ? 'border-blue-500/30 bg-gradient-to-b from-white to-blue-50/30 shadow-2xl'
                  : 'border-gray-200/50 bg-white/80 backdrop-blur-sm'
              } ${isHovered ? 'scale-[1.02] shadow-2xl' : 'shadow-lg'}`}
              style={{
                background: plan.popular 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(219,234,254,0.3) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(249,250,251,0.4) 100%)'
              }}
            >
              {/* Badge flottant */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-gray-900 text-white'
                }`}>
                  {plan.popular && <Star className="inline w-4 h-4 mr-2" />}
                  {plan.badge}
                </div>
              )}

              {/* Contenu de la carte */}
              <div className="pt-12 pb-8 px-8">
                {/* Icône et nom */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${plan.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-gray-800" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-600 text-sm">{plan.tagline}</p>
                  </div>
                </div>

                {/* Prix - TOUJOURS VISIBLE, JAMAIS BUGGÉ */}
                <div className="mb-8">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    {getPrice(plan)}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {plan.priceMonthly === 0 ? 'Pour toujours' : 
                     billingCycle === 'yearly' ? 'Facturation annuelle' : 'Facturation mensuelle'}
                  </div>
                </div>

                {/* Bouton CTA */}
                <button
                  onClick={() => navigate('/signup', { state: { selectedPlan: plan.id } })}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 mb-8 ${
                    plan.ctaVariant === 'primary'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                      : plan.ctaVariant === 'secondary'
                      ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl'
                      : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  } ${isHovered ? 'transform scale-105' : ''}`}
                >
                  {plan.ctaText}
                </button>

                {/* Liste des fonctionnalités */}
                <div className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                        feature.included
                          ? feature.highlight
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                          : 'bg-gray-100 text-gray-300'
                      }`}>
                        {feature.included ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Lock className="w-3 h-3" />
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Effet de bordure animée */}
              {plan.popular && (
                <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 to-purple-500/20 -z-10 animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparaison des fonctionnalités */}
      <div className="mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Comparez les fonctionnalités
          </h2>
          <p className="text-gray-600">
            Tout ce que vous devez savoir pour faire le bon choix
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200/50 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="py-4 px-6 text-left font-semibold text-gray-900">Fonctionnalité</th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-900">Free</th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-900 bg-blue-50/50">Starter</th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-900">Business</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200/50">
                  <td className="py-4 px-6 font-medium text-gray-900">Messages IA/mois</td>
                  <td className="py-4 px-6 text-center">500</td>
                  <td className="py-4 px-6 text-center bg-blue-50/30">10,000</td>
                  <td className="py-4 px-6 text-center font-bold text-purple-600">Illimité</td>
                </tr>
                <tr className="border-t border-gray-200/50">
                  <td className="py-4 px-6 font-medium text-gray-900">Intégrations</td>
                  <td className="py-4 px-6 text-center">Gmail</td>
                  <td className="py-4 px-6 text-center bg-blue-50/30">Gmail + Contacts + Calendar</td>
                  <td className="py-4 px-6 text-center">Toutes</td>
                </tr>
                <tr className="border-t border-gray-200/50">
                  <td className="py-4 px-6 font-medium text-gray-900">Support</td>
                  <td className="py-4 px-6 text-center">Communauté</td>
                  <td className="py-4 px-6 text-center bg-blue-50/30">Email 48h</td>
                  <td className="py-4 px-6 text-center">Dédié SLA 4h</td>
                </tr>
                <tr className="border-t border-gray-200/50">
                  <td className="py-4 px-6 font-medium text-gray-900">Mémoire</td>
                  <td className="py-4 px-6 text-center">Session</td>
                  <td className="py-4 px-6 text-center bg-blue-50/30">30 jours</td>
                  <td className="py-4 px-6 text-center">Illimitée</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Garantie et sécurité */}
      <div className="mt-20 text-center">
        <div className="inline-flex flex-col md:flex-row items-center gap-8 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm rounded-3xl px-8 py-8 border border-gray-200/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Garantie satisfait ou remboursé</div>
              <div className="text-sm text-gray-600">30 jours sans risque</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Disponibilité 99.9%</div>
              <div className="text-sm text-gray-600">Garantie de service</div>
            </div>
          </div>
        </div>
      </div>

      {/* Note de sécurité */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          <Lock className="inline w-4 h-4 mr-2" />
          Tous les paiements sont sécurisés et chiffrés. Aucune information de carte de crédit n'est stockée sur nos serveurs.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          *Les prix sont en euros (EUR). Les taxes applicables seront ajoutées lors du paiement.
        </p>
      </div>
    </div>
  );
};

export default PricingFuturistic;