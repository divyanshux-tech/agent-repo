/**
 * PanoramaPanel — Full-screen immersive 360° tour overlay
 *
 * Features:
 *   - Full-screen Pannellum 360° viewer (70% of screen)
 *   - Agent narration strip with typewriter text + TTS toggle
 *   - Related scenes thumbnail carousel for one-click navigation
 *   - Hotspot navigation (clicking scene hotspot → loads new scene)
 *   - Quick action chips: train booking, hotels, deeper info, food
 *   - Scene gallery with category badges
 *   - Smooth open/close portal animation
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Volume2, VolumeX,
  MapPin, Navigation, Star, Compass, ExternalLink,
} from 'lucide-react';
import PanoramaViewer from './PanoramaViewer';

const CATEGORY_COLORS = {
  ghats:        { bg: '#1e3a5f', accent: '#60a5fa', icon: '🌊' },
  temples:      { bg: '#3d1f00', accent: '#f59e0b', icon: '🛕' },
  monuments:    { bg: '#1a1a2e', accent: '#a78bfa', icon: '🏛️' },
  palaces:      { bg: '#2d1b4e', accent: '#c084fc', icon: '🏰' },
  forts:        { bg: '#1f2d1a', accent: '#4ade80', icon: '🏯' },
  beaches:      { bg: '#0f2a3f', accent: '#38bdf8', icon: '🏖️' },
  mountains:    { bg: '#1a2a1a', accent: '#86efac', icon: '🏔️' },
  nature:       { bg: '#0f2a1a', accent: '#34d399', icon: '🌿' },
  cultural:     { bg: '#2a1a0f', accent: '#fb923c', icon: '🎭' },
  desert:       { bg: '#2a1a00', accent: '#fbbf24', icon: '🏜️' },
  hill_stations:{ bg: '#0f1f2a', accent: '#7dd3fc', icon: '⛰️' },
};

function getCatStyle(category) {
  return CATEGORY_COLORS[category] || { bg: '#1a1a2a', accent: '#ff4d79', icon: '📍' };
}

export default function PanoramaPanel({ scene, narration, relatedScenes = [], quickActions = [], onClose, onSendMessage }) {
  const [currentScene,   setCurrentScene]   = useState(scene);
  const [currentNarr,    setCurrentNarr]    = useState(narration || '');
  const [currentRelated, setCurrentRelated] = useState(relatedScenes);
  const [ttsEnabled,     setTtsEnabled]     = useState(true);
  const [displayedText,  setDisplayedText]  = useState('');
  const [infoHotspot,    setInfoHotspot]    = useState(null);
  const [galleryIdx,     setGalleryIdx]     = useState(0);
  const [transitioning,  setTransitioning]  = useState(false);
  const typewriterRef = useRef(null);
  const speechRef     = useRef(null);

  const catStyle = getCatStyle(currentScene?.category);

  // ── Typewriter narration ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentNarr) return;
    setDisplayedText('');
    if (typewriterRef.current) clearInterval(typewriterRef.current);

    let i = 0;
    const text = currentNarr;
    typewriterRef.current = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(typewriterRef.current);
    }, 18);

    return () => clearInterval(typewriterRef.current);
  }, [currentNarr]);

  // ── TTS narration ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ttsEnabled || !currentNarr || !('speechSynthesis' in window)) return;

    if (speechRef.current) window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(currentNarr);
    utter.lang  = 'hi-IN';
    utter.rate  = 0.9;
    utter.pitch = 1.05;

    // Prefer female Indian voice
    const voices = window.speechSynthesis.getVoices();
    const indFemaleNames = ['aditi', 'veena', 'kalpana', 'heera', 'neerja', 'lekha', 'zira', 'female'];
    
    const indVoice = voices.find(v =>
      (v.lang === 'hi-IN' || v.lang === 'en-IN') && indFemaleNames.some(name => v.name.toLowerCase().includes(name))
    ) || voices.find(v => v.lang === 'hi-IN' || v.lang === 'en-IN')
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
      
    if (indVoice) utter.voice = indVoice;

    utter.lang = 'hi-IN';
    speechRef.current = utter;
    window.speechSynthesis.speak(utter);

    return () => window.speechSynthesis.cancel();
  }, [currentNarr, ttsEnabled]);

  // ── Scene transition (via hotspot or gallery click) ───────────────────────
  const navigateToScene = useCallback(async (newSceneId) => {
    if (transitioning) return;
    setTransitioning(true);
    window.speechSynthesis.cancel();

    try {
      const resp = await fetch(`/api/panorama/scene/${newSceneId}`);
      if (!resp.ok) throw new Error('fetch failed');
      const data = await resp.json();
      setCurrentScene(data.scene);
      setCurrentNarr(data.narration || '');
      setCurrentRelated(data.related_scenes || []);
      setInfoHotspot(null);
    } catch {
      // Fallback: just update from relatedScenes local data
      const local = currentRelated.find(s => s.id === newSceneId);
      if (local) setCurrentScene(local);
    }
    setTransitioning(false);
  }, [transitioning, currentRelated]);

  const handleHotspotClick = useCallback((hs) => {
    if (hs.type === 'scene' && hs.scene_id) {
      navigateToScene(hs.scene_id);
    } else if (hs.type === 'info') {
      setInfoHotspot(hs);
    }
  }, [navigateToScene]);

  const handleQuickAction = (query) => {
    if (onSendMessage) onSendMessage(query);
  };

  const galleryScenes = currentRelated;
  const canPrevGallery = galleryIdx > 0;
  const canNextGallery = galleryIdx < galleryScenes.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        background: `linear-gradient(135deg, ${catStyle.bg}cc, #0a0a1acc)`,
        borderBottom: `1px solid ${catStyle.accent}33`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{catStyle.icon}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {currentScene?.name}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: catStyle.accent, opacity: 0.9 }}>
              <MapPin size={10} style={{ marginRight: 3 }} />
              {currentScene?.city}, {currentScene?.state}
            </p>
          </div>
          <span style={{
            marginLeft: 8, padding: '2px 10px', borderRadius: 20,
            background: `${catStyle.accent}22`, color: catStyle.accent,
            fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
          }}>
            {currentScene?.category?.replace('_', ' ')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* TTS toggle */}
          <button
            onClick={() => { setTtsEnabled(p => !p); if (ttsEnabled) window.speechSynthesis.cancel(); }}
            style={{
              background: ttsEnabled ? `${catStyle.accent}22` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${ttsEnabled ? catStyle.accent : '#333'}`,
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: ttsEnabled ? catStyle.accent : '#666', transition: 'all 0.2s',
            }}
            title={ttsEnabled ? 'Mute tour guide' : 'Unmute tour guide'}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,77,121,0.1)', border: '1px solid #ff4d7933',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: '#ff4d79', transition: 'all 0.2s',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 360° Viewer */}
        <div style={{ flex: 1, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene?.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', height: '100%' }}
            >
              <PanoramaViewer
                imageUrl={currentScene?.panorama_url}
                hotspots={currentScene?.hotspots || []}
                haov={currentScene?.haov || 360}
                vaov={currentScene?.vaov || 160}
                autoRotate={true}
                onHotspotClick={handleHotspotClick}
              />
            </motion.div>
          </AnimatePresence>

          {/* Transitioning overlay */}
          <AnimatePresence>
            {transitioning && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px',
                    border: '2px solid rgba(255,77,121,0.3)', borderTopColor: '#ff4d79',
                    animation: 'panoSpin 0.8s linear infinite',
                  }} />
                  <p style={{ fontSize: 13 }}>Ek second... wahan pahuncha rahi hoon 🌐</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info hotspot popup */}
          <AnimatePresence>
            {infoHotspot && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute', bottom: 80, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, padding: '16px 20px',
                  maxWidth: 340, zIndex: 20, color: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
                    {infoHotspot.info || infoHotspot.text}
                  </p>
                  <button
                    onClick={() => setInfoHotspot(null)}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginLeft: 8 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────────── */}
        <div style={{
          width: 260, display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,20,0.95)', borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {/* Narration strip */}
          <div style={{
            padding: '16px 16px 12px',
            background: `linear-gradient(135deg, ${catStyle.bg}88, transparent)`,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: ttsEnabled ? '#10b981' : '#666',
                animation: ttsEnabled ? 'pulseDot 2s ease infinite' : 'none',
              }} />
              <span style={{ fontSize: 11, color: catStyle.accent, fontWeight: 600 }}>
                NURA — TOUR GUIDE
              </span>
            </div>
            <p style={{
              margin: 0, fontSize: 12, lineHeight: 1.7,
              color: 'rgba(255,255,255,0.85)',
              minHeight: 60,
            }}>
              {displayedText || <span style={{ opacity: 0.4 }}>Narration loading...</span>}
            </p>
          </div>

          {/* Quick action chips */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
              Quick Actions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(qa.query)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '8px 12px',
                    color: 'rgba(255,255,255,0.8)', fontSize: 12,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${catStyle.accent}18`;
                    e.currentTarget.style.borderColor = `${catStyle.accent}44`;
                    e.currentTarget.style.color = catStyle.accent;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* Related scenes */}
          {galleryScenes.length > 0 && (
            <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
                Nearby Places
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {galleryScenes.map(rs => {
                  const rs_style = getCatStyle(rs.category);
                  return (
                    <button
                      key={rs.id}
                      onClick={() => navigateToScene(rs.id)}
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                        transition: 'all 0.2s', textAlign: 'left', padding: 0,
                        display: 'flex', alignItems: 'stretch',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${rs_style.accent}12`;
                        e.currentTarget.style.borderColor = `${rs_style.accent}33`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: 56, height: 56, flexShrink: 0,
                        background: rs_style.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, borderRight: `1px solid rgba(255,255,255,0.06)`,
                      }}>
                        {rs.preview_url
                          ? <img src={rs.preview_url} alt={rs.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                          : rs_style.icon}
                      </div>
                      <div style={{ padding: '8px 10px', flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff' }}>{rs.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: rs_style.accent }}>{rs.city}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                        <ChevronRight size={14} color="#444" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Compass hint ─────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 16, left: 20,
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'rgba(255,255,255,0.3)', fontSize: 11, pointerEvents: 'none',
      }}>
        <Compass size={12} />
        Drag to explore · Scroll to zoom · Click hotspots to navigate
      </div>

      <style>{`
        @keyframes panoSpin { to { transform: rotate(360deg); } }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </motion.div>
  );
}
