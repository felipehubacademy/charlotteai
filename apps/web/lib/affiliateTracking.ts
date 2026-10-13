// lib/affiliateTracking.ts (cliente) — rastreio silencioso do link de afiliado.
// queizy.com/a/CODIGO redireciona para a página inicial com ?aff=CODIGO. Aqui o código é guardado
// no navegador por 30 dias (o primeiro vale), o clique é contado e o parâmetro sai da barra.
// Os botões de baixar (StoreCTA) levam o código para a loja: no Android pelo referrer da Play,
// no iPhone pela área de transferência ("AFF:CODIGO"), lida pelo app na primeira abertura.
const KEY = 'queizy_aff';
const WINDOW_MS = 30 * 86400000;

export function captureAffiliateFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get('aff');
    if (!raw) return;
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    url.searchParams.delete('aff');
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    if (!code || storedAffiliate()) return; // o primeiro link vale
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    const ua = navigator.userAgent;
    const platform = /iPad|iPhone|iPod/.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop';
    fetch('/api/affiliate/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, platform }) }).catch(() => {});
  } catch { /* sem armazenamento: segue sem rastreio */ }
}

export function storedAffiliate(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { code: string; at: number } | null;
    if (!v?.code || Date.now() - v.at > WINDOW_MS) return null;
    return v.code;
  } catch { return null; }
}

/** Link da Play com o código no referrer (o app lê na primeira abertura). */
export function playUrlWithAffiliate(base: string): string {
  const code = storedAffiliate();
  return code ? `${base}&referrer=${encodeURIComponent(`queizy_aff=${code}`)}` : base;
}

/** No iPhone, copia "AFF:CODIGO" antes de ir para a App Store (precisa ser no toque). */
export async function copyAffiliateForIos(): Promise<void> {
  const code = storedAffiliate();
  if (!code) return;
  try { await navigator.clipboard.writeText(`AFF:${code}`); } catch { /* segue sem copiar */ }
}
