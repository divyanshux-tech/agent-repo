import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, Calendar } from 'lucide-react';

const AVATAR_IMAGES = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
];

export const FeatureCardDynamic = () => {
  const [phase, setPhase] = useState('avatars'); // 'avatars' -> 'typing' -> 'results'
  const [typedText, setTypedText] = useState('');
  const targetText = "Build a 7-day European itinerary...";

  useEffect(() => {
    let timeout;
    if (phase === 'avatars') {
      timeout = setTimeout(() => setPhase('typing'), 1500);
    } else if (phase === 'typing') {
      if (typedText.length < targetText.length) {
        timeout = setTimeout(() => {
          setTypedText(targetText.slice(0, typedText.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => setPhase('results'), 1000);
      }
    } else if (phase === 'results') {
      timeout = setTimeout(() => {
        setPhase('avatars');
        setTypedText('');
      }, 4000);
    }
    return () => clearTimeout(timeout);
  }, [phase, typedText]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-32 flex flex-col lg:flex-row items-center lg:items-stretch gap-16 relative z-20 bg-white">
      
      {/* LEFT SIDE */}
      <div className="w-full lg:w-[35%] flex flex-col justify-center relative">
        <div className="flex items-center absolute -left-12 lg:-left-20 top-[20%]">
          <div className="w-[80px] h-[50px] rounded-[30px] bg-[#FF6B4A] flex items-center justify-center text-white font-sans text-xl shadow-lg">
            01
          </div>
        </div>
        <h3 className="font-display text-[42px] leading-[1.1] text-nura-dark mb-6 mt-12">
          Describe what<br/>you need
        </h3>
        <p className="text-[#666666] font-sans text-[15px] leading-[1.6] max-w-sm">
          No need to wonder what to ask, Just tell us what kind of trip you want, like "weekend getaway in Paris" or "family trip to Japan." AI will understand the context and start building in seconds.
        </p>
      </div>

      {/* RIGHT SIDE: Dynamic Card */}
      <div className="w-full lg:w-[65%] min-h-[500px] lg:min-h-[600px] rounded-[32px] p-8 lg:p-12 relative overflow-hidden shadow-[0_20px_50px_rgba(255,107,74,0.15)] transition-all duration-1000">
        
        {/* Soft Reddish Pink Gradient Background matching Nuraform SS */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFE1E1] via-[#FFA4B2] to-[#FF4D79] opacity-90" />
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#FF4D79] blur-[80px] mix-blend-multiply opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB3B3] blur-[80px] mix-blend-screen opacity-70" />
        
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          <h4 className="text-center text-white font-display text-3xl lg:text-4xl mb-12 drop-shadow-sm font-normal">
            Describe and done!
          </h4>

          <div className="relative w-full max-w-2xl h-[340px] flex items-center justify-center">
            
            {/* Phase 1: Floating Avatars & Prompt */}
            <AnimatePresence>
              {(phase === 'avatars' || phase === 'typing') && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* Floating Avatars popping in dynamically */}
                  <div className="absolute inset-0 pointer-events-none">
                    <motion.img src={AVATAR_IMAGES[0]} initial={{scale:0}} animate={{ scale:1, y: [0, -10, 0] }} transition={{ scale: {type:"spring", bounce:0.5, delay:0.1}, y: {duration: 4, repeat: Infinity, ease: "easeInOut"} }} className="absolute top-[10%] left-[20%] w-[90px] h-[90px] rounded-full object-cover shadow-xl border border-white/40" />
                    <motion.img src={AVATAR_IMAGES[1]} initial={{scale:0}} animate={{ scale:1, y: [0, 15, 0] }} transition={{ scale: {type:"spring", bounce:0.5, delay:0.2}, y: {duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1} }} className="absolute top-[15%] right-[15%] w-[110px] h-[110px] rounded-full object-cover shadow-xl border border-white/40" />
                    <motion.img src={AVATAR_IMAGES[2]} initial={{scale:0}} animate={{ scale:1, y: [0, -15, 0] }} transition={{ scale: {type:"spring", bounce:0.5, delay:0.3}, y: {duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2} }} className="absolute bottom-[20%] left-[10%] w-[100px] h-[100px] rounded-full object-cover shadow-xl border border-white/40" />
                    <motion.img src={AVATAR_IMAGES[3]} initial={{scale:0}} animate={{ scale:1, y: [0, 10, 0] }} transition={{ scale: {type:"spring", bounce:0.5, delay:0.4}, y: {duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5} }} className="absolute bottom-[10%] right-[25%] w-[120px] h-[120px] rounded-full object-cover shadow-xl border border-white/40" />
                  </div>

                  {/* Typing Prompt Bar */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4, delay: 0.6 }}
                    className="relative z-20 w-[95%] max-w-[500px] bg-white rounded-[100px] p-2 pl-6 shadow-[0_20px_40px_rgba(0,0,0,0.12)] flex items-center justify-between"
                  >
                    <div className="flex-1 flex items-center overflow-hidden">
                      <span className="font-sans text-[16px] text-[#444] whitespace-nowrap">
                        {typedText || <span className="text-[#999]">Registration form for a weeke...</span>}
                      </span>
                      {phase === 'typing' && <span className="w-[1.5px] h-5 bg-[#FF6B4A] ml-1 animate-pulse" />}
                    </div>
                    <div className="w-[46px] h-[46px] rounded-full bg-[#FF6B4A] flex items-center justify-center text-white shadow-md">
                      <Send size={18} strokeWidth={2} className="ml-0.5" />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 2: Result Cards */}
            <AnimatePresence>
              {phase === 'results' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 flex flex-col gap-4 items-center justify-center w-full max-w-[500px]"
                >
                  {/* Mock Card 1 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: "spring" }}
                    className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.08)] border border-white flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-nura-dark shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-1">Destination</div>
                      <div className="text-[#222] font-sans font-medium text-[16px]">7-Day Classic Europe</div>
                      <div className="text-[#666] text-[13px] mt-1">Paris • Rome • Amsterdam</div>
                    </div>
                  </motion.div>

                  {/* Mock Card 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: "spring" }}
                    className="w-full bg-white/95 backdrop-blur-xl rounded-[20px] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.08)] border border-white flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-nura-dark shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-1">Itinerary Ready</div>
                      <div className="text-[#222] font-sans font-medium text-[16px]">Day 1: Eiffel Tower & Seine</div>
                      <div className="text-[#666] text-[13px] mt-1">Includes 3 premium bookings and walking guides.</div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};
