import React from 'react';

export default function PlanCard({ plan, onSelect }) {
  if (!plan) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
      
      {/* Label Badge */}
      <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
        <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded shadow-sm">
          {plan.label}
        </span>
      </div>

      <h3 className="font-sans font-semibold text-gray-900 mb-1">Trip Plan</h3>
      
      <div className="mb-4">
        <span className="text-2xl font-display font-medium text-nura-dark">₹{plan.total_cost_inr.toLocaleString()}</span>
        <span className="text-xs text-green-600 ml-2 font-medium">Save ₹{plan.savings_vs_budget_inr.toLocaleString()}</span>
      </div>

      {/* Warnings */}
      {plan.incomplete_components?.length > 0 && (
        <div className="bg-orange-50 text-orange-700 text-xs p-2 rounded mb-4">
          Missing components: {plan.incomplete_components.join(", ")}
        </div>
      )}

      {/* Components List */}
      <div className="space-y-3 flex-grow border-t border-gray-50 pt-4 text-sm">
        <div className="flex justify-between items-start">
          <span className="text-gray-500 font-medium">Travel</span>
          <span className="text-gray-800 text-right w-2/3 truncate">
            {plan.travel_candidate ? `${plan.travel_candidate.type} (${plan.travel_candidate.duration_minutes}m)` : "N/A"}
          </span>
        </div>
        
        <div className="flex justify-between items-start">
          <span className="text-gray-500 font-medium">Hotel</span>
          <span className="text-gray-800 text-right w-2/3 truncate">
            {plan.hotel_candidate ? plan.hotel_candidate.name : "N/A"}
          </span>
        </div>

        <div className="flex justify-between items-start">
          <span className="text-gray-500 font-medium">Activities</span>
          <span className="text-gray-800 text-right w-2/3">
            {plan.activities?.length || 0} Included
          </span>
        </div>
        
        <div className="flex justify-between items-start">
          <span className="text-gray-500 font-medium">Food & Local</span>
          <span className="text-gray-800 text-right w-2/3">
            {plan.expense_estimate ? `~₹${plan.expense_estimate.total_estimate_inr}` : "N/A"}
          </span>
        </div>
      </div>
      
      {/* Action */}
      <button 
        onClick={() => onSelect(plan.plan_id)}
        className="mt-6 w-full bg-nura-dark text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Select Plan
      </button>
    </div>
  );
}
