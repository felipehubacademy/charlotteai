'use client';

import { useState, useEffect, useRef } from 'react';

// Carrossel das artes da App Store no hero da home (slide horizontal + auto-play).
const ARTS = [
  '/images/store/01.png', '/images/store/02.png', '/images/store/03.png',
  '/images/store/04.png', '/images/store/05.png', '/images/store/06.png',
];

export default function HeroCarousel() {
  const n = ARTS.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = (d: number) => setI(v => (v + d + n) % n);

  // Rolagem automática; reinicia a cada mudança/interação.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI(v => (v + 1) % n), 5500);
    return () => clearTimeout(t);
  }, [i, paused, n]);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(22,21,58,0.08)',
    boxShadow: '0 4px 14px rgba(22,21,58,0.18)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 3, padding: 0, color: '#16153A',
  };

  return (
    <div
      className="hero-carousel"
      style={{ position: 'relative', width: '100%', maxWidth: 300, margin: '0 auto', alignSelf: 'flex-end' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @media (max-width: 768px) { .hero-carousel { max-width: 230px !important; margin-top: 24px !important; } }
      `}</style>

      {/* glow */}
      <div style={{
        position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
        width: 220, height: 60, background: 'rgba(163,255,60,0.28)',
        filter: 'blur(38px)', borderRadius: '50%', zIndex: 0,
      }} />

      {/* viewport */}
      <div
        style={{
          position: 'relative', width: '100%', aspectRatio: '1290 / 2796',
          borderRadius: 26, overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(22,21,58,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 1,
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* track deslizante */}
        <div style={{ display: 'flex', height: '100%', transform: `translateX(-${i * 100}%)`, transition: 'transform 600ms cubic-bezier(.4,0,.2,1)' }}>
          {ARTS.map(src => (
            <div key={src} style={{ flex: '0 0 100%', height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
            </div>
          ))}
        </div>

        {/* setas */}
        <button aria-label="Anterior" onClick={() => go(-1)} style={{ ...arrowStyle, left: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button aria-label="Próximo" onClick={() => go(1)} style={{ ...arrowStyle, right: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18, position: 'relative', zIndex: 1 }}>
        {ARTS.map((_, idx) => (
          <button
            key={idx} onClick={() => setI(idx)} aria-label={`Ir para arte ${idx + 1}`}
            style={{
              width: idx === i ? 20 : 6, height: 6, borderRadius: 3, border: 'none',
              background: idx === i ? '#16153A' : '#D6D4E4', cursor: 'pointer',
              transition: 'all 250ms', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
