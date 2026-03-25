
import { motion } from 'motion/react'
import { LogOut, CheckCircle } from 'lucide-react'

interface LogoutToastProps {
  title: string
  description?: string
}

export const LogoutToast: React.FC<LogoutToastProps> = ({ title, description }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.3 }}
      className="bg-white border-l-4 border-green-500 shadow-lg rounded-lg p-4 max-w-sm"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {description && (
            <p className="text-xs text-gray-600">{description}</p>
          )}
        </div>
        <div className="ml-3 flex-shrink-0">
          <LogOut className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </motion.div>
  )
}

// Fonction utilitaire pour afficher le toast personnalisé
export const showLogoutSuccess = (customToast?: (component: React.ReactNode) => void) => {
  const toastComponent = (
    <LogoutToast 
      title="Déconnexion réussie" 
      description="À bientôt sur Bouba'ia !" 
    />
  )
  
  // Si un système de toast personnalisé est fourni, l'utiliser
  if (customToast) {
    customToast(toastComponent)
  }
  
  return toastComponent
}