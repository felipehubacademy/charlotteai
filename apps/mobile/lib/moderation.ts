// lib/moderation.ts — denunciar e bloquear alunos (Guideline 1.2 da Apple).
// Menu único usado em todo lugar onde aparece outra pessoa.
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { systemIsPt } from './systemLang';
import { showActionSheet } from '@/components/ui/ActionSheet';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

async function post(body: Record<string, unknown>): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const r = await fetch(`${API_BASE_URL}/api/friends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch { return false; }
}

export const blockUser = (id: string) => post({ action: 'block', id });
export const unfriendUser = (id: string) => post({ action: 'unfriend', id });
export const unblockUser = (id: string) => post({ action: 'unblock', id });
export const reportUser = (id: string, reason: string, context?: string) => post({ action: 'report', id, reason, context });

export async function fetchBlocked(): Promise<{ id: string; name: string; username: string | null }[]> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const r = await fetch(`${API_BASE_URL}/api/friends?blocked=1`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return r.ok ? ((await r.json()).blocked ?? []) : [];
  } catch { return []; }
}

/** Menu da pessoa: deixar de estudar junto (se for amigo), denunciar, bloquear. */
export function openUserActions(person: { id: string; name?: string | null }, opts: { context?: string; onBlocked?: () => void; isFriend?: boolean } = {}) {
  const pt = systemIsPt;
  const who = (person.name ?? '').trim() || (pt ? 'esta pessoa' : 'this person');
  const report = () => {
    const send = async (reason: string) => {
      await reportUser(person.id, reason, opts.context);
      showActionSheet({
        title: pt ? 'Denúncia enviada' : 'Report sent',
        message: pt ? 'Obrigado. Nossa equipe analisa em até 24 horas. Se quiser, bloqueie para não ver mais esta pessoa.' : 'Thanks. Our team reviews it within 24 hours. You can also block this person.',
        options: [{ label: pt ? `Bloquear ${who}` : `Block ${who}`, destructive: true, onPress: block }],
      });
    };
    showActionSheet({
      title: pt ? `Denunciar ${who}` : `Report ${who}`,
      message: pt ? 'Qual é o problema?' : "What's the problem?",
      options: [
        { label: pt ? 'Nome, @ ou foto ofensivos' : 'Offensive name, @ or photo', onPress: () => send('offensive_profile') },
        { label: pt ? 'Assédio ou spam' : 'Harassment or spam', onPress: () => send('harassment') },
        { label: pt ? 'Outro motivo' : 'Something else', onPress: () => send('other') },
      ],
    });
  };
  const block = () => showActionSheet({
    title: pt ? `Bloquear ${who}?` : `Block ${who}?`,
    message: pt ? 'Vocês deixam de ser amigos de estudo e esta pessoa não vai mais te achar, te mandar pedidos, cutucadas, parabéns nem convites.'
                : "You'll stop being study friends and they won't be able to find you or send requests, nudges, congrats or invites.",
    options: [{ label: pt ? 'Bloquear' : 'Block', destructive: true, onPress: async () => { await blockUser(person.id); opts.onBlocked?.(); } }],
  });
  const unfriend = () => showActionSheet({
    title: pt ? `Deixar de estudar com ${who}?` : `Stop studying with ${who}?`,
    message: pt ? 'Vocês deixam de ser amigos de estudo, sem aviso para a outra pessoa. Dá para mandar um novo pedido depois.'
                : "You'll stop being study friends. They won't be notified, and you can send a new request later.",
    options: [{ label: pt ? 'Deixar de estudar junto' : 'Stop studying together', destructive: true, onPress: async () => { await unfriendUser(person.id); opts.onBlocked?.(); } }],
  });
  showActionSheet({
    title: who,
    options: [
      ...(opts.isFriend ? [{ label: pt ? 'Deixar de estudar junto' : 'Stop studying together', onPress: unfriend }] : []),
      { label: pt ? 'Denunciar' : 'Report', onPress: report },
      { label: pt ? 'Bloquear' : 'Block', destructive: true, onPress: block },
    ],
  });
}
