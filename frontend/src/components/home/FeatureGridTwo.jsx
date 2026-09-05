import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, PlusCircle, PenTool, Sparkles } from 'lucide-react';

export const FeatureGridTwo = () => {
  return (
    <div className="w-full bg-white pb-32 relative z-20">
      
      {/* Heading Section */}
      <div className="max-w-4xl mx-auto text-center px-6 mb-16">
        <h2 className="font-display text-[40px] md:text-[50px] lg:text-[56px] leading-[1.1] text-nura-dark mb-6">
          Intelligence that saves you time
        </h2>
        <p className="font-sans text-[15px] md:text-[16px] text-[#666666] max-w-2xl mx-auto leading-[1.6]">
          AI that works behind the scenes, so you don't have to, from one-click itinerary generation to AI summaries. Available on free plan, because your time is precious.
        </p>
      </div>

      {/* Grid Section */}
      <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Left (Pink/Orange Gradient) */}
        <div className="flex flex-col gap-4 group">
          <div className="w-full h-[320px] rounded-[24px] relative overflow-hidden flex items-center justify-center border border-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF8A8A] via-[#FF8A65] to-[#FFD1C9]" />
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
            
            {/* Pill Menu UI */}
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: "spring" }}
              className="relative z-10 bg-white/95 backdrop-blur-md rounded-full p-1.5 shadow-[0_15px_30px_rgba(0,0,0,0.1)] flex items-center"
            >
              <div className="bg-[#FF6B4A] text-white rounded-full px-5 py-2 flex items-center gap-2 font-medium text-[13px] shadow-sm cursor-pointer">
                <Lightbulb size={14} /> Suggest
              </div>
              <div className="text-[#666] px-5 py-2 flex items-center gap-2 font-medium text-[13px] hover:text-[#222] transition-colors cursor-pointer">
                <PlusCircle size={14} /> Insert
              </div>
              <div className="text-[#666] px-5 py-2 flex items-center gap-2 font-medium text-[13px] hover:text-[#222] transition-colors cursor-pointer">
                <PenTool size={14} /> Rewrite
              </div>
            </motion.div>
          </div>
          <p className="text-[15px] text-[#222] font-sans pr-4 leading-[1.4]">
            3 simple modes to help you brainstorm, add, or refine itinerary with AI.
          </p>
        </div>

        {/* Card 2: Middle (Purple Gradient) */}
        <div className="flex flex-col gap-4 group">
          <div className="w-full h-[320px] rounded-[24px] relative overflow-hidden flex items-center justify-center border border-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9760FB] via-[#D38DF8] to-[#FFB5E8]" />
            
            {/* The Top "Sparkle" Text */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/90 text-[12px] font-medium tracking-wide">
              <Sparkles size={12} /> The only column you need to read
            </div>

            {/* Table Mock UI */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring" }}
              className="absolute bottom-0 w-[85%] h-[75%] rounded-t-[16px] bg-white/20 backdrop-blur-md border-t border-x border-white/40 flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header Row */}
              <div className="w-full flex items-center justify-between px-6 py-4 border-b border-white/20 text-white/90 text-[10px] font-bold tracking-widest uppercase">
                <span className="w-1/4">Name</span>
                <span className="w-1/2 text-white">AI Summary</span>
                <span className="w-1/4 text-right">More...</span>
              </div>
              {/* Content Rows */}
              <div className="flex-1 w-full flex relative">
                {/* Highlighted AI Column Overlay */}
                <div className="absolute left-[25%] w-[50%] h-[120%] -top-[10%] bg-white rounded-lg shadow-xl border border-black/5 z-10 flex flex-col p-4 gap-4">
                  <div className="text-[10px] font-medium text-[#222] uppercase tracking-wider mb-1 opacity-40">AI SUMMARY</div>
                  <div className="text-[12px] text-[#222] leading-relaxed">
                    Ronald prefers culturally rich experiences, loves trying local cuisine, and wants to avoid packed tourist spots.
                  </div>
                  <div className="text-[12px] text-[#222] leading-relaxed opacity-60">
                    Esther needs vegetarian dining options and wants at least one hiking day.
                  </div>
                </div>
                {/* Background Row Content (Faded) */}
                <div className="w-full px-6 pt-4 flex justify-between text-white/70 text-[12px]">
                  <span className="w-1/4 pt-4">Ronald R.</span>
                  <span className="w-1/4 text-right pt-4">Details</span>
                </div>
              </div>
            </motion.div>
          </div>
          <p className="text-[15px] text-[#222] font-sans pr-4 leading-[1.4]">
            AI-powered summaries per destination and per group member.
          </p>
        </div>

        {/* Card 3: Right (Orange Gradient Analytics) */}
        <div className="flex flex-col gap-4 group">
          <div className="w-full h-[320px] rounded-[24px] relative overflow-hidden flex items-center justify-center border border-black/5 bg-[#FFF0E5]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF9D7E] to-[#FFD5C2] opacity-80" />
            <div className="absolute top-0 right-0 w-[60%] h-[60%] rounded-full bg-[#FF6B4A]/20 blur-[60px]" />
            
            {/* Analytics Dashboard UI */}
            <motion.div 
              initial={{ y: 15, scale: 0.95, opacity: 0 }}
              whileInView={{ y: 0, scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative z-10 w-[85%] bg-white rounded-[16px] p-5 shadow-[0_20px_40px_rgba(255,107,74,0.15)] border border-black/5"
            >
              <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-4">Trip Details</div>
              
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <div className="text-[#222] font-display text-[28px] leading-none mb-1">$1.2k</div>
                  <div className="text-[#888] text-[10px] uppercase tracking-wider">Est. Cost</div>
                </div>
                <div>
                  <div className="text-[#222] font-display text-[28px] leading-none mb-1">26</div>
                  <div className="text-[#888] text-[10px] uppercase tracking-wider">Activities</div>
                </div>
                <div>
                  <div className="text-[#222] font-display text-[28px] leading-none mb-1 flex items-baseline gap-0.5">4<span className="text-[14px]">hrs</span></div>
                  <div className="text-[#888] text-[10px] uppercase tracking-wider">Travel Time</div>
                </div>
                <div>
                  <div className="text-[#222] font-display text-[24px] leading-[1.15] mb-1">Relaxed</div>
                  <div className="text-[#888] text-[10px] uppercase tracking-wider">Pace</div>
                </div>
              </div>
            </motion.div>
          </div>
          <p className="text-[15px] text-[#222] font-sans pr-4 leading-[1.4]">
            Live analytics — costs, travel time, activities & more.
          </p>
        </div>

      </div>
    </div>
  );
};
