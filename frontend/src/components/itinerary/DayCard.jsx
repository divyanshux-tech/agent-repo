import React, { useState } from 'react';
import SlotRow from './SlotRow';
import { itineraryService } from '../../services/itineraryService';

const DayCard = ({ tripId, day, isExpandedByDefault = false, onRegenerated }) => {
    const [expanded, setExpanded] = useState(isExpandedByDefault);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState(null);

    const handleRegenerate = async (e) => {
        e.stopPropagation();
        setRegenerating(true);
        setError(null);
        try {
            const newItinerary = await itineraryService.regenerateItineraryDay(tripId, day.day);
            if (onRegenerated) {
                onRegenerated(newItinerary);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden mb-4">
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div>
                    <div className="flex items-center gap-3">
                        <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-2 py-1 rounded">
                            Day {day.day}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">
                            {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mt-1">{day.title}</h3>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                    <div className="text-right hidden sm:block">
                        <div className="font-semibold text-emerald-600">₹{day.estimated_spend_today_inr.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{day.slots.length} activities</div>
                    </div>
                    
                    <button 
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50 z-10"
                    >
                        {regenerating ? 'Regenerating...' : 'Change day'}
                    </button>
                    
                    <div className="text-slate-400">
                        {expanded ? '▲' : '▼'}
                    </div>
                </div>
            </div>

            {error && (
                <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-t border-red-100">
                    Failed to regenerate: {error}
                </div>
            )}

            {expanded && (
                <div className="p-4 pt-0 border-t bg-white">
                    {day.notes && (
                        <p className="text-sm text-slate-600 italic mb-4 p-3 bg-slate-50 rounded">
                            {day.notes}
                        </p>
                    )}
                    
                    <div className="ml-2 mt-4 space-y-0">
                        {day.slots.map((slot, idx) => (
                            <SlotRow key={`${day.day}-slot-${idx}`} slot={slot} />
                        ))}
                    </div>
                    
                    <div className="mt-6 flex justify-end border-t pt-3 border-slate-100">
                        <div className="text-sm">
                            <span className="text-slate-500">Estimated spend today: </span>
                            <span className="font-bold text-emerald-600">₹{day.estimated_spend_today_inr.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DayCard;
