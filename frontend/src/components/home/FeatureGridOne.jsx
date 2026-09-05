import React from 'react';
import { motion } from 'framer-motion';
import { Plane, ArrowRight } from 'lucide-react';

export const FeatureGridOne = () => {
  return (
    <div className="w-full bg-white py-32 relative z-20">
      
      {/* Heading Section */}
      <div className="max-w-4xl mx-auto text-center px-6 mb-20">
        <h2 className="font-display text-[40px] md:text-[56px] lg:text-[64px] leading-[1.1] text-nura-dark mb-6">
          Plans Like a Pro, Feels<br />Like Magic
        </h2>
        <p className="font-sans text-[16px] text-[#666666] max-w-2xl mx-auto leading-[1.6]">
          Not just good-looking. High-performing too! Every itinerary is crafted to feel premium—and get you out there faster.
        </p>
      </div>

      {/* Grid Section */}
      <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[480px]">
        
        {/* Card 1: Left */}
        <div className="w-full h-[400px] md:h-full bg-[#FAFAFA] rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden border border-black/5 hover:shadow-xl transition-shadow duration-500 group">
          <div className="text-[9px] font-sans font-bold tracking-[0.2em] text-[#888] bg-black/5 px-3 py-1.5 rounded-full mb-8">
            YOUR TRIP
          </div>
          <h3 className="font-display text-[26px] text-nura-dark mb-16">All Set to Go</h3>
          
          {/* Animated Purple Wedge (Flight Radar / Connection concept) */}
          <motion.div 
            className="absolute bottom-[20%] w-[180px] h-[90px] rounded-t-full bg-gradient-to-t from-[#A23CFD] to-[#DAB6FC] opacity-90"
            style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" }}
          />
          
          <div className="absolute bottom-10 text-center w-full px-12">
            <div className="h-[1px] w-full bg-black/5 mb-4" />
            <p className="text-[10px] text-[#999] leading-relaxed uppercase tracking-wider font-medium">
              Itinerary will be synced to your<br/>calendar in seconds
            </p>
          </div>
        </div>

        {/* Card 2: Middle (Orange Gradient) */}
        <div className="w-full h-[400px] md:h-full rounded-[32px] p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-lg group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFB39B] via-[#FF8A65] to-[#FF6B4A]" />
          
          {/* Floating UI Blocks representing itinerary days */}
          <div className="relative z-10 w-full flex items-center justify-center gap-4">
            {/* Left Block */}
            <motion.div 
              initial={{ y: 10, rotate: -2 }}
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-[120px] h-[100px] bg-white/95 rounded-[12px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-3 flex flex-col gap-2 relative mt-10"
            >
              <div className="w-8 h-10 bg-[#f0f0f0] rounded-[6px]" />
            </motion.div>
            
            {/* Right Block (List) */}
            <motion.div 
              initial={{ y: -10, rotate: 2 }}
              animate={{ y: [5, -5, 5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="w-[140px] h-[140px] bg-white/95 rounded-[12px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-2.5"
            >
              <div className="w-full h-4 bg-[#f0f0f0] rounded-[4px]" />
              <div className="w-[80%] h-4 bg-[#f0f0f0] rounded-[4px]" />
              <div className="w-[90%] h-4 bg-[#f0f0f0] rounded-[4px]" />
              <div className="w-[70%] h-4 bg-[#f0f0f0] rounded-[4px]" />
            </motion.div>
          </div>
        </div>

        {/* Card 3: Right */}
        <div className="w-full h-[400px] md:h-full bg-[#FAFAFA] rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden border border-black/5 hover:shadow-xl transition-shadow duration-500 group">
          <h3 className="font-display text-[26px] text-nura-dark mt-6 mb-12">Your Route</h3>
          <div className="w-full max-w-[200px] h-[1px] bg-black/5 mb-16" />
          
          {/* Abstract Route Shape */}
          <motion.div 
            className="w-[180px] h-[60px] relative flex items-center justify-center mb-16"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Custom wavy path using border radius and rotation trick */}
            <div className="absolute w-[60px] h-[60px] rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8A65] left-0 -ml-4" style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }} />
            <div className="absolute w-[120px] h-[60px] bg-gradient-to-r from-[#FF8A65] to-[#FFB39B] transform skew-x-[-20deg]" />
            <div className="absolute w-[40px] h-[40px] rounded-full bg-gradient-to-r from-[#FFB39B] to-[#FFE1D6] right-0 -mr-2 mt-4" />
          </motion.div>
          
          <div className="absolute bottom-12 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#888] flex items-center justify-center text-white cursor-pointer hover:bg-nura-orange transition-colors">
              <ArrowRight size={18} strokeWidth={1.5} />
            </div>
            <div className="text-[9px] font-medium text-[#999] uppercase tracking-widest">
              Takes 2 Mins
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
