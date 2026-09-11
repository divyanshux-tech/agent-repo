import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { useSmartAuth } from '../components/auth/AuthProvider';
import { Plane, MapPin, Sparkles, Compass } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useSmartAuth();

  // Redirect to chat if already authenticated
  React.useEffect(() => {
    if (user && !user.id.startsWith("mock_")) {
      navigate('/chat');
    }
  }, [user, navigate]);

  const handleFreeTier = () => {
    navigate('/chat');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#121212] font-sans selection:bg-[#FF6B4A]/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E112A] via-[#121212] to-[#120F18]" />
        
        {/* Animated Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF6B4A]/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#D83B8F]/20 blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[30%] left-[40%] w-[400px] h-[400px] rounded-full bg-[#A23CFD]/20 blur-[100px]"
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
        
        {/* Logo / Brand */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B4A] to-[#D83B8F] flex items-center justify-center shadow-lg shadow-[#FF6B4A]/20">
            <Compass className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-display font-medium text-white tracking-tight">NuraTravel</h1>
        </motion.div>

        {/* Hero Copy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-center max-w-2xl mb-12"
        >
          <h2 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight tracking-tight">
            Plan your next journey with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B4A] to-[#D83B8F]">AI Precision</span>
          </h2>
          <p className="text-lg md:text-xl text-white/60 font-light">
            Your personal AI travel companion. Instant itineraries, dynamic budget planning, and voice-activated assistance.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          {/* Clerk Sign In / Sign Up */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <SignInButton mode="modal" fallbackRedirectUrl="/chat" signUpFallbackRedirectUrl="/chat">
              <button className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-black font-medium text-[15px] hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Log In
              </button>
            </SignInButton>

            <SignUpButton mode="modal" fallbackRedirectUrl="/chat" signInFallbackRedirectUrl="/chat">
              <button className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/10 text-white font-medium text-[15px] border border-white/20 hover:bg-white/20 transition-all shadow-lg hover:-translate-y-0.5">
                Sign Up
              </button>
            </SignUpButton>
          </div>

          <div className="w-full sm:w-px h-px sm:h-8 bg-white/20 mx-2 hidden sm:block" />

          {/* Free Tier Button */}
          <button 
            onClick={handleFreeTier}
            className="group relative w-full sm:w-auto px-8 py-3.5 rounded-full overflow-hidden bg-gradient-to-r from-[#FF6B4A] to-[#D83B8F] text-white font-medium text-[15px] transition-all shadow-lg shadow-[#FF6B4A]/20 hover:shadow-[#FF6B4A]/40 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Try Free Tier (2 Messages)
            </span>
          </button>
        </motion.div>

        {/* Floating Features (Decorative) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-8 md:gap-16 text-white/40 text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4" /> <span>Smart Flights</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" /> <span>Local Guides</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
            </svg>
            <span>Voice Agent</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
