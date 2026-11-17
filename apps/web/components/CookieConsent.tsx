'use client';
// Medição do site (desde 16/11/2026, decisão do Felipe: medir todas as visitas, sem aviso de cookies).
// A cada página: pixel da Meta + Google Tag Manager no navegador e a mesma visita pelo servidor
// (/api/meta-pageview, API de Conversões), com o mesmo event_id para a Meta não contar em dobro. Fora do /admin.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { browserIds, loadPixel, track } from '@/lib/meta-pixel';

export default function CookieConsent() {
  const pathname = usePathname() ?? '/';
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/open');

  useEffect(() => {
    if (hidden) return;
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
  }, [pathname, hidden]);

  return null;
}
