import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Mail, Calendar, Users, PiggyBank,
  Zap, ArrowRight, Lock, CheckCircle2, Crown,
  TrendingUp, Sparkles, ChevronRight, BarChart2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';

// Plan metadata used for the badge and feature list
const PLAN_META: Record<string, {
  label: string;
  badge: string;
  badgeClass: string;
  headerClass: string;
  features: { key: string; label: string }[];
  upgradeLabel?: string;
  upgradeTarget?: string;
}> = {
  free: {
    label: 'Free',
    badge: 'Gratuit',
    badgeClass: 'bg-gray-100 text-gray-600',
    headerClass: 'from-gray-700 to-gray-900',
    features: [
      { key: 'chat',     label: 'Chat IA (500 msg/mois)' },
      { key: 'email',    label: 'Email' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'calendar', label: 'Agenda' },
      { key: 'finance',  label: 'Finance' },
    ],
    upgradeLabel: 'Passer au Starter',
    upgradeTarget: 'starter',
  },
  starter: {
    label: 'Starter',
    badge: 'Starter',
    badgeClass: 'bg-blue-100 text-blue-700',
    headerClass: 'from-blue-600 to-indigo-700',
    features: [
      { key: 'chat',     label: 'Chat IA (10 000 msg/mois)' },
      { key: 'email',    label: 'Email' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'calendar', label: 'Agenda' },
      { key: 'finance',  label: 'Finance' },
    ],
    upgradeLabel: 'Passer au Business',
    upgradeTarget: 'business',
  },
  business: {
    label: 'Business',
    badge: 'Business',
    badgeClass: 'bg-violet-100 text-violet-700',
    headerClass: 'from-violet-600 to-purple-800',
    features: [
      { key: 'chat',     label: 'Chat IA illimité' },
      { key: 'email',    label: 'Email' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'calendar', label: 'Agenda' },
      { key: 'finance',  label: 'Finance & documents' },
    ],
  },
  enterprise: {
    label: 'Enterprise',
    badge: 'Enterprise',
    badgeClass: 'bg-amber-100 text-amber-700',
    headerClass: 'from-amber-600 to-orange-700',
    features: [
      { key: 'chat',      label: 'Chat IA illimité' },
      { key: 'email',     label: 'Email' },
      { key: 'contacts',  label: 'Contacts illimités' },
      { key: 'calendar',  label: 'Agenda' },
      { key: 'finance',   label: 'Finance & documents' },
    ],
  },
  // Alias pour compatibilité avec anciens IDs
  pro: {
    label: 'Pro',
    badge: 'Pro',
    badgeClass: 'bg-blue-100 text-blue-700',
    headerClass: 'from-blue-600 to-indigo-700',
    features: [
      { key: 'chat',     label: 'Chat IA (10 000 msg/mois)' },
      { key: 'email',    label: 'Email' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'calendar', label: 'Agenda' },
      { key: 'finance',  label: 'Finance' },
    ],
    upgradeLabel: 'Passer au Business',
    upgradeTarget: 'business',
  },
};

const APPS = [
  {
    id: 'chat',
    name: 'Chat IA',
    icon: MessageCircle,
    gradient: 'from-blue-500 to-blue-600',
    path: '/dashboard/chat',
    desc: 'Discuter avec Bouba',
    alwaysAvailable: true,
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    gradient: 'from-red-500 to-pink-600',
    path: '/dashboard/email',
    desc: 'Gérer vos emails',
    alwaysAvailable: true,
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    gradient: 'from-emerald-500 to-green-600',
    path: '/dashboard/contacts',
    requiresFeature: 'contacts',
    requiredPlan: 'Starter',
  },
  {
    id: 'calendar',
    name: 'Agenda',
    icon: Calendar,
    gradient: 'from-purple-500 to-violet-600',
    path: '/dashboard/calendar',
    requiresFeature: 'calendar',
    requiredPlan: 'Starter',
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: PiggyBank,
    gradient: 'from-amber-500 to-orange-600',
    path: '/dashboard/finance',
    requiresFeature: 'finance',
    requiredPlan: 'Business',
  },
];

const UserDashboardPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { plans, formatPrice, getUsageStatus, hasFeatureAccess } = usePlans();
  const navigate = useNavigate();

  const planId = profile?.plan_id || 'free';
  const meta = PLAN_META[planId] || PLAN_META.free;
  const currentPlan = plans.find(p => p.id === planId);
  const usage = getUsageStatus();

  const firstName = profile?.first_name || user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'vous';

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  const usagePercent = usage.percentage;
  const usageColor =
    usagePercent >= 90 ? 'bg-red-500' :
    usagePercent >= 70 ? 'bg-amber-500' :
    'bg-blue-500';

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6 pb-8">

      {/* ── Annonces admin ── */}

      {/* ── Hero header ── */}
      <div className={`rounded-2xl bg-gradient-to-r ${meta.headerClass} p-6 text-white`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">Tableau de bord</p>
            <h1 className="text-2xl font-bold">Bonjour, {firstName} 👋</h1>
            <p className="text-white/70 text-sm mt-1">Voici un aperçu de votre espace Bouba</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${meta.badgeClass}`}>
              {meta.badge}
            </span>
            {meta.upgradeLabel && (
              <button
                onClick={() => navigate('/settings/plan')}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-white/20"
              >
                <Crown className="w-3.5 h-3.5" />
                {meta.upgradeLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Plan actif', value: meta.label, icon: Sparkles, color: 'text-blue-600 bg-blue-50' },
          {
            label: 'Messages utilisés',
            value: usage.limit === -1 ? '∞' : `${profile?.messages_used ?? 0} / ${usage.limit}`,
            icon: MessageCircle,
            color: 'text-green-600 bg-green-50',
          },
          {
            label: 'Statut abonnement',
            value: profile?.subscription_status === 'active' ? 'Actif' : 'Inactif',
            icon: TrendingUp,
            color: 'text-violet-600 bg-violet-50',
          },
          {
            label: 'Apps disponibles',
            value: `${APPS.filter(a => a.alwaysAvailable || (a.requiresFeature && hasFeatureAccess(a.requiresFeature))).length} / ${APPS.length}`,
            icon: BarChart2,
            color: 'text-amber-600 bg-amber-50',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Applications (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 text-lg">Vos applications</h2>
            <span className="text-xs text-gray-400">
              {APPS.filter(a => a.alwaysAvailable || (a.requiresFeature && hasFeatureAccess(a.requiresFeature))).length}/{APPS.length} actives
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {APPS.map((app) => {
              const available = app.alwaysAvailable || (app.requiresFeature ? hasFeatureAccess(app.requiresFeature) : false);
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => available && navigate(app.path)}
                  disabled={!available}
                  className={`group relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-200 ${
                    available
                      ? 'border-gray-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 bg-white cursor-pointer'
                      : 'border-dashed border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{app.name}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">{app.desc}</span>

                  {!available && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center">
                      <Lock className="w-2.5 h-2.5 text-gray-400" />
                    </div>
                  )}
                  {!available && app.requiredPlan && (
                    <span className="mt-1 text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {app.requiredPlan}+
                    </span>
                  )}
                  {available && (
                    <ArrowRight className="w-3 h-3 text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan card (1/3) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Votre plan</h2>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-gray-900">{currentPlan?.name || meta.label}</span>
            <span className="text-sm text-gray-500">
              {currentPlan ? formatPrice(currentPlan.price) : 'Gratuit'}
              {currentPlan && currentPlan.price > 0 && <span className="text-xs text-gray-400">/mois</span>}
            </span>
          </div>

          <ul className="space-y-2 flex-1">
            {meta.features.map(({ key, label }) => {
              const included = key === 'chat' || key === 'email' || hasFeatureAccess(key);
              return (
                <li key={key} className="flex items-center gap-2.5">
                  {included ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${included ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
                </li>
              );
            })}
          </ul>

          {/* Usage bar */}
          {usage.limit !== -1 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Messages ce mois</span>
                <span>{profile?.messages_used ?? 0} / {usage.limit}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${usageColor} rounded-full transition-all`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {usagePercent >= 90 ? '⚠️ Limite bientôt atteinte' :
                 usagePercent >= 70 ? `${usage.remaining} messages restants` :
                 `${usage.remaining} messages disponibles`}
              </p>
            </div>
          )}
          {usage.limit === -1 && (
            <div className="mt-5 flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <Zap className="w-4 h-4" />
              Messages illimités
            </div>
          )}

          <button
            onClick={() => navigate('/settings/plan')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Gérer mon abonnement
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" /> Actions rapides
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: MessageCircle,
              title: 'Nouvelle conversation',
              desc: 'Discutez avec Bouba',
              path: '/dashboard/chat',
              iconClass: 'bg-blue-100 text-blue-600',
              hoverBorder: 'hover:border-blue-200',
            },
            {
              icon: Mail,
              title: 'Vérifier mes emails',
              desc: 'Voir les messages non lus',
              path: '/dashboard/email',
              iconClass: 'bg-red-100 text-red-600',
              hoverBorder: 'hover:border-red-200',
            },
            {
              icon: Crown,
              title: meta.upgradeLabel || 'Mon plan',
              desc: meta.upgradeLabel ? 'Accéder à plus de features' : 'Voir les détails',
              path: '/settings/plan',
              iconClass: 'bg-violet-100 text-violet-600',
              hoverBorder: 'hover:border-violet-200',
            },
          ].map(({ icon: Icon, title, desc, path, iconClass, hoverBorder }) => (
            <button
              key={title}
              onClick={() => navigate(path)}
              className={`bg-white rounded-xl p-4 border border-gray-100 ${hoverBorder} hover:shadow-sm transition-all text-left group`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Upgrade CTA (si pas Business ou Enterprise) ── */}
      {planId !== 'business' && planId !== 'enterprise' && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-lg">Débloquez tout Bouba</span>
            </div>
            <p className="text-white/70 text-sm">
              {planId === 'free'
                ? 'Passez au Starter pour accéder aux Contacts et à l\'Agenda.'
                : 'Passez au Business pour la Finance, l\'API et les messages illimités.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/settings/plan')}
            className="flex-shrink-0 bg-white text-violet-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
          >
            Voir les offres →
          </button>
        </div>
      )}

      {/* ── Bienvenue (nouveaux utilisateurs) ── */}
      {profile?.created_at && new Date(profile.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
        <div className="bg-green-50 rounded-2xl p-5 border border-green-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Bienvenue sur Bouba ! 🎉</p>
            <p className="text-sm text-gray-600">
              Votre compte est prêt. Commencez par une conversation ou explorez vos applications.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate('/dashboard/chat')}
                className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Commencer
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="text-sm border border-green-200 text-green-700 px-4 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
              >
                Mon compte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboardPage;
