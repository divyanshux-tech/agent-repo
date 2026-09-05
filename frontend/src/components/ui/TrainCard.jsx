import React from 'react';
import { Badge } from './Badge';

export default function TrainCard({ candidate, onSelect }) {
  
  const depTime = new Date(candidate.departure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const arrTime = candidate.arrival ? new Date(candidate.arrival).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
  const hours = Math.floor(candidate.duration_minutes / 60);
  const mins = candidate.duration_minutes % 60;
  
  const classes = candidate.class_options || [];
  
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col sm:flex-row justify-between hover:shadow-md transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge color="green">🚂 Train</Badge>
          <span className="text-sm text-gray-500 font-medium">
            {candidate.train_number} - {candidate.train_name}
          </span>
        </div>
        
        <div className="flex items-center justify-between sm:justify-start sm:gap-8 w-full mt-3">
          <div className="text-center sm:text-left">
            <div className="text-2xl font-bold text-gray-800">{depTime}</div>
            <div className="text-sm text-gray-500">{candidate.from_code}</div>
          </div>
          
          <div className="flex flex-col items-center px-4">
            <div className="text-xs text-gray-400 mb-1">{hours}h {mins}m</div>
            <div className="w-16 sm:w-24 border-t border-gray-300 relative">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white px-1 text-[10px] text-gray-400">
                Direct
              </div>
            </div>
          </div>
          
          <div className="text-center sm:text-right">
            <div className="text-2xl font-bold text-gray-800">{arrTime}</div>
            <div className="text-sm text-gray-500">{candidate.to_code}</div>
          </div>
        </div>
        
        {/* Classes Available */}
        {classes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {classes.map((cls) => (
              <div key={cls.class_code} className="text-xs border rounded px-2 py-1 bg-gray-50 text-gray-600 flex gap-2">
                <span className="font-semibold">{cls.class_code}</span>
                <span>₹{cls.price_inr}</span>
                <span className={`capitalize ${cls.availability === 'available' ? 'text-green-600' : 'text-orange-500'}`}>
                  {cls.availability === 'available' ? 'AVL' : 'WL'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-row sm:flex-col items-center justify-between w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
        <div className="text-xl font-bold text-gray-900">₹{candidate.price_inr.toLocaleString()}</div>
        <div className="text-xs text-gray-400 mt-1">Starts from</div>
        <button 
          onClick={() => onSelect(candidate)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors mt-0 sm:mt-2"
        >
          Select
        </button>
      </div>
    </div>
  );
}
