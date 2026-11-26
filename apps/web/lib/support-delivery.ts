// lib/support-delivery.ts — entrega das respostas do suporte por e-mail.
// Server-only (service role).
//
// Antes, se a resposta do atendente não saía, só aparecia "Não foi possível enviar o e-mail" na tela
// de quem respondeu; e se saía e voltava depois (endereço inexistente, caixa cheia), ninguém ficava
// sabendo. Agora:
//   1. Falha no envio: a resposta fica registrada na conversa como "Não entregue" (com o motivo) e a
//      gestão recebe um alerta.
//   2. Devolução depois do envio: o aviso de não entrega que chega nas caixas da Microsoft é ligado à
//      resposta (cron /api/cron/support-bounces), e a devolução avisada pelo serviço reserva chega
//      pelo webhook /api/webhooks/resend. Nos dois casos a resposta vira "Não entregue" e a gestão
//      recebe um alerta.
//   3. O atendente reenvia pelo /admin (retrySupportEmail).
// Um alerta por falha: reenvios que falham de novo não repetem o alerta; se um reenvio sai e depois
// volta, é uma falha nova e avisa de novo.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmailDetailed, listBounceNotices, type SendEmailResult } from '@/lib/microsoft-graph-email-service';
import { notifyAdmins } from '@/lib/admin-push';
import { supportReplyHtml, setConversationStatus } from '@/lib/support-service';

export type DeliveryStatus = 'sent' | 'failed' | 'bounced' | 'sending';
export const UNDELIVERED: DeliveryStatus[] = ['failed', 'bounced', 'sending'];

/** Assunto da resposta por e-mail (o mesmo do e-mail do aluno, com "Re:"). */
export function supportReplySubject(subject: string | null): string {
  return subject ? (/^re:/i.test(subject) ? subject : `Re: ${subject}`) : 'Queizy — Suporte';
}

const ERR_MAX = 500;
const clip = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, ERR_MAX);

/** Colunas de entrega depois de uma tentativa de envio. */
function deliveryPatch(r: SendEmailResult): Record<string, unknown> {
  const now = new Date().toISOString();
  return r.ok
    ? { delivery_status: 'sent', delivery_error: null, delivery_failed_at: null, delivery_sent_at: now, delivery_alerted_at: null,
        delivery_provider: r.provider, delivery_provider_id: r.providerId }
    : { delivery_status: 'failed', delivery_error: clip(r.error ?? 'Envio recusado'), delivery_failed_at: now };
}

/**
 * Envia a resposta do atendente por e-mail e registra a mensagem na conversa com a situação da entrega.
 * Se falhar, a mensagem fica como "Não entregue" e a gestão é avisada. Devolve o id da mensagem.
 */
export async function sendSupportEmailReply(args: {
  conversationId: string; to: string; subject: string | null; text: string; authorName: string | null;
}): Promise<{ delivered: boolean; messageId: string | null; error: string | null }> {
  const r = await sendEmailDetailed({ to: args.to, subject: supportReplySubject(args.subject), html: supportReplyHtml(args.text), essential: true })
    .catch((e): SendEmailResult => ({ ok: false, provider: null, providerId: null, error: e instanceof Error ? e.message : String(e) }));
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('support_messages').insert({
    conversation_id: args.conversationId, direction: 'out', author: 'human', body: args.text,
    author_name: args.authorName, auto_sent: false, delivery_to: args.to.toLowerCase(), ...deliveryPatch(r),
  } as never).select('id').single();
  let messageId = (data as { id: string } | null)?.id ?? null;
  if (error) {
    console.error('[support-delivery] registrar resposta', error.message);
    // Banco ainda sem as colunas de entrega (migration não aplicada): o e-mail que saiu continua
    // registrado na conversa, como antes.
    if (r.ok) {
      const { data: plain } = await supabase.from('support_messages').insert({
        conversation_id: args.conversationId, direction: 'out', author: 'human', body: args.text, author_name: args.authorName, auto_sent: false,
      } as never).select('id').single();
      messageId = (plain as { id: string } | null)?.id ?? null;
    }
  }
  if (!r.ok && messageId) await onUndelivered(messageId, 'failed').catch(e => console.error('[support-delivery] alerta', e));
  return { delivered: r.ok, messageId, error: r.ok ? null : clip(r.error ?? 'Envio recusado') };
}

type MsgRow = {
  id: string; conversation_id: string; direction: string; body: string; delivery_status: string | null; delivery_to: string | null;
  support_conversations: { channel: string; contact: string; subject: string | null } | null;
};

/** Reenvia uma resposta "Não entregue". Trava contra clique duplo: só um reenvio por vez. */
export async function retrySupportEmail(conversationId: string, messageId: string): Promise<{ ok: boolean; status: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('support_messages')
    .select('id, conversation_id, direction, body, delivery_status, delivery_to, support_conversations(channel, contact, subject)')
    .eq('id', messageId).maybeSingle();
  const m = data as MsgRow | null;
  if (!m || m.conversation_id !== conversationId || m.direction !== 'out') return { ok: false, status: 404, error: 'Mensagem não encontrada nesta conversa.' };
  const conv = m.support_conversations;
  if (!conv || conv.channel !== 'email') return { ok: false, status: 400, error: 'Só respostas por e-mail podem ser reenviadas.' };
  if (m.delivery_status !== 'failed' && m.delivery_status !== 'bounced') return { ok: false, status: 409, error: 'Esta resposta não está marcada como não entregue.' };

  // Reserva o reenvio (outro clique ou outra aba não manda duas vezes).
  const { data: claimed } = await supabase.from('support_messages').update({ delivery_status: 'sending' } as never)
    .eq('id', m.id).in('delivery_status', ['failed', 'bounced']).select('id');
  if (!claimed?.length) return { ok: false, status: 409, error: 'Esta resposta já está sendo reenviada.' };

  const to = m.delivery_to || conv.contact;
  const r = await sendEmailDetailed({ to, subject: supportReplySubject(conv.subject), html: supportReplyHtml(m.body), essential: true })
    .catch((e): SendEmailResult => ({ ok: false, provider: null, providerId: null, error: e instanceof Error ? e.message : String(e) }));
  await supabase.from('support_messages').update({ ...deliveryPatch(r), delivery_to: to.toLowerCase() } as never).eq('id', m.id);
  if (!r.ok) {
    // Mesma falha de antes: o alerta já saiu (trava em delivery_alerted_at), não repete.
    await onUndelivered(m.id, 'failed').catch(e => console.error('[support-delivery] alerta', e));
    return { ok: false, status: 502, error: `O e-mail não saiu de novo: ${clip(r.error ?? 'envio recusado')}` };
  }
  await supabase.from('support_conversations').update({ last_message_at: new Date().toISOString() } as never).eq('id', conversationId);
  return { ok: true, status: 200 };
}

/**
 * Marca uma resposta que saiu e depois voltou. Só vale para a mensagem ainda marcada como enviada,
 * e só se a devolução chegou depois do último envio (um reenvio que saiu não volta a ficar devolvido
 * por um aviso antigo). Devolve true se marcou.
 */
export async function markSupportReplyBounced(messageId: string, reason: string, bouncedAt: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  // Tolerância de 2 min entre os relógios dos servidores.
  const at = new Date(bouncedAt).getTime();
  const sentBefore = new Date((Number.isFinite(at) ? at : Date.now()) + 2 * 60_000).toISOString();
  const { data } = await supabase.from('support_messages')
    .update({ delivery_status: 'bounced', delivery_error: clip(reason), delivery_failed_at: new Date().toISOString() } as never)
    .eq('id', messageId).eq('delivery_status', 'sent').lte('delivery_sent_at', sentBefore).select('id');
  if (!data?.length) return false;
  await onUndelivered(messageId, 'bounced').catch(e => console.error('[support-delivery] alerta', e));
  return true;
}

/** Depois de uma falha: a conversa volta para a fila do atendente e a gestão recebe um alerta (uma vez). */
async function onUndelivered(messageId: string, kind: 'failed' | 'bounced'): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Trava de repetição: só quem marca delivery_alerted_at manda o alerta.
  const { data } = await supabase.from('support_messages').update({ delivery_alerted_at: new Date().toISOString() } as never)
    .eq('id', messageId).is('delivery_alerted_at', null)
    .select('id, conversation_id, delivery_error, delivery_to, support_conversations(contact, status, ticket_code)');
  const row = (data ?? [])[0] as {
    conversation_id: string; delivery_error: string | null; delivery_to: string | null;
    support_conversations: { contact: string; status: string; ticket_code: string | null } | null;
  } | undefined;
  if (!row) return;
  const conv = row.support_conversations;
  // Conversa fechada ou com a IA: volta para a fila do atendente, para alguém resolver.
  if (conv && conv.status !== 'escalated') await setConversationStatus(row.conversation_id, 'escalated');
  const who = row.delivery_to || conv?.contact || 'aluno';
  await notifyAdmins({
    title: kind === 'bounced' ? 'Resposta do suporte voltou (não entregue)' : 'Resposta do suporte não foi enviada',
    body: `${who}${conv?.ticket_code ? ` (chamado #${conv.ticket_code})` : ''}: ${row.delivery_error ?? 'sem motivo informado'}`.slice(0, 200),
    url: '/admin/support', tag: `undelivered-${messageId}`, category: 'ticket_undelivered',
  }, ['admin', 'manager', 'support']).catch(() => 0);
}

// ── Avisos de não entrega da Microsoft ────────────────────────────────────────

const WINDOW_DAYS = 3;
const NDR_PREFIX = /^\s*((undeliverable|undelivered|não é possível entregar|nao e possivel entregar|returned mail|mail delivery failed|delivery status notification \((failure|falha)\))\s*:?\s*)+/i;
const norm = (s: string) => s.toLowerCase().replace(/^\s*((re|res|fw|fwd|enc)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim();

/** Motivo curto tirado do aviso: a linha com o código de erro (5.1.1, 550...) ou o diagnóstico. */
export function bounceReason(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const hit = lines.find(l => /diagnostic-code|remote server returned|status:\s*5|\b5\.\d{1,3}\.\d{1,3}\b|\b55\d\b/i.test(l))
    ?? lines.find(l => /couldn't be delivered|could not be delivered|não pôde ser entregue|não foi possível entregar|wasn't found|does not exist|não existe|mailbox (is )?full|caixa.*cheia/i.test(l));
  return hit ? clip(hit) : 'O servidor do destinatário devolveu o e-mail (aviso de não entrega).';
}

/**
 * Lê os avisos de não entrega das caixas de envio e liga cada um à resposta do suporte que voltou:
 * mesmo destinatário, mesmo assunto (quando o aviso traz o assunto) e aviso chegado depois do envio.
 * Só olha a Microsoft quando há respostas acompanhadas nos últimos 3 dias. Idempotente.
 */
export async function scanSupportBounces(): Promise<{ tracked: number; notices: number; bounced: number }> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
  const { data } = await supabase.from('support_messages')
    .select('id, delivery_to, delivery_sent_at, support_conversations(subject, contact)')
    .eq('delivery_status', 'sent').eq('delivery_provider', 'graph').gte('delivery_sent_at', since)
    .order('delivery_sent_at', { ascending: false }).limit(500);
  const tracked = ((data ?? []) as { id: string; delivery_to: string | null; delivery_sent_at: string; support_conversations: { subject: string | null; contact: string } | null }[])
    .map(t => ({ id: t.id, to: (t.delivery_to || t.support_conversations?.contact || '').toLowerCase(), sentAt: t.delivery_sent_at, subject: norm(supportReplySubject(t.support_conversations?.subject ?? null)) }))
    .filter(t => t.to.includes('@'));
  if (!tracked.length) return { tracked: 0, notices: 0, bounced: 0 };

  const oldest = tracked.reduce((min, t) => (t.sentAt < min ? t.sentAt : min), tracked[0].sentAt);
  const notices = await listBounceNotices(new Date(new Date(oldest).getTime() - 60_000).toISOString());
  let bounced = 0;
  const done = new Set<string>();
  for (const n of notices.sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime))) {
    const text = `${n.subject}\n${n.text}`.toLowerCase().replace(/\s+/g, ' ');
    const stripped = n.subject.replace(NDR_PREFIX, '');
    // Aviso com o assunto original ("Não é possível entregar: Re: ..."): o assunto tem de bater.
    const origSubject = stripped !== n.subject && stripped.trim() ? norm(stripped) : null;
    const received = new Date(n.receivedDateTime).getTime();
    const match = tracked
      .filter(t => !done.has(t.id) && text.includes(t.to) && received >= new Date(t.sentAt).getTime() - 2 * 60_000)
      .filter(t => (origSubject ? origSubject === t.subject : !t.subject || text.includes(t.subject)))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
    if (!match) continue;
    if (await markSupportReplyBounced(match.id, bounceReason(n.text), n.receivedDateTime)) { bounced++; done.add(match.id); }
  }
  return { tracked: tracked.length, notices: notices.length, bounced };
}
