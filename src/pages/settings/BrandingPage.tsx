import { useState } from 'react'
import { motion } from 'motion/react'
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Smartphone, 
  Check, 
  Download, 
  Upload,
  Eye,
  Settings,
  Sparkles,
  Lock
} from 'lucide-react'
import { useAuth } from '@/src/hooks/useAuth'
import { usePlans } from '@/src/hooks/usePlans'
import { toast } from 'sonner'

export default function BrandingPage() {
  const { profile } = useAuth()
  const { hasFeatureAccess } = usePlans()
  const [theme, setTheme] = useState('light')
  const [accentColor, setAccentColor] = useState('#3B82F6')
  const [fontSize, setFontSize] = useState('medium')
  const [showPreview, setShowPreview] = useState(false)
  
  const hasWhiteLabelAccess = hasFeatureAccess('whitelabel')

  const themes = [
    { id: 'light', name: 'Clair', icon: Sun, preview: 'bg-white text-gray-900' },
    { id: 'dark', name: 'Sombre', icon: Moon, preview: 'bg-gray-900 text-white' },
    { id: 'auto', name: 'Automatique', icon: Monitor, preview: 'bg-gradient-to-r from-white to-gray-900' }
  ]

  const colors = [
    { name: 'Bleu', value: '#3B82F6' },
    { name: 'Violet', value: '#8B5CF6' },
    { name: 'Rose', value: '#EC4899' },
    { name: 'Vert', value: '#10B981' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Rouge', value: '#EF4444' }
  ]

  const fontSizes = [
    { id: 'small', name: 'Petite', size: '14px' },
    { id: 'medium', name: 'Moyenne', size: '16px' },
    { id: 'large', name: 'Grande', size: '18px' }
  ]

  const handleSave = () => {
    toast.success('Préférences de personnalisation sauvegardées !')
  }

  const handleExportTheme = () => {
    const themeConfig = {
      theme,
      accentColor,
      fontSize,
      user: profile?.first_name
    }
    
    const blob = new Blob([JSON.stringify(themeConfig, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bouba-theme-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Thème exporté avec succès !')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent flex items-center">
          <Palette className="w-8 h-8 mr-3 text-blue-600" />
          Personnalisation
        </h2>
        <p className="text-gray-600">Personnalisez l'apparence de Bouba'ia selon vos préférences.</p>
        
        {/* Plan limitations */}
        {!hasWhiteLabelAccess && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mt-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-6 h-6 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-800 text-lg">Fonctionnalité Enterprise</h3>
                <p className="text-sm text-purple-700 mt-2 leading-relaxed">
                  La personnalisation complète (white-label) est réservée aux utilisateurs Enterprise. 
                  Cela inclut la modification des thèmes, couleurs, logos et l'exportation de configurations personnalisées.
                </p>
                <button 
                  onClick={() => window.location.href = '/settings/plan'}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Découvrir Enterprise
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {!hasWhiteLabelAccess ? (
        // Affichage pour utilisateurs non-Enterprise  
        <div className="text-center py-16 space-y-6 opacity-60">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto">
            <Palette className="w-10 h-10 text-purple-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-600">Personnalisation Enterprise</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Créez votre propre identité visuelle avec des thèmes personnalisés, logo, couleurs et bien plus encore.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Inclus dans Enterprise :</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Thèmes personnalisés illimités</li>
              <li>• Logo et branding personnalisé</li>
              <li>• Export/Import de configurations</li>
              <li>• Interface white-label complète</li>
            </ul>
          </div>
        </div>
      ) : (
        // Contenu normal pour Enterprise
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Theme Selection */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Monitor className="w-5 h-5 mr-2 text-blue-600" />
              Thème d'interface
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === themeOption.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-20 rounded-lg mb-3 ${themeOption.preview} flex items-center justify-center`}>
                    <themeOption.icon className={`w-6 h-6 ${
                      themeOption.id === 'light' ? 'text-gray-900' : 
                      themeOption.id === 'dark' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <p className="font-medium text-gray-900">{themeOption.name}</p>
                  {theme === themeOption.id && (
                    <Check className="w-4 h-4 text-blue-600 mx-auto mt-2" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Color Selection */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Couleur d'accentuation
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accentColor === color.value
                      ? 'border-gray-400 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-2 shadow-sm"
                    style={{ backgroundColor: color.value }}
                  />
                  <p className="font-medium text-gray-900 text-sm">{color.name}</p>
                  {accentColor === color.value && (
                    <Check className="w-4 h-4 text-gray-600 mx-auto mt-2" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Custom Color Picker */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur personnalisée
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </motion.div>

          {/* Font Size */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-600" />
              Taille de police
            </h3>
            
            <div className="space-y-3">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setFontSize(size.id)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    fontSize === size.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{size.name}</p>
                      <p style={{ fontSize: size.size }} className="text-gray-600 mt-1">
                        Exemple de texte dans cette taille
                      </p>
                    </div>
                    {fontSize === size.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Preview Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1"
        >
          <div className="sticky top-6 space-y-6">
            {/* Live Preview */}
            <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-blue-600" />
                Aperçu
              </h3>
              
              <div 
                className={`rounded-xl border-2 p-4 transition-all ${
                  theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 
                  'bg-white text-gray-900 border-gray-200'
                }`}
                style={{ 
                  fontSize: fontSizes.find(s => s.id === fontSize)?.size,
                }}
              >
                <div className="space-y-3">
                  <div 
                    className="w-full h-2 rounded-full"
                    style={{ backgroundColor: accentColor + '20' }}
                  >
                    <div 
                      className="h-full w-3/4 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                  
                  <h4 className="font-bold">Interface Bouba'ia</h4>
                  <p className="text-sm opacity-75">
                    Voici à quoi ressemblera votre interface avec these paramètres.
                  </p>
                  
                  <button 
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: accentColor }}
                  >
                    Bouton d'action
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={handleSave}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Sauvegarder les paramètres
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleExportTheme}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </button>
                
                <button className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      )}
    </div>
  )
}
