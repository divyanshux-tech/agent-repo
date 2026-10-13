import React, { useState } from 'react';
import { Train, Clock, ArrowRight } from 'lucide-react';

export default function TrainCard({ candidate, onSelect }) {
  const [selected, setSelected] = useState(false);

  const depTime = new Date(candidate.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const arrTime = candidate.arrival
    ? new Date(candidate.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const hours = Math.floor((candidate.duration_minutes || 0) / 60);
  const mins = (candidate.duration_minutes || 0) % 60;
  const durationStr = `${hours}h ${mins}m`;
  const classes = candidate.class_options || [];

  const handleSelect = () => {
    setSelected(true);
    onSelect?.(candidate);
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-200 p-4 hover:-translate-y-0.5 hover:shadow-lg ${
        selected ? 'border-[#10B981] shadow-[0_0_0_2px_rgba(16,185,129,0.15)]' : 'border-black/[0.07] shadow-sm'
      }`}
    >
      {/* Train name row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shrink-0">
            <Train size={13} className="text-white" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              {candidate.train_name || 'Express'}
            </span>
            {candidate.train_number && (
              <span className="ml-1.5 text-[11px] text-[#888] font-mono">#{candidate.train_number}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
          Direct
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
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-200 to-emerald-400" />
            <ArrowRight size={10} className="text-emerald-500 shrink-0" />
          </div>
        </div>

        <div className="text-center">
          <div className="text-[22px] font-bold text-[#111] leading-none">{arrTime}</div>
          <div className="text-[11px] text-[#999] mt-0.5 font-mono">{candidate.to_code}</div>
        </div>
      </div>

      {/* Class options */}
      {classes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {classes.slice(0, 4).map((cls) => (
            <div
              key={cls.class_code}
              className="flex items-center gap-1.5 text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1"
            >
              <span className="font-bold text-[#333]">{cls.class_code}</span>
              <span className="text-[#555]">₹{(cls.price_inr || 0).toLocaleString('en-IN')}</span>
              <span className={`font-semibold ${cls.availability === 'available' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {cls.availability === 'available' ? '✓' : 'WL'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Price + CTA */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
        <div>
          <div className="text-[18px] font-bold text-[#1A1A1A]">
            ₹{(candidate.price_inr || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#AAA]">starts from</div>
        </div>
        <button
          onClick={handleSelect}
          className={`px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
            selected
              ? 'bg-[#10B981] text-white'
              : 'bg-emerald-50 text-emerald-600 hover:bg-[#10B981] hover:text-white'
          }`}
        >
          {selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
}
