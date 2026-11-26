// lib/meta-pixel.ts — medição de anúncios no site, só para quem aceitou os cookies (ver CookieConsent):
//   Pixel da Meta "Queizy" (BM Hub Academy) e Google Tag Manager "queizy.com" (conta Hub Academy),
//   onde ficam as tags do Google Ads. Os IDs são públicos: vão no HTML de qualquer site.
// Cada evento vai para os dois: track('InitiateCheckout' | 'StartTrial' | 'Purchase') também entra no
// dataLayer do Google como begin_checkout / start_trial / purchase (transaction_id = id do checkout).
// LGPD (desde 26/11/2026): sem o aceite ("Aceitar" no aviso de cookies), nada daqui roda: não carrega pixel
// nem GTM, não grava _fbp/qz_vid e track() não faz nada. "Só os essenciais" apaga os cookies de medição.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1703450335123598';
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-N6RMRDTQ';
export const CONSENT_COOKIE = 'qz_consent'; // 'all' (aceitou) | 'essential' (só os essenciais)
/** Evento da janela quando a escolha muda (detail: 'all' | 'essential'). */
export const CONSENT_EVENT = 'qz-consent-change';
/** Evento da janela que reabre o aviso de cookies (link "Preferências de cookies"). */
export const COOKIE_PREFS_EVENT = 'qz-cookie-preferences';

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq; dataLayer?: Record<string, unknown>[]; __gtmLoaded?: boolean } }

const CONSENT_DENIED = { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
const CONSENT_GRANTED = { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' };

/** gtag() do modo de consentimento do Google (precisa do objeto arguments, não de um array). */
function gtag(..._args: unknown[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments as unknown as Record<string, unknown>);
}

/** Carrega o Google Tag Manager (uma vez): consentimento negado por padrão e liberado só com o aceite. */
function loadGtm() {
  if (typeof window === 'undefined' || window.__gtmLoaded || !GTM_ID || !hasConsent()) return;
  window.__gtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  gtag('consent', 'default', CONSENT_DENIED);
  gtag('consent', 'update', CONSENT_GRANTED);
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

/** Aceitou os cookies de medição e publicidade? Sem escolha ainda = não. */
export function hasConsent(): boolean {
  return readConsent() === 'all';
}

export function saveConsent(v: 'all' | 'essential') {
  document.cookie = `${CONSENT_COOKIE}=${v}; path=/; max-age=${365 * 86400}; samesite=lax; secure`;
}

// Cookies de medição: os nossos (qz_vid, qz_utm), os da Meta (_fbp, _fbc) e os das tags do Google.
const TRACKING_COOKIE = /^(_fbp|_fbc|qz_vid|qz_utm|_ga|_gid|_gat|_ga_.+|_gcl_.+|_gac_.+)$/;

/** Apaga os cookies de medição (quem escolheu "Só os essenciais", inclusive depois de ter aceitado). */
function clearTrackingCookies() {
  const host = location.hostname;
  const domains = ['', `; domain=${host}`, `; domain=.${host.replace(/^www\./, '')}`];
  for (const part of document.cookie.split('; ')) {
    const name = part.split('=')[0];
    if (!TRACKING_COOKIE.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; path=/; max-age=0${d}`;
  }
}

/**
 * Grava a escolha do aviso de cookies e avisa a página (CONSENT_EVENT). "Só os essenciais" apaga os cookies de
 * medição e, se o pixel ou o GTM já estavam carregados nesta página (mudou de ideia), recarrega a página para
 * tirar os scripts.
 */
export function applyConsent(v: 'all' | 'essential') {
  if (typeof window === 'undefined') return;
  saveConsent(v);
  if (v === 'essential') {
    clearTrackingCookies();
    if (window.__gtmLoaded) gtag('consent', 'update', CONSENT_DENIED);
    if (window.fbq || window.__gtmLoaded) { window.location.reload(); return; }
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
}

/** Reabre o aviso de cookies (link "Preferências de cookies" no rodapé e na política de privacidade). */
export function openCookiePreferences() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COOKIE_PREFS_EVENT));
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
 * Só com aceite (sem ele, null e nenhum cookie gravado).
 * Identificação do navegador para a Meta, criada já na 1ª página (antes, o cookie _fbp só existia depois que o
 * pixel carregava, e a visita pelo servidor ia sem ela: nota baixa de correspondência). O pixel reaproveita o
 * _fbp que já existe. qz_vid = identificação nossa da visita (external_id), igual no navegador e no servidor.
 */
export function browserIds(): { fbp: string; vid: string } | null {
  if (typeof document === 'undefined' || !hasConsent()) return null;
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

/** Carrega o pixel e o GTM (uma vez), só com aceite. A visita (PageView) é registrada pelo CookieConsent. */
export function loadPixel() {
  if (typeof window === 'undefined' || window.fbq || !hasConsent()) return;
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

/** Evento padrão da Meta e o equivalente no Google (só com aceite e com os dois carregados). */
export function track(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || !hasConsent()) return;
  loadPixel(); // com aceite, o evento não se perde se vier antes da visita (ex.: tela de sucesso)
  if (!window.fbq) return;
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
  if (typeof window === 'undefined' || !window.fbq || !hasConsent()) return;
  window.fbq('trackCustom', event, params ?? {});
}
