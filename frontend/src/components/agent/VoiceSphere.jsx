import React from 'react';
import { motion } from 'framer-motion';
import { PhoneOff } from 'lucide-react';

// States: IDLE, LISTENING, THINKING, SPEAKING
export const VoiceSphere = ({ state = 'IDLE', onEndCall }) => {
  // Determine animation based on state
  let scale = 1;
  let pulseDuration = 4;
  let rotateDuration = 20;

  if (state === 'LISTENING') {
    scale = [1, 1.05, 1];
    pulseDuration = 2;
  } else if (state === 'SPEAKING') {
    scale = [1, 1.1, 1];
    pulseDuration = 1.5;
    rotateDuration = 10;
  } else if (state === 'THINKING') {
    scale = [1, 0.98, 1];
    pulseDuration = 1;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative">
      <style>
        {`
          .grain-overlay {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.15;
            mix-blend-mode: overlay;
          }
        `}
      </style>
      
      {/* 3D Sphere Container */}
      <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] flex items-center justify-center">
        
        {/* Soft outer glow */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00D2FF] to-[#3A7BD5] blur-[40px] opacity-40"
          animate={{ scale }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main Sphere */}
        <motion.div
          className="relative w-[280px] h-[280px] md:w-[360px] md:h-[360px] rounded-full overflow-hidden shadow-2xl"
          animate={{ 
            rotate: [0, 360],
            scale
          }}
          transition={{
            rotate: { duration: rotateDuration, repeat: Infinity, ease: "linear" },
            scale: { duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{
            background: 'radial-gradient(circle at 30% 30%, #A1FFCE 0%, #00D2FF 40%, #3A7BD5 80%, #00416A 100%)',
            boxShadow: 'inset -20px -20px 60px rgba(0,0,0,0.3), inset 20px 20px 60px rgba(255,255,255,0.4)',
          }}
        >
          {/* Grain texture for organic premium feel */}
          <div className="absolute inset-0 grain-overlay rounded-full"></div>
        </motion.div>

        {/* End Call Button overlapping the bottom edge */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button 
            onClick={onEndCall}
            className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-900 transition-colors group border-4 border-[#F5F5F7]"
          >
            <PhoneOff size={24} className="text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
      
      {/* State Text */}
      <div className="mt-16 text-center">
        <p className="font-sans text-[18px] text-[#555] font-medium tracking-wide">
          {state === 'IDLE' && 'Ready to plan'}
          {state === 'LISTENING' && 'Listening...'}
          {state === 'THINKING' && 'Thinking...'}
          {state === 'SPEAKING' && 'Agent speaking'}
        </p>
      </div>
    </div>
  );
};
