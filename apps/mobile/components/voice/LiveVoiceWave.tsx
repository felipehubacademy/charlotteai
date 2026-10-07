// LiveVoiceWave — a onda da marca (queizy → crazy) como visual da conversa.
//   ouvindo   → linha reta e neutra (silêncio)
//   você fala → onda rosa, irregular (o "queizy")
//   Charlotte → onda verde, suave e regular (o "crazy")
// Path SVG recalculado ~30fps enquanto alguém fala; parado no silêncio.

import React, { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';

type Mode = 'idle' | 'user' | 'charlotte';

const COLORS: Record<Mode, string> = {
  idle:      'rgba(22,19,31,0.18)',
  user:      '#FF4F8B',
  charlotte: '#08804A',
};

interface Props {
  mode: Mode;
  width?: number;
  height?: number;
}

export function LiveVoiceWave({ mode, width = 200, height = 30 }: Props) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (mode === 'idle') return;
    const loop = (now: number) => {
      if (now - last.current > 33) { last.current = now; setT(now / 1000); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [mode]);

  const sw = 4;
  const mid = height / 2;
  const maxAmp = height / 2 - sw;
  const steps = 48;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = sw / 2 + ((width - sw) * i) / steps;
    const u = i / steps;
    // envelope: zero nas pontas, cheio no meio
    const env = Math.sin(Math.PI * u);
    let y = mid;
    if (mode === 'charlotte') {
      y = mid + maxAmp * 0.75 * env * Math.sin(u * Math.PI * 6 - t * 6);
    } else if (mode === 'user') {
      const wobble =
        Math.sin(u * Math.PI * 9 - t * 9) * 0.6 +
        Math.sin(u * Math.PI * 17 + t * 13) * 0.3 +
        Math.sin(u * Math.PI * 4 - t * 5) * 0.25;
      y = mid + maxAmp * env * wobble;
    }
    d += `${i === 0 ? 'M' : ' L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={COLORS[mode]} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
