import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MapPin, CheckCircle2 } from 'lucide-react';

export const FeatureCardTwo = () => {
  const [phase, setPhase] = useState('chat'); // 'chat' -> 'updating' -> 'done'

  useEffect(() => {
    let timeout;
    if (phase === 'chat') {
      timeout = setTimeout(() => setPhase('updating'), 2500);
    } else if (phase === 'updating') {
      timeout = setTimeout(() => setPhase('done'), 2000);
    } else if (phase === 'done') {
      timeout = setTimeout(() => setPhase('chat'), 3500);
    }
    return () => clearTimeout(timeout);
  }, [phase]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-20 flex flex-col-reverse lg:flex-row items-center lg:items-stretch gap-16 relative z-20 bg-white">
      
      {/* LEFT SIDE: Dynamic Card (Reversed layout) */}
      <div className="w-full lg:w-[60%] min-h-[500px] lg:min-h-[560px] rounded-[32px] relative overflow-hidden shadow-[0_20px_50px_rgba(123,82,255,0.15)] transition-all duration-1000">
        
        {/* Soft Blue/Purple Gradient Background matching Nuraform SS2 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#5D46F5] via-[#8B6DF8] to-[#DAB6FC]" />
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#E5C9FF] blur-[90px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#351AE3] blur-[80px] mix-blend-multiply opacity-40" />
        
        {/* The Orange 02 Badge Floating on the Right Edge */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30">
          <div className="w-[80px] h-[50px] rounded-[30px] bg-[#FF6B4A] flex items-center justify-center text-white font-sans text-xl shadow-lg">
            02
          </div>
        </div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 lg:p-12">
          
          <h4 className="absolute bottom-12 text-center text-white/40 font-display text-4xl lg:text-5xl drop-shadow-sm font-normal">
            Tweak and done!
          </h4>

          <div className="relative w-full max-w-[440px] h-[340px] flex items-center justify-center">
            
            {/* Phase 1: Chat Suggestion */}
            <AnimatePresence mode="wait">
              {phase === 'chat' && (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-6 shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white"
                >
                  <div className="text-[12px] font-medium text-[#888] uppercase tracking-wider mb-3">User Suggestion</div>
                  <div className="text-[#222] font-sans text-[18px] leading-relaxed">
                    "This looks great, but can we swap out Paris for Tokyo and make it 5 days instead?"
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#EAEAEA]" />
                    <div className="w-[120px] h-2 rounded-full bg-[#EAEAEA]" />
                  </div>
                </motion.div>
              )}

              {/* Phase 2: Updating State */}
              {phase === 'updating' && (
                <motion.div 
                  key="updating"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-6 shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white flex flex-col items-center justify-center py-10"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="text-[#8B6DF8] mb-4"
                  >
                    <RefreshCw size={32} />
                  </motion.div>
                  <div className="text-[#222] font-sans font-medium text-[16px]">Rewriting Itinerary...</div>
                  <div className="text-[#888] text-[13px] mt-2 text-center">Adjusting flights, hotels, and daily schedules for Tokyo context.</div>
                </motion.div>
              )}

              {/* Phase 3: Done State */}
              {phase === 'done' && (
                <motion.div 
                  key="done"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-6 shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-[#888] uppercase tracking-wider">Status</div>
                      <div className="text-[#10B981] font-sans font-medium text-[16px]">Successfully Updated</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#8B6DF8]/10 flex items-center justify-center text-[#8B6DF8] shrink-0 mt-1">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div className="text-[#222] font-sans font-medium text-[16px]">5-Day Tokyo Adventure</div>
                        <div className="text-[#666] text-[13px] mt-1 leading-relaxed">
                          New flight routes assigned. Bullet train schedule generated. Sushi tasting added to Day 1.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Text content */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center lg:pl-10 relative">
        <h3 className="font-display text-[42px] lg:text-[50px] leading-[1.05] text-[#1A1A1A] mb-8 lg:mb-12">
          Tweak it. Ask for<br/>suggestions, just<br/>talk to it
        </h3>
        <p className="text-[#666666] font-sans text-[15px] leading-[1.6] max-w-sm mt-4 lg:mt-24">
          AI builds a full itinerary instantly with accurate pricing, travel times, and logic that makes sense. Want it shorter? More fun? Need vegan options? Just ask.
        </p>
      </div>

    </div>
  );
};
