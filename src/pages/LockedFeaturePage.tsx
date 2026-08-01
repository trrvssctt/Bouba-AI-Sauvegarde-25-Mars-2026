import { motion } from 'motion/react'
import { Lock, Sparkles, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'

interface LockedFeaturePageProps {
  featureName: string
  featureDescription: string
  requiredPlan: 'pro' | 'premium' | 'enterprise'
  currentPlan?: string
  icon?: React.ReactNode
}

export default function LockedFeaturePage({
  featureName,
  featureDescription,
  requiredPlan,
  currentPlan,
  icon = <Lock className="w-12 h-12" />
}: LockedFeaturePageProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { plans } = usePlans()
  
  const currentPlanName = currentPlan || profile?.plan_id || 'starter'
  const requiredPlanData = plans.find(p => p.id === requiredPlan)
  
  const planComparison = {
    starter: { price: 0, features: ['Chat', 'Email'], rank: 1 },
    pro: { price: 29, features: ['Calendar', 'Contacts', 'Projets', 'Visioconférence'], rank: 2 },
    premium: { price: 49, features: ['Finance', 'Paiements', 'Stockage', 'Slack', 'Notion'], rank: 3 },
    enterprise: { price: 99, features: ['Toutes les fonctionnalités', 'API', 'White-label', 'Support dédié'], rank: 4 }
  }
  
  const currentRank = planComparison[currentPlanName as keyof typeof planComparison]?.rank || 1
  const requiredRank = planComparison[requiredPlan]?.rank || 4
  
  const handleUpgrade = () => {
    navigate('/settings/plan')
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <div className="glass-card p-8 md:p-10 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 border border-red-200 flex items-center justify-center"
          >
            <div className="text-red-600">
              {icon}
            </div>
          </motion.div>
          
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-secondary mb-3">
            Fonctionnalité verrouillée 🔒
          </h1>
          
          <p className="text-lg text-muted mb-2">
            <span className="font-semibold text-secondary">{featureName}</span> nécessite le plan{' '}
            <span className="font-bold text-primary">{requiredPlanData?.name || requiredPlan}</span>
          </p>
          
          <p className="text-sm text-muted mb-8 max-w-md mx-auto">
            {featureDescription}
          </p>
          
          {/* Current vs Required Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-secondary">Votre plan actuel</h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  currentPlanName === 'starter' ? 'bg-gray-100 text-gray-800' :
                  currentPlanName === 'pro' ? 'bg-blue-100 text-blue-800' :
                  currentPlanName === 'premium' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {currentPlanName.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-3">
                {planComparison[currentPlanName as keyof typeof planComparison]?.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-secondary">Plan requis</h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  requiredPlan === 'pro' ? 'bg-blue-100 text-blue-800' :
                  requiredPlan === 'premium' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {requiredPlan.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-3">
                {planComparison[requiredPlan]?.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Upgrade CTA */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <h4 className="font-display font-bold text-secondary mb-1">
                  Débloquez {featureName} et bien plus encore
                </h4>
                <p className="text-sm text-muted">
                  Passez au plan {requiredPlanData?.name} pour accéder à toutes les fonctionnalités avancées
                </p>
              </div>
              
              <div className="flex flex-col items-center md:items-end">
                <div className="text-3xl font-display font-bold text-secondary mb-1">
                  {requiredPlanData?.price === 0 ? 'Gratuit' : `${requiredPlanData?.price ? requiredPlanData.price / 100 : 0}€`}
                  <span className="text-sm font-normal text-muted">/mois</span>
                </div>
                <p className="text-xs text-muted">Facturation mensuelle • Annulation à tout moment</p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleUpgrade}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-8 text-lg"
            >
              <Sparkles className="w-5 h-5" />
              Passer au plan {requiredPlanData?.name}
              <ArrowUpRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary py-3 px-8"
            >
              Retour au dashboard
            </button>
          </div>
          
          {/* Additional info */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted text-center">
              💡 <span className="font-semibold">Conseil :</span> Tous les plans incluent un essai gratuit de 14 jours. 
              Aucune carte bancaire requise pour commencer.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}