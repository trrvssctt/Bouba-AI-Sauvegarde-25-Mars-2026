import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string) => void
}

export function NewConversationModal({ isOpen, onClose, onConfirm }: NewConversationModalProps) {
  const [title, setTitle] = useState('')

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim())
      setTitle('')
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Nouvelle Conversation</h2>
                  <p className="text-white/80 text-sm">Donnez un nom à votre conversation</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="conversation-title" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de la conversation
                </label>
                <input
                  id="conversation-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Aide pour mon projet, Questions sur React..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  autoFocus
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {title.length}/50 caractères
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">💡 Conseil</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Choisissez un nom descriptif qui vous aidera à retrouver facilement cette conversation plus tard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!title.trim()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              Créer la conversation
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}