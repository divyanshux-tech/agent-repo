import React from 'react';

export const PromptChips = ({ onSelect }) => {
  const prompts = [
    "✈️ Plan 5 days in Kerala ₹30k",
    "🚂 Trains Delhi → Goa Friday",
    "🏔️ Offbeat October destination",
    "🌤️ Best time to visit Ladakh"
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelect?.(prompt.replace(/^[^\s]+\s/, ''))} // Strips emoji for input
          className="bg-white border border-stone-200 rounded-full px-4 py-2 font-sans font-medium text-[13px] text-stone-700 transition-colors hover:bg-primary-50 hover:border-primary-200 active:scale-95 whitespace-nowrap"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};