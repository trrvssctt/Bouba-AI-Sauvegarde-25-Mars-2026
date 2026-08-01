import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { useBrandingStore, applyBrandingToDOM, DEFAULT_BRANDING } from '../stores/brandingStore'

/**
 * Initialise et synchronise le thème utilisateur.
 *
 * Isolation par compte :
 * - Au montage, on compare l'userId stocké dans le store avec celui en
 *   localStorage. Si c'est un compte différent, on remet les défauts
 *   immédiatement (pas de flash du mauvais thème).
 * - Quand le profil arrive du serveur, on charge les préférences du bon compte.
 * - Quand l'utilisateur se déconnecte (profile → null), on remet les défauts.
 * - Quand un nouvel utilisateur se connecte (userId change), on remet les
 *   défauts avant de charger ses préférences.
 */
export function useTheme() {
  const { profile } = useAuth()
  const { settings, loadFromPreferences, reset } = useBrandingStore()
  const prevUserIdRef = useRef<string | null>(null)

  // ── 1. Vérification au montage ────────────────────────────────────────────
  useEffect(() => {
    const store = useBrandingStore.getState()

    // Lire l'userId depuis le localStorage auth (disponible avant le profil)
    let authUserId: string | null = null
    try {
      const raw = localStorage.getItem('bouba_user_data')
      if (raw) authUserId = JSON.parse(raw)?.id ?? null
    } catch {}

    if (
      store.currentUserId !== null &&
      authUserId !== null &&
      store.currentUserId !== authUserId
    ) {
      // Les settings en mémoire appartiennent à un autre compte → défauts
      applyBrandingToDOM(DEFAULT_BRANDING)
    } else {
      // Même utilisateur (ou première visite) → appliquer ce qui est stocké
      applyBrandingToDOM(store.settings)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Synchronisation quand le profil change ─────────────────────────────
  useEffect(() => {
    const currentId = profile?.id ?? null

    if (!currentId) {
      // Déconnexion ou pas encore chargé
      if (prevUserIdRef.current !== null) {
        // L'utilisateur vient de se déconnecter → défauts
        reset()
      }
      prevUserIdRef.current = null
      return
    }

    if (prevUserIdRef.current !== null && prevUserIdRef.current !== currentId) {
      // Changement de compte dans la même session → défauts d'abord
      reset()
    }

    prevUserIdRef.current = currentId

    // Charger les préférences du bon compte (reset interne si userId change)
    if (profile?.preferences !== undefined) {
      loadFromPreferences(profile.preferences ?? {}, currentId)
    }
  }, [profile?.id, profile?.preferences, loadFromPreferences, reset])

  // ── 3. Réagir aux changements de préférence système (mode "auto") ─────────
  useEffect(() => {
    if (settings.theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyBrandingToDOM(settings)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings])
}
