// lib/email-outbox.ts — fila de e-mails que falharam. O serviço de e-mail aceita cerca de 30 envios por
// minuto por caixa; num pico (lançamento, campanha) os excedentes voltavam erro e o aluno ficava sem
// o e-mail (inclusive o link de criar a senha da assinatura pelo site). Agora o que falha entra aqui e
// o cron /api/cron/email-outbox reenvia aos poucos (até 20 por rodada, a cada 5 minutos, com espera
// crescente entre as tentativas).
//
// Dois tipos de item:
//   kind 'web_welcome'  payload { userId, plan, trialDays }: o e-mail é montado de novo na hora do envio,
//                       com um link de senha novo (o link antigo expira).
//   qualquer outro kind  to_email + subject + html prontos (ex.: e-mails do login, cujo link vale 1 hora).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';

const MAX_ATTEMPTS = 8;
const BATCH = 20;

/** Envia; se falhar, guarda na fila para o cron reenviar. Devolve true se saiu agora. */
export async function sendOrQueue(e: { kind: string; to: string; subject: string; html: string }): Promise<boolean> {
  const ok = await sendEmail({ to: e.to, subject: e.subject, html: e.html }).catch(() => false);
  if (!ok) await enqueue({ kind: e.kind, to_email: e.to, subject: e.subject, html: e.html });
  return ok;
}

export async function enqueue(item: { kind: string; to_email?: string | null; subject?: string | null; html?: string | null; payload?: unknown }): Promise<void> {
  try {
    await getSupabaseAdmin().from('email_outbox').insert({
      kind: item.kind, to_email: item.to_email ?? null, subject: item.subject ?? null, html: item.html ?? null,
      payload: item.payload ?? null, next_attempt_at: new Date(Date.now() + 2 * 60000).toISOString(),
    } as never);
  } catch (err) {
    console.error('[email-outbox] enqueue failed', err);
  }
}

type Row = { id: number; kind: string; to_email: string | null; subject: string | null; html: string | null; payload: Record<string, unknown> | null; attempts: number };

/** Reenvia os pendentes. Chamado pelo cron. */
export async function processOutbox(): Promise<{ sent: number; failed: number; pending: number }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('email_outbox').select('id, kind, to_email, subject, html, payload, attempts')
    .is('sent_at', null).lt('attempts', MAX_ATTEMPTS).lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true }).limit(BATCH);
  const rows = (data ?? []) as Row[];
  let sent = 0; let failed = 0;
  for (const r of rows) {
    let ok = false; let err: string | null = null;
    try {
      if (r.kind === 'web_welcome') {
        const { sendWebWelcomeNow } = await import('@/lib/web-welcome');
        const p = r.payload ?? {};
        ok = await sendWebWelcomeNow(String(p.userId ?? ''), (p.plan === 'annual' ? 'annual' : 'monthly'), Number(p.trialDays ?? 0));
      } else if (r.to_email && r.subject && r.html) {
        ok = await sendEmail({ to: r.to_email, subject: r.subject, html: r.html });
      } else {
        err = 'item incompleto';
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    const attempts = r.attempts + 1;
    if (ok) {
      sent++;
      await supabase.from('email_outbox').update({ sent_at: new Date().toISOString(), attempts } as never).eq('id', r.id);
    } else {
      failed++;
      // Espera crescente: 4, 8, 16, 32… minutos (até 8 tentativas, cerca de 17 horas no total).
      const wait = Math.min(2 ** (attempts + 1), 480) * 60000;
      await supabase.from('email_outbox').update({ attempts, last_error: err ?? 'envio recusado', next_attempt_at: new Date(Date.now() + wait).toISOString() } as never).eq('id', r.id);
    }
  }
  const { count } = await supabase.from('email_outbox').select('id', { count: 'exact', head: true }).is('sent_at', null).lt('attempts', MAX_ATTEMPTS);
  return { sent, failed, pending: count ?? 0 };
}
