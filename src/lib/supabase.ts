// Wrapper API qui remplace le client Supabase
// Importe le nouveau client API au lieu du vrai Supabase

// Re-export tout depuis le module API
export * from './api'
export { supabase as default, supabase } from './api'

// Note: Ce fichier conserve le nom 'supabase.ts' pour
// compatibilité avec les imports existants, mais utilise
// maintenant des appels API REST au lieu de Supabase
