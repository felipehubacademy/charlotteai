// lib/support-instagram.ts — atendimento de uma DM do Instagram (chamado pelo webhook e pelo cron).
// Mesmo fluxo do WhatsApp: a IA responde o que está na FAQ; o resto vira ticket no /admin.
// Ticket com atendente não volta para a IA até ser encerrado.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendInstagramText, instagramProfile, type IncomingInstagramDM } from '@/lib/instagram';
import { runSupportAgent, type SupportTurn, type SupportUserContext } from '@/lib/support-agent';
import { aiShouldStaySilent, findUserContext, upsertConversation, logMessage, setConversationStatus, escalate, ticketOpenedText } from '@/lib/support-service';

const NOT_TEXT = 'Por enquanto eu só consigo ler mensagens de texto. Pode escrever a sua dúvida?';
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export async function handleInstagramDM(m: IncomingInstagramDM) {
  const supabase = getSupabaseAdmin();
  // A Meta reenvia em caso de falha: cada mensagem é processada uma vez só.
  const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true }).eq('external_id', m.id);
  if (count) return;

  const { data: prior } = await supabase.from('support_conversations').select('id, status, user_id, contact').eq('channel', 'instagram').eq('external_id', m.from).maybeSingle();
  const conv0 = prior as { id: string; status: string; user_id: string | null; contact: string } | null;
  // E-mail digitado liga a conversa a um aluno só para encaminhar (não prova quem é, como no WhatsApp).
  let userId = conv0?.user_id ?? null;
  let emailNotFound: string | null = null;
  const email = m.text?.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  if (email) {
    const { data } = await supabase.from('charlotte_users').select('id').ilike('email', email).maybeSingle();
    if (data) userId = (data as { id: string }).id; else emailNotFound = email;
  }
  const profile = conv0 ? null : await instagramProfile(m.from);
  const contact = conv0?.contact ?? (profile?.username ? `@${profile.username}${profile.name ? ` (${profile.name})` : ''}` : `Instagram ${m.from}`);
  const convId = await upsertConversation({ channel: 'instagram', externalId: m.from, contact, userId });
  if (userId && userId !== conv0?.user_id) await supabase.from('support_conversations').update({ user_id: userId, user_verified: false } as never).eq('id', convId);

  const text = m.text ?? '[anexo]';
  const { error: dup } = await supabase.from('support_messages').insert({
    conversation_id: convId, direction: 'in', author: 'user', body: text.slice(0, 4000), external_id: m.id,
  } as never);
  if (dup) return;

  if (m.text && await aiShouldStaySilent(convId, m.text)) return;
  const waitingHuman = conv0?.status === 'escalated';
  if (waitingHuman && !m.text) return;
  if (!m.text) { await reply(convId, m.from, NOT_TEXT, 'midia'); return; }

  const { data: hist } = await supabase.from('support_messages').select('direction, body')
    .eq('conversation_id', convId).order('created_at', { ascending: false }).limit(9);
  const history: SupportTurn[] = ((hist ?? []) as { direction: string; body: string }[]).slice(1).reverse()
    .map(h => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }));

  // Pelo Instagram ninguém é confirmado: dados da conta nunca entram na resposta.
  const full = userId ? await findUserContext(null, userId) : { identified: false } as SupportUserContext;
  const context: SupportUserContext = full.identified
    ? { identified: true, verified: false, userId: full.userId, email: full.email }
    : { identified: false, verified: false, emailNotFound };
  const { count: recentOut } = await supabase.from('support_messages').select('id', { count: 'exact', head: true })
    .eq('conversation_id', convId).eq('direction', 'out').gte('created_at', new Date(Date.now() - 2 * 3600000).toISOString());
  const decision = await runSupportAgent({
    userText: m.text, history, context, channel: 'instagram',
    firstName: firstNameOf(profile?.name), firstReply: !recentOut,
  });

  if (decision.autoSend) {
    await reply(convId, m.from, decision.reply, decision.intent);
    await setConversationStatus(convId, decision.intent === 'encerramento' ? 'closed' : 'auto_resolved');
    return;
  }
  if (waitingHuman) return;
  if (!decision.needsHuman && decision.reply && /e-?mail/i.test(decision.reply)) {
    await reply(convId, m.from, decision.reply, decision.intent);
    return;
  }
  const { ticketCode } = await escalate({ conversationId: convId, contact, channel: 'instagram', intent: decision.intent, userText: m.text, reason: decision.reason, userContext: context });
  await reply(convId, m.from, ticketOpenedText(ticketCode, decision.lang), decision.intent);
}

function firstNameOf(name: string | null | undefined): string | null {
  const w = (name ?? '').trim().split(/\s+/)[0] ?? '';
  const clean = w.replace(/[^\p{L}'-]/gu, '').slice(0, 20);
  return clean.length >= 2 ? clean.charAt(0).toUpperCase() + clean.slice(1) : null;
}

async function reply(convId: string, to: string, text: string, intent: string) {
  const r = await sendInstagramText(to, text);
  await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: r.ok ? text : `${text}\n\n[não enviado: ${r.error}]`, intent, autoSent: r.ok, externalId: r.id });
}
