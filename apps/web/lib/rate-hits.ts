// lib/rate-hits.ts — limite simples de tentativas por chave (telefone, IP, aluno) em rotas públicas.
// Tabela public.rate_hits (migration 20261126210000_rate_hits.sql), só pela chave de servidor.
// Falha de leitura não bloqueia ninguém (não pode derrubar o atendimento nem o checkout).
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type RateKind = 'wa_link_code' | 'coupon_check' | 'rally_join';

/** Quantas tentativas desta chave na janela. */
export async function recentHits(kind: RateKind, key: string, windowMs: number): Promise<number> {
  try {
    const { count } = await getSupabaseAdmin().from('rate_hits').select('id', { count: 'exact', head: true })
      .eq('kind', kind).eq('key', key).gte('created_at', new Date(Date.now() - windowMs).toISOString());
    return count ?? 0;
  } catch { return 0; }
}

/** Registra uma tentativa (e, de vez em quando, apaga as de mais de 2 dias). */
export async function recordHit(kind: RateKind, key: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('rate_hits').insert({ kind, key } as never);
    if (Math.random() < 0.02) {
      await supabase.from('rate_hits').delete().lt('created_at', new Date(Date.now() - 2 * 86400000).toISOString());
    }
  } catch { /* nunca atrapalha a rota */ }
}

/** true = passou do limite (não registra). false = registrou a tentativa e pode seguir. */
export async function overLimit(kind: RateKind, key: string, max: number, windowMs: number): Promise<boolean> {
  if ((await recentHits(kind, key, windowMs)) >= max) return true;
  await recordHit(kind, key);
  return false;
}

/** IP de quem chama (primeiro do x-forwarded-for, como o checkout). */
export function clientIp(headers: Headers): string | null {
  return (headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || headers.get('x-real-ip') || null;
}
