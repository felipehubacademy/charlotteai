'use client';
// Aviso de cookies do site (LGPD): o pixel da Meta só carrega depois de "Aceitar".
// "Só os essenciais" mantém o site funcionando sem medição de anúncios. Fora do /admin.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { readConsent, saveConsent, loadPixel, track } from '@/lib/meta-pixel';

export default function CookieConsent() {
  const pathname = usePathname() ?? '/';
  const [choice, setChoice] = useState<'all' | 'essential' | null | undefined>(undefined);
  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/open');

  useEffect(() => { setChoice(readConsent()); }, []);
  // Uma visita (PageView) por página, depois do aceite.
  useEffect(() => {
    if (choice !== 'all' || hidden) return;
    loadPixel();
    track('PageView');
  }, [choice, pathname, hidden]);

  if (hidden || choice !== null) return null;
  const decide = (v: 'all' | 'essential') => { saveConsent(v); setChoice(v); };
  return (
    <div role="dialog" aria-label="Aviso de cookies" style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 1000, margin: '0 auto', maxWidth: 560,
      background: '#16131F', color: '#FAF7F0', borderRadius: 18, padding: '16px 18px',
      boxShadow: '0 12px 40px rgba(22,19,31,.25)', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif",
    }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        Usamos cookies para medir nossos anúncios e melhorar o site. Você escolhe.{' '}
        <a href="/privacidade" style={{ color: '#DCFF4A' }}>Saiba mais</a>
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => decide('all')}
          style={{ background: '#DCFF4A', color: '#16131F', border: 0, borderRadius: 999, padding: '10px 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          Aceitar
        </button>
        <button type="button" onClick={() => decide('essential')}
          style={{ background: 'transparent', color: '#FAF7F0', border: '1px solid rgba(250,247,240,.35)', borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Só os essenciais
        </button>
      </div>
    </div>
  );
}
