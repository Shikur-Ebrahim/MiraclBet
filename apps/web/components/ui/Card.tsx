import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'bordered';
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  const baseClasses = 'bg-card rounded-lg overflow-hidden';
  const variants = {
    default: '',
    hover: 'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10',
    bordered: 'border border-brand',
  };

  return (
    <div className={clsx(baseClasses, variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
