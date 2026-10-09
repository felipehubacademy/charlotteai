// lib/moderation.ts — bloqueio entre alunos e filtro do @ (Guideline 1.2).
// Bloqueio vale nos dois sentidos: nenhum dos dois vê, encontra ou interage
// com o outro (busca, pedidos, cutucadas, parabéns, competições, pushes).
// Suspensão (feita pela equipe no /admin) equivale a bloqueio com todo mundo.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** Alunos suspensos do social pela equipe. */
export async function suspendedIds(): Promise<Set<string>> {
  const { data } = await getSupabaseAdmin().from('social_suspensions').select('user_id').limit(5000);
  return new Set(((data ?? []) as { user_id: string }[]).map(r => r.user_id));
}

export async function isSuspended(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin().from('social_suspensions').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

/** Ids que eu bloqueei ou que me bloquearam, mais os alunos suspensos. */
export async function blockedWith(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const [a, b, sus] = await Promise.all([
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
    supabase.from('user_blocks').select('blocker_id').eq('blocked_id', userId),
    suspendedIds(),
  ]);
  sus.delete(userId);
  return new Set([
    ...((a.data ?? []) as { blocked_id: string }[]).map(r => r.blocked_id),
    ...((b.data ?? []) as { blocker_id: string }[]).map(r => r.blocker_id),
    ...sus,
  ]);
}

export async function isBlocked(a: string, b: string): Promise<boolean> {
  const sus = await suspendedIds();
  if (sus.has(a) || sus.has(b)) return true;
  const { data } = await getSupabaseAdmin().from('user_blocks').select('blocker_id')
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`).limit(1);
  return !!data?.length;
}

/** Todos os pares bloqueados ("a|b" nos dois sentidos), para os jobs de push. */
export async function allBlockedPairs(): Promise<Set<string>> {
  const { data } = await getSupabaseAdmin().from('user_blocks').select('blocker_id, blocked_id').limit(20000);
  const out = new Set<string>();
  for (const r of (data ?? []) as { blocker_id: string; blocked_id: string }[]) {
    out.add(`${r.blocker_id}|${r.blocked_id}`); out.add(`${r.blocked_id}|${r.blocker_id}`);
  }
  return out;
}

// Palavras proibidas no @ (pt/en): ofensas, termos sexuais e discriminatórios.
// Comparação sem acento, em minúsculas, também com letras trocadas por números.
const BANNED = [
  'porra', 'caralho', 'buceta', 'boceta', 'puta', 'puto', 'viado', 'viadinho', 'bicha', 'cuzao', 'cuzinho', 'arrombad',
  'fdp', 'filhodaputa', 'merda', 'bosta', 'piroca', 'xoxota', 'xereca', 'punheta', 'siririca', 'safad', 'vagabund',
  'macaco', 'crioulo', 'retardad', 'mongol', 'nazista', 'hitler', 'estupr', 'pedofil', 'pornô', 'porno',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'retard', 'rape', 'nazi', 'porn',
  'admin', 'queizy', 'charlotte', 'suporte', 'support', 'oficial', 'official',
];
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

export function isOffensiveHandle(handle: string): boolean {
  const h = handle.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[0-9@$]/g, c => LEET[c] ?? c).replace(/[._]/g, '');
  return BANNED.some(w => h.includes(w.normalize('NFD').replace(/[̀-ͯ]/g, '')));
}
