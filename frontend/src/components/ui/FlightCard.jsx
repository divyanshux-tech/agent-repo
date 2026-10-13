import React, { useState } from 'react';
import { PlaneTakeoff, Clock, ArrowRight } from 'lucide-react';

export default function FlightCard({ candidate, onSelect }) {
  const [selected, setSelected] = useState(false);

  const depTime = new Date(candidate.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const arrTime = candidate.arrival
    ? new Date(candidate.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const hours = Math.floor((candidate.duration_minutes || 0) / 60);
  const mins = (candidate.duration_minutes || 0) % 60;
  const durationStr = `${hours}h ${mins}m`;

  const handleSelect = () => {
    setSelected(true);
    onSelect?.(candidate);
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-200 p-4 hover:-translate-y-0.5 hover:shadow-lg ${
        selected ? 'border-[#3A7BD5] shadow-[0_0_0_2px_rgba(58,123,213,0.15)]' : 'border-black/[0.07] shadow-sm'
      }`}
    >
      {/* Airline row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3A7BD5] to-[#6FA3EF] flex items-center justify-center shrink-0">
            <PlaneTakeoff size={13} className="text-white" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              {candidate.carrier || 'Airline'}
            </span>
            {candidate.flight_number && (
              <span className="ml-1.5 text-[11px] text-[#888] font-mono">{candidate.flight_number}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3A7BD5]">
          {candidate.stops === 0 ? 'Non-stop' : `${candidate.stops} stop`}
        </span>
      </div>

      {/* Time row */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="text-[22px] font-bold text-[#111] leading-none">{depTime}</div>
          <div className="text-[11px] text-[#999] mt-0.5 font-mono">{candidate.from_code}</div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-[#AAA]">
            <Clock size={9} />
            {durationStr}
          </div>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 h-px bg-gradient-to-r from-[#3A7BD5]/30 to-[#3A7BD5]/60" />
            <ArrowRight size={10} className="text-[#3A7BD5] shrink-0" />
          </div>
        </div>

        <div className="text-center">
          <div className="text-[22px] font-bold text-[#111] leading-none">{arrTime}</div>
          <div className="text-[11px] text-[#999] mt-0.5 font-mono">{candidate.to_code}</div>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
        <div>
          <div className="text-[18px] font-bold text-[#1A1A1A]">
            ₹{(candidate.price_inr || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#AAA]">per person</div>
        </div>
        <button
          onClick={handleSelect}
          className={`px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
            selected
              ? 'bg-[#3A7BD5] text-white'
              : 'bg-[#EFF6FF] text-[#3A7BD5] hover:bg-[#3A7BD5] hover:text-white'
          }`}
        >
          {selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
}
