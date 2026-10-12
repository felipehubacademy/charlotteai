// lib/goalsClaim.ts — pede ao servidor o XP das metas concluídas. O servidor
// tem os valores e só paga 1 vez por meta e período; pedir de novo não duplica.
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export type GoalClaim = { kind: 'mission' | 'weekly'; id: string; period: string };

export async function claimGoals(items: GoalClaim[]): Promise<{ kind: string; id: string; xp: number }[]> {
  if (!items.length) return [];
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return [];
    const r = await fetch(`${API_BASE_URL}/api/goals/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items }),
    });
    return r.ok ? ((await r.json()).granted ?? []) : [];
  } catch { return []; }
}
