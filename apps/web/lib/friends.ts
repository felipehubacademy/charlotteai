// lib/friends.ts — amigos de estudo: quem entrou pelo convite (referrals) e
// quem virou amigo pela busca (study_friends, depois de pedido + aceite).
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type FriendRelation = 'sponsor' | 'invited' | 'friend';

/** Amigos de um aluno, com a relação (padrinho, convidado ou amigo da busca). */
export async function friendsOf(userId: string): Promise<Map<string, FriendRelation>> {
  const supabase = getSupabaseAdmin();
  const [inv, by, fa, fb] = await Promise.all([
    supabase.from('referrals').select('invitee_id').eq('inviter_id', userId),
    supabase.from('referrals').select('inviter_id').eq('invitee_id', userId),
    supabase.from('study_friends').select('user_b').eq('user_a', userId),
    supabase.from('study_friends').select('user_a').eq('user_b', userId),
  ]);
  const out = new Map<string, FriendRelation>();
  ((fa.data ?? []) as { user_b: string }[]).forEach(r => out.set(r.user_b, 'friend'));
  ((fb.data ?? []) as { user_a: string }[]).forEach(r => out.set(r.user_a, 'friend'));
  ((inv.data ?? []) as { invitee_id: string }[]).forEach(r => out.set(r.invitee_id, 'invited'));
  ((by.data ?? []) as { inviter_id: string }[]).forEach(r => out.set(r.inviter_id, 'sponsor'));
  out.delete(userId);
  return out;
}

/** Todos os pares de amigos (para os pushes de competição da dupla). */
export async function allFriendPairs(): Promise<Array<[string, string]>> {
  const supabase = getSupabaseAdmin();
  const [ref, sf] = await Promise.all([
    supabase.from('referrals').select('inviter_id, invitee_id').limit(20000),
    supabase.from('study_friends').select('user_a, user_b').limit(20000),
  ]);
  return [
    ...((ref.data ?? []) as { inviter_id: string; invitee_id: string }[]).map(r => [r.inviter_id, r.invitee_id] as [string, string]),
    ...((sf.data ?? []) as { user_a: string; user_b: string }[]).map(r => [r.user_a, r.user_b] as [string, string]),
  ];
}

export const orderedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);
