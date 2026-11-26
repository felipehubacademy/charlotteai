'use client';
// Aviso de cookies e medição do site (LGPD, desde 26/11/2026).
// Nada de medição antes da escolha: sem pixel da Meta, sem Google Tag Manager, sem cookies _fbp/_fbc/qz_vid e
// sem a visita pelo servidor. "Aceitar" grava qz_consent=all e liga a medição (a página atual conta na hora);
// "Só os essenciais" grava qz_consent=essential e não mede nada. A escolha vale por 1 ano e pode ser mudada pelo
// link "Preferências de cookies" (rodapé e /privacidade), que reabre este aviso.
// Com aceite, a cada página: pixel + GTM no navegador e a mesma visita pelo servidor (/api/meta-pageview, API de
// Conversões), com o mesmo event_id para a Meta não contar em dobro. Fora do /admin e do /open.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { applyConsent, browserIds, loadPixel, readConsent, track, CONSENT_EVENT, COOKIE_PREFS_EVENT } from '@/lib/meta-pixel';

const INK = '#14121A';
const MID = '#5C5668';

type Choice = 'all' | 'essential' | null;

/** Visita medida (só com aceite): pixel no navegador e a mesma visita pelo servidor. */
function measurePageView() {
  loadPixel();
  const eventId = `pv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  track('PageView', {}, eventId);
  // Clique vindo de anúncio (fbclid): o servidor manda junto, mesmo antes de o pixel gravar o cookie _fbc.
  let fbc: string | undefined;
  try {
    const id = new URLSearchParams(window.location.search).get('fbclid');
    if (id) fbc = `fb.1.${Date.now()}.${id}`;
  } catch { /* sem URL: segue */ }
  const ids = browserIds();
  fetch('/api/meta-pageview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ eventId, url: window.location.href, fbc, fbp: ids?.fbp, vid: ids?.vid }),
  }).catch(() => {});
}

export default function CookieConsent() {
  const pathname = usePathname() ?? '/';
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/open');
  // undefined = ainda não leu o cookie (no servidor o aviso não aparece, para não piscar para quem já escolheu).
  const [choice, setChoice] = useState<Choice | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [fromPrefs, setFromPrefs] = useState(false);
  const lastMeasured = useRef<string | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const c = readConsent();
    setChoice(c);
    if (!c) setOpen(true);
    const onPrefs = () => { setFromPrefs(true); setOpen(true); };
    const onChange = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (v === 'all' || v === 'essential') setChoice(v);
    };
    window.addEventListener(COOKIE_PREFS_EVENT, onPrefs);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => {
      window.removeEventListener(COOKIE_PREFS_EVENT, onPrefs);
      window.removeEventListener(CONSENT_EVENT, onChange);
    };
  }, []);

  // Medição: só com aceite, uma vez por página (inclusive a página em que a pessoa tocou em "Aceitar").
  useEffect(() => {
    if (hidden || choice !== 'all' || lastMeasured.current === pathname) return;
    lastMeasured.current = pathname;
    measurePageView();
  }, [pathname, hidden, choice]);

  // Reaberto pelo link de preferências: leva o foco para o aviso (quem navega pelo teclado chega aos botões).
  useEffect(() => {
    if (open && fromPrefs) firstButton.current?.focus();
  }, [open, fromPrefs]);

  if (hidden || !open || choice === undefined) return null;

  const choose = (v: 'all' | 'essential') => {
    setOpen(false); setFromPrefs(false);
    applyConsent(v);
  };
  // Esc fecha só quando a pessoa já tinha escolhido antes (reaberto pelas preferências).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && choice) { setOpen(false); setFromPrefs(false); }
  };

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="qz-cookie-title" aria-describedby="qz-cookie-text"
      className="qz-cookie" onKeyDown={onKeyDown}>
      <style>{`
        .qz-cookie {
          position: fixed; z-index: 60; left: 16px; right: 16px;
          bottom: max(16px, env(safe-area-inset-bottom));
          max-width: 640px; margin: 0 auto;
          background: #fff; border: 1px solid #E6E2EC; border-radius: 16px;
          box-shadow: 0 8px 28px rgba(22,19,31,0.14);
          padding: 14px 16px; display: flex; align-items: center; gap: 14px;
          font-family: 'Inter',-apple-system,'Segoe UI',Arial,sans-serif;
        }
        .qz-cookie p { margin: 0; font-size: 13.5px; line-height: 1.5; color: ${MID}; }
        .qz-cookie p b { color: ${INK}; }
        .qz-cookie a { color: #6B4BFF; font-weight: 600; text-decoration: underline; }
        .qz-cookie .qz-cookie-btns { display: flex; gap: 8px; flex-shrink: 0; }
        .qz-cookie button {
          padding: 10px 16px; border-radius: 999px; font-size: 14px; font-weight: 700; cursor: pointer;
          white-space: nowrap; border: 1px solid ${INK};
        }
        .qz-cookie .qz-cookie-min { background: #fff; color: ${INK}; }
        .qz-cookie .qz-cookie-all { background: ${INK}; color: #DDFF4A; }
        .qz-cookie button:focus-visible, .qz-cookie a:focus-visible { outline: 3px solid #6B4BFF; outline-offset: 2px; }
        @media (max-width: 600px) {
          .qz-cookie { flex-direction: column; align-items: stretch; gap: 12px; }
          .qz-cookie .qz-cookie-btns button { flex: 1; }
        }
      `}</style>
      <p id="qz-cookie-text">
        <b id="qz-cookie-title">Cookies.</b> Usamos cookies essenciais para o site funcionar. Se você aceitar, também
        usamos cookies de medição e publicidade para saber quais anúncios trazem visitas e assinaturas.{' '}
        <a href="/privacidade">Política de Privacidade</a>
      </p>
      <div className="qz-cookie-btns">
        <button ref={firstButton} type="button" className="qz-cookie-min" onClick={() => choose('essential')}>Só os essenciais</button>
        <button type="button" className="qz-cookie-all" onClick={() => choose('all')}>Aceitar</button>
      </div>
    </section>
  );
}
