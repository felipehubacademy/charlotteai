'use client';
// Marca no funil do site (lib/site-funnel) quando a seção aparece na tela, pela rolagem ou pelo botão "Ver planos".
import { useEffect } from 'react';
import { trackFunnel, type FunnelStep } from '@/lib/site-funnel';

export default function FunnelSectionWatch({ id, step }: { id: string; step: FunnelStep }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { trackFunnel(step); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [id, step]);
  return null;
}
