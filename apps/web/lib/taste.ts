// lib/taste.ts — degustação (conta nova sem assinatura), liberada aos poucos por TASTE_DAYS dias.
//   - Trilha: 1 tópico novo por dia (controlado no app, apps/mobile/lib/tasteDays.ts).
//   - Practice: 10 mensagens no 1º dia e mais 5 a cada dia seguinte, até o 5º (30 no total).
//   - Live Voice: 3 minutos no total, sem renovação mensal (lib/liveVoiceUsage.ts no app + /api/realtime-token).
// Depois disso, o paywall com o teste de 7 dias da loja.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const TASTE_PRACTICE_MESSAGES = 10;      // 1º dia
export const TASTE_PRACTICE_PER_DAY = 5;        // a cada dia seguinte
export const TASTE_DAYS = 5;
// Quem já estava na degustação antes da mudança começa a contar daqui.
const TASTE_DAILY_START = Date.UTC(2026, 9, 27, 3); // 27/10/2026 0h em Brasília (em 28/10 quem já tinha conta está no dia 2: um tópico novo)

/** Dia da degustação (1 no dia do cadastro), em dias do calendário de Brasília. */
export function tasteDay(createdAt: string | null | undefined, now = Date.now()): number {
  const created = createdAt ? new Date(createdAt).getTime() : now;
  const start = Math.max(created, TASTE_DAILY_START);
  const brtDay = (t: number) => Math.floor((t - 3 * 3600000) / 86400000);
  return Math.max(1, brtDay(now) - brtDay(start) + 1);
}

/** Mensagens do Practice liberadas até hoje. */
export const tastePracticeAllowance = (day: number) =>
  TASTE_PRACTICE_MESSAGES + TASTE_PRACTICE_PER_DAY * (Math.min(day, TASTE_DAYS) - 1);
export const TASTE_LIVE_VOICE_SECONDS = 3 * 60;

export const isTasterRow = (u: { subscription_status?: string | null; is_institutional?: boolean | null } | null | undefined) =>
  !!u && !u.is_institutional && (!u.subscription_status || u.subscription_status === 'none');

/** Degustação do Practice esgotada? Devolve o corpo da resposta 402, ou null para seguir. Nunca lança. */
export async function checkPracticeTaste(userId: string, isPt: boolean): Promise<{ error: 'taste_exhausted'; message: string } | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: u } = await supabase.from('charlotte_users').select('subscription_status, is_institutional, created_at').eq('id', userId).maybeSingle();
    if (!isTasterRow(u as never)) return null;
    const day = tasteDay((u as { created_at?: string } | null)?.created_at);
    const { count } = await supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user');
    if ((count ?? 0) < tastePracticeAllowance(day)) return null;
    const more = day < TASTE_DAYS;
    return {
      error: 'taste_exhausted',
      message: isPt
        ? (more
          ? `Suas mensagens de hoje acabaram. Amanhã você ganha mais ${TASTE_PRACTICE_PER_DAY}. Ou comece seus 7 dias grátis para continuar conversando com a Charlotte agora.`
          : 'Sua degustação do Practice acabou. Comece seus 7 dias grátis para continuar conversando com a Charlotte.')
        : (more
          ? `You're out of messages for today. You get ${TASTE_PRACTICE_PER_DAY} more tomorrow. Or start your 7-day free trial to keep talking with Charlotte now.`
          : 'Your Practice taste is over. Start your 7-day free trial to keep talking with Charlotte.'),
    };
  } catch (e) {
    console.warn('[taste] check failed', e);
    return null;
  }
}
