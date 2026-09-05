import React from 'react';
import { cn } from '../../utils/cn';

export const Modal = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={cn(
          "relative bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden animate-fade-up",
          className
        )}
      >
        {title && (
          <div className="px-6 py-4 border-b border-stone-200">
            <h3 className="font-sans font-semibold text-[18px] text-stone-900">{title}</h3>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};