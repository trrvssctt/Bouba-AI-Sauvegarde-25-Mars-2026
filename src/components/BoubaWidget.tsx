import { useState, useRef, useEffect } from 'react'
import { X, Send, Mic, MicOff } from 'lucide-react'
import { useBouba } from '@/src/hooks/useBouba'
import { useAuth } from '@/src/hooks/useAuth'
import { useChatStore } from '@/src/stores/chatStore'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/lib/utils'
import MessageBubble from './chat/MessageBubble'
import AvatarBouba, { useAvatarAnimation, AvatarAnimation } from './AvatarBouba'

const QUICK_PROMPTS_DEFAULT = [
  'Rédige un email professionnel',
  "Quels sont mes RDV aujourd'hui ?",
  'Montre mes emails non lus',
  'Ajoute une dépense',
]

const QUICK_PROMPTS_ADMIN = [
  'Liste les utilisateurs en impayé depuis plus de 3 jours',
  'Analyse les logs d\'erreurs de cette semaine',
  'Donne-moi le MRR et les KPIs de croissance',
  'Rédige un message broadcast pour annoncer la sortie du module Contacts',
]

export default function BoubaWidget({ source }: { source?: string } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { sendMessage, isLoading, activeAgent } = useBouba(source)
  const { refreshProfile, profile } = useAuth()
  const QUICK_PROMPTS = source === 'admin' ? QUICK_PROMPTS_ADMIN : QUICK_PROMPTS_DEFAULT
  const { sessions, currentSessionId, createNewSession } = useChatStore()
  const { animation, play, playOnce } = useAvatarAnimation('idle')

  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const messages = currentSession?.messages.slice(-8) || []

  // Sync quota from server each time the widget opens (non-admin only)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  useEffect(() => {
    if (isOpen && !isAdmin) {
      refreshProfile()
    }
  }, [isOpen])

  // Drive avatar animation based on chat state
  useEffect(() => {
    if (isLoading) {
      play('thinking')
    } else if (!isOpen) {
      play('idle')
    } else {
      play('happy')
      setTimeout(() => play('idle'), 900)
    }
  }, [isLoading, isOpen])

  // Wave when a new assistant message arrives
  const lastMsgCount = useRef(messages.length)
  useEffect(() => {
    if (messages.length > lastMsgCount.current && !isLoading) {
      playOnce('wave', 1400)
    }
    lastMsgCount.current = messages.length
  }, [messages.length, isLoading])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    if (!currentSessionId) await createNewSession()
    playOnce('nod', 600)
    sendMessage(text)
  }

  const handleOpen = () => {
    setIsOpen((v) => {
      if (!v) playOnce('arrive', 900)
      else playOnce('wave', 800)
      return !v
    })
  }

  const handleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    if (isListening) { recognitionRef.current?.stop(); return }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => { setIsListening(true); play('search') }
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
    }
    recognition.onerror = () => { setIsListening(false); play('idle') }
    recognition.onend = () => { setIsListening(false); play('idle') }
    recognition.start()
  }

  const agentLabel = isLoading
    ? activeAgent ? `Agent ${activeAgent}…` : 'En train de réfléchir…'
    : isOpen ? 'Prêt à vous aider' : 'Demander à Bouba'

  // Determine which animation to show inside header (talking when responding)
  const headerAnim: AvatarAnimation = isLoading ? 'thinking' : messages.length > 0 ? 'talking' : 'happy'

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 flex flex-col items-center gap-1.5">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="bg-secondary text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap"
            >
              {isLoading ? agentLabel : 'Demander à Bouba'}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <AvatarBouba
            animation={animation}
            size={56}
            onClick={handleOpen}
            className={cn(
              'rounded-full border-2 shadow-xl transition-all',
              isOpen ? 'border-primary/80 shadow-primary/30' : 'border-white hover:border-primary/40',
              isLoading && 'ring-2 ring-primary ring-offset-2 ring-offset-white'
            )}
          />
          {isLoading && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border border-white"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-40 lg:bottom-32 right-4 lg:right-8 w-[calc(100vw-2rem)] sm:w-96 max-h-[520px] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col z-40 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-violet-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AvatarBouba
                  animation={headerAnim}
                  size={36}
                  className="rounded-full border-2 border-white/30 shrink-0"
                  autoIdle={false}
                />
                <div>
                  <p className="font-bold text-sm leading-none">Bouba</p>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {isLoading
                      ? activeAgent ? `Agent ${activeAgent} en cours…` : 'En train de réfléchir…'
                      : 'Assistant IA • Toujours disponible'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsOpen(false); play('wave') }}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[340px]"
            >
              {messages.length === 0 ? (
                <div className="text-center py-4 space-y-4">
                  <AvatarBouba animation="wave" size={64} className="mx-auto rounded-full shadow-lg" autoIdle={false} />
                  <div>
                    <p className="text-sm font-bold text-secondary">Bonjour ! Comment puis-je vous aider ?</p>
                    <p className="text-xs text-muted mt-1">Emails, agenda, contacts, finances…</p>
                  </div>
                  <div className="space-y-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => { setInput(prompt); playOnce('nod', 500) }}
                        className="block w-full text-left text-xs text-primary bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 transition-colors font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    {...msg}
                    onSuggestionClick={(s) => {
                      setInput(s)
                      inputRef.current?.focus()
                    }}
                  />
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 ml-2">
                  <AvatarBouba animation="thinking" size={24} className="rounded-full shrink-0" autoIdle={false} />
                  <div className="flex items-center gap-1 text-primary">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-background/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVoice}
                  className={cn(
                    'p-2 rounded-xl transition-all shrink-0',
                    isListening
                      ? 'bg-danger text-white animate-pulse'
                      : 'text-muted hover:text-primary hover:bg-primary/10'
                  )}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder="Parlez à Bouba…"
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary-dark transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
