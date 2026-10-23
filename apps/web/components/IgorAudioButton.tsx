'use client';

import { useRef, useState } from 'react';

// Botão "Ouça o Igorfina" no hero: toca os bordões de abertura do app (um por clique, em sequência),
// só quando a pessoa clica (nunca sozinho).
const CLIPS = ['queizy_1', 'oh_man', 'queizy_2', 'sliced', 'uncrumble'].map(c => `/audio/igorfina/${c}.mp3`);

export default function IgorAudioButton() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const next = useRef(0);

  const toggle = () => {
    if (playing && audio.current) { audio.current.pause(); setPlaying(false); return; }
    audio.current = new Audio(CLIPS[next.current]);
    next.current = (next.current + 1) % CLIPS.length;
    audio.current.onended = () => setPlaying(false);
    audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <button type="button" className="igor-play" onClick={toggle} aria-label={playing ? 'Parar o áudio do Igorfina' : 'Ouça o Igorfina'}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
      </svg>
      {playing ? 'Tocando…' : 'Ouça o Igorfina'}
    </button>
  );
}
