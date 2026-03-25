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

  /** Génère un brouillon (sujet + corps HTML) à partir d'une instruction */
  const draftEmailFromPrompt = useCallback(async (prompt: string): Promise<{ subject: string; body: string }> => {
    setIsGenerating(true)
    try {
      const result = await aiGenerate<{ subject: string; body: string }>(
        `Rédige un email professionnel basé sur cette demande : "${prompt}".\nRéponds avec un objet JSON contenant 'subject' (string) et 'body' (HTML simple, sans balises html/head/body).\nTon professionnel et bienveillant, en français.`,
        'email_draft',
        'application/json'
      )
      if (result && typeof result === 'object' && result.subject) return result
      return {
        subject: 'Réponse à votre demande',
        body: '<p>Bonjour,</p><p>Faisant suite à votre demande, voici ma réponse.</p><p>Cordialement</p>',
      }
    } finally {
      setIsGenerating(false)
    }
  }, [])

  /**
   * Demande à Bouba d'envoyer un email via l'agent Gmail (outil réel).
   * Ex: "Envoie un mail de relance à seydou.dianka@uahb.sn"
   */
  const sendEmailViaBouba = useCallback(
    async (instruction: string, emailContext?: Email): Promise<{ success: boolean; output: string; error?: string }> => {
      const context = emailContext
        ? `[CONTEXTE EMAIL ACTUEL]\nSujet: ${emailContext.subject}\nDe: ${emailContext.from} <${emailContext.fromEmail}>\nÀ: ${emailContext.to}\nDate: ${emailContext.timestamp}`
        : undefined
      return callBouba(instruction, context)
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
