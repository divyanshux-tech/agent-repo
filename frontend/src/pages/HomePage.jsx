import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollTextReveal } from '../components/home/ScrollTextReveal';
import { FeatureCardDynamic } from '../components/home/FeatureCardDynamic';
import { FeatureCardTwo } from '../components/home/FeatureCardTwo';
import { FeatureCardThree } from '../components/home/FeatureCardThree';
import { FeatureGridOne } from '../components/home/FeatureGridOne';
import { FeatureGridTwo } from '../components/home/FeatureGridTwo';
import { FooterCTA } from '../components/layout/FooterCTA';

const indiaDestinations = [
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80', // Kerala
  'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=1200&q=80', // Ladakh
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80', // Jaipur
  'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80', // Varanasi
];

const dynamicPrompts = [
  "Plan a 5-day trip to Kerala...",
  "Find cheap flights to Goa...",
  "Book a heritage hotel in Jaipur...",
  "Suggest a trekking route in Ladakh..."
];

export const HomePage = () => {
  const containerRef = useRef(null);
  
  // Very smooth and slow mouse tracking for dynamic splashes
  const mouseX = useSpring(0, { stiffness: 15, damping: 40 });
  const mouseY = useSpring(0, { stiffness: 15, damping: 40 });
  
  // Opposite movement for parallax depth
  const mouseXOpposite = useTransform(mouseX, [ -100, 100 ], [ 40, -40 ]);
  const mouseYOpposite = useTransform(mouseY, [ -100, 100 ], [ 40, -40 ]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseX.set(x * 200); // Larger travel radius
      mouseY.set(y * 200);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % indiaDestinations.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentPrompt = dynamicPrompts[promptIndex];
    let timeout;
    
    if (isTyping) {
      if (displayText.length < currentPrompt.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentPrompt.slice(0, displayText.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 2000);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 30);
      } else {
        setIsTyping(true);
        setPromptIndex((prev) => (prev + 1) % dynamicPrompts.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayText, isTyping, promptIndex]);

  return (
    <div className="w-full relative bg-white">
      {/* Hero Section Container */}
      <div 
        ref={containerRef}
        className="h-screen min-h-[700px] overflow-hidden relative w-full bg-[#FF8A65]"
        style={{
          // Moderate dark rich base blending orange to a subtle magenta deep down
          backgroundImage: 'linear-gradient(135deg, #FFB39B 0%, #FF8A65 40%, #D83B8F 120%)'
        }}
      >
        {/* Rich Purple Splash tracking cursor very slowly */}
      <motion.div 
        className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full pointer-events-none z-0"
        style={{
          x: mouseX,
          y: mouseY,
          backgroundImage: 'radial-gradient(circle, rgba(162, 60, 253, 0.7) 0%, rgba(240, 47, 194, 0.4) 40%, transparent 75%)',
          filter: 'blur(90px)',
          mixBlendMode: 'multiply'
        }}
      />

      {/* Deep Warm Splash moving opposite */}
      <motion.div 
        className="absolute bottom-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full pointer-events-none z-0"
        style={{
          x: mouseXOpposite,
          y: mouseYOpposite,
          backgroundImage: 'radial-gradient(circle, rgba(255, 90, 64, 0.6) 0%, rgba(255, 138, 101, 0.3) 60%, transparent 80%)',
          filter: 'blur(100px)',
          mixBlendMode: 'color-burn'
        }}
      />

      {/* Beautiful, Slow Expanding Circular Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] flex items-center justify-center pointer-events-none z-0">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-[1.5px] border-white/10"
            style={{ boxShadow: '0 0 30px rgba(255,255,255,0.05) inset, 0 0 30px rgba(255,255,255,0.05)' }}
            initial={{ width: 450, height: 450, opacity: 1 }}
            animate={{ width: 2200, height: 2200, opacity: 0 }}
            transition={{
              duration: 16, // Very slow expansion
              repeat: Infinity,
              ease: "linear",
              delay: i * 4,
            }}
          />
        ))}
      </div>
      
      {/* Bottom Left Corner Text */}
      <div className="absolute bottom-8 left-10 flex flex-col gap-2 z-10 pointer-events-auto">
        <Link to="#" className="text-white/90 font-sans text-[13px] hover:text-white transition-colors flex items-center gap-1">See example <ArrowRight size={14} strokeWidth={1.5} /></Link>
        <Link to="#" className="text-white/90 font-sans text-[13px] hover:text-white transition-colors flex items-center gap-1">Get in touch <ArrowRight size={14} strokeWidth={1.5} /></Link>
      </div>

      {/* Bottom Right Corner Text Block */}
      <div className="absolute bottom-8 right-10 max-w-[280px] z-10 hidden md:block">
        <div className="flex items-center gap-1 mb-3 opacity-80">
          <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
          <div className="text-white/90 text-lg leading-none mt-1">*</div>
        </div>
        <p className="text-white/80 font-sans font-light text-[13px] leading-[1.6]">
          The free travel agent alternative you always deserved. From solo backpackers to luxury travelers — create stunning, interactive itineraries that boost your experience, and deliver AI-driven insights.
        </p>
      </div>

      {/* Absolutely Centered Image Circle (Reduced size) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] z-10">
        <div className="relative w-[380px] h-[380px] lg:w-[600px] lg:h-[600px] rounded-full overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.15)] ring-1 ring-white/10 bg-[#FF9A7A]">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={currentImgIndex}
              src={indiaDestinations[currentImgIndex]}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Travel Destination"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20" />
        </div>

        {/* Frosted Chat Input precisely placed inside the circle space */}
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 z-30">
          <div className="w-full bg-[#2A2A2A]/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full p-2 pl-6 flex items-center justify-between">
            <div className="flex items-center flex-1 overflow-hidden">
              <span className="font-sans font-medium text-[14px] text-white whitespace-nowrap">
                {displayText}
              </span>
              <span className="w-[2px] h-4 bg-nura-orange ml-1 animate-pulse" />
            </div>
            <div className="w-10 h-10 rounded-full bg-[#A23CFD] flex items-center justify-center text-white shrink-0 ml-4 cursor-pointer hover:bg-[#b055fd] transition-colors shadow-glow">
              <Send size={16} strokeWidth={1.5} className="ml-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Left Side Text (Absolutely Positioned) */}
      <div className="absolute left-6 md:left-[8%] top-1/2 -translate-y-1/2 w-full max-w-[500px] z-20 pointer-events-none">
        <motion.h1 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-display font-light text-[56px] lg:text-[76px] leading-[1.05] text-white tracking-tight"
          style={{ textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'antialiased', textShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          Stunning, <br/>AI-Powered <br/>Trips in <br/>Seconds.
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-10 flex items-center gap-3 pointer-events-auto"
        >
          {/* Separated Pill & Circle Button Design */}
          <Link to="/demo" className="bg-white rounded-full px-7 py-[15px] flex items-center justify-center shadow-lg hover:scale-[1.02] transition-transform">
            <span className="font-sans font-light text-nura-dark text-[15px] tracking-wide">Try Agent Now</span>
          </Link>
          <Link to="/demo" className="w-[54px] h-[54px] rounded-full bg-white flex items-center justify-center shadow-md hover:scale-[1.02] transition-transform text-nura-dark">
            <ArrowRight size={20} strokeWidth={1} />
          </Link>
        </motion.div>
      </div>

      </div>

      {/* NEW SCROLLING COMPONENTS */}
      <ScrollTextReveal />
      <FeatureCardDynamic />
      <FeatureCardTwo />
      <FeatureCardThree />
      
      {/* FINAL HOMEPAGE SECTIONS */}
      <FeatureGridOne />
      <FeatureGridTwo />
      <FooterCTA />

    </div>
  );
};