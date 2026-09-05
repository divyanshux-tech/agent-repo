import React from 'react';
import Badge from './Badge';

export default function ActivityCard({ candidate, onSelect }) {
  // candidate is the ActivityCandidate object from the backend
  
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
      
      {/* Top Row: Category Badge & Price */}
      <div className="flex justify-between items-start mb-3">
        <Badge variant="neutral" className="uppercase tracking-wider text-[10px]">
          {candidate.category}
        </Badge>
        <div className="text-right">
          <span className="font-display font-medium text-lg text-nura-dark">
            ₹{candidate.price_inr}
          </span>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Per Person</p>
        </div>
      </div>
      
      {/* Middle Row: Name and Region */}
      <div className="mb-3">
        <h4 className="font-sans font-semibold text-[15px] text-gray-900 leading-tight">
          {candidate.name}
        </h4>
        <p className="text-sm text-gray-500 capitalize">{candidate.region}</p>
      </div>

      {/* Bottom Row: Duration & Details */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-xs text-gray-500">
            <span className="font-semibold mr-1">Duration:</span> {candidate.duration_hrs} hrs
          </div>
          {candidate.operator_note && (
            <p className="text-[11px] text-gray-400 line-clamp-1 italic">
              "{candidate.operator_note}"
            </p>
          )}
        </div>
        
        {onSelect && (
          <button 
            onClick={() => onSelect(candidate)}
            className="shrink-0 px-4 py-1.5 bg-nura-dark text-white text-xs font-medium rounded-full hover:bg-black transition-colors"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}
