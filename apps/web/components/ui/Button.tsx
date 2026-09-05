import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-colors focus:outline-none active:scale-95';
  
  const variants = {
    primary: 'bg-primary text-dark hover:bg-primary-hover',
    secondary: 'bg-surface border border-brand text-white hover:bg-card',
    ghost: 'text-muted hover:text-white hover:bg-surface',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  
  // Mobile-first sizes — big tap targets on mobile
  const sizes = {
    sm: 'text-sm px-4 py-2.5 min-h-[40px]',
    md: 'text-base px-5 py-3 min-h-[48px]',
    lg: 'text-lg px-6 py-4 min-h-[56px]',
  };

  return (
    <button
      className={clsx(baseClasses, variants[variant], sizes[size], (disabled || loading) && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
