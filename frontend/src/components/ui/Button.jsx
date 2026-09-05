import React from 'react';
import { cn } from '../../utils/cn';

const variantStyles = {
  primary: 'bg-nura-gradient text-white hover:opacity-90 hover:shadow-glow',
  secondary: 'bg-white text-nura-orange border border-nura-orange hover:bg-nura-light',
  glass: 'glass-pill text-nura-dark hover:bg-white/80',
  ghost: 'text-nura-dark hover:bg-black/5',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-6 py-[12px] text-[15px]',
  lg: 'px-8 py-[16px] text-[16px]',
};

export const Button = React.forwardRef(({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center font-sans font-medium rounded-full transition-all duration-300 ease-out active:scale-[0.96]',
        variantStyles[variant],
        sizeStyles[size],
        (disabled && !isLoading) && 'opacity-50 cursor-not-allowed',
        isLoading && 'opacity-80',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';