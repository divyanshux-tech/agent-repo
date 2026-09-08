import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, ArrowRightLeft, Plane, Train, Building2, Users, Minus, Plus, Search, Star, Clock, ChevronRight } from 'lucide-react';
import { travelService } from '../../services/travelService';
import { hotelService } from '../../services/hotelService';

// ─── Indian City / Airport Quick-Select Data ───────────────────────────────
const INDIAN_CITIES = [
  { city: 'Delhi', code: 'DEL', label: 'New Delhi (DEL)' },
  { city: 'Mumbai', code: 'BOM', label: 'Mumbai (BOM)' },
  { city: 'Bangalore', code: 'BLR', label: 'Bangalore (BLR)' },
  { city: 'Kolkata', code: 'CCU', label: 'Kolkata (CCU)' },
  { city: 'Chennai', code: 'MAA', label: 'Chennai (MAA)' },
  { city: 'Hyderabad', code: 'HYD', label: 'Hyderabad (HYD)' },
  { city: 'Goa', code: 'GOI', label: 'Goa (GOI)' },
  { city: 'Kochi', code: 'COK', label: 'Kochi (COK)' },
  { city: 'Jaipur', code: 'JAI', label: 'Jaipur (JAI)' },
  { city: 'Ahmedabad', code: 'AMD', label: 'Ahmedabad (AMD)' },
  { city: 'Pune', code: 'PNQ', label: 'Pune (PNQ)' },
  { city: 'Leh', code: 'IXL', label: 'Leh (IXL)' },
  { city: 'Varanasi', code: 'VNS', label: 'Varanasi (VNS)' },
  { city: 'Srinagar', code: 'SXR', label: 'Srinagar (SXR)' },
  { city: 'Patna', code: 'PAT', label: 'Patna (PAT)' },
  { city: 'Bhubaneswar', code: 'BBI', label: 'Bhubaneswar (BBI)' },
  { city: 'Indore', code: 'IDR', label: 'Indore (IDR)' },
  { city: 'Nagpur', code: 'NAG', label: 'Nagpur (NAG)' },
  { city: 'Amritsar', code: 'ATQ', label: 'Amritsar (ATQ)' },
  { city: 'Coimbatore', code: 'CJB', label: 'Coimbatore (CJB)' },
];

// ─── City Dropdown Component ──────────────────────────────────────────────
const CitySelector = ({ value, onChange, placeholder, icon: Icon, iconColor }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef(null);

  const filtered = INDIAN_CITIES.filter(c =>
    c.city.toLowerCase().includes(query.toLowerCase()) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={15} className={iconColor} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none text-[13px] font-medium focus:outline-none text-[#1A1A1A] placeholder-gray-400"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-[200px] overflow-y-auto">
          {/* Popular routes */}
          <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest text-gray-400 uppercase border-b border-gray-50">
            {query ? 'Matching Cities' : 'Popular Cities'}
          </div>
          {filtered.slice(0, 8).map(c => (
            <button
              key={c.code}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF0F5] flex items-center gap-2 transition-colors"
              onMouseDown={() => { onChange(c.code); setQuery(c.label); setOpen(false); }}
            >
              <span className="w-8 text-[10px] font-bold text-[#FF4D79] font-mono">{c.code}</span>
              <span className="text-[13px] text-[#1A1A1A]">{c.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Flight Result Card ────────────────────────────────────────────────────
const FlightResultCard = ({ candidate, onBook }) => {
  const dep = new Date(candidate.departure);
  const arr = candidate.arrival ? new Date(candidate.arrival) : null;
  const hrs = Math.floor(candidate.duration_minutes / 60);
  const mins = candidate.duration_minutes % 60;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-[#FF6B4A] to-[#FF4D79] rounded-lg flex items-center justify-center">
            <Plane size={12} className="text-white" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#1A1A1A]">{candidate.carrier || 'IndiGo'} · {candidate.flight_number || 'FL'}</div>
            <div className="text-[10px] text-gray-400">{candidate.stops === 0 ? 'Non-stop' : `${candidate.stops} stop`}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-bold text-[#1A1A1A]">₹{candidate.price_inr?.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-400">per person</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-[15px] font-bold">{dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div className="text-[10px] text-gray-400 font-mono">{candidate.from_code}</div>
        </div>
        <div className="flex-1 mx-3 flex flex-col items-center">
          <div className="text-[10px] text-gray-400 mb-1">{hrs}h {mins}m</div>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px bg-gray-200" />
            <Plane size={10} className="text-[#FF4D79]" />
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-[15px] font-bold">{arr ? arr.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}</div>
          <div className="text-[10px] text-gray-400 font-mono">{candidate.to_code}</div>
        </div>
      </div>
      <button
        onClick={() => onBook?.(candidate)}
        className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF4D79] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
      >
        Select Flight →
      </button>
    </div>
  );
};

// ─── Train Result Card ─────────────────────────────────────────────────────
const TrainResultCard = ({ candidate, onBook }) => {
  const dep = new Date(candidate.departure);
  const hrs = Math.floor(candidate.duration_minutes / 60);
  const mins = candidate.duration_minutes % 60;
  const cheapestClass = candidate.class_options?.[0];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-[#A23CFD] to-[#7C3AED] rounded-lg flex items-center justify-center">
            <Train size={12} className="text-white" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#1A1A1A]">{candidate.train_name || 'Express Train'}</div>
            <div className="text-[10px] text-gray-400">#{candidate.train_number}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-bold text-[#1A1A1A]">₹{cheapestClass?.price_inr?.toLocaleString('en-IN') || candidate.price_inr?.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-400">{cheapestClass?.class_code || 'SL'}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-bold">{dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div className="text-[10px] text-gray-400">{candidate.from_code}</div>
        </div>
        <div className="flex-1 mx-3 flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock size={9} /> {hrs}h {mins}m
          </div>
          <div className="w-full h-px bg-gray-200 mt-1" />
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold">--:--</div>
          <div className="text-[10px] text-gray-400">{candidate.to_code}</div>
        </div>
      </div>
      {candidate.class_options && candidate.class_options.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {candidate.class_options.slice(0, 4).map(cls => (
            <div key={cls.class_code} className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${cls.availability === 'available' ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
              {cls.class_code} · ₹{cls.price_inr}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onBook?.(candidate)}
        className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-[#A23CFD] to-[#7C3AED] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
      >
        Select Train →
      </button>
    </div>
  );
};

// ─── Hotel Result Card ─────────────────────────────────────────────────────
const HotelResultCard = ({ hotel, onBook }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <div className="text-[13px] font-bold text-[#1A1A1A]">{hotel.name}</div>
        <div className="text-[11px] text-gray-400 capitalize mt-0.5">{hotel.category}</div>
        {hotel.rating && (
          <div className="flex items-center gap-1 mt-1">
            {[...Array(Math.floor(hotel.rating || 3))].map((_, i) => (
              <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-[16px] font-bold text-[#1A1A1A]">₹{hotel.price_total_inr?.toLocaleString('en-IN')}</div>
        <div className="text-[10px] text-gray-400">total stay</div>
      </div>
    </div>
    <button
      onClick={() => onBook?.(hotel)}
      className="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-[#FF4D79] to-[#D83B8F] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
    >
      Book Hotel →
    </button>
  </div>
);

// ─── Main Panel ────────────────────────────────────────────────────────────
export const RightSidebarPanel = ({ type, onClose, onSearchResults }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Shared fields
  const [fromCode, setFromCode] = useState('DEL');
  const [toCode, setToCode] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState('one_way');
  const [travelClass, setTravelClass] = useState('Economy');

  // Hotel-specific
  const [destination, setDestination] = useState('');
  const [checkin, setCheckin] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [checkout, setCheckout] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [minRating, setMinRating] = useState('ANY');
  const [sortBy, setSortBy] = useState('Popular');

  const POPULAR_ROUTES = type === 'flights'
    ? [['DEL', 'GOI'], ['BOM', 'IXL'], ['BLR', 'COK'], ['DEL', 'JAI']]
    : [['DEL', 'MUM'], ['DEL', 'NDLS'], ['BOM', 'PNQ'], ['DEL', 'JAT']];

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      if (type === 'flights' || type === 'trains') {
        if (!toCode) { setError('Please select a destination city.'); setLoading(false); return; }
        const res = await travelService.searchTravel(null, fromCode, toCode, date, passengers);
        const filtered = type === 'flights'
          ? res.candidates.filter(c => c.type === 'flight')
          : res.candidates.filter(c => c.type === 'train');
        setResults(filtered);
        onSearchResults?.(type, filtered);
        if (filtered.length === 0) setError(`No ${type} found. Try different dates or route.`);
      } else if (type === 'stays') {
        if (!destination) { setError('Please enter a destination.'); setLoading(false); return; }
        const res = await hotelService.searchHotels(destination, checkin, checkout, guests, rooms);
        setResults(res || []);
        onSearchResults?.('stays', res || []);
        if (!res || res.length === 0) setError('No hotels found for this destination.');
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const icons = { flights: Plane, stays: Building2, trains: Train };
  const titles = { flights: 'Flights', stays: 'Stays', trains: 'Trains' };
  const subtitles = { flights: 'Live fares in ₹', stays: 'Heritage hotels to homestays', trains: 'Routes, timings & classes' };
  const accentColors = { flights: 'from-[#FF6B4A] to-[#FF4D79]', stays: 'from-[#FF4D79] to-[#D83B8F]', trains: 'from-[#A23CFD] to-[#7C3AED]' };
  const Icon = icons[type] || Plane;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accentColors[type]} flex items-center justify-center`}>
            <Icon size={14} className="text-white" />
          </div>
          <div>
            <div className="font-display text-[18px] font-medium text-[#1A1A1A]">{titles[type]}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{subtitles[type]}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">

        {/* ── FLIGHTS FORM ── */}
        {(type === 'flights') && (
          <>
            {/* Trip type toggle */}
            <div className="flex bg-gray-100 rounded-full p-0.5 text-[11px] font-semibold">
              {['one_way', 'round_trip'].map(t => (
                <button key={t} onClick={() => setTripType(t)}
                  className={`flex-1 py-1.5 rounded-full transition-all capitalize ${tripType === t ? `bg-gradient-to-r ${accentColors[type]} text-white shadow-sm` : 'text-gray-500'}`}>
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Route */}
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Route</div>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative">
                <CitySelector value={fromCode} onChange={setFromCode} placeholder="From — Delhi, Mumbai..." icon={MapPin} iconColor="text-gray-400" />
                <div className="h-px bg-gray-200 mx-3" />
                <CitySelector value={toCode} onChange={setToCode} placeholder="To — Goa, Leh, Kochi..." icon={MapPin} iconColor="text-[#FF4D79]" />
                <button onClick={() => { const t = fromCode; setFromCode(toCode); setToCode(t); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white p-1.5 rounded-full shadow-sm border border-gray-100 hover:scale-105 transition-transform text-[#FF4D79]">
                  <ArrowRightLeft size={12} />
                </button>
              </div>
            </div>

            {/* Popular routes */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Popular Routes</div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_ROUTES.map(([f, t]) => (
                  <button key={`${f}-${t}`} onClick={() => { setFromCode(f); setToCode(t); }}
                    className="text-[11px] px-3 py-1 rounded-full bg-white border border-gray-100 hover:border-[#FF4D79]/30 hover:text-[#FF4D79] transition-all text-gray-600 font-medium">
                    {f} → {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Passengers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Departure</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-[#FF4D79]/40" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Passengers</div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                  <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="text-gray-400 hover:text-[#FF4D79]"><Minus size={12} /></button>
                  <span className="flex-1 text-center text-[13px] font-medium">{passengers}</span>
                  <button onClick={() => setPassengers(Math.min(9, passengers + 1))} className="text-gray-400 hover:text-[#FF4D79]"><Plus size={12} /></button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TRAINS FORM ── */}
        {type === 'trains' && (
          <>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Route</div>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative">
                <CitySelector value={fromCode} onChange={setFromCode} placeholder="From — Delhi, Mumbai..." icon={MapPin} iconColor="text-gray-400" />
                <div className="h-px bg-gray-200 mx-3" />
                <CitySelector value={toCode} onChange={setToCode} placeholder="To — Goa, Kochi, Pune..." icon={MapPin} iconColor="text-[#A23CFD]" />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Date of Journey</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-[#A23CFD]/40" />
            </div>
          </>
        )}

        {/* ── STAYS FORM ── */}
        {type === 'stays' && (
          <>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Destination</div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-2 px-3 py-2">
                <MapPin size={14} className="text-[#FF4D79]" />
                <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Kerala, Goa, Manali..."
                  className="flex-1 bg-transparent text-[13px] focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Check-In</div>
                <input type="date" value={checkin} onChange={e => setCheckin(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[13px] focus:outline-none" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Check-Out</div>
                <input type="date" value={checkout} onChange={e => setCheckout(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[13px] focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Guests</div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                  <button onClick={() => setGuests(Math.max(1, guests - 1))}><Minus size={12} className="text-gray-400" /></button>
                  <span className="flex-1 text-center text-[13px] font-medium">{guests}</span>
                  <button onClick={() => setGuests(guests + 1)}><Plus size={12} className="text-gray-400" /></button>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Rooms</div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                  <button onClick={() => setRooms(Math.max(1, rooms - 1))}><Minus size={12} className="text-gray-400" /></button>
                  <span className="flex-1 text-center text-[13px] font-medium">{rooms}</span>
                  <button onClick={() => setRooms(rooms + 1)}><Plus size={12} className="text-gray-400" /></button>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Min Rating</div>
              <div className="flex gap-2">
                {['ANY', '3', '4', '5'].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${minRating === r ? 'bg-gradient-to-r from-[#FF4D79] to-[#D83B8F] text-white border-transparent' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                    {r === 'ANY' ? 'Any' : `⭐ ${r}`}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
        )}

        {/* Search Button */}
        <button onClick={handleSearch} disabled={loading}
          className={`w-full py-3 rounded-2xl bg-gradient-to-r ${accentColors[type]} text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60`}>
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching...</>
          ) : (
            <><Search size={14} /> Search {titles[type]}</>
          )}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {results.length} results found
            </div>
            {type === 'flights' && results.map((c, i) => (
              <FlightResultCard key={i} candidate={c} onBook={c => onSearchResults?.('flights', [c])} />
            ))}
            {type === 'trains' && results.map((c, i) => (
              <TrainResultCard key={i} candidate={c} onBook={c => onSearchResults?.('trains', [c])} />
            ))}
            {type === 'stays' && results.map((h, i) => (
              <HotelResultCard key={i} hotel={h} onBook={h => onSearchResults?.('stays', [h])} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
