import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft, Loader2, Building, Phone, Globe, CreditCard, Check, Crown, QrCode, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { usePlans } from '@/src/hooks/usePlans';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState(1);
  const [localPlanId, setLocalPlanId] = useState<string>('starter');
  const [paymentReference, setPaymentReference] = useState('');
  const [isValidatingPayment, setIsValidatingPayment] = useState(false);
  const plansInitialized = useRef(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { plans, loading: plansLoading } = usePlans();

  // Init plan selection once (avoid re-running on every render)
  useEffect(() => {
    if (plans.length > 0 && !plansInitialized.current) {
      plansInitialized.current = true;
      const planFromUrl = searchParams.get('plan');
      if (planFromUrl && plans.some(p => p.id === planFromUrl)) {
        setLocalPlanId(planFromUrl);
      }
    }
    if (searchParams.get('cancelled') === 'true') {
      toast.info('Paiement annulé. Vous pouvez réessayer.');
      setStep(3);
    }
  }, [plans, searchParams]);

  // Derived active plan — always in sync, no stale closure
  const activePlan = plans.find(p => p.id === localPlanId) ?? plans[0] ?? null;

  // Redirect if already authenticated — but only when account is fully ready
  useEffect(() => {
    if (!user || !profile || authLoading) return;
    // Subscription inactive = user may still be completing payment → stay here
    if (profile.subscription_status === 'inactive') return;
    if (profile.onboarding_complete) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Veuillez saisir une adresse email valide');
      return;
    }

    // Passer à la sélection de plan
    setStep(2);
  };

  const handlePlanSelection = () => {
    if (!activePlan) { toast.error('Veuillez sélectionner un plan'); return; }
    if (activePlan.price === 0) {
      handleCreateAccount();
    } else {
      setStep(3);
    }
  };

  const handleCreateAccount = async () => {
    setIsLoading(true);
    
    try {
      // Vérifier qu'un plan est sélectionné
      if (!activePlan) {
        toast.error('Aucun plan sélectionné');
        return;
      }

      // Déterminer le statut d'abonnement selon le plan
      const subscriptionStatus = activePlan.price === 0 ? 'active' : 'inactive'; // Gratuit = actif, Payant = inactif par défaut

      // Créer le compte avec les bonnes métadonnées
      const signupData = {
        email: email.trim(),
        password: password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        plan_id: activePlan.id,
        subscription_status: subscriptionStatus,
        company: company.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null
      };

      // Pour les plans payants, ne pas créer le compte, juste stocker les données
      if (activePlan.price > 0 && subscriptionStatus === 'inactive') {
        // Stocker temporairement les données pour après paiement
        sessionStorage.setItem('pending_signup', JSON.stringify(signupData));
        toast.info('En attente du paiement pour finaliser l\'inscription...');
        return;
      }

      // Créer le compte avec l'API modifiée
      const result = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData)
      });

      const responseData = await result.json();
      
      if (responseData.success) {
        // Notifier N8N de la création de compte
        try {
          const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.realtechprint.com/webhook/user-signup';
          
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'user_signup',
              user_data: {
                email: email.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                company: company.trim() || null,
                phone: phone.trim() || null,
                website: website.trim() || null,
                plan_id: activePlan?.id || 'starter'
              },
              metadata: {
                source: 'signup_form',
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent
              }
            })
          });
        } catch (n8nError) {
          console.warn('Échec de notification N8N:', n8nError);
          // Continue malgré l'erreur N8N
        }

        toast.success('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
        
        // Rediriger vers la page de connexion avec un message
        navigate('/login?message=signup_success');
      } else {
        throw new Error(responseData.error || 'Erreur lors de la création du compte');
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      toast.error(error.message || 'Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidatePayment = async () => {
    if (!paymentReference.trim()) {
      toast.error('Veuillez saisir la référence de paiement');
      return;
    }

    if (!activePlan) {
      toast.error('Aucun plan sélectionné');
      return;
    }

    setIsValidatingPayment(true);
    try {
      // Créer le compte avec subscription_status='pending' (en attente de validation admin)
      const signupData = {
        email: email.trim(),
        password: password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        plan_id: activePlan.id,
        subscription_status: 'pending',
        company: company.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null
      };

      const result = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });

      const responseData = await result.json();

      if (responseData.success) {
        const newUserId = responseData.user?.id;

        // Soumettre la demande d'upgrade auprès de l'admin (avec cookie de session)
        if (newUserId) {
          try {
            await fetch('/api/upgrade-requests', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toPlan: activePlan.id,
                paymentMethod: 'wave',
                paymentReference: paymentReference.trim(),
                amount: activePlan.price,
              }),
            });
          } catch (upErr) {
            console.warn('Erreur création upgrade_request:', upErr);
          }
        }

        navigate('/payment/pending');
      } else {
        throw new Error(responseData.error || 'Erreur lors de la création du compte');
      }
    } catch (error: any) {
      console.error('Erreur lors de la validation du paiement:', error);
      toast.error(error.message || 'Erreur lors de la création du compte.');
    } finally {
      setIsValidatingPayment(false);
    }
  };

  const handleStripePayment = async () => {
    if (!activePlan || isStripeLoading) return;
    setIsStripeLoading(true);

    try {
      // Envoyer les infos utilisateur directement — le compte est créé par le webhook Stripe
      const checkoutRes = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activePlan.id,
          userInfo: {
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company.trim() || null,
            phone: phone.trim() || null,
            website: website.trim() || null,
          },
        }),
      });
      const checkoutData = await checkoutRes.json();

      if (checkoutData.checkoutUrl) {
        window.location.href = checkoutData.checkoutUrl;
      } else {
        const msg = checkoutData.error || 'Impossible de créer la session de paiement';
        toast.error(msg, { duration: 6000 });
        console.error('[Stripe Checkout]', checkoutData);
        setIsStripeLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur réseau lors du paiement Stripe');
      console.error('[handleStripePayment]', error);
      setIsStripeLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <img src="/avatar-bouba.png" alt="Bouba" className="h-9 w-9 rounded-xl object-cover shadow-md"
                onError={e => { const el = e.target as HTMLImageElement; el.style.display='none' }} />
              <span className="text-xl font-bold text-gray-900">Bouba<span className="text-blue-600">'ia</span></span>
            </div>
            <div className="text-sm text-gray-500">
              Étape {step} sur {activePlan?.price === 0 ? 2 : 3}
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / (activePlan?.price === 0 ? 2 : 3)) * 100}%` }}
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
            />
          </div>
        </div>

        {/* Step 1: Formulaire d'inscription */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Inscription</h1>
              <p className="text-gray-600 mt-2">Créez votre compte assistant IA personnalisé</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="John"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Doe"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="votre@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-500 mt-1">Minimum 6 caractères</p>
              </div>

              {/* Informations complémentaires */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations professionnelles (optionnel)</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="h-4 w-4 inline mr-2" />
                      Entreprise
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Nom de votre entreprise"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="h-4 w-4 inline mr-2" />
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="+33 1 23 45 67 89"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="h-4 w-4 inline mr-2" />
                        Site web
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="https://votre-site.com"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditions d'utilisation */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <label htmlFor="accept-terms" className="text-sm text-gray-600 leading-5">
                  J'accepte les{' '}
                  <Link to="/legal" className="text-blue-600 hover:text-blue-700 underline">
                    conditions d'utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link to="/legal" className="text-blue-600 hover:text-blue-700 underline">
                    politique de confidentialité
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Continuer
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center space-y-4">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 block">
                Déjà un compte ? Se connecter
              </Link>
              <div>
                <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Sélection du plan */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Choisissez votre plan</h2>
              <p className="text-gray-600 mt-1">Cliquez sur un plan pour le sélectionner — changez à tout moment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const isSelected = localPlanId === plan.id;
                return (
                  <motion.button
                    key={plan.id}
                    type="button"
                    onClick={() => setLocalPlanId(plan.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative text-left rounded-2xl border-2 p-5 transition-all focus:outline-none",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-4">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Crown className="h-3 w-3" /> Populaire
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <div>
                        <span className="text-3xl font-bold text-blue-600">
                          {plan.price === 0 ? 'Gratuit' : `${Math.floor(plan.price / 100)}€`}
                        </span>
                        {plan.price > 0 && <span className="text-gray-500 text-sm">/mois</span>}
                      </div>
                      <p className="text-sm text-gray-500">{plan.description}</p>
                    </div>

                    <ul className="mt-4 space-y-1.5">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </motion.button>
                );
              })}
            </div>

            {activePlan && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 text-center">
                Plan sélectionné : <span className="font-bold">{activePlan.name}</span>
                {activePlan.price > 0 && ` — ${Math.floor(activePlan.price / 100)}€/mois`}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={handlePlanSelection}
                disabled={!activePlan || isLoading}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {activePlan?.price === 0 ? 'Créer mon compte gratuitement' : `Continuer vers le paiement →`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Paiement */}
        {step === 3 && activePlan && activePlan.price > 0 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Finaliser votre abonnement</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Plan <span className="font-semibold text-blue-600">{activePlan.name}</span> — <span className="font-bold">{Math.floor(activePlan.price / 100)}€</span>/mois
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* ── Carte Stripe ── */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Carte bancaire</h3>
                    <p className="text-xs text-gray-500">Paiement sécurisé via Stripe</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-1 bg-blue-600 rounded text-white text-[10px] font-bold">VISA</span>
                  <span className="px-2 py-1 bg-red-500 rounded text-white text-[10px] font-bold">MC</span>
                  <span className="px-2 py-1 bg-blue-500 rounded text-white text-[10px] font-bold">AMEX</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-1">
                    <ShieldCheck className="h-3 w-3" /> PCI DSS Level 1
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Votre compte est créé, puis vous êtes redirigé vers Stripe pour saisir votre carte.
                  L'activation est automatique dès le paiement confirmé.
                </p>

                <button
                  onClick={handleStripePayment}
                  disabled={isStripeLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-auto"
                >
                  {isStripeLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirection vers Stripe…</>
                  ) : (
                    <><CreditCard className="h-4 w-4" /> Payer {Math.floor(activePlan.price / 100)}€ avec Stripe</>
                  )}
                </button>
              </div>

              {/* ── Wave Mobile Money ── */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border-2 border-orange-200 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                    <QrCode className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Wave Mobile Money</h3>
                    <p className="text-xs text-gray-500">Validation manuelle sous 24h</p>
                  </div>
                </div>

                {/* QR Code — toujours visible */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img
                      src="/qr_code_marchant_wave.png"
                      alt="QR Code Wave"
                      className="w-28 h-28 border-2 border-orange-200 rounded-xl bg-white p-1.5 shadow-sm"
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        (img.nextElementSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    {/* Fallback si image manquante */}
                    <div className="w-28 h-28 border-2 border-orange-200 rounded-xl bg-white items-center justify-center hidden flex-col gap-1">
                      <QrCode className="h-10 w-10 text-orange-400" />
                      <p className="text-[10px] text-orange-500 text-center">QR Code Wave</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-orange-700">
                    Montant à envoyer : {Math.floor(activePlan.price / 100)}€
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Référence de paiement *
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2.5 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-colors bg-white"
                    placeholder="Ex: WAV123456789"
                    disabled={isValidatingPayment}
                  />
                </div>

                <button
                  onClick={handleValidatePayment}
                  disabled={!paymentReference.trim() || isValidatingPayment}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-auto"
                >
                  {isValidatingPayment
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Validation…</>
                    : 'Valider le paiement Wave'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setStep(2)}
                disabled={isStripeLoading || isValidatingPayment}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <p className="text-xs text-gray-400">
                Aide : <a href="mailto:support@boubaia.com" className="text-blue-600 hover:underline">support@boubaia.com</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}