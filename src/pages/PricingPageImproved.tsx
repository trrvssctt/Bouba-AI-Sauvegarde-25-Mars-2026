import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Check, Shield, Zap, Users, Globe, Lock, 
  Battery, TrendingUp, Rocket, MessageCircle, Mail, Calendar, PiggyBank
} from 'lucide-react';
import PricingFuturistic from '../components/PricingFuturistic';
import { usePlansStatic } from '../hooks/usePlansStatic';

const PricingPageImproved = () => {
  const { formatPrice } = usePlansStatic();
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const faqs = [
    {
      question: "Puis-je changer de plan à tout moment ?",
      answer: "Oui ! Vous pouvez passer à un plan supérieur à tout moment. Le changement est instantané et vous ne paierez que la différence au prorata. Pour passer à un plan inférieur, cela prendra effet à la fin de votre période de facturation en cours."
    },
    {
      question: "Y a-t-il des frais cachés ?",
      answer: "Absolument pas. Nos tarifs sont transparents et incluent toutes les fonctionnalités listées. Les seuls frais supplémentaires seraient si vous dépassez les limites de votre plan, auquel cas nous vous préviendrons bien à l'avance."
    },
    {
      question: "Proposez-vous des remises pour les startups ?",
      answer: "Oui, nous avons un programme spécial pour les startups en phase de croissance. Contactez notre équipe commerciale pour discuter de vos besoins spécifiques et obtenir une offre personnalisée."
    },
    {
      question: "Quels modes de paiement acceptez-vous ?",
      answer: "Nous acceptons toutes les cartes de crédit/débit principales (Visa, Mastercard, American Express), ainsi que les paiements par virement bancaire pour les plans annuels. Les paiements par mobile money sont également disponibles dans certaines régions."
    },
    {
      question: "Puis-je exporter mes données ?",
      answer: "Oui, tous les plans vous permettent d'exporter vos données à tout moment au format CSV ou JSON. Pour les plans Business, nous proposons également des exports automatisés vers vos systèmes existants."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      {/* Hero Section améliorée */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full text-sm font-semibold text-gray-700 mb-8">
            <Shield className="w-4 h-4" />
            Sécurité et confidentialité garanties
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Des tarifs <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">justes</span> pour une productivité <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">maximale</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Bouba s'adapte à vos besoins. Commencez gratuitement, évoluez quand vous le souhaitez.
            Pas de contrat à long terme, pas de surprises.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.scrollTo({ top: document.getElementById('pricing-section')?.offsetTop || 0, behavior: 'smooth' })}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              Voir les tarifs
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques de confiance */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">10K+</div>
            <div className="text-gray-600">Utilisateurs actifs</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">99.9%</div>
            <div className="text-gray-600">Disponibilité</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">4.8/5</div>
            <div className="text-gray-600">Satisfaction clients</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">24/7</div>
            <div className="text-gray-600">Support</div>
          </div>
        </div>
      </div>

      {/* Section Pricing Futuriste */}
      <div id="pricing-section">
        <PricingFuturistic />
      </div>

      {/* Applications disponibles */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Applications incluses selon votre plan
          </h2>
          <p className="text-gray-600">
            Découvrez toutes les fonctionnalités disponibles
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { icon: MessageCircle, name: 'Chat IA', free: true, starter: true, business: true, desc: 'Discutez avec notre IA' },
            { icon: Mail, name: 'Email', free: true, starter: true, business: true, desc: 'Gérez vos emails' },
            { icon: Calendar, name: 'Agenda', free: false, starter: true, business: true, desc: 'Votre calendrier' },
            { icon: Users, name: 'Contacts', free: false, starter: true, business: true, desc: 'Vos contacts' },
            { icon: PiggyBank, name: 'Finance', free: false, starter: true, business: true, desc: 'Gestion financière' },
          ].map((app, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200 text-center hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${
                app.free ? 'bg-blue-500' : 
                app.starter ? 'bg-purple-500' : 
                'bg-gray-500'
              } rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <app.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{app.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{app.desc}</p>
              <div className="flex justify-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${app.free ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  Free
                </span>
                <span className={`text-xs px-2 py-1 rounded ${app.starter ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                  Starter
                </span>
                <span className={`text-xs px-2 py-1 rounded ${app.business ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  Business
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Questions fréquentes</h2>
          <p className="text-gray-600">Trouvez rapidement les réponses à vos questions</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => setFaqOpen(faqOpen === index ? null : index)}
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  faqOpen === index ? 'rotate-90' : ''
                }`} />
              </button>
              
              {faqOpen === index && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Final */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-12 border border-gray-200">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Prêt à transformer votre productivité ?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui ont déjà choisi Bouba pour booster leur efficacité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Zap className="w-5 h-5" />
              Commencer gratuitement
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-10 py-5 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            >
              <Users className="w-5 h-5" />
              Demander une démo
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-8">
            <Lock className="inline w-4 h-4 mr-2" />
            Sécurisé par chiffrement de bout en bout. Vos données sont en sécurité.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPageImproved;