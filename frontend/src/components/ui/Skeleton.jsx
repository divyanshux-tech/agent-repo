import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton = ({ className, width, height, borderRadius = 'md', ...props }) => {
  const radiusClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[borderRadius] || 'rounded-md';

  return (
    <div
      className={cn(
        "bg-stone-200 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:400%_100%] animate-shimmer",
        radiusClass,
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
};
