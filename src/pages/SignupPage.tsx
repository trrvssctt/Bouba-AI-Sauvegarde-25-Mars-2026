import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, Check, Eye, EyeOff, Crown } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';
import AuthLayout, { AuthDivider, SocialAuthButtons, AuthFooterLink } from '@/src/components/layout/AuthLayout';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const passwordStrength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;
  const strengthColor = {
    0: 'bg-gray-200',
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-green-500',
    5: 'bg-green-600',
  }[strengthScore];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    if (strengthScore < 3) {
      toast.error('Le mot de passe est trop faible');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email, password, firstName, lastName);
      if (result.success) {
        toast.success('Compte créé ! Vérifiez votre email pour activer votre compte.');
        navigate('/login?message=verify_email');
      } else {
        toast.error(result.error || 'Échec de l\'inscription');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Échec de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Commencez votre aventure"
      subtitle="Créez votre compte Bouba'IA en 2 minutes"
      backText="Déjà un compte ? Se connecter"
      backTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom et Prénom */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="form-label">
              <User className="h-4 w-4 inline mr-2" />
              Prénom
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="form-input"
              placeholder="Jean"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="form-label">
              <User className="h-4 w-4 inline mr-2" />
              Nom
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="form-input"
              placeholder="Dupont"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="form-label">
            <Mail className="h-4 w-4 inline mr-2" />
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="votre@email.com"
            required
            disabled={isLoading}
          />
        </div>

        {/* Mot de passe */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="form-label">
              <Lock className="h-4 w-4 inline mr-2" />
              Mot de passe
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              {showPassword ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Masquer
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Afficher
                </>
              )}
            </button>
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Créez un mot de passe sécurisé"
            required
            disabled={isLoading}
          />

          {/* Force du mot de passe */}
          {password && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Force du mot de passe</span>
                <span className="text-sm font-medium">
                  {strengthScore === 0 && 'Très faible'}
                  {strengthScore === 1 && 'Faible'}
                  {strengthScore === 2 && 'Moyen'}
                  {strengthScore === 3 && 'Bon'}
                  {strengthScore === 4 && 'Fort'}
                  {strengthScore === 5 && 'Très fort'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${strengthColor} transition-all duration-300`}
                  style={{ width: `${(strengthScore / 5) * 100}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${passwordStrength.length ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${passwordStrength.length ? 'text-gray-700' : 'text-gray-400'}`}>
                    8 caractères minimum
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${passwordStrength.uppercase ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${passwordStrength.uppercase ? 'text-gray-700' : 'text-gray-400'}`}>
                    Majuscule
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${passwordStrength.lowercase ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${passwordStrength.lowercase ? 'text-gray-700' : 'text-gray-400'}`}>
                    Minuscule
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${passwordStrength.number ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${passwordStrength.number ? 'text-gray-700' : 'text-gray-400'}`}>
                    Chiffre
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation mot de passe */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="confirmPassword" className="form-label">
              <Lock className="h-4 w-4 inline mr-2" />
              Confirmer le mot de passe
            </label>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              {showConfirmPassword ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Masquer
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Afficher
                </>
              )}
            </button>
          </div>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`form-input ${password && confirmPassword && password !== confirmPassword ? 'border-red-300' : ''}`}
            placeholder="Confirmez votre mot de passe"
            required
            disabled={isLoading}
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p className="mt-2 text-sm text-red-600">
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>

        {/* Conditions */}
        <div className="flex items-start gap-3">
          <input
            id="terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
          <label htmlFor="terms" className="text-sm text-gray-700">
            J'accepte les{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-800 font-medium">
              Conditions d'utilisation
            </Link>{' '}
            et la{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">
              Politique de confidentialité
            </Link>
          </label>
        </div>

        {/* Newsletter */}
        <div className="flex items-start gap-3">
          <input
            id="newsletter"
            type="checkbox"
            defaultChecked
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isLoading}
          />
          <label htmlFor="newsletter" className="text-sm text-gray-700">
            Je souhaite recevoir des conseils productivité et des nouveautés Bouba'IA
          </label>
        </div>

        {/* Lien vers les plans payants */}
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <Crown className="h-4 w-4 text-purple-600 shrink-0" />
          <span className="text-purple-700">
            Vous souhaitez un plan <strong>Starter</strong> ou <strong>Business</strong> ?{' '}
            <Link to="/subscribe" className="font-semibold text-purple-800 underline hover:text-purple-900">
              S'inscrire avec un plan payant →
            </Link>
          </span>
        </div>

        {/* Bouton d'inscription */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-full mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Création du compte...
            </>
          ) : (
            'Créer mon compte gratuitement'
          )}
        </button>
      </form>

      <AuthDivider />
      <SocialAuthButtons />

      <div className="mt-6 pt-6 border-t border-gray-100">
        <AuthFooterLink
          text="Déjà un compte ?"
          linkText="Se connecter"
          to="/login"
        />
      </div>
    </AuthLayout>
  );
}