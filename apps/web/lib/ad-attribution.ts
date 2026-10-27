// lib/ad-attribution.ts — teste A/B de anúncios (site x lojas).
// Lado "loja": o link /baixar?c=<campanha> grava o clique e manda para a loja do celular, com a campanha
// marcada (App Store: ct= com o código do provedor; Play: referrer com utm). Lado "site": a visita com
// utm_campaign grava o evento e guarda a campanha no cookie qz_utm, que segue até a compra
// (asaas_checkouts.meta_tracking.utm). Só nome de campanha e plataforma: nenhum dado pessoal.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const APPLE_PROVIDER_TOKEN = '128349057';
export const APP_STORE_ID = '6760943273';
export const PLAY_PACKAGE = 'com.hubacademy.charlotte';
export const UTM_COOKIE = 'qz_utm';

export type AdPlatform = 'ios' | 'android' | 'desktop';

export function platformFromUA(ua: string | null): AdPlatform {
  const s = (ua ?? '').toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'ios';
  if (/android/.test(s)) return 'android';
  return 'desktop';
}

/** Campanha segura para URL e banco: letras, números, - e _, até 60. */
export function cleanCampaign(c: string | null | undefined): string {
  return (c ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sem-campanha';
}

export function storeUrlFor(platform: AdPlatform, campaign: string, source = 'meta'): string {
  if (platform === 'ios') return `https://apps.apple.com/app/apple-store/id${APP_STORE_ID}?pt=${APPLE_PROVIDER_TOKEN}&ct=${encodeURIComponent(campaign)}&mt=8`;
  if (platform === 'android') {
    const ref = `utm_source=${source}&utm_medium=ads&utm_campaign=${campaign}`;
    return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${encodeURIComponent(ref)}`;
  }
  // Computador: não instala app; vai para o site com a mesma campanha.
  return `https://queizy.com/?utm_source=${source}&utm_medium=ads&utm_campaign=${encodeURIComponent(campaign)}`;
}

export async function logAdEvent(e: { kind: 'click' | 'visit'; arm: string; campaign: string; source?: string | null; platform: AdPlatform; path?: string | null }) {
  try {
    await getSupabaseAdmin().from('ad_events').insert({
      kind: e.kind, arm: e.arm.slice(0, 20), campaign: cleanCampaign(e.campaign),
      source: e.source ? e.source.slice(0, 40) : null, platform: e.platform, path: e.path ? e.path.slice(0, 120) : null,
    } as never);
  } catch (err) {
    console.warn('[ad-attribution] log failed', err);
  }
}
