'use client';
// Link "Preferências de cookies": reabre o aviso de cookies (components/CookieConsent) para mudar a escolha.
// Usado no rodapé do site e na política de privacidade. É um botão com cara de link (não muda de página).
// Fica escondido no /admin e no /open, onde o aviso não aparece.
import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { openCookiePreferences } from '@/lib/meta-pixel';

export default function CookiePreferencesLink({ style, className, label = 'Preferências de cookies' }: { style?: CSSProperties; className?: string; label?: string }) {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/admin') || pathname.startsWith('/open')) return null;
  return (
    <button type="button" className={className} onClick={openCookiePreferences}
      style={{ background: 'none', border: 0, padding: 0, margin: 0, font: 'inherit', cursor: 'pointer', color: 'inherit', ...style }}>
      {label}
    </button>
  );
}
