import React, { useState } from 'react';
import { X, Search, MapPin, ArrowRightLeft, Calendar, ChevronRight, Users, Minus, Plus, Star, Info, BedDouble, Train, Radio, Ticket } from 'lucide-react';
import { travelService } from '../../services/travelService';
import { hotelService } from '../../services/hotelService';

export const RightSidebarPanel = ({ type, onClose, onSearchResults }) => {
  const [loading, setLoading] = useState(false);
  
  // Flights / Trains state
  const [fromCode, setFromCode] = useState('DEL');
  const [toCode, setToCode] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState('round_trip');
  const [returnDate, setReturnDate] = useState('');
  const [travelClass, setTravelClass] = useState('Economy');
  
  // Trains state
  const [trainTab, setTrainTab] = useState('route'); // 'route', 'train', 'live', 'pnr'
  const [trainName, setTrainName] = useState('');
  const [liveTrain, setLiveTrain] = useState('');
  const [pnr, setPnr] = useState('');
  
  // Stays state
  const [destination, setDestination] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [minRating, setMinRating] = useState('ANY');
  const [sortBy, setSortBy] = useState('Popular');

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
        
        {type === 'flights' && (
          <>
            <div className="flex bg-[#F5F5F7] rounded-full p-1 mb-2">
                <button 
                  onClick={() => setTripType('round_trip')} 
                  className={`flex-1 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${tripType === 'round_trip' ? 'bg-gradient-to-r from-[#FF6B4A] to-[#FCA311] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Round Trip
                </button>
                <button 
                  onClick={() => setTripType('one_way')} 
                  className={`flex-1 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${tripType === 'one_way' ? 'bg-gradient-to-r from-[#FF6B4A] to-[#FCA311] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  One Way
                </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</label>
              <div className="flex flex-col bg-[#F5F5F7] rounded-xl border border-gray-100 p-2 relative">
                <div className="flex items-center gap-3 px-2 py-1">
                  <MapPin size={16} className="text-gray-400" />
                  <input 
                    value={fromCode} onChange={e => setFromCode(e.target.value)} 
                    className="w-full bg-transparent border-none text-sm font-medium focus:outline-none uppercase"
                    placeholder="FROM — DEL, BOM, BLR..."
                  />
                </div>
                <div className="h-px bg-gray-200 my-1 mx-2"></div>
                <div className="flex items-center gap-3 px-2 py-1">
                  <MapPin size={16} className="text-[#FF6B4A]" />
                  <input 
                    value={toCode} onChange={e => setToCode(e.target.value)} 
                    className="w-full bg-transparent border-none text-sm font-medium focus:outline-none uppercase"
                    placeholder="TO — GOI, IXL, COK..."
                  />
                </div>
                <button 
                  onClick={() => { const temp = fromCode; setFromCode(toCode); setToCode(temp); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-sm border border-gray-100 hover:scale-105 transition-transform text-[#FF6B4A]"
                >
                  <ArrowRightLeft size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dates</label>
              <div className="flex items-center bg-[#F5F5F7] rounded-xl border border-gray-100 p-3">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Departure</span>
                  <input 
                    type="date"
                    value={date} onChange={e => setDate(e.target.value)} 
                    className="bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700"
                  />
                </div>
                <ChevronRight size={16} className="text-gray-300 mx-2" />
                <div className={`flex-1 flex flex-col ${tripType === 'one_way' ? 'opacity-40 pointer-events-none' : ''}`}>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Return</span>
                  <input 
                    type="date"
                    value={returnDate} onChange={e => setReturnDate(e.target.value)} 
                    className="bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700"
                    disabled={tripType === 'one_way'}
                  />
                </div>
                <Calendar size={18} className="text-gray-400 ml-2" />
              </div>
            </div>

            <div className="flex gap-4 mt-2">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passengers</label>
                <div className="flex items-center justify-between bg-[#F5F5F7] rounded-xl border border-gray-100 px-3 py-2.5">
                  <Users size={16} className="text-gray-400" />
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-[#FF6B4A]">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-3 text-center">{passengers}</span>
                    <button onClick={() => setPassengers(passengers + 1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-[#FF6B4A]">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</label>
                <div className="bg-[#F5F5F7] rounded-xl border border-gray-100 px-3 py-2.5 h-[42px]">
                  <select 
                    value={travelClass} onChange={e => setTravelClass(e.target.value)}
                    className="w-full h-full bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700 cursor-pointer"
                  >
                    <option value="Economy">Economy</option>
                    <option value="Premium Economy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First Class">First Class</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Popular Routes</label>
              <div className="flex flex-wrap gap-2">
                {[['DEL', 'GOI'], ['BOM', 'IXL'], ['BLR', 'COK'], ['DEL', 'JAI']].map(([f, t], i) => (
                  <button 
                    key={i}
                    onClick={() => { setFromCode(f); setToCode(t); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-[#FF6B4A] hover:text-[#FF6B4A] transition-colors text-xs font-medium text-gray-600 shadow-sm"
                  >
                    {f} <ArrowRightLeft size={10} /> {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {type === 'trains' && (
          <>
            <div className="flex bg-[#F5F5F7] rounded-full p-1 mb-4">
              {[
                { id: 'route', label: 'ROUTE', icon: ArrowRightLeft },
                { id: 'train', label: 'TRAIN', icon: Train },
                { id: 'live', label: 'LIVE', icon: Radio },
                { id: 'pnr', label: 'PNR', icon: Ticket }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = trainTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setTrainTab(tab.id)}
                    className={`flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${isActive ? 'bg-gradient-to-r from-[#FCA311] to-[#FF6B4A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Icon size={12} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {trainTab === 'route' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
                    <span>From</span><span>To</span>
                  </label>
                  <div className="flex items-center bg-[#F5F5F7] rounded-xl border border-gray-100 p-2 relative">
                    <input 
                      value={fromCode} onChange={e => setFromCode(e.target.value)} 
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none px-2 py-1"
                      placeholder="Delhi, NDLS..."
                    />
                    <button 
                      onClick={() => { const temp = fromCode; setFromCode(toCode); setToCode(temp); }}
                      className="mx-2 bg-white rounded-full p-1.5 shadow-sm border border-gray-100 hover:scale-105 transition-transform text-gray-400"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                    <input 
                      value={toCode} onChange={e => setToCode(e.target.value)} 
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none px-2 py-1 text-right"
                      placeholder="Jaipur, JP..."
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Journey</label>
                  <div className="flex items-center bg-[#F5F5F7] rounded-xl border border-gray-100 px-4 py-3">
                    <input 
                      type="date"
                      value={date} onChange={e => setDate(e.target.value)} 
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700"
                    />
                    <Calendar size={18} className="text-[#FCA311] ml-2" />
                  </div>
                </div>
              </>
            )}

            {trainTab === 'train' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Train Name or Number</label>
                  <div className="flex items-center gap-3 px-3 py-3 bg-[#F5F5F7] rounded-xl border border-gray-100">
                    <Search size={16} className="text-gray-400" />
                    <input 
                      value={trainName} onChange={e => setTrainName(e.target.value)} 
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none"
                      placeholder="Rajdhani, Vande Bharat, 12951..."
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Rajdhani', 'Shatabdi', 'Vande Bharat', 'Duronto'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setTrainName(t)}
                      className="px-4 py-1.5 rounded-full border border-gray-200 bg-white hover:border-[#FCA311] hover:text-[#FCA311] transition-colors text-xs font-semibold text-gray-600 shadow-sm"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {trainTab === 'live' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Train Number</label>
                  <div className="flex items-center gap-3 px-3 py-3 bg-[#F5F5F7] rounded-xl border border-gray-100">
                    <Radio size={16} className="text-gray-400" />
                    <input 
                      value={liveTrain} onChange={e => setLiveTrain(e.target.value)} 
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none"
                      placeholder="12951"
                    />
                  </div>
                </div>
              </>
            )}

            {trainTab === 'pnr' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PNR Number</label>
                  <div className="flex items-center gap-3 px-3 py-3 bg-[#F5F5F7] rounded-xl border border-gray-100">
                    <Ticket size={16} className="text-gray-400" />
                    <input 
                      value={pnr} onChange={e => setPnr(e.target.value)} 
                      className="w-full bg-transparent border-none text-sm font-medium focus:outline-none"
                      placeholder="Ten digits from your ticket"
                    />
                  </div>
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mt-1">Read from IRCTC and shown to you • Never stored</span>
                </div>
              </>
            )}
          </>
        )}

        {type === 'stays' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</label>
              <div className="flex items-center gap-3 px-3 py-2 bg-[#F5F5F7] rounded-xl border border-gray-100">
                <MapPin size={16} className="text-gray-400" />
                <input 
                  value={destination} onChange={e => setDestination(e.target.value)} 
                  className="w-full bg-transparent border-none text-sm font-medium focus:outline-none"
                  placeholder="City, region, or property name"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stay Dates</label>
              <div className="flex items-center bg-[#F5F5F7] rounded-xl border border-gray-100 p-3">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Check-in</span>
                  <input 
                    type="date"
                    value={checkin} onChange={e => setCheckin(e.target.value)} 
                    className="bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700"
                  />
                </div>
                <ChevronRight size={16} className="text-gray-300 mx-2" />
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Check-out</span>
                  <input 
                    type="date"
                    value={checkout} onChange={e => setCheckout(e.target.value)} 
                    className="bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700"
                  />
                </div>
                <Calendar size={18} className="text-gray-400 ml-2" />
              </div>
            </div>

            <div className="flex gap-4 mt-2">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guests</label>
                <div className="flex items-center justify-between bg-[#F5F5F7] rounded-xl border border-gray-100 px-3 py-2.5">
                  <Users size={16} className="text-gray-400" />
                  <div className="flex items-center gap-3">
                    <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-[#A23CFD]">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-3 text-center">{guests}</span>
                    <button onClick={() => setGuests(guests + 1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-[#A23CFD]">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rooms</label>
                <div className="flex items-center justify-between bg-[#F5F5F7] rounded-xl border border-gray-100 px-3 py-2.5">
                  <BedDouble size={16} className="text-gray-400" />
                  <div className="flex items-center gap-3">
                    <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-[#A23CFD]">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-3 text-center">{rooms}</span>
                    <button onClick={() => setRooms(rooms + 1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-[#A23CFD]">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Star size={12} className="text-yellow-400" fill="currentColor" /> Minimum Rating
              </label>
              <div className="flex bg-[#F5F5F7] rounded-full p-1 border border-gray-100">
                {['ANY', '3', '4', '5'].map(rating => (
                  <button 
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1 ${minRating === rating ? 'bg-gradient-to-r from-[#FF4D79] to-[#D83B8F] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {rating !== 'ANY' && <Star size={10} fill={minRating === rating ? "currentColor" : "none"} />}
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort By</label>
              <div className="bg-[#F5F5F7] rounded-xl border border-gray-100 px-3 py-2.5 h-[42px]">
                <select 
                  value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="w-full h-full bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700 cursor-pointer"
                >
                  <option value="Popular">Popular</option>
                  <option value="Price: Low to High">Price: Low to High</option>
                  <option value="Price: High to Low">Price: High to Low</option>
                  <option value="Rating: High to Low">Rating: High to Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 p-3 rounded-xl border border-amber-200 bg-amber-50">
              <Info size={16} className="text-amber-500 shrink-0" />
              <span className="text-xs text-amber-700 font-medium">Pick a destination from the suggestions to continue.</span>
            </div>
          </>
        )}

      </div>

      {/* Footer / Search Button */}
      <div className="pt-6 mt-4 flex flex-col items-center">
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-4 rounded-xl font-medium text-white shadow-md transition-all flex items-center justify-center gap-2
            bg-gradient-to-r from-[#FF6B4A] to-[#D83B8F] hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Searching..." : (
            <>
              {type === 'trains' ? (
                <>
                  {trainTab === 'route' && <Search size={18} />}
                  {trainTab === 'train' && <Search size={18} />}
                  {trainTab === 'live' && <Radio size={18} />}
                  {trainTab === 'pnr' && <Ticket size={18} />}
                  {trainTab === 'route' && 'Find trains'}
                  {trainTab === 'train' && 'Search trains'}
                  {trainTab === 'live' && 'Track this train'}
                  {trainTab === 'pnr' && 'Check status'}
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search {title}
                </>
              )}
            </>
          )}
        </button>
        {type === 'stays' && (
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3">Free cancellation on many stays</span>
        )}
        {type === 'trains' && (
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 text-center px-4">
            {trainTab === 'route' && 'Direct trains on your date'}
            {trainTab === 'train' && 'Search by train name or number'}
            {trainTab === 'live' && 'Position and delay, live from IRCTC'}
            {trainTab === 'pnr' && 'Your booking, never stored'}
          </span>
        )}
      </div>
    </div>
  );
};
