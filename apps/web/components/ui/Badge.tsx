import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'live' | 'hot' | 'new' | 'default';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const variants = {
    live: 'bg-red-500/10 text-red-500 border border-red-500/20',
    hot: 'bg-primary/10 text-primary border border-primary/20',
    new: 'bg-green-500/10 text-green-500 border border-green-500/20',
    default: 'bg-surface text-muted border border-brand',
  };

  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider', variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
