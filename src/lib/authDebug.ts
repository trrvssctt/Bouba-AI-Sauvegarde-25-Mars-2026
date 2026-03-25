// Utilitaires de debug pour l'authentification
// Uniquement pour le développement

export const debugAuth = {
  // Vérifier l'état du localStorage
  checkLocalStorage: () => {
    console.log('🔍 État du localStorage:')
    const authKeys = [
      'onboarding_completed',
      'user_preference',
      'auth_token',
      'supabase.auth.token',
      'sb-eskohmvmbeazudcpanam-auth-token'
    ]
    
    authKeys.forEach(key => {
      const value = localStorage.getItem(key)
      console.log(`  ${key}: ${value ? '✅ Présent' : '❌ Absent'}`)
    })
  },

  // Nettoyer complètement le localStorage
  clearAll: () => {
    console.log('🧹 Nettoyage complet du localStorage...')
    const authKeys = [
      'onboarding_completed',
      'user_preference',
      'auth_token',
      'supabase.auth.token',
      'sb-eskohmvmbeazudcpanam-auth-token'
    ]
    
    authKeys.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    
    console.log('✅ Nettoyage terminé')
  },

  // Vérifier le statut Supabase
  checkSupabaseSession: async () => {
    try {
      const { default: supabase } = await import('./supabase')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log('🔍 Session Supabase:', {
        hasSession: !!session,
        user: session?.user?.email || 'Aucun',
        error: error?.message || 'Aucune'
      })
      
      return session
    } catch (error) {
      console.error('❌ Erreur lors de la vérification Supabase:', error)
      return null
    }
  }
}

// Exposer globalement en développement
if (import.meta.env.DEV) {
  (window as any).debugAuth = debugAuth
}