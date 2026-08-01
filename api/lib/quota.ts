/**
 * Quota mensuel de messages — reset paresseux + contrôle d'épuisement.
 *
 * profiles.messages_used est remis à zéro au premier contrôle de quota du
 * mois (login, /api/chat, /api/bouba/action) : si le mois de quota_reset_at
 * est antérieur au mois courant, on reset AVANT de lire le compteur.
 * Nécessite la migration api/migrations/add_quota_reset_at.sql.
 */
import { query, queryOne } from './db';

export interface QuotaProfile {
  plan_id: string;
  messages_used: number;
  messages_limit: number | null;
  subscription_status: string | null;
}

// Limites de secours si profiles.messages_limit est NULL (aligné sur les plans actifs)
const FALLBACK_LIMITS: Record<string, number> = {
  free: 500,
  starter: 10000,
  business: -1,
  // anciens plans (profils non migrés éventuels)
  pro: 10000,
  enterprise: -1,
};

/**
 * Remet le compteur à zéro si on a changé de mois, puis renvoie le profil
 * avec son quota à jour. Renvoie null si le profil n'existe pas.
 */
export async function getProfileWithFreshQuota(userId: string): Promise<QuotaProfile | null> {
  try {
    // Reset paresseux : nouveau mois → compteur à zéro (atomique, idempotent)
    await query(
      `UPDATE public.profiles
       SET messages_used = 0, quota_reset_at = NOW(), updated_at = NOW()
       WHERE id = $1
         AND date_trunc('month', quota_reset_at) < date_trunc('month', NOW())`,
      [userId]
    );
  } catch (err) {
    // Colonne absente (migration non exécutée) : on continue sans reset
    console.warn('[QUOTA] Reset mensuel indisponible (migration add_quota_reset_at.sql exécutée ?):', (err as Error).message);
  }

  return queryOne<QuotaProfile>(
    'SELECT plan_id, messages_used, messages_limit, subscription_status FROM public.profiles WHERE id = $1',
    [userId]
  );
}

/** Limite effective du profil (-1 = illimité). */
export function effectiveLimit(profile: QuotaProfile): number {
  if (profile.messages_limit !== undefined && profile.messages_limit !== null) {
    return profile.messages_limit;
  }
  return FALLBACK_LIMITS[(profile.plan_id || 'free').toLowerCase()] ?? 500;
}

/** true si le quota mensuel est épuisé (jamais pour les plans illimités). */
export function isQuotaExhausted(profile: QuotaProfile): boolean {
  const limit = effectiveLimit(profile);
  return limit !== -1 && profile.messages_used >= limit;
}
