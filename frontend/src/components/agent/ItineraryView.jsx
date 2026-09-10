import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Sunset, Moon, UtensilsCrossed, MapPin, Train, Plane,
  Hotel, ChevronDown, ChevronUp, Download, Clock, Wallet,
} from 'lucide-react';

// ─── Slot type → icon + colour ──────────────────────────────────────────────
const SLOT_CONFIG = {
  travel:   { icon: Plane,            color: '#3A7BD5', bg: 'bg-blue-50',   label: 'Travel'   },
  train:    { icon: Train,            color: '#10B981', bg: 'bg-emerald-50', label: 'Train'    },
  checkin:  { icon: Hotel,            color: '#8B5CF6', bg: 'bg-purple-50',  label: 'Check-in' },
  checkout: { icon: Hotel,            color: '#F59E0B', bg: 'bg-amber-50',   label: 'Check-out'},
  explore:  { icon: MapPin,           color: '#FF6B4A', bg: 'bg-orange-50',  label: 'Explore'  },
  activity: { icon: MapPin,           color: '#FF4D79', bg: 'bg-pink-50',    label: 'Activity' },
  food:     { icon: UtensilsCrossed,  color: '#EF4444', bg: 'bg-red-50',     label: 'Food'     },
};

function getTimeOfDay(time) {
  if (!time) return 'morning';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

// ─── Single time slot row ────────────────────────────────────────────────────
const SlotRow = ({ slot }) => {
  const config = SLOT_CONFIG[slot.type] || SLOT_CONFIG.explore;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 items-start py-2.5 border-b border-black/[0.04] last:border-0">
      {/* Time */}
      <div className="w-14 shrink-0 text-right">
        <span className="text-[11px] font-mono text-[#888] font-medium">{slot.time || ''}</span>
      </div>

      {/* Icon */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}
      >
        <Icon size={14} color={config.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight truncate">
          {slot.activity}
        </div>
        {slot.description && (
          <div className="text-[11px] text-[#666] mt-0.5 leading-snug line-clamp-2">
            {slot.description}
          </div>
        )}
      </div>

      {/* Cost */}
      {slot.estimated_cost_inr > 0 && (
        <div className="shrink-0 text-right">
          <span className="text-[11px] font-medium text-[#10B981]">
            ₹{slot.estimated_cost_inr.toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Single day card ─────────────────────────────────────────────────────────
const DayCard = ({ day, index, totalBudget }) => {
  const [expanded, setExpanded] = useState(index === 0);

  const spend = day.estimated_spend_inr || 0;
  const spendPct = totalBudget > 0 ? Math.min(100, (spend / totalBudget) * 100 * (day.totalDays || 1)) : 0;

  const morningSlots   = day.slots?.filter(s => getTimeOfDay(s.time) === 'morning') || [];
  const afternoonSlots = day.slots?.filter(s => getTimeOfDay(s.time) === 'afternoon') || [];
  const eveningSlots   = day.slots?.filter(s => ['evening', 'night'].includes(getTimeOfDay(s.time))) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden"
    >
      {/* Day header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#FF4D79] flex items-center justify-center shrink-0">
            <span className="text-white text-[12px] font-bold">{day.day}</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#1A1A1A] leading-tight">
              {day.title || `Day ${day.day}`}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Wallet size={10} className="text-[#10B981]" />
              <span className="text-[11px] text-[#10B981] font-medium">
                ₹{spend.toLocaleString('en-IN')} est. spend
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#888]">{day.slots?.length || 0} slots</span>
          {expanded ? <ChevronUp size={14} className="text-[#888]" /> : <ChevronDown size={14} className="text-[#888]" />}
        </div>
      </button>

      {/* Spend bar */}
      <div className="h-1 bg-gray-100 mx-4 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#3A7BD5]"
          initial={{ width: 0 }}
          animate={{ width: `${spendPct}%` }}
          transition={{ duration: 0.8, delay: index * 0.08 + 0.2 }}
        />
      </div>

      {/* Expanded slots */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-3 space-y-0">
              {morningSlots.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sun size={11} className="text-[#F59E0B]" />
                    <span className="text-[10px] font-bold tracking-widest text-[#F59E0B] uppercase">Morning</span>
                  </div>
                  {morningSlots.map((slot, i) => <SlotRow key={i} slot={slot} />)}
                </div>
              )}
              {afternoonSlots.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sunset size={11} className="text-[#FF6B4A]" />
                    <span className="text-[10px] font-bold tracking-widest text-[#FF6B4A] uppercase">Afternoon</span>
                  </div>
                  {afternoonSlots.map((slot, i) => <SlotRow key={i} slot={slot} />)}
                </div>
              )}
              {eveningSlots.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Moon size={11} className="text-[#8B5CF6]" />
                    <span className="text-[10px] font-bold tracking-widest text-[#8B5CF6] uppercase">Evening</span>
                  </div>
                  {eveningSlots.map((slot, i) => <SlotRow key={i} slot={slot} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Full itinerary view ─────────────────────────────────────────────────────
export const ItineraryView = ({ itinerary, onDownload }) => {
  if (!itinerary || !itinerary.days?.length) return null;

  const totalDays = itinerary.total_days || itinerary.days.length;
  const totalBudget = itinerary.total_budget_inr || 0;
  const totalSpend = itinerary.days.reduce((sum, d) => sum + (d.estimated_spend_inr || 0), 0);
  const destination = itinerary.destination || 'Trip';

  // Inject totalDays into each day for spend bar calculation
  const daysWithMeta = itinerary.days.map(d => ({ ...d, totalDays }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[520px] self-start"
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-[#FF4D79]/60 uppercase mb-0.5">
              📍 Day-by-Day Itinerary
            </div>
            <div className="font-display text-[18px] font-semibold text-[#1A1A1A]">
              {destination} — {totalDays} Days
            </div>
          </div>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF4D79] text-white text-[12px] font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all"
          >
            <Download size={13} />
            PDF
          </button>
        </div>

        {/* Budget summary */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <Wallet size={12} className="text-[#10B981]" />
            <span className="text-[12px] text-[#555]">
              Est. spend: <strong className="text-[#10B981]">₹{totalSpend.toLocaleString('en-IN')}</strong>
              {totalBudget > 0 && <span className="text-[#888]"> / ₹{totalBudget.toLocaleString('en-IN')} budget</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-[#3A7BD5]" />
            <span className="text-[12px] text-[#555]">{totalDays} days</span>
          </div>
        </div>

        {/* Overall budget bar */}
        {totalBudget > 0 && (
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${totalSpend > totalBudget ? 'bg-red-400' : 'bg-gradient-to-r from-[#10B981] to-[#3A7BD5]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalSpend / totalBudget) * 100)}%` }}
              transition={{ duration: 1.2 }}
            />
          </div>
        )}

        {/* Tips */}
        {itinerary.tips?.length > 0 && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="text-[10px] font-bold tracking-widest text-amber-600 uppercase mb-1">💡 Travel Tips</div>
            {itinerary.tips.slice(0, 3).map((tip, i) => (
              <div key={i} className="text-[11px] text-amber-800 leading-snug">• {tip}</div>
            ))}
          </div>
        )}
      </div>

      {/* Day cards */}
      <div className="space-y-2">
        {daysWithMeta.map((day, i) => (
          <DayCard
            key={day.day || i}
            day={day}
            index={i}
            totalBudget={totalBudget}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B4A] to-[#FF4D79] text-white text-[13px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all"
        >
          <Download size={15} />
          Download Full Itinerary PDF
        </button>
      </div>
    </motion.div>
  );
};
