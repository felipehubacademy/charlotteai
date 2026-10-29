'use client';
// AdAttribution — visita vinda de anúncio (utm_campaign na URL): grava a visita e guarda a campanha no
// cookie qz_utm (30 dias), que o checkout leva para a compra. Só nome de campanha; nada pessoal.
import { useEffect } from 'react';

export default function AdAttribution() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const c = q.get('utm_campaign');
      if (!c) return;
      const utm = { s: q.get('utm_source') ?? '', m: q.get('utm_medium') ?? '', c, ct: q.get('utm_content') ?? '', at: new Date().toISOString() };
      document.cookie = `qz_utm=${encodeURIComponent(JSON.stringify(utm))}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax`;
      // Uma vez por sessão e campanha (recarregar a página não conta de novo).
      const key = `qz_utm_seen_${c}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      fetch('/api/ad-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ campaign: c, source: utm.s, path: window.location.pathname }) }).catch(() => {});
    } catch { /* sem cookie/sessão: segue sem medir */ }
  }, []);
  return null;
}
