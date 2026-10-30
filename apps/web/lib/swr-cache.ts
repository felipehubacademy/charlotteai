// Resposta na hora com o último cálculo guardado (tabela provider_cost_cache) e recálculo por trás:
// - guardado há menos de freshMs: devolve direto;
// - guardado há menos de staleMs: devolve o guardado e recalcula depois da resposta (after);
// - sem nada ou muito velho: calcula agora e guarda.
import { after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function swrCached<T>(key: string, freshMs: number, staleMs: number, compute: () => Promise<T>): Promise<T> {
  const db = getSupabaseAdmin();
  const save = async (value: T) => { await db.from('provider_cost_cache').upsert({ key, payload: value as never, updated_at: new Date().toISOString() } as never); };
  const { data } = await db.from('provider_cost_cache').select('payload, updated_at').eq('key', key).maybeSingle();
  const row = data as { payload: T; updated_at: string } | null;
  const age = row ? Date.now() - new Date(row.updated_at).getTime() : Infinity;
  if (row && age < freshMs) return row.payload;
  if (row && age < staleMs) {
    after(async () => { try { await save(await compute()); } catch (e) { console.error('[swr-cache]', key, e); } });
    return row.payload;
  }
  const value = await compute();
  await save(value).catch(() => {});
  return value;
}
