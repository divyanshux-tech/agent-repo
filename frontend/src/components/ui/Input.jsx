import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, error, ...props }, ref) => {
  return (
    <div className="w-full relative">
      <input
        ref={ref}
        className={cn(
          "w-full bg-white border-[1.5px] border-stone-200 text-stone-900 rounded-md px-4 py-[10px] text-[15px] font-sans placeholder:text-stone-400 transition-all duration-150 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-red-500 text-[12px] font-medium mt-1 absolute -bottom-5 left-0">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';