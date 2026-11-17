// lib/meta-pixel.ts — medição de anúncios no site, em todas as visitas (ver CookieConsent):
//   Pixel da Meta "Queizy" (BM Hub Academy) e Google Tag Manager "queizy.com" (conta Hub Academy),
//   onde ficam as tags do Google Ads. Os IDs são públicos: vão no HTML de qualquer site.
// Cada evento vai para os dois: track('InitiateCheckout' | 'StartTrial' | 'Purchase') também entra no
// dataLayer do Google como begin_checkout / start_trial / purchase (transaction_id = id do checkout).
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1703450335123598';
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-N6RMRDTQ';
export const CONSENT_COOKIE = 'qz_consent'; // 'all' (aceitou) | 'essential' (só os essenciais)

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq; dataLayer?: Record<string, unknown>[]; __gtmLoaded?: boolean } }

/** Carrega o Google Tag Manager (uma vez), com a medição liberada. */
function loadGtm() {
  if (typeof window === 'undefined' || window.__gtmLoaded || !GTM_ID) return;
  window.__gtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  const gtag = function (..._args: unknown[]) { window.dataLayer!.push(arguments as unknown as Record<string, unknown>); };
  gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true; s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

const GOOGLE_EVENT: Record<string, string> = { InitiateCheckout: 'begin_checkout', StartTrial: 'start_trial', Purchase: 'purchase' };

export function readConsent(): 'all' | 'essential' | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return m?.[1] === 'all' ? 'all' : m?.[1] === 'essential' ? 'essential' : null;
}

export function saveConsent(v: 'all' | 'essential') {
  document.cookie = `${CONSENT_COOKIE}=${v}; path=/; max-age=${365 * 86400}; samesite=lax; secure`;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const domain = /(^|\.)queizy\.com$/.test(location.hostname) ? '; domain=.queizy.com' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}; samesite=lax; secure${domain}`;
}

/**
 * Identificação do navegador para a Meta, criada já na 1ª página (antes, o cookie _fbp só existia depois que o
 * pixel carregava, e a visita pelo servidor ia sem ela: nota baixa de correspondência). O pixel reaproveita o
 * _fbp que já existe. qz_vid = identificação nossa da visita (external_id), igual no navegador e no servidor.
 */
export function browserIds(): { fbp: string; vid: string } | null {
  if (typeof document === 'undefined') return null;
  try {
    let fbp = readCookie('_fbp');
    if (!fbp || !/^fb\.\d\.\d+\.\d+$/.test(fbp)) {
      fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 9e9) + 1e9}`;
      writeCookie('_fbp', fbp, 90);
    }
    let vid = readCookie('qz_vid');
    if (!vid || !/^[a-z0-9-]{16,40}$/.test(vid)) {
      vid = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`).toLowerCase();
      writeCookie('qz_vid', vid, 365);
    }
    return { fbp, vid };
  } catch { return null; }
}

/** Carrega o pixel (uma vez) e registra a visita. */
export function loadPixel() {
  if (typeof window === 'undefined' || window.fbq) return;
  const ids = browserIds();
  const fbq: Fbq = function (...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args); else fbq.queue!.push(args);
  } as Fbq;
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
  window.fbq = fbq; window._fbq = fbq;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  fbq('init', META_PIXEL_ID, ids ? { external_id: ids.vid } : undefined);
  loadGtm();
}

/** Evento padrão da Meta e o equivalente no Google (quando os dois estão carregados). */
export function track(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params ?? {}, eventId ? { eventID: eventId } : undefined);
  const g = GOOGLE_EVENT[event];
  if (g && window.dataLayer) {
    window.dataLayer.push({
      event: g,
      value: typeof params?.value === 'number' ? params.value : 0,
      currency: (params?.currency as string) ?? 'BRL',
      plan: params?.content_name ?? null,
      // Id único da compra: o Google não conta a mesma conversão duas vezes (ex.: recarregar a página).
      transaction_id: eventId ?? null,
    });
  }
}

export function trackCustom(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', event, params ?? {});
}
