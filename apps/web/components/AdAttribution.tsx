'use client';
// AdAttribution — visita vinda de anúncio (utm_campaign na URL): grava a visita e guarda a campanha no
// cookie qz_utm (30 dias), que o checkout leva para a compra. Só nome de campanha; nada pessoal.
// LGPD (desde 26/11/2026): é medição de anúncios, então só roda com o aceite dos cookies ("Aceitar" no aviso).
// Quem aceita na própria página de entrada ainda conta: espera o aviso (CONSENT_EVENT) enquanto a URL tem a campanha.
import { useEffect } from 'react';
import { hasConsent, CONSENT_EVENT } from '@/lib/meta-pixel';

function recordVisit() {
  try {
    const q = new URLSearchParams(window.location.search);
    const c = q.get('utm_campaign');
    if (!c) return;
    const utm = { s: q.get('utm_source') ?? '', m: q.get('utm_medium') ?? '', c, ct: q.get('utm_content') ?? '', lp: window.location.pathname, at: new Date().toISOString() };
    document.cookie = `qz_utm=${encodeURIComponent(JSON.stringify(utm))}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax`;
    // Uma vez por sessão e campanha (recarregar a página não conta de novo).
    const key = `qz_utm_seen_${c}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch('/api/ad-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ campaign: c, source: utm.s, path: window.location.pathname }) }).catch(() => {});
  } catch { /* sem cookie/sessão: segue sem medir */ }
}

export default function AdAttribution() {
  useEffect(() => {
    if (hasConsent()) { recordVisit(); return; }
    const onChange = (e: Event) => { if ((e as CustomEvent).detail === 'all') recordVisit(); };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);
  return null;
}
