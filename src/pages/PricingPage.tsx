import { useState } from 'react';
import { ArrowRight, Check, Shield, Zap, Users, Globe, Lock } from 'lucide-react';
import PricingCardsBeautiful from '../components/PricingCardsBeautiful';

const PricingPage = () => {
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full text-sm font-semibold text-gray-700 mb-8">
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
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 hover:bg-gray-50 transition-all">
              Voir la démo
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

      {/* Composant Pricing Beautiful */}
      <PricingCardsBeautiful />

      {/* Comparaison des plans */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Comparaison détaillée des fonctionnalités</h2>
          <p className="text-gray-600">Tout ce que vous devez savoir pour faire le bon choix</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl overflow-hidden border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-4 px-6 text-left font-semibold text-gray-900">Fonctionnalité</th>
                <th className="py-4 px-6 text-center font-semibold text-gray-900">Free</th>
                <th className="py-4 px-6 text-center font-semibold text-gray-900 bg-blue-50">Starter</th>
                <th className="py-4 px-6 text-center font-semibold text-gray-900">Business</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="py-4 px-6 font-medium text-gray-900">Messages IA/mois</td>
                <td className="py-4 px-6 text-center">500</td>
                <td className="py-4 px-6 text-center bg-blue-50">10,000</td>
                <td className="py-4 px-6 text-center">Illimité</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-4 px-6 font-medium text-gray-900">Intégrations</td>
                <td className="py-4 px-6 text-center">Gmail</td>
                <td className="py-4 px-6 text-center bg-blue-50">Gmail + Contacts + Calendar</td>
                <td className="py-4 px-6 text-center">Toutes</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-4 px-6 font-medium text-gray-900">Support</td>
                <td className="py-4 px-6 text-center">Communauté</td>
                <td className="py-4 px-6 text-center bg-blue-50">Email 48h</td>
                <td className="py-4 px-6 text-center">Dédié SLA 4h</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-4 px-6 font-medium text-gray-900">Mémoire</td>
                <td className="py-4 px-6 text-center">Session</td>
                <td className="py-4 px-6 text-center bg-blue-50">30 jours</td>
                <td className="py-4 px-6 text-center">Illimitée</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-4 px-6 font-medium text-gray-900">API Access</td>
                <td className="py-4 px-6 text-center">-</td>
                <td className="py-4 px-6 text-center bg-blue-50">-</td>
                <td className="py-4 px-6 text-center">✓</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-4 px-6 font-medium text-gray-900">White-label</td>
                <td className="py-4 px-6 text-center">-</td>
                <td className="py-4 px-6 text-center bg-blue-50">-</td>
                <td className="py-4 px-6 text-center">Optionnel</td>
              </tr>
            </tbody>
          </table>
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
            <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden">
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
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Prêt à transformer votre productivité ?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui ont déjà choisi Bouba pour booster leur efficacité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3">
              <Zap className="w-5 h-5" />
              Commencer gratuitement
            </button>
            <button className="px-10 py-5 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
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

export default PricingPage;