/**
 * Intégration n8n — parseur de réponse unique et appel webhook avec timeout.
 *
 * Contrat de réponse n8n v3.0 (succès comme erreur) :
 *   { success, output, message, agent, sessionId, tokens_used, type }
 * `success: false` signifie que l'agent a planté : le message d'erreur
 * utilisateur est dans `output`. Il n'y a plus de variantes par agent.
 */

// Valeurs valides pour la contrainte CHECK de messages.agent_used
export const VALID_AGENTS = new Set(['email', 'calendar', 'contacts', 'finance', 'search', 'rag', 'general']);

export function normalizeAgent(agent?: string | null): string | null {
  if (!agent) return null;
  const lower = agent.toLowerCase();
  if (VALID_AGENTS.has(lower)) return lower;
  // Mapper les noms d'agents n8n historiques vers les valeurs valides
  if (lower.includes('email') || lower.includes('mail')) return 'email';
  if (lower.includes('calendar') || lower.includes('agenda')) return 'calendar';
  if (lower.includes('contact')) return 'contacts';
  if (lower.includes('finance') || lower.includes('comptab')) return 'finance';
  if (lower.includes('search') || lower.includes('rag') || lower.includes('vector')) return 'search';
  return 'general';
}

export interface ParsedN8nResponse {
  success: boolean;
  output: string;
  agent: string;
  suggestion?: string;
  suggestions?: string[];
  tokensUsed: number;
  /** Champs additionnels éventuels (actions du mode démo, etc.) */
  raw?: any;
}

const GENERIC_ERROR = "Bouba n'a pas pu traiter votre demande. Réessayez dans un instant.";

/**
 * Parseur unique de la réponse n8n. Ne lève JAMAIS d'exception :
 * toute forme inattendue → { success: false, output: <message propre> }.
 * Tolère : tableau ([{...}] → premier élément), string JSON, string brute.
 */
export function parseN8nResponse(rawInput: unknown): ParsedN8nResponse {
  try {
    let raw: any = rawInput;

    // String → tenter JSON.parse, sinon la string est l'output direct
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return failure('Réponse n8n vide');
      try {
        raw = JSON.parse(trimmed);
        // Double encodage (fréquent selon les versions n8n)
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch { /* garder la string */ }
        }
      } catch {
        return {
          success: true,
          output: trimmed,
          agent: 'general',
          tokensUsed: 0,
        };
      }
    }

    // Tableau → premier élément
    if (Array.isArray(raw)) raw = raw[0];

    if (raw === null || typeof raw !== 'object') {
      return failure(`Forme inattendue: ${typeof raw}`, rawInput);
    }

    const output = firstString(raw.output, raw.message, raw.text, raw.response) ?? '';
    if (!output.trim()) {
      return failure('output vide', rawInput);
    }

    // success absent → true (rétro-compatibilité) ; false explicite → erreur agent
    const success = raw.success !== false;
    const agent = normalizeAgent(typeof raw.agent === 'string' ? raw.agent : 'general') || 'general';
    const tokensUsed = typeof raw.tokens_used === 'number' ? raw.tokens_used : 0;

    const parsed: ParsedN8nResponse = { success, output: output.trim(), agent, tokensUsed, raw };
    if (typeof raw.suggestion === 'string' && raw.suggestion.trim()) parsed.suggestion = raw.suggestion;
    if (Array.isArray(raw.suggestions)) {
      parsed.suggestions = raw.suggestions.filter((s: unknown) => typeof s === 'string');
    }
    return parsed;
  } catch (err) {
    return failure(`Exception parseur: ${err}`, rawInput);
  }
}

function failure(reason: string, rawInput?: unknown): ParsedN8nResponse {
  const preview = rawInput !== undefined
    ? ` — raw: ${safeStringify(rawInput).slice(0, 500)}`
    : '';
  console.error(`[n8n] parseN8nResponse: ${reason}${preview}`);
  return { success: false, output: GENERIC_ERROR, agent: 'general', tokensUsed: 0 };
}

function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

// ─────────────────────────────────────────────────────────────────
// Appel webhook avec timeout et mesure de latence
// ─────────────────────────────────────────────────────────────────

/** Le frontend coupe à 60 s : le backend doit échouer proprement avant. */
export const N8N_TIMEOUT_MS = 50_000;
const SLOW_CALL_THRESHOLD_MS = 15_000;

export interface N8nCallResult {
  /** false = échec transport (HTTP ≠ 2xx, réseau, timeout) — parsed contient le message utilisateur */
  ok: boolean;
  /** Statut HTTP (0 si réseau/timeout) — permet le repli mode démo sur 404 */
  status: number;
  timedOut: boolean;
  parsed: ParsedN8nResponse;
  durationMs: number;
}

export async function callN8nWebhook(
  url: string,
  payload: unknown,
  agentLabel: string
): Promise<N8nCallResult> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - startedAt;
    logLatency(agentLabel, durationMs);

    const text = await response.text();

    if (!response.ok) {
      console.error(`[n8n] HTTP ${response.status} (${agentLabel}): ${text.slice(0, 500)}`);
      return {
        ok: false,
        status: response.status,
        timedOut: false,
        durationMs,
        parsed: {
          success: false,
          output: GENERIC_ERROR,
          agent: 'general',
          tokensUsed: 0,
        },
      };
    }

    return {
      ok: true,
      status: response.status,
      timedOut: false,
      durationMs,
      parsed: parseN8nResponse(text),
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const timedOut = err instanceof Error && err.name === 'AbortError';
    logLatency(agentLabel, durationMs);
    if (timedOut) {
      console.error(`[n8n] TIMEOUT après ${durationMs}ms (${agentLabel})`);
    } else {
      console.error(`[n8n] Erreur réseau (${agentLabel}):`, err);
    }
    return {
      ok: false,
      status: 0,
      timedOut,
      durationMs,
      parsed: {
        success: false,
        output: timedOut
          ? 'Bouba met trop de temps à répondre. Réessayez.'
          : GENERIC_ERROR,
        agent: 'general',
        tokensUsed: 0,
      },
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function logLatency(agentLabel: string, durationMs: number) {
  if (durationMs > SLOW_CALL_THRESHOLD_MS) {
    console.warn('[n8n]', agentLabel, `${durationMs}ms (LENT > ${SLOW_CALL_THRESHOLD_MS / 1000}s)`);
  } else {
    console.log('[n8n]', agentLabel, `${durationMs}ms`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Plafonnement du payload (lenteur = tokens)
// ─────────────────────────────────────────────────────────────────

export function truncateText(text: string, max: number): string {
  if (typeof text !== 'string') return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** history : max 6 messages, contenu tronqué à 600 caractères. */
export function capHistory(
  history: unknown
): Array<{ role: string; content: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m: any) => m && typeof m.content === 'string' && typeof m.role === 'string')
    .slice(-6)
    .map((m: any) => ({ role: m.role, content: truncateText(m.content, 600) }));
}

/** memories : max 15 entrées, valeur tronquée à 300 caractères. */
export function capMemories(
  memories: Array<{ key: string; value: any }>
): Array<{ key: string; value: string }> {
  return (memories || []).slice(0, 15).map(m => ({
    key: m.key,
    value: truncateText(typeof m.value === 'string' ? m.value : safeStringify(m.value), 300),
  }));
}

/** context (données de page) : tronqué à 4000 caractères, avec log si tronqué. */
export function capPageContext(context: unknown): string | undefined {
  if (typeof context !== 'string' || !context.trim()) return undefined;
  if (context.length > 4000) {
    console.warn(`[n8n] context de page tronqué: ${context.length} → 4000 caractères`);
    return context.slice(0, 4000) + '…';
  }
  return context;
}
