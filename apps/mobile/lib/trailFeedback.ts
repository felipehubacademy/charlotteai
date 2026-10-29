// lib/trailFeedback.ts — fim do Role-play e do Guided Chat: XP da conversa e
// correção do inglês do aluno (até 3 frases, gravadas para Minha evolução).
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { systemIsPt } from './systemLang';
import { getModule } from './curriculum-v2/loader';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export type ConversationActivity = 'roleplay' | 'chat';
export interface Correction { said: string; correct: string; tip: string }
export interface ConversationFeedback { errorFree: boolean; corrections: Correction[]; praise?: string }

/** XP da conversa: 10 por terminar + 5 por objetivo cumprido. Conta para sequência, metas e ranking. */
export function conversationXP(objectivesMet: number): number {
  return 10 + 5 * Math.max(0, objectivesMet);
}

export async function recordConversationPractice(userId: string, activity: ConversationActivity, objectivesMet: number): Promise<number> {
  const xp = conversationXP(objectivesMet);
  try {
    await supabase.from('charlotte_practices').insert({
      user_id: userId,
      practice_type: activity === 'roleplay' ? 'roleplay' : 'guided_chat',
      xp_earned: xp,
    });
  } catch (e) { console.warn('[trailFeedback] practice insert failed', e); }
  return xp;
}

export async function fetchConversationFeedback(args: {
  level: string; moduleId: string; unitId: string; activity: ConversationActivity; topic?: string; lines: string[];
}): Promise<ConversationFeedback | null> {
  try {
    // Estrutura que a unidade treina: o revisor não pode "corrigir" o alvo da aula.
    const mod = getModule(args.level as any, args.moduleId);
    const focus = [mod?.theme, mod?.goal].filter(Boolean).join(' — ').slice(0, 400);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const r = await fetch(`${API_BASE_URL}/api/trail/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...args, focus, lang: systemIsPt ? 'pt' : 'en' }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
