import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Plane, Building2, Train, MessageSquarePlus } from 'lucide-react';
import { AgentInput } from './AgentInput';
import { VoiceSphere } from './VoiceSphere';
import { VoiceState } from '../../services/voice/voiceState';
import { RightSidebarPanel } from './RightSidebarPanel';
import FlightCard from '../ui/FlightCard';
import TrainCard from '../ui/TrainCard';

const SidebarItem = ({ icon, label, isOpen, onClick, active }) => (
  <motion.div 
    onClick={onClick}
    className={`h-[48px] rounded-[14px] flex items-center px-[14px] shadow-sm border border-black/5 cursor-pointer hover:scale-105 transition-transform relative overflow-hidden ${active ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
  >
    <div className="shrink-0 text-white flex items-center justify-center w-[20px] h-[20px]">
      {icon}
    </div>
    <AnimatePresence>
      {isOpen && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="font-sans font-medium text-[15px] text-white ml-3 whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  </motion.div>
);

export const NuraAgentDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState(null);
  
  const [voiceState, setVoiceState] = useState(VoiceState.IDLE);
  
  const [messages, setMessages] = useState([
    { role: 'user', content: 'Mujhe october mein jaipur ghumna hai' },
    { role: 'agent', content: 'Bilkul, Jaipur October mein kaafi achha option hai. Aap kitne din ke liye jaana soch rahe hain?' }
  ]);
  
  const wsRef = useRef(null);

  useEffect(() => {
    if (isVoiceMode && !wsRef.current) {
      const ws = new WebSocket('ws://localhost:8000/api/voice/ws/test-session-123');
      
      ws.onopen = () => {
        console.log('Connected to Voice Gateway');
        setVoiceState(VoiceState.IDLE);
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TRANSCRIPT_INTERIM' || msg.type === 'TRANSCRIPT_FINAL') {
          setVoiceState(VoiceState.PROCESSING);
        } else if (msg.type === 'AGENT_RESPONSE_TEXT') {
          setVoiceState(VoiceState.SPEAKING);
          setMessages(prev => [...prev, { role: 'agent', content: msg.text }]);
        } else if (msg.type === 'TURN_COMPLETE') {
          setVoiceState(VoiceState.IDLE);
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected from Voice Gateway');
        wsRef.current = null;
      };
      
      wsRef.current = ws;
    }
    
    return () => {
      if (!isVoiceMode && wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isVoiceMode]);

  const handleInputSubmit = (text, isVoiceTrigger = false) => {
    if (isVoiceTrigger) {
      setIsVoiceMode(true);
      setIsChatActive(true);
      setVoiceState(VoiceState.LISTENING);
    } else {
      console.log('Query:', text);
      setIsChatActive(true);
      if (isVoiceMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setVoiceState(VoiceState.PROCESSING);
        wsRef.current.send(JSON.stringify({ type: 'TEXT_INPUT', text }));
      } else {
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        // Mock text response for demo since we don't have a text WS endpoint yet
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'agent', content: "Got it! Feel free to use the sidebar to search for specific flights, stays, or trains." }]);
        }, 1000);
      }
    }
  };

  const handleEndCall = () => {
    setIsVoiceMode(false);
    setVoiceState(VoiceState.IDLE);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleSearchResults = (type, results) => {
    // We can inject a system message into the chat showing we found results
    setMessages(prev => [...prev, { 
      role: 'agent', 
      content: `I found ${results.length} ${type} for you!`,
      resultsData: results,
      resultsType: type
    }]);
  };

  return (
    <div className="h-screen w-full flex bg-[#F5F5F7] p-3 overflow-hidden">
      
      {/* Flappable Left Sidebar */}
      <motion.div 
        className="flex flex-col justify-between py-6 h-full mr-2 rounded-2xl relative z-50 overflow-hidden shadow-lg bg-gradient-to-b from-[#FF6B4A] via-[#FF4D79] to-[#D83B8F]"
        initial={{ width: 60 }}
        animate={{ width: isSidebarOpen ? 240 : 60 }}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      >
        <div className="flex flex-col gap-6">
          {/* Top Logo */}
          <div className="flex items-center gap-4 px-[16px] text-white cursor-pointer h-[28px]">
            <svg className="shrink-0 text-white" width="28" height="28" viewBox="0 0 32 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" />
            </svg>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-sans font-medium text-[20px] text-white tracking-tight whitespace-nowrap"
                >
                  nuraform
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Items */}
          <div className="px-[6px] flex flex-col gap-2 mt-4">
            <SidebarItem 
              icon={<MessageSquarePlus size={20} strokeWidth={2}/>} 
              label="New conversation" 
              isOpen={isSidebarOpen} 
              onClick={() => { setIsChatActive(false); setActiveRightPanel(null); }} 
            />
            
            <div className="h-px bg-white/20 my-2 mx-2"></div>
            
            <SidebarItem 
              icon={<Plane size={20} strokeWidth={2}/>} 
              label="Flights" 
              isOpen={isSidebarOpen} 
              active={activeRightPanel === 'flights'}
              onClick={() => { setIsChatActive(true); setActiveRightPanel('flights'); }} 
            />
            <SidebarItem 
              icon={<Building2 size={20} strokeWidth={2}/>} 
              label="Stays" 
              isOpen={isSidebarOpen} 
              active={activeRightPanel === 'stays'}
              onClick={() => { setIsChatActive(true); setActiveRightPanel('stays'); }} 
            />
            <SidebarItem 
              icon={<Train size={20} strokeWidth={2}/>} 
              label="Trains" 
              isOpen={isSidebarOpen} 
              active={activeRightPanel === 'trains'}
              onClick={() => { setIsChatActive(true); setActiveRightPanel('trains'); }} 
            />
          </div>
        </div>

        {/* BOTTOM SECTION: User Avatar */}
        <div className="px-2.5">
          <motion.div 
            className="h-[40px] flex items-center bg-black/10 hover:bg-black/20 rounded-full cursor-pointer transition-colors overflow-hidden"
          >
            <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#A23CFD] to-[#FF6B4A] flex items-center justify-center shrink-0 border-2 border-white">
              <User size={18} className="text-white" strokeWidth={2} />
            </div>
            
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col ml-3 pr-4 whitespace-nowrap"
                >
                  <span className="font-sans font-medium text-[14px] text-white leading-tight">Guest</span>
                  <span className="font-sans text-[11px] text-white/80 leading-tight">Demo Access</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div 
        layout
        className="flex-1 h-full rounded-[32px] bg-white shadow-xl flex overflow-hidden relative border border-black/5"
      >
        <AnimatePresence mode="wait">
          {!isChatActive && !isVoiceMode ? (
            /* INACTIVE STATE: Large centered search canvas */
            <motion.div 
              key="inactive"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full flex flex-col relative bg-nura-hero overflow-hidden"
            >
              <style>
                {`
                  @keyframes slow-gradient-nura {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  .bg-nura-hero {
                    background: linear-gradient(-45deg, #FFF0F5, #FFFFFF, #FFE4E1, #F8F4FF, #FFF0EE);
                    background-size: 400% 400%;
                    animation: slow-gradient-nura 15s ease infinite;
                  }
                `}
              </style>
              <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF8A65]/20 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
              <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A23CFD]/15 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '10s' }} />
              <div className="absolute bottom-[-20%] right-[20%] w-[40%] h-[40%] bg-[#FF4D79]/15 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '12s' }} />

              <div className="px-12 py-8 flex items-center gap-3 z-10">
                <svg className="w-6 h-6 text-[#FF6B4A]" viewBox="0 0 32 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" />
                </svg>
                <div className="font-display font-medium text-[24px] text-nura-dark tracking-tight">NuraTravel</div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-8 z-10 pb-[25vh]">
                <span className="font-sans text-[#888] font-normal text-[18px] mb-3 tracking-[0.02em]">Try AI Travel Agent Demo</span>
                <h1 className="font-display font-normal text-[56px] md:text-[68px] text-[#1A1A1A] tracking-[-0.02em] mb-12 leading-none antialiased">
                  Plan a trip in seconds
                </h1>

                <div className="flex items-center gap-4 flex-wrap justify-center max-w-3xl">
                  {['Weekend Getaway', 'Kerala Backwaters', 'Spiti Expedition', 'Goa Budget Trip'].map((chip, i) => (
                    <button key={i} onClick={() => handleInputSubmit(chip)} className="px-5 py-2.5 rounded-full bg-[#F5F5F7] text-[#555] font-sans font-medium text-[13px] tracking-wide hover:bg-[#E8E8ED] transition-colors antialiased">
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[800px] px-6 z-20">
                <AgentInput onSubmit={handleInputSubmit} placeholder="Describe your trip idea..." />
              </div>
            </motion.div>
          ) : (
            /* ACTIVE STATE: Multi-column Layout */
            <motion.div 
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex relative overflow-hidden"
            >
              <style>
                {`
                  @keyframes slow-gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  .bg-dynamic-agent {
                    background: linear-gradient(-45deg, #FFF0F5, #F5F3FF, #FFF5EC, #FFFFFF);
                    background-size: 400% 400%;
                    animation: slow-gradient 15s ease infinite;
                  }
                `}
              </style>
              <div className="absolute inset-0 bg-dynamic-agent z-0"></div>
              
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF4D79]/5 rounded-full blur-[120px] animate-pulse z-0" style={{ animationDuration: '8s' }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A23CFD]/5 rounded-full blur-[120px] animate-pulse z-0" style={{ animationDuration: '10s' }} />

              {/* Left Column (Voice Mode Only) */}
              {isVoiceMode && (
                <div className="w-1/2 h-full flex flex-col relative z-10 border-r border-black/5 bg-white/30 backdrop-blur-sm">
                  <VoiceSphere state={voiceState} onEndCall={handleEndCall} />
                </div>
              )}

              {/* Center Column: Chat Workspace */}
              <div className={`transition-all duration-500 ease-in-out ${isVoiceMode ? 'w-1/2' : (activeRightPanel ? 'w-2/3 border-r border-black/5' : 'w-full')} h-full flex flex-col p-8 overflow-hidden relative z-10`}>
                <h2 className="font-display font-light text-[32px] text-nura-dark mb-8 tracking-tight shrink-0">Travel Workspace</h2>
                
                <div className="space-y-6 flex-1 pr-4 overflow-y-auto pb-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={
                        msg.role === 'user'
                          ? "bg-white/90 backdrop-blur-md border border-black/5 px-6 py-4 rounded-2xl rounded-tr-sm text-[15px] text-nura-dark font-sans font-light shadow-sm max-w-[85%] leading-relaxed"
                          : "bg-gradient-to-br from-[#FF4D79]/10 to-[#A23CFD]/10 backdrop-blur-md border border-[#FF4D79]/10 px-6 py-4 rounded-2xl rounded-tl-sm text-[15px] text-nura-dark font-sans font-light shadow-sm max-w-[85%] leading-relaxed"
                      }>
                        {msg.content}
                      </div>

                      {/* Display rendered results injected by sidebar search */}
                      {msg.resultsData && (
                        <div className="w-full max-w-[90%] self-start space-y-4">
                          {msg.resultsType === 'flights' && msg.resultsData.map(c => <FlightCard key={c.id} candidate={c} onSelect={() => {}} />)}
                          {msg.resultsType === 'trains' && msg.resultsData.map(c => <TrainCard key={c.id} candidate={c} onSelect={() => {}} />)}
                          {msg.resultsType === 'stays' && msg.resultsData.map(c => (
                             <div key={c.id || Math.random()} className="bg-white p-4 rounded-lg shadow-sm border border-black/5">
                                <div className="font-semibold text-lg">{c.name}</div>
                                <div className="text-sm text-gray-500">{c.category} • ₹{c.price_total_inr}</div>
                             </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 shrink-0">
                  <AgentInput onSubmit={handleInputSubmit} placeholder="Reply to agent..." />
                </div>
              </div>

              {/* Right Column: Dynamic Sidebar Forms */}
              <AnimatePresence>
                {activeRightPanel && !isVoiceMode && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '33.333333%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="h-full bg-white/60 backdrop-blur-xl relative z-20 overflow-hidden flex flex-col"
                  >
                    <RightSidebarPanel 
                      type={activeRightPanel} 
                      onClose={() => setActiveRightPanel(null)}
                      onSearchResults={handleSearchResults}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
