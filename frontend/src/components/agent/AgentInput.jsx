import React, { useState } from 'react';
import { Send, PlusSquare, Mic } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AgentInput = ({ onSubmit, isLoading, placeholder = "Describe your trip idea..." }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit?.(inputValue);
      setInputValue('');
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes gradient-stream {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-stream {
            background-size: 200% 200%;
            animation: gradient-stream 4s ease infinite;
          }
        `}
      </style>
      <div className="relative w-full rounded-[26px] p-[2px] group">
        
        {/* Streaming Gradient Glow Layers */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FF4D79] via-[#A23CFD] to-[#FF8A65] rounded-[26px] opacity-100 blur-[2px] animate-stream z-0"></div>
        <div className="absolute -inset-[4px] bg-gradient-to-r from-[#FF4D79] via-[#A23CFD] to-[#FF8A65] rounded-[26px] opacity-40 blur-[8px] animate-stream z-0"></div>

        {/* Main Input Form */}
        <form 
          onSubmit={handleSubmit}
          className="relative z-10 flex flex-col w-full bg-white/95 backdrop-blur-xl rounded-[24px] p-2 shadow-2xl"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent outline-none border-none text-nura-dark text-[15px] font-sans placeholder:text-[#888] px-5 py-3"
          />

          <div className="flex items-center justify-between px-4 pb-1 pt-1 mt-1 border-t border-black/5">
            <button type="button" className="flex items-center gap-2 text-nura-dark text-[14px] font-medium transition-colors hover:opacity-80">
              <PlusSquare size={18} strokeWidth={1.5} />
              <span>Sign Up to Add files</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Voice Trigger Button */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onSubmit?.("", true); }}
                className="flex items-center justify-center w-[36px] h-[36px] rounded-full text-nura-dark hover:bg-gray-100 transition-colors"
                title="Start Voice Agent"
              >
                <Mic size={20} strokeWidth={1.2} />
              </button>

              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={cn(
                  "flex items-center justify-center w-[36px] h-[36px] rounded-full text-white transition-all duration-300",
                  inputValue.trim() 
                    ? "bg-[#FF6B4A] hover:bg-[#ff5b36] shadow-md hover:scale-105" 
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send size={16} strokeWidth={2} className={inputValue.trim() ? "ml-0.5" : ""} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};