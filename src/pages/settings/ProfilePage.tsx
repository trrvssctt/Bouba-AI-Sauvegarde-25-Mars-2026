import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import {
  Camera, Save, Download, Trash2, ShieldCheck, AlertTriangle,
  User, Mail, Globe, Clock, Link2, CheckCircle2, XCircle,
  Calendar, Users, Sparkles, ExternalLink,
  Building2, Phone, MapPin, Hash, CreditCard, Upload, X, MessageSquare,
  ArrowUpRight, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/src/hooks/useAuth'
import { useConnections } from '@/src/hooks/useConnections'
import { usePlans } from '@/src/hooks/usePlans'
import { cn } from '@/src/lib/utils'
import { useCompanyStore } from '@/src/stores/companyStore'

// Map connection IDs to icon/color metadata
function getConnectionMeta(id: string): { icon: React.ReactNode; color: string; bg: string; label: string } {
  const normalised = id.toLowerCase()
  if (normalised === 'gmail' || normalised === 'google_gmail') {
    return {
      icon: <Mail className="w-5 h-5" />,
      color: 'text-red-500',
      bg: 'bg-red-50 border-red-200',
      label: 'Gmail',
    }
  }
  if (normalised === 'google_calendar' || normalised === 'calendar') {
    return {
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-blue-500',
      bg: 'bg-blue-50 border-blue-200',
      label: 'Google Calendar',
    }
  }
  if (normalised === 'google_contacts' || normalised === 'contacts') {
    return {
      icon: <Users className="w-5 h-5" />,
      color: 'text-green-500',
      bg: 'bg-green-50 border-green-200',
      label: 'Google Contacts',
    }
  }
  return {
    icon: <Link2 className="w-5 h-5" />,
    color: 'text-primary',
    bg: 'bg-primary/5 border-primary/20',
    label: id,
  }
}

// Avatar gradient palette — cycle by first char code
const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
]

export default function ProfilePage() {
  const { profile, user, updateProfile } = useAuth()
  const { connections } = useConnections()
  const { getUsageStatus } = usePlans()
  const { company, setCompany } = useCompanyStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)
  const [companyForm, setCompanyForm] = useState({ ...company })
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    language: profile?.language || 'fr',
    timezone: profile?.timezone || 'Europe/Paris',
    work_type: profile?.work_type || '',
  })

  const getUserInitials = () => {
    const firstName = profile?.first_name || formData.first_name || ''
    const lastName = profile?.last_name || formData.last_name || ''
    if (!firstName && !lastName) return user?.email?.charAt(0).toUpperCase() || 'U'
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const avatarGradient = AVATAR_GRADIENTS[(user?.email?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    try {
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success('Profil mis à jour avec succès !')
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour du profil')
    }
    setIsUpdating(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleExportData = async () => {
    try {
      const userData = {
        profile: profile,
        email: user?.email,
        exportDate: new Date().toISOString(),
        version: '1.0',
      }
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bouba-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Données exportées avec succès (RGPD Art. 20)')
    } catch {
      toast.error("Erreur lors de l'exportation des données")
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous absolument sûr ? Cette action est irréversible et supprimera toutes vos données conformément au RGPD Art. 17.')) {
      return
    }
    setIsDeleting(true)
    try {
      const response = await fetch('/api/user/account', { method: 'DELETE' })
      if (response.ok) {
        toast.success('Compte supprimé. Redirection...')
        setTimeout(() => (window.location.href = '/'), 2000)
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erreur lors de la suppression du compte')
      setIsDeleting(false)
    }
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      const formDataAvatar = new FormData()
      formDataAvatar.append('file', file)
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formDataAvatar,
      })
      if (response.ok) {
        toast.success('Photo de profil mise à jour !')
      } else {
        throw new Error()
      }
    } catch {
      toast.error("Erreur lors du téléchargement de l'avatar")
    } finally {
      setIsUploadingAvatar(false)
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveCompany = async () => {
    setIsSavingCompany(true)
    try {
      setCompany(companyForm)
      toast.success('Informations entreprise sauvegardées !')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSavingCompany(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast.error('Logo trop lourd (max 500 Ko)'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string
      setCompanyForm(f => ({ ...f, logo: b64 }))
    }
    reader.readAsDataURL(file)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleOpenBillingPortal = async () => {
    if (!user?.id) return
    setIsOpeningPortal(true)
    try {
      const res = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.portalUrl) {
        window.location.href = data.portalUrl
      } else {
        toast.error(data.error || 'Impossible d\'ouvrir le portail de paiement')
      }
    } catch {
      toast.error('Erreur lors de l\'ouverture du portail')
    } finally {
      setIsOpeningPortal(false)
    }
  }

  const usageStatus = getUsageStatus()
  const connectedCount = (connections || []).filter(c => c.status === 'connected').length
  const memberSince = (profile as any)?.created_at
    ? new Date((profile as any).created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : '—'

  // Only show the 3 "Google" connections in the profile summary strip
  const featuredConnectionIds = ['gmail', 'google_gmail', 'calendar', 'google_calendar', 'contacts', 'google_contacts']
  const featuredConnections = (connections || []).filter(c =>
    featuredConnectionIds.includes(c.id.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-10">

      {/* ── Gradient Hero Header ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary-light to-primary p-8 text-white shadow-violet"
      >
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-primary-light/20 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div
              className={cn(
                'w-24 h-24 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white/20 overflow-hidden',
                !profile?.avatar_url && `bg-gradient-to-br ${avatarGradient}`
              )}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                getUserInitials()
              )}
            </div>
            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-3xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Changer la photo"
            >
              {isUploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white drop-shadow" />
              )}
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>

          {/* Name + plan */}
          <div className="text-center sm:text-left space-y-1 flex-1">
            <h1 className="text-2xl font-display font-bold leading-tight">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : formData.first_name
                  ? `${formData.first_name} ${formData.last_name}`.trim()
                  : 'Mon profil'}
            </h1>
            <p className="text-white/70 text-sm flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {user?.email || '—'}
            </p>
          </div>

          {/* Plan badge */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary-light" />
              Plan {profile?.plan_id || 'Starter'}
            </span>
          </div>
        </div>

        {/* Statistics strip inside header */}
        <div className="relative mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-white">{connectedCount}</p>
            <p className="text-xs text-white/60 mt-0.5">Services liés</p>
          </div>
          <div className="text-center border-x border-white/15">
            <p className="text-2xl font-display font-bold text-white capitalize">
              {profile?.plan_id || 'Starter'}
            </p>
            <p className="text-xs text-white/60 mt-0.5">Abonnement</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-display font-bold text-white">{memberSince}</p>
            <p className="text-xs text-white/60 mt-0.5">Membre depuis</p>
          </div>
        </div>
      </motion.div>

      {/* ── Message Usage Widget ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-secondary text-sm">Messages ce mois</h3>
              <p className="text-xs text-muted">Quota IA utilisé sur votre plan</p>
            </div>
          </div>
          {usageStatus.limit !== -1 && usageStatus.remaining >= 0 && (
            <span className={cn(
              "text-xs font-bold px-3 py-1 rounded-full",
              usageStatus.remaining < 50
                ? "bg-danger/10 text-danger"
                : usageStatus.remaining < 100
                ? "bg-warning/10 text-warning"
                : "bg-success/10 text-success"
            )}>
              {usageStatus.remaining} restants
            </span>
          )}
        </div>

        {usageStatus.limit === -1 ? (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-secondary">Messages <span className="font-bold text-primary">illimités</span> — Plan Enterprise</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted">{profile?.messages_used || 0} utilisés</span>
              <span className="font-bold text-secondary">{usageStatus.limit} / mois</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden border border-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(usageStatus.percentage, 100)}%` }}
                transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                className={cn(
                  "h-full rounded-full",
                  usageStatus.percentage > 90 ? "bg-danger" : usageStatus.percentage > 70 ? "bg-warning" : "bg-primary"
                )}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted">{usageStatus.percentage}% utilisé</p>
              <a href="/settings/plan" className="text-xs text-primary font-semibold hover:underline">
                Gérer le plan →
              </a>
            </div>
            {usageStatus.percentage >= 100 && (
              <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-xs text-danger font-medium">Quota épuisé. <a href="/settings/plan" className="underline font-bold">Mettre à niveau votre plan</a> pour continuer.</p>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Paiement & Abonnement ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09 }}
        className="glass-card p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-secondary">Paiement & Abonnement</h3>
            <p className="text-xs text-muted">Gérez votre carte bancaire et vos factures</p>
          </div>
        </div>

        {/* Plan actuel */}
        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-secondary capitalize">
                Plan {profile?.plan_id || 'Starter'}
              </p>
              <p className="text-xs text-muted">
                {profile?.subscription_status === 'active'
                  ? 'Abonnement actif — renouvelé automatiquement'
                  : profile?.plan_id === 'starter'
                  ? 'Gratuit — pas de carte requise'
                  : 'Aucun abonnement actif'}
              </p>
            </div>
          </div>
          <a
            href="/settings/plan"
            className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors"
          >
            Changer de plan
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Carte bancaire via Stripe Billing Portal */}
        {profile?.plan_id && profile.plan_id !== 'starter' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary">Carte bancaire</p>
                <p className="text-xs text-muted">
                  Stockée de manière sécurisée par Stripe (PCI DSS Level 1). Bouba ne voit jamais votre numéro.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenBillingPortal}
              disabled={isOpeningPortal}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-2xl font-semibold text-sm hover:bg-secondary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {isOpeningPortal ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ouverture du portail…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Gérer ma carte & mes factures
                  <ArrowUpRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </button>

            <p className="text-xs text-muted text-center px-2">
              Vous serez redirigé vers le portail sécurisé de Stripe pour mettre à jour votre carte,
              consulter vos factures ou annuler votre abonnement.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted">
              Vous êtes sur le plan gratuit — aucune carte bancaire requise.
            </p>
            <a
              href="/settings/plan"
              className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Passer à Pro
            </a>
          </div>
        )}
      </motion.div>

      {/* ── Personal Information Form ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-secondary">Informations personnelles</h3>
            <p className="text-xs text-muted">Modifiez vos données de profil</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Prénom */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Prénom <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={e => handleInputChange('first_name', e.target.value)}
              className="input-bouba"
              placeholder="Votre prénom"
            />
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Nom <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={e => handleInputChange('last_name', e.target.value)}
              className="input-bouba"
              placeholder="Votre nom"
            />
          </div>

          {/* Email (readonly) */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Email professionnel
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="input-bouba opacity-60 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-muted">L'email ne peut pas être modifié pour des raisons de sécurité.</p>
          </div>

          {/* Langue */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Langue
            </label>
            <select
              value={formData.language}
              onChange={e => handleInputChange('language', e.target.value)}
              className="input-bouba"
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
              <option value="de">Allemand</option>
            </select>
          </div>

          {/* Fuseau horaire */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Fuseau horaire
            </label>
            <select
              value={formData.timezone}
              onChange={e => handleInputChange('timezone', e.target.value)}
              className="input-bouba"
            >
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
            </select>
          </div>

          {/* Type de travail */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Type de travail
            </label>
            <select
              value={formData.work_type}
              onChange={e => handleInputChange('work_type', e.target.value)}
              className="input-bouba"
            >
              <option value="">Sélectionner...</option>
              <option value="entrepreneur">Entrepreneur</option>
              <option value="freelance">Freelance</option>
              <option value="employee">Employé</option>
              <option value="consultant">Consultant</option>
              <option value="student">Étudiant</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className="btn-primary flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mise à jour…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Connections ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-secondary">Connexions</h3>
              <p className="text-xs text-muted">Services connectés à votre compte</p>
            </div>
          </div>
          <a
            href="/settings/connections"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Gérer les connexions
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {featuredConnections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredConnections.map(conn => {
              const meta = getConnectionMeta(conn.id)
              const isConnected = conn.status === 'connected'
              return (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'rounded-2xl border p-4 flex items-start gap-3 transition-shadow hover:shadow-card',
                    meta.bg
                  )}
                >
                  <div className={cn('mt-0.5 shrink-0', meta.color)}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-secondary truncate">{meta.label}</p>
                    {conn.email && (
                      <p className="text-xs text-muted truncate">{conn.email}</p>
                    )}
                    {conn.lastSync && isConnected && (
                      <p className="text-xs text-muted mt-0.5">
                        Sync {new Date(conn.lastSync).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Lié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <XCircle className="w-3 h-3" /> Non lié
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* Show all connections if no featured ones */
          connections && connections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {connections.slice(0, 6).map(conn => {
                const meta = getConnectionMeta(conn.id)
                const isConnected = conn.status === 'connected'
                return (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'rounded-2xl border p-4 flex items-start gap-3 transition-shadow hover:shadow-card',
                      meta.bg
                    )}
                  >
                    <div className={cn('mt-0.5 shrink-0', meta.color)}>{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary truncate">{conn.name}</p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {isConnected ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center">
                <Link2 className="w-7 h-7 text-muted" />
              </div>
              <p className="text-sm font-semibold text-secondary">Aucune connexion configurée</p>
              <p className="text-xs text-muted max-w-xs">
                Connectez Gmail, Calendar et vos autres services pour enrichir Bouba.
              </p>
              <a href="/settings/connections" className="btn-primary mt-1 text-sm py-2 px-5">
                Connecter un service
              </a>
            </div>
          )
        )}
      </motion.div>

      {/* ── RGPD ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-secondary">Protection des données (RGPD)</h3>
            <p className="text-xs text-muted">Portabilité et suppression de vos données personnelles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportData}
            className="group flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 hover:border-blue-300 transition-all text-left"
          >
            <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center text-blue-600 transition-colors shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-secondary">Exporter mes données</p>
              <p className="text-xs text-muted mt-0.5">Télécharger une copie de vos données (Art. 20)</p>
            </div>
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="group flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 hover:border-red-300 transition-all text-left disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center text-danger transition-colors shrink-0">
              {isDeleting ? (
                <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="font-semibold text-danger">Supprimer mon compte</p>
              <p className="text-xs text-red-500 mt-0.5">Effacer définitivement toutes vos données (Art. 17)</p>
            </div>
          </button>
        </div>

        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-0.5">Note sur la sécurité</p>
            <p className="text-amber-700 leading-relaxed">
              Vos jetons d'accès Google sont chiffrés avec l'algorithme AES-256 avant stockage.
              Bouba ne stocke aucun mot de passe et utilise des sessions JWT sécurisées.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Company Information ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="glass-card p-6 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-secondary text-lg">Mon Entreprise</h2>
            <p className="text-xs text-muted">Utilisé dans vos documents (factures, devis, etc.)</p>
          </div>
        </div>

        {/* Logo upload */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-background overflow-hidden flex-shrink-0">
            {companyForm.logo ? (
              <>
                <img src={companyForm.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                <button
                  onClick={() => setCompanyForm(f => ({ ...f, logo: '' }))}
                  className="absolute top-1 right-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <Building2 className="w-8 h-8 text-muted/40" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-secondary mb-1">Logo de l'entreprise</p>
            <p className="text-xs text-muted mb-2">PNG, JPG, SVG — max 500 Ko. Apparaît sur vos documents.</p>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {companyForm.logo ? 'Changer le logo' : 'Télécharger un logo'}
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Company name */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Nom de l'entreprise *
            </label>
            <input
              value={companyForm.name}
              onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ma Société SAS"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Legal form */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Forme juridique</label>
            <select
              value={companyForm.legalForm}
              onChange={e => setCompanyForm(f => ({ ...f, legalForm: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none"
            >
              <option value="">Choisir...</option>
              {['Auto-entrepreneur', 'EI', 'EIRL', 'SARL', 'SAS', 'SASU', 'SA', 'EURL', 'SCI', 'Association'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <Phone className="w-3 h-3" /> Téléphone
            </label>
            <input
              value={companyForm.phone}
              onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+33 1 23 45 67 89"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email professionnel
            </label>
            <input
              type="email"
              value={companyForm.email}
              onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))}
              placeholder="contact@masociete.fr"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Website */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <Globe className="w-3 h-3" /> Site web
            </label>
            <input
              value={companyForm.website}
              onChange={e => setCompanyForm(f => ({ ...f, website: e.target.value }))}
              placeholder="www.masociete.fr"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Address */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Adresse
            </label>
            <input
              value={companyForm.address}
              onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
              placeholder="10 rue de la Paix"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Postal code + city */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Code postal</label>
            <input
              value={companyForm.postalCode}
              onChange={e => setCompanyForm(f => ({ ...f, postalCode: e.target.value }))}
              placeholder="75001"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Ville</label>
            <input
              value={companyForm.city}
              onChange={e => setCompanyForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Paris"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Country */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Pays</label>
            <input
              value={companyForm.country}
              onChange={e => setCompanyForm(f => ({ ...f, country: e.target.value }))}
              placeholder="France"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* SIRET */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <Hash className="w-3 h-3" /> SIRET
            </label>
            <input
              value={companyForm.siret}
              onChange={e => setCompanyForm(f => ({ ...f, siret: e.target.value }))}
              placeholder="12345678901234"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* VAT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">N° TVA intracommunautaire</label>
            <input
              value={companyForm.vat}
              onChange={e => setCompanyForm(f => ({ ...f, vat: e.target.value }))}
              placeholder="FR 12 345678901"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* IBAN */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> IBAN (optionnel)
            </label>
            <input
              value={companyForm.iban}
              onChange={e => setCompanyForm(f => ({ ...f, iban: e.target.value }))}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Bank name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Banque</label>
            <input
              value={companyForm.bankName}
              onChange={e => setCompanyForm(f => ({ ...f, bankName: e.target.value }))}
              placeholder="BNP Paribas"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveCompany}
            disabled={isSavingCompany}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
          >
            {isSavingCompany ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder l'entreprise
          </button>
        </div>
      </motion.div>
    </div>
  )
}
