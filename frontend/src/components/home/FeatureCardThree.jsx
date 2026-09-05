import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Users, Clock, ThumbsUp, BarChart2 } from 'lucide-react';

export const FeatureCardThree = () => {
  const [phase, setPhase] = useState('share'); // 'share' -> 'summary' -> 'insights' -> 'table'

  useEffect(() => {
    let timeout;
    if (phase === 'share') {
      timeout = setTimeout(() => setPhase('summary'), 2000);
    } else if (phase === 'summary') {
      timeout = setTimeout(() => setPhase('insights'), 3000);
    } else if (phase === 'insights') {
      timeout = setTimeout(() => setPhase('table'), 4000);
    } else if (phase === 'table') {
      timeout = setTimeout(() => setPhase('share'), 4000);
    }
    return () => clearTimeout(timeout);
  }, [phase]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center lg:items-stretch gap-16 relative z-20 bg-white">
      
      {/* LEFT SIDE: Text content */}
      <div className="w-full lg:w-[35%] flex flex-col justify-center relative">
        <h3 className="font-display text-[42px] lg:text-[50px] leading-[1.05] text-[#1A1A1A] mb-8 lg:mb-12 mt-12 lg:mt-0">
          Share & get<br/>insights, built in<br/>tracking
        </h3>
        <p className="text-[#666666] font-sans text-[15px] leading-[1.6] max-w-sm mt-4 lg:mt-24">
          Send it out and start collecting responses. Track performance, tone, and engagement and let AI summarize everything for you. No need for third-party link trackers.
        </p>
      </div>

      {/* RIGHT SIDE: Dynamic Card */}
      <div className="w-full lg:w-[65%] min-h-[500px] lg:min-h-[560px] rounded-[32px] relative overflow-hidden shadow-[0_20px_50px_rgba(255,107,74,0.15)] transition-all duration-1000">
        
        {/* Vibrant Purple to Orange Gradient Background matching Nuraform SS3 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#A23CFD] via-[#FF5A5F] to-[#FF8A65] opacity-95" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB39B] blur-[90px] mix-blend-screen opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#7B52FF] blur-[100px] mix-blend-multiply opacity-50" />
        
        {/* The Orange 03 Badge Floating on the Left Edge */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30">
          <div className="w-[80px] h-[50px] rounded-[30px] bg-[#FF6B4A] flex items-center justify-center text-white font-sans text-xl shadow-lg">
            03
          </div>
        </div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 lg:p-12">
          
          <h4 className="absolute top-12 text-center text-white/40 font-display text-4xl lg:text-5xl drop-shadow-sm font-normal transition-opacity duration-500">
            {phase === 'share' && "Share and done!"}
            {phase === 'summary' && "Share and done!"}
            {(phase === 'insights' || phase === 'table') && ""}
          </h4>

          <div className="relative w-full max-w-[500px] h-[360px] flex items-center justify-center mt-10">
            
            <AnimatePresence mode="wait">
              {/* Phase 1: Share Button */}
              {phase === 'share' && (
                <motion.div 
                  key="share"
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} 
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} 
                  exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                  transition={{ duration: 0.8 }}
                  className="bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full px-8 py-4 flex items-center gap-3 shadow-lg"
                >
                  <span className="font-sans font-medium text-[16px]">Share Itinerary</span>
                  <Share2 size={18} />
                </motion.div>
              )}

              {/* Phase 2: Summary Card */}
              {phase === 'summary' && (
                <motion.div 
                  key="summary"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-white"
                >
                  <div className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-4">Itinerary Summary</div>
                  <div className="text-[#222] font-sans font-medium text-[18px] mb-2">High Group Consensus</div>
                  <div className="text-[#666] text-[14px] leading-relaxed mb-6">
                    4 out of 5 travelers have upvoted the <strong>Tokyo itinerary</strong>. The primary focus is on cultural tours and street food.
                  </div>
                  
                  <div className="text-[#222] font-sans font-medium text-[18px] mb-2">Budget Allocation:</div>
                  <div className="text-[#666] text-[14px] leading-relaxed">
                    Estimated cost per person is $1,250, sitting perfectly within the $1,500 budget limit set by the group.
                  </div>
                </motion.div>
              )}

              {/* Phase 3: Insights Dashboard */}
              {phase === 'insights' && (
                <motion.div 
                  key="insights"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-white"
                >
                  <div className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <span>Group Insights</span>
                    <BarChart2 size={16} className="text-[#888]" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                    <div>
                      <div className="text-[#222] font-display text-[40px] leading-none mb-1">456</div>
                      <div className="text-[#888] text-[12px]">Total Views</div>
                    </div>
                    <div>
                      <div className="text-[#222] font-display text-[40px] leading-none mb-1">5<span className="text-[20px] text-[#888]">/6</span></div>
                      <div className="text-[#888] text-[12px]">Travelers Confirmed</div>
                    </div>
                    <div>
                      <div className="text-[#222] font-display text-[40px] leading-none mb-1 flex items-baseline gap-1">12 <span className="text-[20px] text-[#888]">Days</span></div>
                      <div className="text-[#888] text-[12px]">Trip Duration</div>
                    </div>
                    <div>
                      <div className="text-[#222] font-display text-[32px] leading-[1.2] mb-1">Positive</div>
                      <div className="text-[#888] text-[12px]">Overall Tone</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 4: Table */}
              {phase === 'table' && (
                <motion.div 
                  key="table"
                  initial={{ opacity: 0, y: 40 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  className="w-full"
                >
                  <div className="grid grid-cols-4 px-4 mb-4">
                    <div className="text-[12px] font-medium text-white/80">Name</div>
                    <div className="text-[12px] font-medium text-white/80">Email</div>
                    <div className="text-[12px] font-medium text-white/80">Status</div>
                    <div className="text-[12px] font-medium text-white/80">Dietary</div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {[
                      { name: "Ronald Richards", email: "ronald@ex.com", status: "Confirmed", diet: "None" },
                      { name: "Courtney Henry", email: "court@ex.com", status: "Pending", diet: "Vegan" },
                      { name: "Esther Howard", email: "esther@ex.com", status: "Confirmed", diet: "Gluten-Free" },
                    ].map((row, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className="bg-white/20 backdrop-blur-md rounded-xl p-4 grid grid-cols-4 items-center border border-white/10"
                      >
                        <div className="text-white font-sans text-[13px]">{row.name}</div>
                        <div className="text-white/80 font-sans text-[13px] truncate">{row.email}</div>
                        <div className="text-white/80 font-sans text-[13px]">{row.status}</div>
                        <div className="text-white/80 font-sans text-[13px]">{row.diet}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};
