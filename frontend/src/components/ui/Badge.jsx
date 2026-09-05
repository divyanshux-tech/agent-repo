import React from 'react';
import { cn } from '../../utils/cn';

export const Badge = ({ children, variant = 'default', className }) => {
  const variantStyles = {
    default: 'bg-stone-100 text-stone-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium tracking-[0.02em]",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};