// lib/supportFaq.ts — FAQ da tela "Ajuda e suporte", vinda do servidor.
// É a mesma base que a IA do suporte usa (editada em /admin/suporte → FAQ da IA, perguntas
// marcadas "No app"). Guarda a última versão para abrir sem internet; se nunca baixou,
// a tela usa a lista fixa dela.
import Constants from 'expo-constants';
import { cacheGet, cacheSet } from './offlineCache';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export interface SupportFaqEntry { section: string; question: string; answer: string }

const key = (isPt: boolean) => `support_faq_${isPt ? 'pt' : 'en'}`;

export async function getCachedSupportFaq(isPt: boolean): Promise<SupportFaqEntry[] | null> {
  const c = await cacheGet<SupportFaqEntry[]>(key(isPt)).catch(() => null);
  return c?.length ? c : null;
}

export async function fetchSupportFaq(isPt: boolean): Promise<SupportFaqEntry[] | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${API_BASE_URL}/api/support/faq?lang=${isPt ? 'pt' : 'en'}`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json() as { entries?: SupportFaqEntry[] };
    const list = (j.entries ?? []).filter(e => e.question && e.answer);
    if (!list.length) return null;
    await cacheSet(key(isPt), list).catch(() => {});
    return list;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
