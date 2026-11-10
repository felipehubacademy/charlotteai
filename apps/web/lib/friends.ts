// lib/friends.ts — amigos de estudo: quem entrou pelo convite (referrals) e
// quem virou amigo pela busca (study_friends, depois de pedido + aceite).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { blockedWith, allBlockedPairs, isSuspended, suspendedIds } from '@/lib/moderation';
import { readAll } from '@/lib/db-batch';

export type FriendRelation = 'sponsor' | 'invited' | 'friend';

/** Amigos de um aluno, com a relação (padrinho, convidado ou amigo da busca). */
export async function friendsOf(userId: string): Promise<Map<string, FriendRelation>> {
  const supabase = getSupabaseAdmin();
  if (await isSuspended(userId)) return new Map(); // suspenso: sem amigos no social
  const [inv, by, fa, fb, blocked, ua, ub] = await Promise.all([
    supabase.from('referrals').select('invitee_id').eq('inviter_id', userId),
    supabase.from('referrals').select('inviter_id').eq('invitee_id', userId),
    supabase.from('study_friends').select('user_b').eq('user_a', userId),
    supabase.from('study_friends').select('user_a').eq('user_b', userId),
    blockedWith(userId),
    supabase.from('study_unfriended').select('user_b').eq('user_a', userId),
    supabase.from('study_unfriended').select('user_a').eq('user_b', userId),
  ]);
  const out = new Map<string, FriendRelation>();
  ((fa.data ?? []) as { user_b: string }[]).forEach(r => out.set(r.user_b, 'friend'));
  ((fb.data ?? []) as { user_a: string }[]).forEach(r => out.set(r.user_a, 'friend'));
  ((inv.data ?? []) as { invitee_id: string }[]).forEach(r => out.set(r.invitee_id, 'invited'));
  ((by.data ?? []) as { inviter_id: string }[]).forEach(r => out.set(r.inviter_id, 'sponsor'));
  out.delete(userId);
  for (const id of blocked) out.delete(id); // bloqueio desfaz a amizade em tudo
  // "Deixar de estudar junto" (sem bloquear) também tira o par.
  ((ua.data ?? []) as { user_b: string }[]).forEach(r => out.delete(r.user_b));
  ((ub.data ?? []) as { user_a: string }[]).forEach(r => out.delete(r.user_a));
  return out;
}

/** Todos os pares de amigos (para os pushes de competição da dupla). */
export async function allFriendPairs(): Promise<Array<[string, string]>> {
  const supabase = getSupabaseAdmin();
  // Em páginas: o .limit(20000) não valia (máximo de 1.000 linhas por leitura) e duplas ficavam sem push sem aviso.
  const [ref, sf, blocked, un, sus] = await Promise.all([
    readAll<{ inviter_id: string; invitee_id: string }>('convites', () => supabase.from('referrals').select('inviter_id, invitee_id').order('invitee_id')),
    readAll<{ user_a: string; user_b: string }>('amigos da busca', () => supabase.from('study_friends').select('user_a, user_b').order('user_a').order('user_b')),
    allBlockedPairs(),
    readAll<{ user_a: string; user_b: string }>('deixaram de estudar junto', () => supabase.from('study_unfriended').select('user_a, user_b').order('user_a').order('user_b')),
    suspendedIds(),
  ]);
  for (const r of un) { blocked.add(`${r.user_a}|${r.user_b}`); blocked.add(`${r.user_b}|${r.user_a}`); }
  const pairs: Array<[string, string]> = [
    ...ref.map(r => [r.inviter_id, r.invitee_id] as [string, string]),
    ...sf.map(r => [r.user_a, r.user_b] as [string, string]),
  ];
  return pairs.filter(([a, b]) => !blocked.has(`${a}|${b}`) && !sus.has(a) && !sus.has(b));
}

export const orderedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);
