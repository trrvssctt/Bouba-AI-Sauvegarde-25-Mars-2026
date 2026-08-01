/**
 * Parseur miroir des réponses Bouba (backend → frontend).
 *
 * Le backend normalise déjà les réponses n8n via api/lib/n8n.ts :
 *   /api/chat         → { success, output, agent, suggestions, actions, sessionId, mode }
 *   /api/bouba/action → { success, output, agent, suggestion, raw }
 * Ce module lit `success` et `output`, point — plus de cascade
 * output/message/text/response côté frontend (mission 2.1).
 * Tous les parseurs sont tolérants : jamais de crash sur une forme inattendue.
 */

export interface BoubaAction {
  type: string
  payload?: any
}

export interface BoubaApiResponse {
  success: boolean
  output: string
  agent: string
  suggestions: string[]
  actions: BoubaAction[]
  sessionId?: string
  mode?: string
  raw?: any
}

const GENERIC_ERROR = 'Désolé, je rencontre une difficulté technique. Peux-tu réessayer ?'

/** Lit la réponse JSON déjà normalisée par le backend. Tolérant, ne lève jamais. */
export function parseBoubaApiResponse(data: any): BoubaApiResponse {
  if (!data || typeof data !== 'object') {
    return { success: false, output: GENERIC_ERROR, agent: 'general', suggestions: [], actions: [] }
  }
  const output = typeof data.output === 'string' && data.output.trim() ? data.output.trim() : ''
  return {
    success: data.success === true && output !== '',
    output: output || (typeof data.error === 'string' ? data.error : GENERIC_ERROR),
    agent: typeof data.agent === 'string' ? data.agent : 'general',
    suggestions: sanitizeSuggestions(data.suggestions),
    actions: sanitizeActions(data.actions),
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
    mode: typeof data.mode === 'string' ? data.mode : undefined,
    raw: data.raw ?? data,
  }
}

function sanitizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((s): s is string => typeof s === 'string' && s.trim() !== '').slice(0, 6)
}

function sanitizeActions(value: unknown): BoubaAction[] {
  if (!Array.isArray(value)) return []
  return value.filter((a): a is BoubaAction => !!a && typeof a === 'object' && typeof (a as any).type === 'string')
}

/**
 * Bloc `---SUGGESTIONS---` embarqué dans le texte (tolérant : espaces,
 * retours ligne, JSON invalide → suggestions ignorées silencieusement).
 */
export function extractEmbeddedSuggestions(text: string): { visibleText: string; suggestions: string[] } {
  const match = text.match(/^([\s\S]*?)\s*-{3,}\s*SUGGESTIONS\s*-{3,}\s*([\s\S]*)$/i)
  if (!match) return { visibleText: text.trim(), suggestions: [] }
  let suggestions: string[] = []
  try {
    const parsed = JSON.parse(match[2].trim())
    suggestions = sanitizeSuggestions(parsed)
  } catch {
    // JSON invalide → on ignore, jamais de crash
  }
  return { visibleText: match[1].trim(), suggestions }
}

/**
 * Balises `[ACTION:TYPE key="value" ...]` dans le texte de la réponse.
 * Parsing tolérant : balise malformée → ignorée, le texte reste affiché.
 */
export function parseActionTokens(text: string): {
  cleanText: string
  actions: Array<{ type: string; params: Record<string, string> }>
} {
  const actions: Array<{ type: string; params: Record<string, string> }> = []
  let cleanText = text
  try {
    const actionRegex = /\[ACTION:\s*(\w+)((?:\s+\w+\s*=\s*"[^"]*")*)\s*\]/g
    cleanText = text.replace(actionRegex, (_match, type: string, paramsStr: string) => {
      const params: Record<string, string> = {}
      const paramRegex = /(\w+)\s*=\s*"([^"]*)"/g
      let m: RegExpExecArray | null
      while ((m = paramRegex.exec(paramsStr)) !== null) {
        params[m[1]] = m[2]
      }
      actions.push({ type, params })
      return ''
    }).trim()
  } catch (err) {
    console.warn('[Bouba] parseActionTokens: balise ignorée', err)
  }
  return { cleanText, actions }
}

/** Tronque le contexte de page avant envoi (défense en profondeur — le backend tronque aussi). */
export function capContext(context: string | undefined, max = 4000): string | undefined {
  if (!context) return undefined
  return context.length > max ? context.slice(0, max) + '…' : context
}
