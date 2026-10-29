// lib/legacy-trial.ts — fim do teste antigo (7 dias sem cartão, dado até 21/10/2026).
//
// Quando o teste vence, a conta passa para a degustação (subscription_status 'none': 1 tópico por dia
// por 5 dias, no app) em vez de ficar sem acesso nenhum, e recebe push e e-mail lembrando que ainda
// tem os 7 dias grátis da loja (quem estava no teste antigo nunca usou o teste da loja).
// Roda de hora em hora pelo agendador (/api/notifications/scheduler, tarefa legacy_trial).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendOrQueue } from '@/lib/email-outbox';
import { legacyTrialEndedTemplate } from '@/lib/email-templates';
import { sendLegacyTrialEndedPush } from '@/lib/expo-notification-service';
import { inQuietHours } from '@/lib/push-quiet-hours';

export async function endLegacyTrials(): Promise<{ moved: number }> {
  // Teste que vence de madrugada passa às 9h: o aviso sai junto e no horário certo.
  if (inQuietHours('America/Sao_Paulo')) return { moved: 0 };
  const supabase = getSupabaseAdmin();
  const { data: users, error } = await supabase.from('charlotte_users')
    .select('id, name, email, email_bounced, expo_push_token, timezone, app_language, charlotte_level, is_institutional, subscription_product')
    .eq('subscription_status', 'trial').lte('trial_ends_at', new Date().toISOString()).limit(200);
  if (error || !users?.length) return { moved: 0 };

  let moved = 0;
  for (const u of users as any[]) {
    if (u.is_institutional || u.subscription_product) continue;
    // Muda o status primeiro (só se ainda estiver em 'trial'): rodar duas vezes não manda nada em dobro.
    const { data: upd } = await supabase.from('charlotte_users').update({ subscription_status: 'none' } as never)
      .eq('id', u.id).eq('subscription_status', 'trial').select('id');
    if (!upd?.length) continue;
    moved++;

    const [{ count: activities }, { data: prog }] = await Promise.all([
      supabase.from('learn_history_v2').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('completed', true),
      supabase.from('charlotte_progress').select('total_xp').eq('user_id', u.id).maybeSingle(),
    ]);
    const xp = (prog as { total_xp?: number } | null)?.total_xp ?? 0;

    if (u.email && !u.email_bounced) {
      const { subject, html } = legacyTrialEndedTemplate({ name: u.name, activities: activities ?? 0, xp });
      await sendOrQueue({ kind: 'legacy_trial_ended', to: u.email, subject, html }).catch(() => false);
    }
    await sendLegacyTrialEndedPush(supabase, u).catch(() => {});
  }
  return { moved };
}
