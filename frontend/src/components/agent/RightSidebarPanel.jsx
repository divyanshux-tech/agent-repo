import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { travelService } from '../../services/travelService';
import { hotelService } from '../../services/hotelService';

export const RightSidebarPanel = ({ type, onClose, onSearchResults }) => {
  const [loading, setLoading] = useState(false);
  
  // Flights / Trains state
  const [fromCode, setFromCode] = useState('Delhi');
  const [toCode, setToCode] = useState('Goa');
  const [date, setDate] = useState('2026-10-15');
  const [passengers, setPassengers] = useState(1);
  
  // Stays state
  const [destination, setDestination] = useState('Goa');
  const [checkin, setCheckin] = useState('2026-10-15');
  const [checkout, setCheckout] = useState('2026-10-20');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (type === 'flights') {
        const res = await travelService.searchTravel("dummy-trip", fromCode, toCode, date, passengers);
        const flights = res.candidates.filter(c => c.type === 'flight');
        onSearchResults('flights', flights);
      } else if (type === 'trains') {
        const res = await travelService.searchTravel("dummy-trip", fromCode, toCode, date, passengers);
        const trains = res.candidates.filter(c => c.type === 'train');
        onSearchResults('trains', trains);
      } else if (type === 'stays') {
        const res = await hotelService.searchHotels(destination, checkin, checkout, guests, rooms);
        onSearchResults('stays', res);
      }
    } catch (e) {
      console.error(e);
      alert("Search failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'flights' ? 'Flights' : type === 'stays' ? 'Stays' : 'Trains';
  const subtitle = type === 'flights' ? 'LIVE FARES IN ₹' : type === 'stays' ? 'HERITAGE HOTELS TO HOMESTAYS' : 'ROUTES, TIMINGS AND CLASSES';

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="font-display text-2xl text-nura-dark capitalize">{title}</h3>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">{subtitle}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Forms */}
      <div className="flex-1 flex flex-col gap-6">
        
        {(type === 'flights' || type === 'trains') && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</label>
              <div className="flex gap-2">
                <input 
                  value={fromCode} onChange={e => setFromCode(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                  placeholder="From (e.g. Delhi)"
                />
                <input 
                  value={toCode} onChange={e => setToCode(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                  placeholder="To (e.g. Goa)"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Journey</label>
              <input 
                type="date"
                value={date} onChange={e => setDate(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            {type === 'flights' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passengers</label>
                <input 
                  type="number" min="1"
                  value={passengers} onChange={e => setPassengers(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
            )}
          </>
        )}

        {type === 'stays' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</label>
              <input 
                value={destination} onChange={e => setDestination(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                placeholder="City, region, or property name"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in</label>
                <input 
                  type="date"
                  value={checkin} onChange={e => setCheckin(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out</label>
                <input 
                  type="date"
                  value={checkout} onChange={e => setCheckout(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guests</label>
                <input 
                  type="number" min="1"
                  value={guests} onChange={e => setGuests(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rooms</label>
                <input 
                  type="number" min="1"
                  value={rooms} onChange={e => setRooms(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
            </div>
          </>
        )}

      </div>

      {/* Footer / Search Button */}
      <div className="pt-6 mt-4">
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-4 rounded-xl font-medium text-white shadow-md transition-all flex items-center justify-center gap-2
            bg-gradient-to-r from-[#FF6B4A] to-[#D83B8F] hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Searching..." : (
            <>
              <Search size={18} />
              Search {title}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
