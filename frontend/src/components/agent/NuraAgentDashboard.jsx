/**
 * NuraAgentDashboard — Production-grade Voice + Text Travel Agent UI
 *
 * VOICE PIPELINE:
 *   - Start button on the orb → MediaRecorder → WebSocket → Groq Whisper ASR
 *   - TRANSCRIPT_INTERIM: show live dim user bubble in chat
 *   - TRANSCRIPT_FINAL:   solidify user bubble
 *   - AGENT_THINKING:     show animated thinking bubble + speak it via TTS
 *   - AGENT_RESPONSE_TEXT: show agent bubble in chat, speak via Web Speech API
 *   - SHOW_DESTINATION_CARDS: render place cards carousel in chat
 *   - SHOW_TRAVEL_RESULTS: render FlightCard + TrainCard in chat
 *   - SHOW_HOTEL_RESULTS: render hotel cards in chat
 *   - SHOW_ITINERARY: render ItineraryView component in chat
 *   - SHOW_KNOWLEDGE: render knowledge answer card in chat
 *   - STATE_CHANGE → drive VoiceSphere animation
 *   - TTS_SPEAK → Web Speech API with Indian female voice
 *
 * TEXT PIPELINE:
 *   - POST /chat → SSE stream → parse events → update chat messages
 *   - Same card rendering as voice
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, User, Plane, Building2, Train, MessageSquarePlus,
  Compass, MapPin, Download, Sparkles, X,
} from 'lucide-react';
import { AgentInput } from './AgentInput';
import { VoiceSphere } from './VoiceSphere';
import { ItineraryView } from './ItineraryView';
import { ChatMessage } from './ChatMessage';
import { RightSidebarPanel } from './RightSidebarPanel';
import FlightCard from '../ui/FlightCard';
import TrainCard from '../ui/TrainCard';
import { useSmartAuth } from '../auth/AuthProvider';

const BACKEND_WS  = import.meta.env.VITE_WS_URL  || 'ws://localhost:8000';
const BACKEND_API = import.meta.env.VITE_API_URL  || 'http://localhost:8000';

// ── Sidebar nav item ─────────────────────────────────────────────────────────
const SidebarItem = ({ icon, label, isOpen, onClick, active }) => (
  <motion.div
    onClick={onClick}
    className={`h-[48px] rounded-[14px] flex items-center px-[14px] shadow-sm border border-black/5 cursor-pointer transition-all relative overflow-hidden ${active ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
  >
    <div className="shrink-0 text-white flex items-center justify-center w-[20px] h-[20px]">{icon}</div>
    <AnimatePresence>
      {isOpen && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.18 }}
          className="font-sans font-medium text-[15px] text-white ml-3 whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  </motion.div>
);

// ── Thinking bubble ──────────────────────────────────────────────────────────
const ThinkingBubble = ({ text }) => (
  <div className="flex items-center gap-3 bg-gradient-to-r from-[#FF6B4A]/10 to-[#A23CFD]/10 border border-[#FF6B4A]/15 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%]">
    <div className="flex gap-1 shrink-0">
      {[0, 150, 300].map(d => (
        <div key={d} className="w-1.5 h-1.5 bg-[#FF4D79] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
    {text && <p className="text-[13px] text-[#555] font-sans italic leading-relaxed">{text}</p>}
  </div>
);

// ── Hotel card ───────────────────────────────────────────────────────────────
const HotelCard = ({ hotel }) => (
  <div className="bg-white rounded-2xl border border-black/[0.07] p-4 shadow-sm hover:shadow-md transition-all min-w-[220px] max-w-[260px] shrink-0">
    <div className="flex items-start justify-between mb-2">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#A23CFD] to-[#FF4D79] flex items-center justify-center shrink-0">
        <Building2 size={14} className="text-white" />
      </div>
      {hotel.rating && (
        <span className="text-[11px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
          ⭐ {hotel.rating}
        </span>
      )}
    </div>
    <div className="font-semibold text-[13px] text-[#1A1A1A] leading-tight mb-0.5">{hotel.name}</div>
    <div className="text-[11px] text-[#888] mb-2">{hotel.category} · {hotel.price_band}</div>
    <div className="text-[15px] font-bold text-[#1A1A1A]">₹{(hotel.price_total_inr || 0).toLocaleString('en-IN')}</div>
    <div className="text-[10px] text-[#888]">total · {hotel.nights} nights</div>
    {hotel.cancellation && (
      <div className="mt-2 text-[10px] text-[#10B981] bg-emerald-50 px-2 py-1 rounded-lg">
        {hotel.cancellation}
      </div>
    )}
  </div>
);

// ── Place card ────────────────────────────────────────────────────────────────
const PlaceCard = ({ card }) => (
  <div className="shrink-0 w-[180px] rounded-2xl overflow-hidden bg-white shadow-md border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
    <div className="relative h-[110px] bg-gray-100">
      <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
      <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full text-[#FF4D79] uppercase">
        {card.category}
      </div>
      {card.rating && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          ⭐ {card.rating}
        </div>
      )}
    </div>
    <div className="p-3">
      <div className="font-display font-medium text-[13px] text-[#1A1A1A] leading-tight mb-1">{card.name}</div>
      <div className="text-[11px] text-[#888] leading-snug line-clamp-2">{card.description}</div>
    </div>
  </div>
);

// ── Quick suggestion chip ────────────────────────────────────────────────────
const QuickChip = ({ label, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.96 }}
    className="text-[12px] font-medium px-3 py-1.5 rounded-xl bg-white border border-[#FF4D79]/30 text-[#FF4D79] hover:bg-[#FF4D79] hover:text-white transition-colors shadow-sm"
  >
    {label}
  </motion.button>
);

// ═══════════════════════════════════════════════════════════════════════════════
export const NuraAgentDashboard = () => {
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
  const [isVoiceMode,    setIsVoiceMode]    = useState(false);
  const [isChatActive,   setIsChatActive]   = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState(null);

  // Voice state
  const [voiceState,    setVoiceState]    = useState('IDLE');
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [agentSpeaking,  setAgentSpeaking]  = useState('');

  // Chat messages
  const [messages, setMessages] = useState([]);

  const { user, getToken } = useSmartAuth();
  const wsRef              = useRef(null);
  const mediaRecorderRef   = useRef(null);
  const audioChunksRef     = useRef([]);
  const tripStateRef       = useRef({});
  const sessionIdRef       = useRef(`voice-${Date.now()}`);
  const chatBottomRef      = useRef(null);
  const ttsRef             = useRef(null);     // current SpeechSynthesisUtterance

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── TTS helper (Web Speech API with Indian female voice) ──────────────────
  const speak = useCallback((text, lang = 'hi-IN') => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = lang === 'hinglish' ? 'hi-IN' : lang;
    utterance.rate  = 0.9;
    utterance.pitch = 1.08;

    // Prefer female Indian voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      (v.lang === 'hi-IN' || v.lang === 'en-IN') && v.name.toLowerCase().includes('female')
    ) || voices.find(v => v.lang === 'hi-IN' || v.lang === 'en-IN')
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setVoiceState('SPEAKING');
    utterance.onend   = () => {
      setVoiceState('IDLE');
      setAgentSpeaking('');
    };
    ttsRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Add message to chat ───────────────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  const replaceOrAdd = useCallback((matcher, newMsg) => {
    setMessages(prev => {
      const idx = prev.findLastIndex(matcher);
      if (idx === -1) return [...prev, { id: Date.now(), ...newMsg }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...newMsg };
      return next;
    });
  }, []);

  // ── WS message handler ────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {

      case 'CONNECTION_ESTABLISHED':
        setIsWsConnected(true);
        setVoiceState('IDLE');
        addMessage({ role: 'agent', content: msg.message, language: 'hinglish' });
        speak(msg.message, 'hi-IN');
        break;

      case 'STATE_CHANGE':
        setVoiceState(msg.state);
        break;

      case 'LANGUAGE_DETECTED':
        // Remember for TTS
        break;

      case 'TRANSCRIPT_INTERIM':
        setLiveTranscript(msg.text || '...');
        setVoiceState('LISTENING');
        // Show interim user bubble (styled dim)
        replaceOrAdd(m => m.isInterim, {
          role: 'user', content: msg.text || '...', isInterim: true,
        });
        break;

      case 'TRANSCRIPT_FINAL':
        setLiveTranscript('');
        // Solidify the user bubble
        replaceOrAdd(m => m.isInterim, {
          role: 'user', content: msg.text, isInterim: false,
        });
        break;

      case 'AGENT_THINKING':
        setVoiceState('PROCESSING');
        setAgentSpeaking(msg.text || '');
        replaceOrAdd(m => m.isThinkingBubble, {
          role: 'thinking', content: msg.text, isThinkingBubble: true,
        });
        speak(msg.text, msg.language || 'hi-IN');
        break;

      case 'AGENT_RESPONSE_TEXT':
        setAgentSpeaking(msg.text);
        // Remove thinking bubble, add agent reply
        setMessages(prev => {
          const noThink = prev.filter(m => !m.isThinkingBubble);
          return [...noThink, { id: Date.now(), role: 'agent', content: msg.text, language: msg.language }];
        });
        break;

      case 'TTS_SPEAK':
        speak(msg.text, msg.language || 'hi-IN');
        break;

      case 'SHOW_DESTINATION_CARDS':
        addMessage({
          role: 'cards',
          cardType: 'destination',
          destination: msg.destination,
          cards: msg.cards,
        });
        break;

      case 'SHOW_TRAVEL_RESULTS':
        addMessage({
          role: 'cards',
          cardType: 'travel',
          origin: msg.origin,
          destination: msg.destination,
          flights: msg.flights || [],
          trains: msg.trains || [],
        });
        break;

      case 'SHOW_HOTEL_RESULTS':
        addMessage({
          role: 'cards',
          cardType: 'hotels',
          destination: msg.destination,
          hotels: msg.hotels || [],
        });
        break;

      case 'SHOW_ITINERARY':
        addMessage({
          role: 'cards',
          cardType: 'itinerary',
          itinerary: msg.itinerary,
        });
        break;

      case 'SHOW_KNOWLEDGE':
        addMessage({
          role: 'agent',
          content: msg.answer,
          isKnowledge: true,
          destination: msg.destination,
        });
        break;

      case 'TURN_COMPLETE':
        setVoiceState('IDLE');
        setLiveTranscript('');
        break;

      case 'INTERRUPT_ACKNOWLEDGED':
        setVoiceState('IDLE');
        window.speechSynthesis.cancel();
        break;

      case 'ERROR_MESSAGE':
        addMessage({ role: 'agent', content: msg.text || 'Kuch problem aayi!', isError: true });
        speak(msg.text, 'hi-IN');
        setVoiceState('IDLE');
        break;

      default:
        break;
    }
  }, [addMessage, replaceOrAdd, speak]);

  // ── Connect WebSocket ─────────────────────────────────────────────────────
  const connectWs = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = await getToken().catch(() => '');
    const url   = `${BACKEND_WS}/api/voice/ws/${sessionIdRef.current}${token ? `?token=${token}` : ''}`;
    const ws    = new WebSocket(url);

    ws.onopen = () => {
      console.log('[Voice WS] connected');
    };
    ws.onmessage = (ev) => {
      try { handleWsMessage(JSON.parse(ev.data)); }
      catch (e) { console.warn('[Voice WS] bad JSON', e); }
    };
    ws.onerror   = (e) => console.error('[Voice WS] error', e);
    ws.onclose   = () => {
      console.log('[Voice WS] closed');
      setIsWsConnected(false);
      wsRef.current = null;
    };

    wsRef.current = ws;
  }, [getToken, handleWsMessage]);

  // ── Start recording (push-to-talk style) ─────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current   = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob    = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader  = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result.split(',')[1];
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'AUDIO_CHUNK', audio_b64: b64 }));
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setVoiceState('LISTENING');
    } catch (e) {
      console.error('Mic error:', e);
      addMessage({ role: 'agent', content: 'Microphone access denied. Please allow mic permission.', isError: true });
    }
  }, [addMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Handle voice orb START click ──────────────────────────────────────────
  const handleVoiceStart = useCallback(async () => {
    setIsVoiceMode(true);
    setIsChatActive(true);
    await connectWs();
    // Small delay to let WS connect before recording
    setTimeout(startRecording, 400);
  }, [connectWs, startRecording]);

  // ── Handle mic tap during active voice session ────────────────────────────
  const handleMicTap = useCallback(() => {
    if (voiceState === 'LISTENING') {
      stopRecording();
    } else if (voiceState === 'IDLE') {
      // Interrupt speaking if any
      window.speechSynthesis.cancel();
      startRecording();
    } else if (voiceState === 'SPEAKING') {
      window.speechSynthesis.cancel();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'INTERRUPT' }));
      }
      setTimeout(startRecording, 300);
    }
  }, [voiceState, stopRecording, startRecording]);

  // ── End voice call ────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    stopRecording();
    window.speechSynthesis.cancel();
    wsRef.current?.close();
    wsRef.current = null;
    setIsVoiceMode(false);
    setIsWsConnected(false);
    setVoiceState('IDLE');
    setLiveTranscript('');
    setAgentSpeaking('');
  }, [stopRecording]);

  // ── Text chat submit ──────────────────────────────────────────────────────
  const handleInputSubmit = useCallback(async (text, isVoiceTrigger = false) => {
    if (isVoiceTrigger) {
      setIsVoiceMode(true);
      setIsChatActive(true);
      await connectWs();
      setTimeout(startRecording, 400);
      return;
    }

    if (!text?.trim()) return;
    setIsChatActive(true);

    // If WS open and voice mode, send text via WS
    if (isVoiceMode && wsRef.current?.readyState === WebSocket.OPEN) {
      addMessage({ role: 'user', content: text });
      wsRef.current.send(JSON.stringify({ type: 'TEXT_INPUT', text }));
      return;
    }

    // Text chat via HTTP SSE
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    const thinkingId = `thinking-${Date.now()}`;
    setMessages(prev => [...prev, { id: thinkingId, role: 'thinking', isThinkingBubble: true }]);

    try {
      const token = await getToken().catch(() => '');
      const conversationHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      })).filter(m => m.content);

      const response = await fetch(`${BACKEND_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          message: text,
          user_id: user?.id || 'guest',
          session_id: sessionIdRef.current,
          trip_id: tripStateRef.current.trip_id || null,
          current_state: tripStateRef.current,
          conversation_history: conversationHistory,
          language: 'hi',
          language_confidence: 0.85,
          is_code_mixed: true,
        }),
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let agentReply = '';
      let toolSteps  = [];

      // Remove thinking bubble
      setMessages(prev => prev.filter(m => m.id !== thinkingId));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            switch (event.type) {

              case 'tool_step':
                toolSteps = [...toolSteps, { message: event.message, status: event.status }];
                setMessages(prev => {
                  const noTools = prev.filter(m => m.role !== 'tool_steps');
                  return [...noTools, { id: 'tools', role: 'tool_steps', steps: toolSteps }];
                });
                break;

              case 'state_sync':
                tripStateRef.current = {
                  ...event.updated_state,
                  trip_id: event.trip_id || event.updated_state?.trip_id || tripStateRef.current.trip_id,
                };
                break;

              case 'message':
              case 'knowledge_message': {
                agentReply = event.content;
                setMessages(prev => {
                  const noTools = prev.filter(m => m.role !== 'tool_steps');
                  return [...noTools, {
                    id: Date.now(),
                    role: event.type === 'knowledge_message' ? 'knowledge' : 'agent',
                    content: agentReply,
                    language: event.language,
                    webSources: event.web_sources || [],
                  }];
                });
                break;
              }

              case 'destination_cards':
                setMessages(prev => {
                  const noTools = prev.filter(m => m.role !== 'tool_steps');
                  if (agentReply) return noTools;  // Cards come with a message already
                  return [...noTools, {
                    id: Date.now(),
                    role: 'cards',
                    cardType: 'destination',
                    destination: event.destination,
                    cards: event.cards,
                  }];
                });
                // Attach cards to the last agent message if present
                if (agentReply) {
                  setMessages(prev => {
                    const idx = prev.findLastIndex(m => m.role === 'agent');
                    if (idx === -1) return prev;
                    const next = [...prev];
                    next[idx] = { ...next[idx], destinationCards: event.cards, destination: event.destination };
                    return next;
                  });
                }
                break;

              case 'agent_candidates':
                setMessages(prev => {
                  const noTools = prev.filter(m => m.role !== 'tool_steps');
                  return [...noTools, {
                    id: Date.now(),
                    role: 'cards',
                    cardType: 'travel',
                    flights: event.flights || [],
                    trains: event.trains || [],
                    hotels: event.hotels || [],
                  }];
                });
                break;

              case 'plans':
                setMessages(prev => {
                  const noTools = prev.filter(m => m.role !== 'tool_steps');
                  return [...noTools, {
                    id: Date.now(),
                    role: 'agent',
                    content: agentReply || 'Yeh rahi aapke liye best travel plans!',
                    plans: event.data,
                  }];
                });
                break;

              case 'itinerary':
                setMessages(prev => [...prev.filter(m => m.role !== 'tool_steps'), {
                  id: Date.now(),
                  role: 'cards',
                  cardType: 'itinerary',
                  itinerary: event.data,
                }]);
                break;

              case 'weather_message':
                setMessages(prev => [...prev.filter(m => m.role !== 'tool_steps'), {
                  id: Date.now(),
                  role: 'agent',
                  content: event.content,
                  weatherData: event.data,
                }]);
                break;

              default:
                break;
            }
          } catch (_) { /* skip malformed */ }
        }
      }

      if (!agentReply) {
        setMessages(prev => [...prev.filter(m => m.role !== 'tool_steps'), {
          id: Date.now(),
          role: 'agent',
          content: 'Main yahan hoon aapki madad ke liye! Kahan jaana chahte hain? 😊',
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev.filter(m => m.role !== 'tool_steps'), {
        id: Date.now(),
        role: 'agent',
        content: `Connection error — please check if the backend is running. (${err.message})`,
        isError: true,
      }]);
    }
  }, [user, getToken, messages, addMessage, isVoiceMode, connectWs, startRecording]);

  // ── Sidebar search results → inject into chat ─────────────────────────────
  const handleSearchResults = useCallback((type, results) => {
    addMessage({
      role: 'cards',
      cardType: type === 'flights' ? 'travel' : type === 'stays' ? 'hotels' : 'travel',
      flights: type === 'flights' ? results : [],
      trains:  type === 'trains'  ? results : [],
      hotels:  type === 'stays'   ? results : [],
    });
  }, [addMessage]);

  // ── Download itinerary ────────────────────────────────────────────────────
  const handleDownloadItinerary = useCallback((itinerary) => {
    const blob = new Blob([JSON.stringify(itinerary, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${itinerary?.destination || 'itinerary'}_trip_plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Render a single chat message ───────────────────────────────────────────

  const renderMessage = (msg) => {
    const key = msg.id || Math.random();

    // Tool steps
    if (msg.role === 'tool_steps') {
      return <ChatMessage key={key} msg={msg} animate={false} />;
    }

    // Thinking
    if (msg.role === 'thinking') {
      return <ChatMessage key={key} msg={msg} />;
    }

    // User message
    if (msg.role === 'user') {
      return <ChatMessage key={key} msg={msg} />;
    }

    // Card row — handled specially (not via ChatMessage)
    if (msg.role === 'cards') {
      if (msg.cardType === 'destination' && msg.cards?.length) {
        return (
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start w-full">
            <div className="text-[11px] font-bold tracking-widest text-[#FF4D79]/60 uppercase mb-2 ml-1">
              📍 {msg.destination} — Places to Explore
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {msg.cards.map((card, i) => <PlaceCard key={i} card={card} />)}
            </div>
          </motion.div>
        );
      }

      if (msg.cardType === 'travel') {
        const flights = msg.flights || [];
        const trains  = msg.trains  || [];
        const hotels  = msg.hotels  || [];
        return (
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start w-full max-w-[540px] space-y-3">
            {flights.length > 0 && (
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#3A7BD5]/60 uppercase mb-1.5">✈️ Flights</div>
                <div className="space-y-2">
                  {flights.slice(0, 3).map(c => <FlightCard key={c.id} candidate={c} onSelect={() => {}} />)}
                </div>
              </div>
            )}
            {trains.length > 0 && (
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#10B981]/60 uppercase mb-1.5">🚂 Trains</div>
                <div className="space-y-2">
                  {trains.slice(0, 3).map(c => <TrainCard key={c.id} candidate={c} onSelect={() => {}} />)}
                </div>
              </div>
            )}
            {hotels.length > 0 && (
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#A23CFD]/60 uppercase mb-1.5">🏨 Stays</div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {hotels.slice(0, 4).map((h, i) => <HotelCard key={i} hotel={h} />)}
                </div>
              </div>
            )}
          </motion.div>
        );
      }

      if (msg.cardType === 'hotels' && msg.hotels?.length) {
        return (
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start w-full">
            <div className="text-[10px] font-bold tracking-widest text-[#A23CFD]/60 uppercase mb-1.5">🏨 Hotels in {msg.destination}</div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {msg.hotels.map((h, i) => <HotelCard key={i} hotel={h} />)}
            </div>
          </motion.div>
        );
      }

      if (msg.cardType === 'itinerary' && msg.itinerary) {
        return (
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="self-start w-full">
            <ItineraryView
              itinerary={msg.itinerary}
              onDownload={() => handleDownloadItinerary(msg.itinerary)}
            />
            <div className="flex gap-2 mt-3 flex-wrap">
              <QuickChip label="Hotels dikhao 🏨" onClick={() => handleInputSubmit(`${msg.itinerary?.destination || ''} mein hotels dikhao budget ke hisab se`)} />
              <QuickChip label="Flights dikhao ✈️" onClick={() => handleInputSubmit(`Delhi se ${msg.itinerary?.destination || ''} flights dikhao`)} />
              <QuickChip label="PDF Download 📥"   onClick={() => handleDownloadItinerary(msg.itinerary)} />
            </div>
          </motion.div>
        );
      }

      return null;
    }

    // Agent / knowledge message — use rich ChatMessage component
    return (
      <ChatMessage
        key={key}
        msg={{
          ...msg,
          role: msg.role === 'knowledge' ? 'knowledge' : 'agent',
          webSources: msg.webSources || [],
        }}
        animate={true}
      />
    );
  };

  // ── Empty state prompt chips ──────────────────────────────────────────────
  const promptChips = [
    { icon: <MapPin size={14} className="text-[#FF6B4A]" />, color: '#FF6B4A', tag: 'Plan', text: 'Plan 5 days in Kerala under ₹30k' },
    { icon: <Plane   size={14} className="text-[#D83B8F]" />, color: '#D83B8F', tag: 'Flights', text: 'Flights Delhi to Leh in June' },
    { icon: <Building2 size={14} className="text-[#A23CFD]" />, color: '#A23CFD', tag: 'Stays', text: 'Hotels near the Taj under ₹4,000' },
    { icon: <Compass size={14} className="text-[#FF4D79]" />, color: '#FF4D79', tag: 'Discover', text: 'Kerala ke hidden gems dikhao' },
  ];

  const EmptyStateGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full">
      {promptChips.map(({ icon, color, tag, text }) => (
        <button
          key={text}
          onClick={() => handleInputSubmit(text)}
          className="flex flex-col text-left p-4 rounded-xl bg-white/70 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            {icon}
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>{tag}</span>
          </div>
          <span className="text-[14px] font-display text-[#1A1A1A] font-medium group-hover:opacity-80 transition-opacity leading-snug">{text}</span>
        </button>
      ))}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full flex bg-[#F5F5F7] p-3 overflow-hidden">

      {/* ── Left Sidebar ────────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col justify-between py-6 h-full mr-2 rounded-2xl relative z-50 overflow-hidden shadow-lg bg-gradient-to-b from-[#FF6B4A] via-[#FF4D79] to-[#D83B8F]"
        initial={{ width: 60 }}
        animate={{ width: isSidebarOpen ? 240 : 60 }}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      >
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-4 px-[16px] text-white cursor-pointer h-[28px]">
            <svg className="shrink-0 text-white" width="28" height="28" viewBox="0 0 32 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" />
            </svg>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="font-sans font-light text-[17px] text-white tracking-wider whitespace-nowrap">
                  NuraTravel
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Nav items */}
          <div className="px-[6px] flex flex-col gap-2 mt-4">
            <SidebarItem icon={<MessageSquarePlus size={20} strokeWidth={2}/>} label="New conversation"  isOpen={isSidebarOpen}
              onClick={() => { setIsChatActive(false); setIsVoiceMode(false); setActiveRightPanel(null); setMessages([]); tripStateRef.current = {}; }} />
            <div className="h-px bg-white/20 my-2 mx-2" />
            <SidebarItem icon={<Plane      size={20} strokeWidth={2}/>} label="Flights" isOpen={isSidebarOpen}
              active={activeRightPanel === 'flights'} onClick={() => { setIsChatActive(true); setActiveRightPanel('flights'); }} />
            <SidebarItem icon={<Building2  size={20} strokeWidth={2}/>} label="Stays"   isOpen={isSidebarOpen}
              active={activeRightPanel === 'stays'}   onClick={() => { setIsChatActive(true); setActiveRightPanel('stays'); }} />
            <SidebarItem icon={<Train      size={20} strokeWidth={2}/>} label="Trains"  isOpen={isSidebarOpen}
              active={activeRightPanel === 'trains'}  onClick={() => { setIsChatActive(true); setActiveRightPanel('trains'); }} />
          </div>
        </div>

        {/* User avatar */}
        <div className="px-2.5">
          <div className="h-[40px] flex items-center bg-black/10 hover:bg-black/20 rounded-full cursor-pointer transition-colors overflow-hidden">
            <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#A23CFD] to-[#FF6B4A] flex items-center justify-center shrink-0 border-2 border-white">
              <User size={18} className="text-white" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col ml-3 pr-4 whitespace-nowrap">
                  <span className="font-sans font-medium text-[14px] text-white leading-tight">{user?.firstName || 'Guest'}</span>
                  <span className="font-sans text-[11px] text-white/80 leading-tight">Travel Agent</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <motion.div layout className="flex-1 h-full rounded-[32px] bg-white shadow-xl flex overflow-hidden relative border border-black/5">
        <AnimatePresence mode="wait">
          {!isChatActive && !isVoiceMode ? (

            /* ── Landing / Inactive ──────────────────────────────────── */
            <motion.div key="inactive" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full flex flex-col relative overflow-hidden"
              style={{ background: 'linear-gradient(-45deg,#FFF0F5,#FFFFFF,#FFE4E1,#F8F4FF,#FFF0EE)', backgroundSize: '400% 400%', animation: 'slow-gradient-nura 15s ease infinite' }}
            >
              <style>{`@keyframes slow-gradient-nura{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
              <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF8A65]/20 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
              <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A23CFD]/15 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '10s' }} />

              <div className="px-12 py-8 flex items-center gap-3 z-10">
                <svg className="w-6 h-6 text-[#FF6B4A]" viewBox="0 0 32 24" fill="currentColor"><path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" /></svg>
                <div className="font-display font-medium text-[24px] text-[#1A1A1A] tracking-tight">NuraTravel</div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-4 z-10 pb-[15vh]">
                <h1 className="font-display font-normal text-[36px] text-[#1A1A1A] tracking-[-0.02em] mb-3 leading-none text-center">
                  Where shall we <span className="font-serif italic text-[#D83B8F]">go?</span>
                </h1>
                <p className="text-[#555] text-[14px] mb-8 max-w-md text-center leading-relaxed">
                  Itineraries, fares, stays and seasons across India — ask in Hindi, Hinglish, or English.
                </p>
                <EmptyStateGrid />
              </div>

              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[700px] px-6 z-20">
                <AgentInput onSubmit={handleInputSubmit} placeholder="Kahan jaana hai? Trip plan karo..." />
              </div>
            </motion.div>

          ) : (

            /* ── Active (chat + optional voice panel) ────────────────── */
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full h-full flex relative overflow-hidden"
              style={{ background: 'linear-gradient(-45deg,#FFF0F5,#F5F3FF,#FFF5EC,#FFFFFF)', backgroundSize: '400% 400%', animation: 'slow-gradient 15s ease infinite' }}
            >
              <style>{`@keyframes slow-gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF4D79]/5 rounded-full blur-[120px] animate-pulse z-0" style={{ animationDuration: '8s' }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A23CFD]/5 rounded-full blur-[120px] animate-pulse z-0" style={{ animationDuration: '10s' }} />

              {/* Voice panel (left half) */}
              {isVoiceMode && (
                <div className="w-[45%] h-full flex flex-col relative z-10 border-r border-black/5 bg-white/30 backdrop-blur-sm">
                  <VoiceSphere
                    state={voiceState}
                    isConnected={isWsConnected}
                    transcript={liveTranscript}
                    agentText={agentSpeaking}
                    onStart={handleVoiceStart}
                    onEndCall={handleEndCall}
                  />

                  {/* Tap to speak / stop hint */}
                  {isWsConnected && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                      <button
                        onClick={handleMicTap}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold shadow-md transition-all ${voiceState === 'LISTENING' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/80 text-[#1A1A1A] border border-black/10 hover:bg-white'}`}
                      >
                        {voiceState === 'LISTENING' ? '⏹ Tap to stop' : '🎙 Tap to speak'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Chat workspace */}
              <div className={`transition-all duration-500 ${isVoiceMode ? 'w-[55%]' : 'flex-1'} h-full flex flex-col p-6 overflow-hidden relative z-10 ${activeRightPanel && !isVoiceMode ? 'border-r border-black/5' : ''}`}>
                <h2 className="font-display font-light text-[26px] text-[#1A1A1A] mb-5 tracking-tight shrink-0">
                  {isVoiceMode ? '💬 Live Chat' : 'Travel Workspace'}
                </h2>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-hide">
                  {messages.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center pb-12">
                      <p className="text-[#888] text-[14px] mb-6">Start talking or type your travel query...</p>
                      <EmptyStateGrid />
                    </div>
                  ) : (
                    messages.map(msg => renderMessage(msg))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div className="mt-4 shrink-0 w-full max-w-[680px] mx-auto">
                  <AgentInput onSubmit={handleInputSubmit} placeholder={isVoiceMode ? 'Type a message or tap mic...' : 'Reply to agent...'} />
                </div>
              </div>

              {/* Right sidebar panel */}
              <AnimatePresence>
                {activeRightPanel && !isVoiceMode && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                    className="h-[calc(100%-2rem)] my-4 mr-4 rounded-3xl bg-white/70 backdrop-blur-xl relative z-20 overflow-hidden flex flex-col border border-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] shrink-0"
                  >
                    <RightSidebarPanel type={activeRightPanel} onClose={() => setActiveRightPanel(null)} onSearchResults={handleSearchResults} />
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
