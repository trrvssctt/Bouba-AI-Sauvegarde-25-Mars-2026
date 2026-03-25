import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Calendar, 
  Users, 
  Bot,
  Globe,
  Briefcase,
  Bell,
  Play,
  Languages,
  Clock,
  CreditCard,
  Check,
  Loader2,
  Crown,
  QrCode
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import { usePayment } from '@/src/hooks/usePayment'
import { supabase } from '@/src/lib/supabase'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [config, setConfig] = useState({
    workType: 'Entrepreneur',
    timezone: 'Europe/Paris (GMT+1)',
    language: 'Français'
  })
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { plans, loading: planLoading } = usePlans()

  // Vérifier que l'utilisateur a un abonnement actif
  const userPlan = plans.find(plan => plan.id === profile?.plan_id)
  
  // Redirect logic with proper plan handling
  useEffect(() => {
    if (!profile || planLoading) return

    // Onboarding déjà terminé → dashboard
    if (profile.onboarding_complete) {
      navigate('/dashboard', { replace: true })
      return
    }

    // Plan payant avec abonnement inactif → page de paiement (évite la boucle /signup ↔ /onboarding)
    if (userPlan && userPlan.price > 0 && profile.subscription_status !== 'active') {
      toast.error('Votre abonnement n\'est pas encore actif. Finalisez votre paiement.')
      navigate('/settings/plan', { replace: true })
      return
    }

    // Starter ou abonnement actif → onboarding peut continuer
  }, [profile, planLoading, navigate, userPlan])

  const totalSteps = 2 // Configuration et Finalisation
  const progress = (step / totalSteps) * 100

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleCompleteOnboarding()
    }
  }

  const handleCompleteOnboarding = async () => {
    try {
      // Maintenant que les colonnes sont ajoutées, sauvegarder toutes les préférences
      await updateProfile({
        onboarding_complete: true,
        work_type: config.workType,
        timezone: config.timezone,
        language: config.language
      })
      
      toast.success("Configuration terminée ! Bienvenue sur Bouba'ia !")
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Onboarding completion error:', error)
      toast.error('Erreur lors de la finalisation. Veuillez réessayer.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-2 bg-border z-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary shadow-lg"
        />
      </div>

      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <div className="p-3 bg-primary rounded-xl">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-secondary font-display">Bouba'ia</span>
                </div>
                <h1 className="text-4xl font-display font-bold text-secondary">
                  Bienvenue sur Bouba'ia
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Votre assistant IA multi-agents qui révolutionne votre productivité.
                  Votre abonnement <span className="font-semibold text-primary">{userPlan?.name}</span> est actif ! 
                  Finalisons la configuration de votre expérience personnalisée.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                  <Mail className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-secondary">Agent Email</h3>
                  <p className="text-muted-foreground">Gestion intelligente de vos emails avec réponses automatiques</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                  <Calendar className="h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-secondary">Agent Calendrier</h3>
                  <p className="text-muted-foreground">Planification automatique et gestion des rendez-vous</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                  <Users className="h-12 w-12 text-purple-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-secondary">Agent Contacts</h3>
                  <p className="text-muted-foreground">CRM intelligent pour vos relations professionnelles</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                  <CreditCard className="h-12 w-12 text-orange-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-secondary">Agent Finance</h3>
                  <p className="text-muted-foreground">Suivi automatisé de vos revenus et dépenses</p>
                </div>
              </div>

              <div className="text-center">
                <button 
                  onClick={handleNext}
                  className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Finaliser la configuration
                  <ArrowRight className="ml-2 h-5 w-5 inline" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Étape 2 - Configuration finale */}
          {step === 2 && (
            <motion.div
              key="step2-config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-secondary font-display">
                  Configuration de vos préférences
                </h2>
                <p className="text-lg text-muted-foreground">
                  Personnalisez votre environnement de travail pour une expérience optimale.
                </p>
              </div>

              {/* Configuration options */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-border max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Briefcase className="h-4 w-4 inline mr-2" />
                      Type de travail
                    </label>
                    <select
                      value={config.workType}
                      onChange={(e) => setConfig(prev => ({ ...prev, workType: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Entrepreneur">Entrepreneur</option>
                      <option value="Freelance">Freelance</option>
                      <option value="Consultant">Consultant</option>
                      <option value="Manager">Manager</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Fuseau horaire
                    </label>
                    <select
                      value={config.timezone}
                      onChange={(e) => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Europe/Paris (GMT+1)">Europe/Paris (GMT+1)</option>
                      <option value="America/New_York (GMT-5)">America/New_York (GMT-5)</option>
                      <option value="America/Los_Angeles (GMT-8)">America/Los_Angeles (GMT-8)</option>
                      <option value="Asia/Tokyo (GMT+9)">Asia/Tokyo (GMT+9)</option>
                      <option value="Australia/Sydney (GMT+11)">Australia/Sydney (GMT+11)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Languages className="h-4 w-4 inline mr-2" />
                      Langue préférée
                    </label>
                    <select
                      value={config.language}
                      onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Français">Français</option>
                      <option value="English">English</option>
                      <option value="Español">Español</option>
                      <option value="Deutsch">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button 
                  onClick={handleCompleteOnboarding}
                  className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Accéder au dashboard
                  <ArrowRight className="ml-2 h-5 w-5 inline" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}