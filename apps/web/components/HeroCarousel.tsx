'use client';

import { useState, useEffect } from 'react';

// Carrossel das artes da App Store no hero da home.
const ARTS = [
  '/images/store/01.png', '/images/store/02.png', '/images/store/03.png',
  '/images/store/04.png', '/images/store/05.png', '/images/store/06.png',
];

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI(v => (v + 1) % ARTS.length), 3500);
    return () => clearInterval(t);
  }, [paused]);

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

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1290 / 2796',
        borderRadius: 26, overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(22,21,58,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)',
        zIndex: 1,
      }}>
        {ARTS.map((src, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src} src={src} alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: idx === i ? 1 : 0,
              transition: 'opacity 700ms ease',
            }}
          />
        ))}
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
