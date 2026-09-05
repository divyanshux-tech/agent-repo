import React, { useState } from 'react';

export default function ExpenseBreakdownCard({ estimate }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!estimate) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm relative">
      {/* Header with Estimate Prefix */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-sans font-semibold text-gray-900">Food & Local Transport</h3>
        
        {/* Confidence Badge */}
        <div 
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-1 rounded-full cursor-help
            ${estimate.confidence === 'low' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}
          `}>
            {estimate.confidence} Confidence
          </span>
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
              <p className="mb-2"><strong>Method:</strong> {estimate.estimation_method}</p>
              <p className="italic">{estimate.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Total with Tilde Prefix */}
      <div className="mb-5">
        <span className="text-3xl font-display font-medium text-nura-dark">~₹{estimate.total_estimate_inr.toLocaleString()}</span>
        <span className="text-xs text-gray-400 ml-2 uppercase tracking-wide">Total Est.</span>
      </div>

      {/* Breakdown */}
      <div className="space-y-3 border-t border-gray-50 pt-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Food (Meals & Snacks)</span>
          <span className="font-medium text-gray-800">~₹{estimate.breakdown.food_estimate_inr.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Local Transport</span>
          <span className="font-medium text-gray-800">~₹{estimate.breakdown.local_transport_estimate_inr.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Disclaimer */}
      <div className="mt-4 bg-gray-50 p-2 rounded text-[10px] text-gray-400 leading-tight">
        *This is a static-data-driven estimate based on destination averages. It is not a guaranteed cost or a booking. Actual costs may vary.
      </div>
    </div>
  );
}
