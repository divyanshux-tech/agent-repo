import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Mic, Pause } from 'lucide-react';

/**
 * VoiceSphere — the live agent orb
 *
 * Props:
 *   state        : 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'
 *   onStart      : () => void — called when user taps Start
 *   onEndCall    : () => void — called when user taps End
 *   transcript   : string — current live transcript (interim or final)
 *   agentText    : string — what the agent is currently saying
 *   isConnected  : boolean
 */
export const VoiceSphere = ({
  state = 'IDLE',
  onStart,
  onEndCall,
  transcript = '',
  agentText = '',
  isConnected = false,
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const wavePhaseRef = useRef(0);

  // ── Canvas waveform animation ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const amplitude = state === 'LISTENING' ? 18 : state === 'SPEAKING' ? 24 : state === 'PROCESSING' ? 10 : 4;
      const speed = state === 'SPEAKING' ? 0.07 : state === 'LISTENING' ? 0.05 : 0.02;
      wavePhaseRef.current += speed;

      // Draw 3 waves
      const waves = [
        { color: 'rgba(161,255,206,0.6)', offset: 0 },
        { color: 'rgba(0,210,255,0.5)', offset: Math.PI * 0.66 },
        { color: 'rgba(58,123,213,0.5)', offset: Math.PI * 1.33 },
      ];

      waves.forEach(({ color, offset }) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let x = 0; x < W; x++) {
          const y = H / 2 + Math.sin((x / W) * Math.PI * 4 + wavePhaseRef.current + offset) * amplitude;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  // ── Sphere scale based on state ──────────────────────────────────────────
  const sphereScale =
    state === 'LISTENING'   ? [1, 1.06, 1] :
    state === 'SPEAKING'    ? [1, 1.12, 1] :
    state === 'PROCESSING'  ? [1, 0.97, 1] : 1;

  const pulseDuration =
    state === 'SPEAKING' ? 0.8 :
    state === 'LISTENING' ? 1.4 :
    state === 'PROCESSING' ? 0.5 : 4;

  const glowColor =
    state === 'LISTENING'  ? '0,210,255' :
    state === 'SPEAKING'   ? '161,255,206' :
    state === 'PROCESSING' ? '255,107,74' : '58,123,213';

  const stateLabel =
    state === 'IDLE'       ? (isConnected ? 'Tap to speak' : 'Ready to start') :
    state === 'LISTENING'  ? 'Listening...' :
    state === 'PROCESSING' ? 'Thinking...' :
    state === 'SPEAKING'   ? 'Nura is speaking' : '';

  const notStarted = !isConnected && state === 'IDLE';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative select-none">

      {/* ── Ambient background blobs ───────────────────────────────────── */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${glowColor},0.12) 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Orb container ─────────────────────────────────────────────── */}
      <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] flex items-center justify-center">

        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-[-8px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${glowColor},0.35) 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{ scale: sphereScale }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Main sphere */}
        <motion.div
          className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px] rounded-full overflow-hidden shadow-2xl cursor-pointer"
          onClick={notStarted ? onStart : undefined}
          animate={{ scale: sphereScale }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'radial-gradient(circle at 30% 30%, #A1FFCE 0%, #00D2FF 40%, #3A7BD5 75%, #00416A 100%)',
            boxShadow: `inset -20px -20px 60px rgba(0,0,0,0.3), inset 20px 20px 60px rgba(255,255,255,0.35), 0 0 60px rgba(${glowColor},0.25)`,
          }}
        >
          {/* Waveform overlay */}
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="absolute inset-0 w-full h-full"
            style={{ mixBlendMode: 'screen', opacity: state === 'IDLE' ? 0.4 : 0.9 }}
          />

          {/* Grain texture */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              opacity: 0.12,
              mixBlendMode: 'overlay',
            }}
          />

          {/* START overlay — shown before connection */}
          <AnimatePresence>
            {notStarted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center mb-2 hover:bg-white/30 transition-colors">
                  <Mic size={28} className="text-white ml-1" />
                </div>
                <span className="text-white font-semibold text-[14px] tracking-wide drop-shadow">
                  Tap to Start
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing spinner ring */}
          <AnimatePresence>
            {state === 'PROCESSING' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full"
                style={{
                  border: '4px solid transparent',
                  borderTopColor: 'rgba(255,255,255,0.8)',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
          </AnimatePresence>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </motion.div>

        {/* ── End call / pause button ──────────────────────────────────── */}
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10"
            >
              <button
                onClick={onEndCall}
                className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-colors group border-4 border-white/20"
              >
                <PhoneOff size={22} className="text-white group-hover:scale-110 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── State label ───────────────────────────────────────────────── */}
      <motion.p
        key={stateLabel}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 text-[15px] font-medium text-[#444] tracking-wide text-center"
      >
        {stateLabel}
      </motion.p>

      {/* ── Live transcript (user speaking) ──────────────────────────── */}
      <AnimatePresence>
        {transcript && state === 'LISTENING' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 max-w-[280px] text-center"
          >
            <p className="text-[13px] text-[#00416A] italic font-medium bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-[#00D2FF]/30">
              "{transcript}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Agent speaking text ───────────────────────────────────────── */}
      <AnimatePresence>
        {agentText && state === 'SPEAKING' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 max-w-[300px] text-center"
          >
            <p className="text-[13px] text-[#1A3A5C] font-medium bg-gradient-to-r from-[#A1FFCE]/30 to-[#00D2FF]/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-[#00D2FF]/20 leading-relaxed">
              {agentText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Thinking indicator ───────────────────────────────────────── */}
      <AnimatePresence>
        {state === 'PROCESSING' && !agentText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-[#FF6B4A]/20"
          >
            <div className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-[#FF6B4A] rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <span className="text-[12px] text-[#FF6B4A] font-medium">Thinking...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
