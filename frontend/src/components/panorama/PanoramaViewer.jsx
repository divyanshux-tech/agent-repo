/**
 * PanoramaViewer
 * A true 360° equirectangular viewer powered by Pannellum (MIT license).
 * Loads via CDN — no npm package needed.
 *
 * Props:
 *   imageUrl   {string}   - equirectangular panorama image URL
 *   hotspots   {Array}    - Pannellum hotspot objects
 *   haov       {number}   - horizontal angle of view (default 360)
 *   vaov       {number}   - vertical angle of view (default 160)
 *   autoRotate {boolean}  - slow drift rotation
 *   onHotspotClick {fn}   - called with (hotspot) when a scene hotspot is clicked
 *   onReady    {fn}       - called when viewer is initialized
 */
import React, { useEffect, useRef, useState } from 'react';

// Pannellum CDN version
const PANNELLUM_CSS = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
const PANNELLUM_JS  = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';

let pannellumLoaded = false;
let pannellumLoading = false;
const loadCallbacks = [];

function loadPannellum() {
  return new Promise((resolve) => {
    if (pannellumLoaded) { resolve(); return; }
    if (pannellumLoading) { loadCallbacks.push(resolve); return; }
    pannellumLoading = true;

    // CSS
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = PANNELLUM_CSS;
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = PANNELLUM_JS;
    script.onload = () => {
      pannellumLoaded = true;
      pannellumLoading = false;
      resolve();
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export default function PanoramaViewer({
  imageUrl,
  hotspots = [],
  haov = 360,
  vaov = 160,
  autoRotate = true,
  onHotspotClick,
  onReady,
}) {
  const containerRef = useRef(null);
  const viewerRef    = useRef(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!imageUrl) return;

    setLoading(true);
    setError(null);

    loadPannellum().then(() => {
      if (!containerRef.current || !window.pannellum) return;

      // Destroy any existing viewer
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch (_) {}
        viewerRef.current = null;
      }

      // Build Pannellum hotspot configs
      const pannellumHotspots = hotspots.map(hs => ({
        id:       hs.id,
        pitch:    hs.pitch ?? 0,
        yaw:      hs.yaw   ?? 0,
        type:     hs.type === 'scene' ? 'custom' : 'info',
        text:     hs.text  ?? '',
        cssClass: hs.type === 'scene' ? 'pano-nav-hotspot' : 'pano-info-hotspot',
        clickHandlerFunc: hs.type === 'scene' || hs.type === 'info'
          ? () => onHotspotClick && onHotspotClick(hs)
          : undefined,
      }));

      const isPartial = haov < 360;

      try {
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type:             'equirectangular',
          panorama:         imageUrl,
          autoLoad:         true,
          autoRotate:       autoRotate ? -2 : 0,
          autoRotateInactivityDelay: 3000,
          compass:          true,
          showControls:     true,
          hfov:             Math.min(haov, 120),
          minHfov:          50,
          maxHfov:          120,
          haov:             isPartial ? haov : undefined,
          vaov:             isPartial ? vaov : undefined,
          hotSpots:         pannellumHotspots,
          showFullscreenCtrl: true,
          mouseZoom:        true,
          friction:         0.15,
          onLoad: () => {
            setLoading(false);
            onReady && onReady(viewerRef.current);
          },
          onError: (err) => {
            setLoading(false);
            setError(`Image load failed: ${err}`);
          },
        });
      } catch (e) {
        setLoading(false);
        setError(`Viewer error: ${e.message}`);
      }
    });

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch (_) {}
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0f' }}>
      {/* Pannellum container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading skeleton */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)',
          zIndex: 10,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '3px solid rgba(255,77,121,0.2)',
            borderTopColor: '#ff4d79',
            animation: 'panoSpin 1s linear infinite',
          }} />
          <p style={{ color: '#ff4d79', marginTop: 16, fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
            360° view load ho raha hai...
          </p>
          <style>{`
            @keyframes panoSpin { to { transform: rotate(360deg); } }
            .pano-nav-hotspot {
              background: rgba(255,107,74,0.9) !important;
              border: 2px solid #fff !important;
              border-radius: 50% !important;
              width: 32px !important; height: 32px !important;
              cursor: pointer !important;
              transition: transform 0.2s, box-shadow 0.2s !important;
            }
            .pano-nav-hotspot:hover {
              transform: scale(1.2) !important;
              box-shadow: 0 0 12px rgba(255,107,74,0.8) !important;
            }
            .pano-info-hotspot {
              background: rgba(59,130,246,0.9) !important;
              border: 2px solid #fff !important;
              border-radius: 50% !important;
              width: 28px !important; height: 28px !important;
              cursor: pointer !important;
            }
            .pnlm-hotspot-base.custom { background: none !important; }
          `}</style>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a1a', color: '#ff4d79',
          fontFamily: 'Inter, sans-serif',
        }}>
          <p style={{ fontSize: 40 }}>📷</p>
          <p style={{ fontSize: 14 }}>Panorama load nahi ho payi</p>
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{error}</p>
        </div>
      )}

      {/* Drag hint — hidden after 3s */}
      {!loading && !error && (
        <DragHint />
      )}
    </div>
  );
}

function DragHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.7)', color: '#fff',
      padding: '8px 16px', borderRadius: 20, fontSize: 12,
      pointerEvents: 'none', backdropFilter: 'blur(8px)',
      animation: 'panoFadeOut 0.5s ease 2.5s forwards',
      fontFamily: 'Inter, sans-serif',
    }}>
      🖱️ Drag to look around · Scroll to zoom
      <style>{`@keyframes panoFadeOut { to { opacity: 0; } }`}</style>
    </div>
  );
}
