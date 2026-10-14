// lib/taste.ts — degustação (conta nova sem assinatura): um gostinho de cada parte do app, uma vez só.
//   - Trilha: o 1º bloco dos 3 níveis (controlado no app).
//   - Practice: 10 mensagens no total (conta as mensagens do aluno em chat_messages).
//   - Live Voice: 3 minutos no total, sem renovação mensal (lib/liveVoiceUsage.ts no app + /api/realtime-token).
// Depois disso, o paywall com o teste de 7 dias da loja.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const TASTE_PRACTICE_MESSAGES = 10;
export const TASTE_LIVE_VOICE_SECONDS = 3 * 60;

export const isTasterRow = (u: { subscription_status?: string | null; is_institutional?: boolean | null } | null | undefined) =>
  !!u && !u.is_institutional && (!u.subscription_status || u.subscription_status === 'none');

/** Degustação do Practice esgotada? Devolve o corpo da resposta 402, ou null para seguir. Nunca lança. */
export async function checkPracticeTaste(userId: string, isPt: boolean): Promise<{ error: 'taste_exhausted'; message: string } | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: u } = await supabase.from('charlotte_users').select('subscription_status, is_institutional').eq('id', userId).maybeSingle();
    if (!isTasterRow(u as never)) return null;
    const { count } = await supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user');
    if ((count ?? 0) < TASTE_PRACTICE_MESSAGES) return null;
    return {
      error: 'taste_exhausted',
      message: isPt
        ? 'Sua degustação do Practice acabou. Comece seus 7 dias grátis para continuar conversando com a Charlotte.'
        : 'Your Practice taste is over. Start your 7-day free trial to keep talking with Charlotte.',
    };
  } catch (e) {
    console.warn('[taste] check failed', e);
    return null;
  }
}
