// lib/request-user.ts — aluno da prova de login (Authorization: Bearer) do pedido, conferida no Supabase.
// Quando há prova, ela vale mais que qualquer id mandado no corpo ou em cabeçalho (que dá para forjar).
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const cache = new Map<string, { id: string | null; at: number }>();
const TTL_MS = 5 * 60_000;

export async function requestUserId(req: NextRequest): Promise<string | null> {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (token.split('.').length !== 3) return null;
  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.id;
  const { data } = await getSupabaseAdmin().auth.getUser(token).catch(() => ({ data: { user: null } }));
  const id = data?.user?.id ?? null;
  if (cache.size > 5000) cache.clear();
  cache.set(token, { id, at: Date.now() });
  return id;
}
