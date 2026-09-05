import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FooterCTA = () => {
  return (
    <div className="w-full bg-white relative overflow-hidden pt-32 min-h-[600px] flex flex-col justify-between z-20">
      
      {/* Massive Glowing Footer Gradient at the very bottom */}
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[150vw] h-[600px] pointer-events-none z-0">
        <div className="w-full h-full rounded-full bg-gradient-to-t from-[#FF6B4A]/80 via-[#FF8A65]/40 to-transparent blur-[100px]" />
      </div>

      {/* Main CTA Section */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center flex-1 flex flex-col items-center justify-center pt-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display text-[46px] md:text-[64px] lg:text-[76px] leading-[1.05] text-nura-dark mb-8 tracking-tight"
        >
          You're just a few clicks away from a<br />trip you'll never forget.
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-sans text-[15px] md:text-[17px] text-[#888888] max-w-2xl mx-auto leading-[1.6] mb-12"
        >
          Join hundreds who've already switched to travel planning that feels modern, smart, and captivating!
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center gap-3 justify-center"
        >
          <Link to="/demo" className="bg-[#FF6B4A] rounded-full px-8 py-[18px] flex items-center justify-center shadow-[0_10px_30px_rgba(255,107,74,0.3)] hover:bg-[#ff5b36] hover:scale-[1.02] transition-all">
            <span className="font-sans font-medium text-white text-[15px] tracking-wide">Build Itinerary for free</span>
          </Link>
          <Link to="/demo" className="w-[56px] h-[56px] rounded-full bg-[#FF6B4A] flex items-center justify-center shadow-[0_10px_30px_rgba(255,107,74,0.3)] hover:bg-[#ff5b36] hover:scale-[1.02] transition-all text-white">
            <ArrowRight size={20} strokeWidth={2} />
          </Link>
        </motion.div>
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-8 pt-32">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          
          <div className="flex-1 flex justify-start">
            <Link to="#" className="text-[#666] font-sans text-[14px] hover:text-nura-dark transition-colors">Blogs</Link>
          </div>
          
          <div className="flex-1 flex justify-center gap-12 md:gap-24">
            <Link to="#" className="text-[#666] font-sans text-[14px] hover:text-nura-dark transition-colors">Help</Link>
            <Link to="#" className="text-[#666] font-sans text-[14px] hover:text-nura-dark transition-colors">Contact</Link>
            
            {/* Minimal Logo */}
            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center -mt-2">
              <span className="font-display font-bold text-nura-dark text-xs opacity-50">N</span>
            </div>

            <Link to="#" className="text-[#666] font-sans text-[14px] hover:text-nura-dark transition-colors">Instagram</Link>
            <Link to="#" className="text-[#666] font-sans text-[14px] hover:text-nura-dark transition-colors">Twitter</Link>
          </div>
          
          <div className="flex-1 flex justify-end">
            <Link to="#" className="text-[#666] font-sans text-[14px] hover:text-nura-dark transition-colors">LinkedIn</Link>
          </div>
        </div>
        
        {/* Copyright & Legal */}
        <div className="flex items-center justify-between text-[#999] text-[11px] font-sans">
          <div>© 2026 Agent. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-nura-dark transition-colors">Terms & Use</Link>
            <span>|</span>
            <Link to="#" className="hover:text-nura-dark transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
