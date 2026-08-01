import { useState, useEffect } from 'react';

/**
 * Hook pour détecter si l'utilisateur est sur mobile
 * Basé sur la largeur d'écran et le user agent
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      
      // Breakpoints Tailwind
      setIsMobile(width < 768);  // < md
      setIsTablet(width >= 768 && width < 1024); // md à lg
    };

    // Vérifier immédiatement
    checkMobile();

    // Écouter les changements de taille
    window.addEventListener('resize', checkMobile);
    
    // Nettoyer
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenWidth,
  };
}

/**
 * Hook pour détecter l'orientation
 */
export function useOrientation() {
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.matchMedia('(orientation: portrait)').matches);
    };

    checkOrientation();
    
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    mediaQuery.addEventListener('change', checkOrientation);
    
    return () => mediaQuery.removeEventListener('change', checkOrientation);
  }, []);

  return {
    isPortrait,
    isLandscape: !isPortrait,
  };
}

/**
 * Hook pour détecter les capacités tactiles
 */
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Méthode 1: Vérifier si l'appareil supporte le touch
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       (navigator as any).msMaxTouchPoints > 0;
      
      // Méthode 2: Vérifier le user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /mobile|android|iphone|ipad|ipod/.test(userAgent);
      
      setIsTouchDevice(hasTouch || isMobileUA);
    };

    checkTouch();
  }, []);

  return isTouchDevice;
}

/**
 * Hook pour gérer le viewport mobile (éviter le zoom sur input)
 */
export function useMobileViewport() {
  useEffect(() => {
    // Ajouter un meta viewport pour mobile
    const metaViewport = document.querySelector('meta[name="viewport"]');
    
    if (metaViewport) {
      // Sauvegarder la valeur originale
      const originalContent = metaViewport.getAttribute('content') || '';
      
      // Mettre à jour pour mobile
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        metaViewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      // Restaurer à la destruction
      return () => {
        metaViewport.setAttribute('content', originalContent);
      };
    }
  }, []);
}

/**
 * Utilitaire pour les classes responsive conditionnelles
 */
export function responsiveClass(
  mobileClass: string,
  tabletClass: string = '',
  desktopClass: string = ''
): string {
  const { isMobile, isTablet } = useMobile();
  
  if (isMobile) return mobileClass;
  if (isTablet) return tabletClass || mobileClass;
  return desktopClass || tabletClass || mobileClass;
}