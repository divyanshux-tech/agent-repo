import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const ScrollTextReveal = () => {
  const containerRef = useRef(null);
  
  // Track the scroll progress through a taller container for sticky effect
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"] 
  });

  // Calculate opacities for the fading words (animating as user scrolls through the sticky section)
  const clickOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0.1, 1]);
  const aCompleteOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0.1, 1]);
  const formInSecOpacity = useTransform(scrollYProgress, [0.5, 0.7], [0.1, 1]);
  const pOpacity = useTransform(scrollYProgress, [0.6, 0.8], [0, 1]);
  const pY = useTransform(scrollYProgress, [0.6, 0.8], [20, 0]);

  return (
    <div 
      ref={containerRef}
      className="w-full bg-white relative z-20 h-[150vh]"
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="font-display font-normal text-[#1A1A1A] text-[40px] md:text-[60px] lg:text-[76px] leading-[1.1] tracking-tight"
            style={{ textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'antialiased' }}
          >
            <span>One prompt. </span>
            <motion.span style={{ opacity: clickOpacity }}>One click. </motion.span>
            <motion.span style={{ opacity: aCompleteOpacity }}>A complete </motion.span>
            <br className="hidden md:block" />
            <motion.span style={{ opacity: formInSecOpacity }} className="text-[#888888] italic">itinerary in seconds</motion.span>
          </h2>
          
          <motion.p 
            style={{ opacity: pOpacity, y: pY }}
            className="mt-8 text-[15px] md:text-[16px] text-[#666666] font-sans max-w-2xl mx-auto leading-[1.6]"
          >
            No decision making. No need to wonder what to search, Just describe what you need, 
            and let AI handle the rest. Customize your travel, and unlock experiences that actually matter.
          </motion.p>
        </div>
      </div>
    </div>
  );
};
