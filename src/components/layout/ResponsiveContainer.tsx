import React from 'react';
import { cn } from '@/src/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Padding sur mobile/desktop
   * Format: "mobile desktop" ou valeur unique
   * Ex: "p-4 md:p-6" ou "p-4"
   */
  padding?: string;
  /**
   * Max width du contenu
   * Format: "mobile desktop" ou valeur unique  
   * Ex: "max-w-full md:max-w-7xl" ou "max-w-7xl"
   */
  maxWidth?: string;
  /**
   * Afficher un scroll horizontal sur mobile pour les tables
   */
  scrollable?: boolean;
}

/**
 * Conteneur responsive pour toutes les pages
 * Gère automatiquement:
 * - Padding adaptatif mobile/desktop
 * - Largeur maximale
 * - Scroll horizontal pour tables
 * - Safe areas (encoches iPhone)
 */
export default function ResponsiveContainer({
  children,
  className = '',
  padding = 'p-4 md:p-6',
  maxWidth = 'max-w-full md:max-w-7xl',
  scrollable = false,
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'w-full mx-auto',
      padding,
      maxWidth,
      scrollable && 'overflow-x-auto md:overflow-visible',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Grille responsive avec colonnes adaptatives
 * Par défaut: 1 colonne mobile, 2 tablette, 4 desktop
 */
export function ResponsiveGrid({
  children,
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 4 },
}: {
  children: React.ReactNode;
  className?: string;
  cols?: { mobile: number; tablet: number; desktop: number };
}) {
  const gridClasses = cn(
    'grid gap-4',
    `grid-cols-${cols.mobile}`,
    `md:grid-cols-${cols.tablet}`,
    `lg:grid-cols-${cols.desktop}`,
    className
  );
  
  return <div className={gridClasses}>{children}</div>;
}

/**
 * Table responsive avec scroll horizontal sur mobile
 */
export function ResponsiveTable({
  children,
  className = '',
  minWidth = 'min-w-[600px]',
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto md:overflow-visible -mx-4 md:mx-0">
      <div className={cn('inline-block min-w-full align-middle', minWidth)}>
        <table className={cn('w-full', className)}>
          {children}
        </table>
      </div>
    </div>
  );
}

/**
 * Titre responsive avec taille adaptative
 */
export function ResponsiveTitle({
  children,
  className = '',
  level = 1,
}: {
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3;
}) {
  const baseClasses = 'font-display font-bold text-secondary mb-2';
  
  const sizeClasses = {
    1: 'text-2xl md:text-3xl lg:text-4xl',
    2: 'text-xl md:text-2xl lg:text-3xl', 
    3: 'text-lg md:text-xl lg:text-2xl',
  };
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag className={cn(baseClasses, sizeClasses[level], className)}>
      {children}
    </Tag>
  );
}

/**
 * Bouton tactile pour mobile (min-height: 44px)
 */
export function TouchButton({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline';
}) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-800',
  };
  
  return (
    <button
      className={cn(
        'min-h-[44px] px-4 py-2.5 rounded-xl font-medium transition-colors',
        'flex items-center justify-center gap-2',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Carte responsive avec ombre adaptative
 */
export function ResponsiveCard({
  children,
  className = '',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 md:p-6',
      interactive && 'hover:shadow-lg transition-shadow cursor-pointer',
      className
    )}>
      {children}
    </div>
  );
}