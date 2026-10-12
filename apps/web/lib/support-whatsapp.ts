// lib/support-whatsapp.ts — atendimento de uma mensagem do WhatsApp (chamado pelo webhook).
// IA responde o que está na FAQ; o resto vira ticket no /admin. Ticket com atendente não volta para a IA.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppText, markWhatsAppRead, type IncomingWhatsApp } from '@/lib/whatsapp';
import { runSupportAgent, type SupportTurn } from '@/lib/support-agent';
import { findUserContext, upsertConversation, logMessage, setConversationStatus, escalate } from '@/lib/support-service';

const HOLDING = 'Obrigado pela mensagem! Vou passar para a nossa equipe, que te responde por aqui em breve.';
const NOT_TEXT = 'Por enquanto eu só consigo ler mensagens de texto. Pode escrever a sua dúvida?';
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export async function handleWhatsAppMessage(m: IncomingWhatsApp) {
  const supabase = getSupabaseAdmin();
  // A Meta reenvia em caso de falha: cada mensagem é processada uma vez só.
  const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true }).eq('external_id', m.id);
  if (count) return;
  await markWhatsAppRead(m.id);

  // Identifica o aluno pelo e-mail citado em alguma mensagem desta conversa.
  const { data: prior } = await supabase.from('support_conversations').select('id, status, user_id').eq('channel', 'whatsapp').eq('external_id', m.from).maybeSingle();
  const conv0 = prior as { id: string; status: string; user_id: string | null } | null;
  const email = m.text?.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  let userId = conv0?.user_id ?? null;
  let userEmail: string | null = null;
  if (email) {
    const { data } = await supabase.from('charlotte_users').select('id, email').ilike('email', email).maybeSingle();
    if (data) { userId = (data as { id: string }).id; userEmail = (data as { email: string }).email; }
  } else if (userId) {
    const { data } = await supabase.from('charlotte_users').select('email').eq('id', userId).maybeSingle();
    userEmail = (data as { email: string } | null)?.email ?? null;
  }
  const contact = m.name ? `${m.name} (+${m.from})` : `+${m.from}`;
  const convId = await upsertConversation({ channel: 'whatsapp', externalId: m.from, contact, userId });

  const text = m.text ?? `[${m.type}]`;
  const { error: dup } = await supabase.from('support_messages').insert({
    conversation_id: convId, direction: 'in', author: 'user', body: text.slice(0, 4000), external_id: m.id,
  } as never);
  if (dup) return; // outra execução já pegou esta mensagem

  // Atendente cuidando: só registra (o ticket segue na fila e entra no aviso por e-mail se demorar).
  if (conv0?.status === 'escalated') return;

  if (!m.text) {
    await reply(convId, m.from, NOT_TEXT, 'midia');
    return;
  }

  const { data: hist } = await supabase.from('support_messages').select('direction, body')
    .eq('conversation_id', convId).order('created_at', { ascending: false }).limit(9);
  const history: SupportTurn[] = ((hist ?? []) as { direction: string; body: string }[]).slice(1).reverse()
    .map(h => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }));

  const context = await findUserContext(userEmail, userId);
  const decision = await runSupportAgent({ userText: m.text, history, context, channel: 'whatsapp' });

  if (decision.autoSend) {
    await reply(convId, m.from, decision.reply, decision.intent);
    await setConversationStatus(convId, 'auto_resolved');
    return;
  }
  // Pedido de e-mail para identificar (sem caso para humano ainda): responde e segue com a IA.
  if (!decision.needsHuman && decision.reply && !context.identified && /e-?mail/i.test(decision.reply)) {
    await reply(convId, m.from, decision.reply, decision.intent);
    return;
  }
  await reply(convId, m.from, HOLDING, decision.intent);
  await escalate({ conversationId: convId, contact, channel: 'whatsapp', intent: decision.intent, userText: m.text, reason: decision.reason, userContext: context });
}

async function reply(convId: string, to: string, text: string, intent: string) {
  const r = await sendWhatsAppText(to, text);
  await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: r.ok ? text : `${text}\n\n[não enviado: ${r.error}]`, intent, autoSent: r.ok, externalId: r.id });
}
