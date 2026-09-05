import React from 'react';

const iconMap = {
    travel: '🚗',
    checkin: '🏨',
    checkout: '🏨',
    activity: '🎯',
    explore: '📍',
    food: '🍽️',
    rest: '🛋️',
    shopping: '🛍️',
    logistics: '⚙️',
    nightlife: '🍸',
    spiritual: '🙏',
    nature: '🌳',
    photography: '📷'
};

const SlotRow = ({ slot }) => {
    const icon = iconMap[slot.type] || '📌';
    
    return (
        <div className="flex gap-4 p-3 border-l-2 border-indigo-200 relative items-start hover:bg-slate-50 transition-colors">
            <div className="absolute -left-3 top-4 bg-white border-2 border-indigo-200 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {icon}
            </div>
            
            <div className="flex flex-col w-20 flex-shrink-0 text-sm font-medium text-slate-600 mt-1">
                <span>{slot.time}</span>
                {slot.end_time && <span className="text-slate-400 text-xs">to {slot.end_time}</span>}
            </div>
            
            <div className="flex-1 pb-2">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-slate-800">{slot.title}</h4>
                    {slot.estimated_spend_inr > 0 && (
                        <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            ₹{slot.estimated_spend_inr.toLocaleString()}
                        </span>
                    )}
                </div>
                
                <p className="text-sm text-slate-600 mt-1">{slot.description}</p>
                
                {slot.location && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                        <span>📍</span>
                        <span>{slot.location}</span>
                    </div>
                )}
                
                {(slot.inferred || slot.flags?.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {slot.inferred && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                Inferred
                            </span>
                        )}
                        {slot.flags?.map((flag, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {flag.replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlotRow;
