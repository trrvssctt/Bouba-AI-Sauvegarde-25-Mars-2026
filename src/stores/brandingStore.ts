import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type FontSize = 'small' | 'medium' | 'large'
export type FontFamily = 'dm-sans' | 'inter' | 'poppins' | 'nunito' | 'roboto'
export type BorderRadius = 'sharp' | 'rounded' | 'pill'

export interface BrandingSettings {
  theme: ThemeMode
  accentColor: string
  fontSize: FontSize
  fontFamily: FontFamily
  borderRadius: BorderRadius
}

export const DEFAULT_BRANDING: BrandingSettings = {
  theme: 'light',
  accentColor: '#6C3EF4',
  fontSize: 'medium',
  fontFamily: 'dm-sans',
  borderRadius: 'rounded',
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
}

const FONT_FAMILY_MAP: Record<FontFamily, { family: string; googleFont: string }> = {
  'dm-sans':  { family: '"DM Sans", sans-serif',  googleFont: 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600' },
  'inter':    { family: '"Inter", sans-serif',     googleFont: 'Inter:wght@400;500;600' },
  'poppins':  { family: '"Poppins", sans-serif',   googleFont: 'Poppins:wght@400;500;600' },
  'nunito':   { family: '"Nunito", sans-serif',    googleFont: 'Nunito:wght@400;500;600' },
  'roboto':   { family: '"Roboto", sans-serif',    googleFont: 'Roboto:wght@400;500;700' },
}

const BORDER_RADIUS_MAP: Record<BorderRadius, { base: string; lg: string; xl: string; '2xl': string; full: string }> = {
  sharp:   { base: '0.25rem', lg: '0.375rem', xl: '0.5rem',  '2xl': '0.75rem', full: '0.375rem' },
  rounded: { base: '0.5rem',  lg: '0.75rem',  xl: '1rem',    '2xl': '1.25rem', full: '9999px' },
  pill:    { base: '1rem',    lg: '1.5rem',   xl: '2rem',    '2xl': '2.5rem',  full: '9999px' },
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function deriveAccentVariants(hex: string) {
  const hsl = hexToHsl(hex)
  if (!hsl) return { light: '#A78BFA', dark: '#4C1D95' }
  return {
    light: hslToHex(hsl.h, Math.min(100, hsl.s + 10), Math.min(90, hsl.l + 25)),
    dark:  hslToHex(hsl.h, Math.min(100, hsl.s + 5),  Math.max(10, hsl.l - 25)),
  }
}

function loadGoogleFont(googleFont: string) {
  const id = 'gf-' + googleFont.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`
  document.head.appendChild(link)
}

export function applyBrandingToDOM(settings: BrandingSettings) {
  const root = document.documentElement

  // Accent color + derived variants
  const { light, dark } = deriveAccentVariants(settings.accentColor)
  root.style.setProperty('--color-primary', settings.accentColor)
  root.style.setProperty('--color-primary-light', light)
  root.style.setProperty('--color-primary-dark', dark)

  // Font size — change html font-size so rem-based Tailwind scales
  root.style.fontSize = FONT_SIZE_MAP[settings.fontSize]

  // Font family — load and apply
  const fontConfig = FONT_FAMILY_MAP[settings.fontFamily]
  loadGoogleFont(fontConfig.googleFont)
  root.style.setProperty('--font-body', fontConfig.family)
  document.body.style.fontFamily = fontConfig.family

  // Border radius
  const radii = BORDER_RADIUS_MAP[settings.borderRadius]
  root.style.setProperty('--bouba-radius-base', radii.base)
  root.style.setProperty('--bouba-radius-lg', radii.lg)
  root.style.setProperty('--bouba-radius-xl', radii.xl)
  root.style.setProperty('--bouba-radius-2xl', radii['2xl'])
  root.style.setProperty('--bouba-radius-full', radii.full)
  root.style.setProperty('--radius-2xl', radii['2xl'])
  root.style.setProperty('--radius-3xl', radii['2xl'])

  // Dark / light / auto
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && prefersDark)
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface BrandingStore {
  settings: BrandingSettings
  /** ID de l'utilisateur dont les préférences sont actuellement chargées */
  currentUserId: string | null
  isSaving: boolean
  set: (partial: Partial<BrandingSettings>) => void
  apply: (partial: Partial<BrandingSettings>) => void
  /**
   * Charge les préférences depuis le profil serveur.
   * Si l'userId change, réinitialise d'abord aux valeurs par défaut.
   */
  loadFromPreferences: (prefs: Record<string, any>, userId: string) => void
  /** Remet le thème aux valeurs par défaut et efface l'userId courant */
  reset: () => void
  setSaving: (v: boolean) => void
}

export const useBrandingStore = create<BrandingStore>()(
  persist(
    (setState, getState) => ({
      settings: DEFAULT_BRANDING,
      currentUserId: null,
      isSaving: false,

      set: (partial) => {
        setState(s => ({ settings: { ...s.settings, ...partial } }))
      },

      apply: (partial) => {
        const merged = { ...getState().settings, ...partial }
        setState({ settings: merged })
        applyBrandingToDOM(merged)
      },

      loadFromPreferences: (prefs, userId) => {
        const prev = getState().currentUserId

        // Compte différent → on repart des défauts avant d'appliquer
        if (prev !== null && prev !== userId) {
          applyBrandingToDOM(DEFAULT_BRANDING)
        }

        const loaded: BrandingSettings = {
          ...DEFAULT_BRANDING,
          ...(prefs?.branding ?? {}),
        }
        setState({ settings: loaded, currentUserId: userId })
        applyBrandingToDOM(loaded)
      },

      reset: () => {
        setState({ settings: DEFAULT_BRANDING, currentUserId: null })
        applyBrandingToDOM(DEFAULT_BRANDING)
      },

      setSaving: (v) => setState({ isSaving: v }),
    }),
    { name: 'bouba-branding-v1' }
  )
)
