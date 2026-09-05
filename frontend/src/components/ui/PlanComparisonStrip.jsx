import React from 'react';
import PlanCard from './PlanCard';

export default function PlanComparisonStrip({ plans, onSelectPlan }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No viable plans could be found for your budget. Try adjusting your constraints.
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-display font-semibold mb-6">Recommended Plans</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard 
            key={plan.plan_id} 
            plan={plan} 
            onSelect={onSelectPlan} 
          />
        ))}
      </div>
      
      {plans.length > 3 && (
        <div className="mt-4 text-center text-xs text-gray-400">
          Scroll or swipe to see all {plans.length} options.
        </div>
      )}
    </div>
  );
}
