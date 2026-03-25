import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Check } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('bouba_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (type: 'all' | 'essential') => {
    localStorage.setItem('bouba_cookie_consent', type);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[400px] z-[100]"
        >
          <div className="glass-card p-6 shadow-2xl border-primary/20 bg-surface/95 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-secondary">Respect de votre vie privée</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Bouba utilise des cookies pour assurer le bon fonctionnement du service et analyser l'audience. 
                  Conformément au RGPD, vous pouvez choisir vos préférences.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => handleAccept('all')}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Tout accepter
              </button>
              <button
                onClick={() => handleAccept('essential')}
                className="w-full py-2.5 text-sm font-bold text-muted hover:text-secondary transition-colors"
              >
                Uniquement l'essentiel
              </button>
            </div>
            
            <p className="mt-4 text-[10px] text-center text-muted">
              Consultez notre <a href="/legal" className="underline">Politique de Confidentialité</a>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
