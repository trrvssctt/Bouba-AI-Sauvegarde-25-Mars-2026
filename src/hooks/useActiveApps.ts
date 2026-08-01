import { useState, useEffect } from 'react'

/**
 * Catalogue des applications géré par l'admin (Paramètres → Applications).
 *
 * Le catalogue est AUTORITAIRE : une application désactivée OU supprimée du
 * catalogue n'est plus proposée nulle part (page Connexions, sidebar…).
 * Si le catalogue est injoignable (migration absente, erreur réseau), tout
 * reste visible — jamais de régression bloquante côté utilisateur.
 */
export function useActiveApps() {
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/apps', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.success && Array.isArray(j.data)) {
          setActiveIds(new Set(j.data.filter((a: any) => a.active !== false).map((a: any) => a.id)))
        }
      })
      .catch(() => { /* fallback : tout disponible */ })
      .finally(() => setLoaded(true))
  }, [])

  /** true si l'application est proposée aux utilisateurs. */
  const isAppAvailable = (id: string): boolean => {
    if (!loaded || activeIds === null) return true // catalogue absent → fallback permissif
    return activeIds.has(id)
  }

  /** Visibilité des entrées de navigation liées à une application. */
  const isNavAvailable = (path: string): boolean => {
    if (path.includes('/email')) return isAppAvailable('gmail') || isAppAvailable('office365')
    if (path.includes('/calendar')) return isAppAvailable('calendar') || isAppAvailable('googlemeet')
    if (path.includes('/contacts')) return isAppAvailable('contacts') || isAppAvailable('hubspot')
    if (path.includes('/trello')) return isAppAvailable('trello')
    if (path.includes('/finance')) return isAppAvailable('airtable')
    if (path.includes('/video')) return isAppAvailable('googlemeet')
    return true
  }

  return { isAppAvailable, isNavAvailable, loaded }
}
