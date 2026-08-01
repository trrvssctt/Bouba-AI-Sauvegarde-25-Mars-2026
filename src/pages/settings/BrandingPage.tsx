import { useCallback } from 'react'
import { motion } from 'motion/react'
import {
  Palette,
  Monitor,
  Sun,
  Moon,
  Check,
  Download,
  Upload,
  Type,
  Squircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/src/hooks/useAuth'
import { useBrandingStore, applyBrandingToDOM } from '@/src/stores/brandingStore'
import type { BrandingSettings, ThemeMode, FontSize, FontFamily, BorderRadius } from '@/src/stores/brandingStore'
import { toast } from 'sonner'

// ─── Data ────────────────────────────────────────────────────────────────────

const THEMES: { id: ThemeMode; label: string; Icon: typeof Sun; preview: string }[] = [
  { id: 'light', label: 'Clair',        Icon: Sun,     preview: 'bg-white text-gray-900 border-gray-200' },
  { id: 'dark',  label: 'Sombre',       Icon: Moon,    preview: 'bg-gray-900 text-white border-gray-700' },
  { id: 'auto',  label: 'Automatique',  Icon: Monitor, preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-300' },
]

const PRESET_COLORS = [
  { name: 'Violet',   value: '#6C3EF4' },
  { name: 'Bleu',     value: '#3B82F6' },
  { name: 'Indigo',   value: '#6366F1' },
  { name: 'Rose',     value: '#EC4899' },
  { name: 'Vert',     value: '#10B981' },
  { name: 'Orange',   value: '#F59E0B' },
  { name: 'Rouge',    value: '#EF4444' },
  { name: 'Cyan',     value: '#06B6D4' },
]

const FONT_SIZES: { id: FontSize; label: string; px: string; example: string }[] = [
  { id: 'small',  label: 'Petite',  px: '14px', example: 'Texte en taille petite' },
  { id: 'medium', label: 'Normale', px: '16px', example: 'Texte en taille normale' },
  { id: 'large',  label: 'Grande',  px: '18px', example: 'Texte en taille grande' },
]

const FONT_FAMILIES: { id: FontFamily; label: string; style: string }[] = [
  { id: 'dm-sans',  label: 'DM Sans',  style: '"DM Sans", sans-serif' },
  { id: 'inter',    label: 'Inter',    style: '"Inter", sans-serif' },
  { id: 'poppins',  label: 'Poppins',  style: '"Poppins", sans-serif' },
  { id: 'nunito',   label: 'Nunito',   style: '"Nunito", sans-serif' },
  { id: 'roboto',   label: 'Roboto',   style: '"Roboto", sans-serif' },
]

const BORDER_RADII: { id: BorderRadius; label: string; desc: string; preview: string }[] = [
  { id: 'sharp',   label: 'Angulaire', desc: 'Coins droits',    preview: 'rounded-sm' },
  { id: 'rounded', label: 'Arrondi',   desc: 'Coins doux',      preview: 'rounded-xl' },
  { id: 'pill',    label: 'Pill',      desc: 'Coins très ronds', preview: 'rounded-full' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function BrandingPage() {
  const { updateProfile } = useAuth()
  const { settings, apply, isSaving, setSaving } = useBrandingStore()

  // Apply locally (instant) then persist to DB
  const change = useCallback(
    async (partial: Partial<BrandingSettings>) => {
      apply(partial)
      const merged = { ...settings, ...partial }
      setSaving(true)
      try {
        const result = await updateProfile({
          preferences: { branding: merged } as any,
        })
        if (!result.success) toast.error('Erreur lors de la sauvegarde')
      } finally {
        setSaving(false)
      }
    },
    [apply, settings, updateProfile, setSaving]
  )

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `boubaia-theme-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Thème exporté !')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as Partial<BrandingSettings>
        await change(imported)
        toast.success('Thème importé et appliqué !')
      } catch {
        toast.error('Fichier invalide')
      }
    }
    input.click()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-secondary">
            <Palette className="w-6 h-6 text-primary" />
            Personnalisation
          </h2>
          <p className="text-sm text-muted">
            Les modifications s'appliquent instantanément et sont propres à votre compte.
          </p>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sauvegarde…
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Thème */}
          <Section
            title="Thème d'interface"
            Icon={Monitor}
            delay={0.05}
          >
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map(({ id, label, Icon, preview }) => (
                <button
                  key={id}
                  onClick={() => change({ theme: id })}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    settings.theme === id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-16 rounded-lg mb-2 border ${preview} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 opacity-60" />
                  </div>
                  <p className="text-sm font-medium text-secondary">{label}</p>
                  {settings.theme === id && (
                    <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* Couleur d'accentuation */}
          <Section title="Couleur principale" Icon={Palette} delay={0.1}>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.name}
                  onClick={() => change({ accentColor: c.value })}
                  className="relative group flex flex-col items-center gap-1"
                >
                  <div
                    className="w-9 h-9 rounded-full shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: c.value }}
                  />
                  {settings.accentColor === c.value && (
                    <Check className="absolute top-2 w-5 h-5 text-white drop-shadow" />
                  )}
                  <span className="text-[10px] text-gray-500 truncate w-full text-center">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => change({ accentColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs text-muted mb-1">Couleur personnalisée</p>
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                      if (e.target.value.length === 7) change({ accentColor: e.target.value })
                      else applyBrandingToDOM({ ...settings, accentColor: e.target.value })
                    }
                  }}
                  className="w-full text-sm font-mono px-2 py-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-secondary"
                  placeholder="#6C3EF4"
                />
              </div>
              <div
                className="w-10 h-10 rounded-xl shadow-sm shrink-0"
                style={{ backgroundColor: settings.accentColor }}
              />
            </div>
          </Section>

          {/* Taille de police */}
          <Section title="Taille de police" Icon={Type} delay={0.15}>
            <div className="space-y-2">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => change({ fontSize: s.id })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    settings.fontSize === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <div>
                    <span className="font-medium text-secondary">{s.label}</span>
                    <span
                      className="block text-muted mt-0.5"
                      style={{ fontSize: s.px }}
                    >
                      {s.example}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted">{s.px}</span>
                    {settings.fontSize === s.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Police de caractères */}
          <Section title="Police de caractères" Icon={Type} delay={0.2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => change({ fontFamily: f.id })}
                  className={`relative px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    settings.fontFamily === f.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <p
                    className="font-semibold text-secondary text-base"
                    style={{ fontFamily: f.style }}
                  >
                    {f.label}
                  </p>
                  <p
                    className="text-xs text-muted mt-0.5"
                    style={{ fontFamily: f.style }}
                  >
                    Aa Bb Cc 123
                  </p>
                  {settings.fontFamily === f.id && (
                    <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* Coins */}
          <Section title="Arrondi des coins" Icon={Squircle} delay={0.25}>
            <div className="grid grid-cols-3 gap-3">
              {BORDER_RADII.map((r) => (
                <button
                  key={r.id}
                  onClick={() => change({ borderRadius: r.id })}
                  className={`relative p-4 border-2 transition-all text-left ${
                    settings.borderRadius === r.id
                      ? 'border-primary bg-primary/5 rounded-xl'
                      : 'border-border hover:border-gray-300 rounded-xl'
                  }`}
                >
                  <div
                    className={`w-full h-10 mb-3 border-2 border-gray-300 bg-gray-100 ${r.preview}`}
                    style={{ backgroundColor: settings.accentColor + '30', borderColor: settings.accentColor + '60' }}
                  />
                  <p className="text-sm font-medium text-secondary">{r.label}</p>
                  <p className="text-xs text-muted">{r.desc}</p>
                  {settings.borderRadius === r.id && (
                    <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Right column — Aperçu ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="sticky top-6 space-y-4">
            {/* Live preview */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-secondary mb-4">Aperçu en direct</h3>
              <div
                className="rounded-xl border p-4 space-y-3 transition-all"
                style={{
                  backgroundColor: settings.theme === 'dark' ? '#1A1730' : '#ffffff',
                  borderColor: settings.theme === 'dark' ? '#2D2B4E' : '#E5E7EB',
                  color: settings.theme === 'dark' ? '#E2E8F0' : '#1E1B4B',
                  fontSize: FONT_SIZES.find(s => s.id === settings.fontSize)?.px,
                  fontFamily: FONT_FAMILIES.find(f => f.id === settings.fontFamily)?.style,
                  borderRadius: settings.borderRadius === 'sharp' ? '0.375rem' : settings.borderRadius === 'pill' ? '1.5rem' : '0.75rem',
                }}
              >
                {/* Barre de navigation simulée */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: settings.accentColor }}
                  />
                  <span className="font-bold text-xs">Bouba'ia</span>
                </div>

                {/* Badge */}
                <div className="flex gap-2 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2 py-1 text-white"
                    style={{
                      backgroundColor: settings.accentColor,
                      borderRadius: settings.borderRadius === 'sharp' ? '0.25rem' : settings.borderRadius === 'pill' ? '9999px' : '0.5rem',
                    }}
                  >
                    Nouveau
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-1"
                    style={{
                      backgroundColor: settings.accentColor + '20',
                      color: settings.accentColor,
                      borderRadius: settings.borderRadius === 'sharp' ? '0.25rem' : settings.borderRadius === 'pill' ? '9999px' : '0.5rem',
                    }}
                  >
                    Actif
                  </span>
                </div>

                {/* Titre */}
                <div>
                  <p className="font-bold">Tableau de bord</p>
                  <p className="text-xs opacity-60 mt-0.5">Vue d'ensemble de votre activité</p>
                </div>

                {/* Barre de progression */}
                <div
                  className="w-full h-2 overflow-hidden"
                  style={{
                    backgroundColor: settings.accentColor + '20',
                    borderRadius: '9999px',
                  }}
                >
                  <div
                    className="h-full w-2/3"
                    style={{ backgroundColor: settings.accentColor, borderRadius: '9999px' }}
                  />
                </div>

                {/* Bouton */}
                <button
                  className="w-full py-2 text-white text-sm font-semibold"
                  style={{
                    backgroundColor: settings.accentColor,
                    borderRadius: settings.borderRadius === 'sharp' ? '0.25rem' : settings.borderRadius === 'pill' ? '9999px' : '0.75rem',
                  }}
                >
                  Bouton principal
                </button>
              </div>
            </div>

            {/* Export / Import */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-secondary">Sauvegarde du thème</h3>
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-secondary rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Exporter (.json)
              </button>
              <button
                onClick={handleImport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-secondary rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                Importer un thème
              </button>
            </div>

            {/* Résumé des réglages */}
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-2 text-xs text-secondary">
              <p className="font-semibold text-secondary text-sm">Réglages actifs</p>
              <div className="flex items-center justify-between">
                <span>Thème</span>
                <span className="font-medium capitalize">{settings.theme === 'auto' ? 'Automatique' : settings.theme === 'dark' ? 'Sombre' : 'Clair'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Couleur</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: settings.accentColor }} />
                  <span className="font-mono">{settings.accentColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Police</span>
                <span className="font-medium">{FONT_FAMILIES.find(f => f.id === settings.fontFamily)?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taille</span>
                <span className="font-medium">{FONT_SIZES.find(s => s.id === settings.fontSize)?.px}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Coins</span>
                <span className="font-medium">{BORDER_RADII.find(r => r.id === settings.borderRadius)?.label}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  Icon,
  delay = 0,
  children,
}: {
  title: string
  Icon: React.ElementType
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-5"
    >
      <h3 className="text-base font-semibold text-secondary flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        {title}
      </h3>
      {children}
    </motion.div>
  )
}
