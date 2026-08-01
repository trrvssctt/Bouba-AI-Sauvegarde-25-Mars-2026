import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'gradient' | 'simple';
  className?: string;
}

export default function Logo({ 
  size = 'md', 
  showText = true, 
  variant = 'default',
  className = '' 
}: LogoProps) {
  const sizeClasses = {
    sm: {
      container: 'w-6 h-6',
      icon: 'h-3 w-3',
      text: 'text-sm'
    },
    md: {
      container: 'w-8 h-8',
      icon: 'h-4 w-4',
      text: 'text-base'
    },
    lg: {
      container: 'w-12 h-12',
      icon: 'h-6 w-6',
      text: 'text-xl'
    }
  };

  const variantClasses = {
    default: 'bg-gradient-to-br from-blue-600 to-blue-700',
    gradient: 'bg-gradient-to-br from-purple-600 to-pink-600',
    simple: 'bg-blue-600'
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-lg flex items-center justify-center shadow-sm',
        currentSize.container,
        currentVariant
      )}>
        {variant === 'gradient' ? (
          <Sparkles className={cn('text-white', currentSize.icon)} />
        ) : (
          <Bot className={cn('text-white', currentSize.icon)} />
        )}
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-display font-bold text-gray-900', currentSize.text)}>
            Bouba'IA
          </span>
          <span className="text-[10px] text-gray-500 -mt-1 hidden md:block">
            Assistant IA
          </span>
        </div>
      )}
    </div>
  );
}

// Logo pour mobile (compact)
export function MobileLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div>
        <span className="font-bold text-gray-900 text-base">Bouba'IA</span>
        <span className="text-[10px] text-gray-500 -mt-1 block">Assistant</span>
      </div>
    </div>
  );
}

// Logo pour header mobile
export function HeaderLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="font-display font-bold text-gray-900 text-lg">Bouba'IA</span>
        <span className="text-[11px] text-gray-500 -mt-1">AI Assistant</span>
      </div>
    </div>
  );
}