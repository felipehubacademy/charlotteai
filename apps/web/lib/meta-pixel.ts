// lib/meta-pixel.ts — Pixel da Meta no site (só com o aceite de cookies; ver CookieConsent).
// Pixel "Queizy" (BM Hub Academy). O ID é público: vai no HTML de qualquer site com pixel.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1703450335123598';
export const CONSENT_COOKIE = 'qz_consent'; // 'all' (aceitou) | 'essential' (só os essenciais)

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

export function readConsent(): 'all' | 'essential' | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return m?.[1] === 'all' ? 'all' : m?.[1] === 'essential' ? 'essential' : null;
}

export function saveConsent(v: 'all' | 'essential') {
  document.cookie = `${CONSENT_COOKIE}=${v}; path=/; max-age=${365 * 86400}; samesite=lax; secure`;
}

/** Carrega o pixel (uma vez) e registra a visita. */
export function loadPixel() {
  if (typeof window === 'undefined' || window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args); else fbq.queue!.push(args);
  } as Fbq;
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
  window.fbq = fbq; window._fbq = fbq;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  fbq('init', META_PIXEL_ID);
}

/** Evento padrão da Meta (só se o pixel estiver carregado, ou seja, com aceite). */
export function track(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

export function trackCustom(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', event, params ?? {});
}
