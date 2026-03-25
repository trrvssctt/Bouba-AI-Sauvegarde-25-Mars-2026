
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Home, ArrowLeft, Bot } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-md"
      >
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-primary/10 text-primary rounded-[40px] flex items-center justify-center mx-auto">
            <Bot className="w-16 h-16" />
          </div>
          <div className="absolute -top-2 -right-2 bg-danger text-white text-4xl font-display font-bold px-4 py-2 rounded-2xl shadow-lg rotate-12">
            404
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold text-secondary">Oups ! Page introuvable.</h1>
          <p className="text-lg text-muted">
            Même Bouba ne peut pas trouver ce que vous cherchez ici. Il semble que ce lien soit rompu ou que la page ait été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/dashboard" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4">
            <Home className="w-5 h-5" />
            Retour au Dashboard
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="btn-ghost border border-border w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </button>
        </div>
      </motion.div>
    </div>
  )
}
