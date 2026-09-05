import React, { useEffect, useState } from 'react';
import { itineraryService } from '../../services/itineraryService';
import DayCard from './DayCard';

const ItineraryView = ({ tripId, onBack }) => {
    const [itinerary, setItinerary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);

    const fetchItinerary = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await itineraryService.getItinerary(tripId);
            setItinerary(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const data = await itineraryService.generateItinerary(tripId);
            setItinerary(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchItinerary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]);

    const handleItineraryUpdated = (newItinerary) => {
        setItinerary(newItinerary);
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading itinerary...</div>;
    }

    if (!itinerary) {
        return (
            <div className="max-w-3xl mx-auto p-6 text-center bg-slate-50 rounded-lg border border-slate-200 mt-8">
                <h2 className="text-xl font-bold text-slate-800 mb-2">No Itinerary Generated Yet</h2>
                <p className="text-slate-600 mb-6">
                    Ready to turn your locked plan into a day-by-day timeline? 
                    This will use AI to craft a detailed schedule grounded in real logistics.
                </p>
                {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
                
                <button 
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                    {generating ? 'Generating (this may take a few seconds)...' : 'Generate Itinerary'}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
            {onBack && (
                <button onClick={onBack} className="text-sm text-indigo-600 font-medium mb-4 hover:underline">
                    &larr; Back to plan
                </button>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
                <div className="flex flex-col md:flex-row justify-between md:items-end mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Itinerary for {itinerary.destination}
                        </h1>
                        <div className="flex gap-3 text-sm text-slate-500 mt-2">
                            <span>{itinerary.days.length} days</span>
                            <span>•</span>
                            <span className="uppercase text-xs font-semibold tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                Lang: {itinerary.language}
                            </span>
                        </div>
                    </div>
                    
                    <div className="mt-4 md:mt-0 text-left md:text-right">
                        <div className="text-sm text-slate-500 uppercase font-semibold tracking-wider">
                            Total Est. Variable Spend
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">
                            ₹{itinerary.total_estimated_spend_inr.toLocaleString()}
                        </div>
                    </div>
                </div>

                {itinerary.warnings?.length > 0 && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                        <span className="font-bold mr-2">Note:</span>
                        {itinerary.warnings.join(' | ')}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {itinerary.days.map((day, idx) => (
                    <DayCard 
                        key={day.day} 
                        tripId={tripId} 
                        day={day} 
                        isExpandedByDefault={idx === 0} 
                        onRegenerated={handleItineraryUpdated}
                    />
                ))}
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    Generated at: {new Date(itinerary.generated_at).toLocaleString()}
                </p>
            </div>
        </div>
    );
};

export default ItineraryView;
