import React from 'react';
import { cn } from '../../utils/cn';
import { Check, AlertCircle, XCircle, Info } from 'lucide-react';

export const Toast = ({ message, type = 'info', className, ...props }) => {
  const typeConfig = {
    success: { icon: Check, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-50 border-emerald-200' },
    error: { icon: XCircle, colorClass: 'text-red-500', bgClass: 'bg-red-50 border-red-200' },
    warning: { icon: AlertCircle, colorClass: 'text-amber-500', bgClass: 'bg-amber-50 border-amber-200' },
    info: { icon: Info, colorClass: 'text-sky-500', bgClass: 'bg-stone-50 border-stone-200' },
  };

  const { icon: Icon, colorClass, bgClass } = typeConfig[type] || typeConfig.info;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 border rounded-xl shadow-md min-w-[300px] animate-fade-up",
        bgClass,
        className
      )}
      {...props}
    >
      <Icon className={cn("w-5 h-5 shrink-0", colorClass)} strokeWidth={1.5} />
      <p className="text-[14px] font-medium text-stone-900 leading-snug">{message}</p>
    </div>
  );
};