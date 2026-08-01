import { useState, useCallback } from 'react'
import { Email } from '@/src/stores/emailStore'
import { useBoubaAction } from './useBoubaAction'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

/** Fast AI call for pure text generation (no tool use needed) */
async function aiGenerate<T>(prompt: string, type: string, mimeType?: string): Promise<T | null> {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ prompt, type, responseMimeType: mimeType }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'AI error')
    return data.data as T
  } catch (err) {
    console.error('[EmailAI]', err)
    return null
  }
}

export function useEmailAI() {
  const [isGenerating, setIsGenerating] = useState(false)
  const { callBouba, isLoading: isBoubaLoading } = useBoubaAction()

  /** Résumé court en 2 phrases — pure génération, pas besoin de tools */
  const generateSummary = useCallback(async (email: Email): Promise<string> => {
    setIsGenerating(true)
    try {
      const body = (email.htmlBody || email.body).replace(/<[^>]*>/g, '').slice(0, 1000)
      const result = await aiGenerate<string>(
        `Résume cet email en exactement 2 phrases courtes et professionnelles.\nSujet: ${email.subject}\nDe: ${email.from} <${email.fromEmail}>\nÀ: ${email.to}\nDate: ${email.timestamp}\nContenu: ${body}`,
        'summary'
      )
      return result || 'Résumé indisponible.'
    } finally {
      setIsGenerating(false)
    }
  }, [])

  /** 3 réponses suggérées courtes */
  const generateSmartReplies = useCallback(async (email: Email): Promise<string[]> => {
    setIsGenerating(true)
    try {
      const body = (email.htmlBody || email.body).replace(/<[^>]*>/g, '').slice(0, 600)
      const result = await aiGenerate<string[]>(
        `Propose 3 réponses courtes (max 10 mots chacune, en français) pour cet email.\nRéponds uniquement avec un tableau JSON de strings.\nSujet: ${email.subject}\nDe: ${email.from}\nContenu: ${body}`,
        'smart_replies',
        'application/json'
      )
      return Array.isArray(result) ? result : ["D'accord, merci.", 'Je reviens vers vous.', 'Bien noté.']
    } finally {
      setIsGenerating(false)
    }
  }, [])

  /** Extrait une adresse email d'un texte libre */
  const extractEmail = (text: string): string =>
    text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/)?.[0] ?? ''

  /** Génère un brouillon (destinataire + sujet + corps) à partir d'une instruction via Bouba */
  const draftEmailFromPrompt = useCallback(async (prompt: string): Promise<{ to: string; subject: string; body: string }> => {
    setIsGenerating(true)
    try {
      // Extract email directly from prompt text (instant, no AI needed)
      const toFromText = extractEmail(prompt)

      const systemPrompt = [
        'INSTRUCTIONS: Tu es un assistant de rédaction email.',
        'Réponds UNIQUEMENT avec un JSON structuré (aucun autre texte) :',
        '{"to":"email@dest.com ou chaine vide","subject":"Objet du mail","body":"Corps du message en texte simple"}',
        'Extrais l\'adresse email du destinataire si présente. Rédige en français, ton professionnel.',
        'NE PAS envoyer l\'email — rédiger uniquement.',
        '',
        `Demande: ${prompt}`,
      ].join('\n')

      const result = await callBouba(systemPrompt)

      if (result.success && result.output) {
        const jsonMatch = result.output.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.subject || parsed.body) {
              return {
                to: toFromText || parsed.to || '',
                subject: parsed.subject || '',
                body: parsed.body || '',
              }
            }
          } catch {}
        }
        // JSON parsing failed — use raw output as body
        return { to: toFromText, subject: 'Nouveau message', body: result.output }
      }

      return { to: toFromText, subject: 'Nouveau message', body: '' }
    } finally {
      setIsGenerating(false)
    }
  }, [callBouba])

  /**
   * Demande à Bouba d'envoyer un email via l'agent Gmail (outil réel).
   * Le workflow n8n v3.0 lit les balises EXACTES ci-dessous telles quelles :
   * c'est le contrat de câblage le plus important de la page Email.
   * La confirmation d'envoi ne doit être affichée que si success === true.
   */
  const sendEmailViaBouba = useCallback(
    async (
      fields: { to: string; subject: string; bodyHtml: string },
      emailContext?: Email
    ): Promise<{ success: boolean; output: string; error?: string }> => {
      const tags = [
        `[EMAIL_TO]${fields.to}[/EMAIL_TO]`,
        `[EMAIL_SUBJECT]${fields.subject}[/EMAIL_SUBJECT]`,
        `[EMAIL_BODY_HTML]${fields.bodyHtml}[/EMAIL_BODY_HTML]`,
      ].join('\n')
      const context = emailContext
        ? `${tags}\n\n[CONTEXTE EMAIL ACTUEL]\nSujet: ${emailContext.subject}\nDe: ${emailContext.from} <${emailContext.fromEmail}>\nÀ: ${emailContext.to}\nDate: ${emailContext.timestamp}`
        : tags
      return callBouba(
        'Envoie cet email maintenant avec les informations fournies dans le contexte.',
        context
      )
    },
    [callBouba]
  )

  return {
    generateSummary,
    generateSmartReplies,
    draftEmailFromPrompt,
    sendEmailViaBouba,
    isGenerating: isGenerating || isBoubaLoading,
  }
}
