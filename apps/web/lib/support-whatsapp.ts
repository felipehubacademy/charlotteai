// lib/support-whatsapp.ts — atendimento de uma mensagem do WhatsApp (chamado pelo webhook).
// IA responde o que está na FAQ; o resto vira ticket no /admin. Ticket com atendente não volta para a IA.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppText, markWhatsAppRead, type IncomingWhatsApp } from '@/lib/whatsapp';
import { runSupportAgent, type SupportTurn, type SupportUserContext } from '@/lib/support-agent';
import { aiShouldStaySilent, findUserContext, upsertConversation, logMessage, setConversationStatus, escalate, ticketOpenedText } from '@/lib/support-service';

const NOT_TEXT = 'Por enquanto eu só consigo ler mensagens de texto. Pode escrever a sua dúvida?';
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Código do botão do app (ver /api/support/whatsapp-code): "Q" + 5 caracteres sem 0/O/1/I/L.
const CODE_RE = /\bQ[2-9A-HJKMNP-Z]{5}\b/;
const CODE_TEXT_RE = /\(?\s*(?:c[óo]digo|code):?\s*Q[2-9A-HJKMNP-Z]{5}\s*\)?/i;

export async function handleWhatsAppMessage(m: IncomingWhatsApp) {
  const supabase = getSupabaseAdmin();
  // A Meta reenvia em caso de falha: cada mensagem é processada uma vez só.
  const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true }).eq('external_id', m.id);
  if (count) return;
  await markWhatsAppRead(m.id);

  // Quem é o aluno, em ordem de confiança:
  // 1) código do botão "Falar no WhatsApp" do app (gerado para a conta logada) → confirmado;
  // 2) conversa já ligada antes a um aluno (o número fica lembrado);
  // 3) e-mail digitado na conversa → só para encaminhar (não prova quem é).
  const { data: prior } = await supabase.from('support_conversations').select('id, status, user_id, user_verified').eq('channel', 'whatsapp').eq('external_id', m.from).maybeSingle();
  const conv0 = prior as { id: string; status: string; user_id: string | null; user_verified: boolean } | null;
  let userId = conv0?.user_id ?? null;
  let verified = conv0?.user_verified ?? false;
  let emailNotFound: string | null = null;
  const code = m.text?.toUpperCase().match(CODE_RE)?.[0] ?? null;
  if (code) {
    const { data } = await supabase.from('support_link_codes').select('user_id')
      .eq('code', code).gte('expires_at', new Date().toISOString()).maybeSingle();
    if (data) {
      userId = (data as { user_id: string }).user_id; verified = true;
      await supabase.from('support_link_codes').update({ used_at: new Date().toISOString() } as never).eq('code', code);
    }
  }
  const email = m.text?.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  if (email && !verified) {
    const { data } = await supabase.from('charlotte_users').select('id').ilike('email', email).maybeSingle();
    if (data) userId = (data as { id: string }).id; else emailNotFound = email;
  }
  const contact = m.name ? `${m.name} (+${m.from})` : `+${m.from}`;
  const convId = await upsertConversation({ channel: 'whatsapp', externalId: m.from, contact, userId });
  if (userId && (userId !== conv0?.user_id || verified !== (conv0?.user_verified ?? false))) {
    await supabase.from('support_conversations').update({ user_id: userId, user_verified: verified } as never).eq('id', convId);
  }

  const text = m.text ?? `[${m.type}]`;
  const { error: dup } = await supabase.from('support_messages').insert({
    conversation_id: convId, direction: 'in', author: 'user', body: text.slice(0, 4000), external_id: m.id,
  } as never);
  if (dup) return; // outra execução já pegou esta mensagem

  // Atendente respondeu há pouco, ou é só um "obrigado"/emoji depois da despedida: só registra.
  if (m.text && await aiShouldStaySilent(convId, m.text)) return;
  // Chamado aberto e ainda sem atendente: a IA segue respondendo o que a FAQ cobre (o aluno não
  // espera horas por uma dúvida simples); o que ela não resolve continua na fila.
  const waitingHuman = conv0?.status === 'escalated';
  if (waitingHuman && !m.text) return;

  if (!m.text) {
    await reply(convId, m.from, NOT_TEXT, 'midia');
    return;
  }

  const { data: hist } = await supabase.from('support_messages').select('direction, body')
    .eq('conversation_id', convId).order('created_at', { ascending: false }).limit(9);
  const history: SupportTurn[] = ((hist ?? []) as { direction: string; body: string }[]).slice(1).reverse()
    .map(h => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }));

  // Dados da conta só para quem foi confirmado pelo app; e-mail digitado serve só para encaminhar.
  const full = userId ? await findUserContext(null, userId) : { identified: false } as SupportUserContext;
  const context: SupportUserContext = full.identified && !verified
    ? { identified: true, verified: false, userId: full.userId, email: full.email }
    : { ...full, verified, emailNotFound };
  // Primeira resposta do atendimento = nenhuma resposta nossa nas últimas 2 h (o atendimento
  // da IA encerra sozinho depois de 2 h sem resposta do aluno; ver closeIdleConversations).
  const { count: recentOut } = await supabase.from('support_messages').select('id', { count: 'exact', head: true })
    .eq('conversation_id', convId).eq('direction', 'out').gte('created_at', new Date(Date.now() - 2 * 3600000).toISOString());
  const decision = await runSupportAgent({
    userText: m.text.replace(CODE_TEXT_RE, '').trim() || m.text, history, context, channel: 'whatsapp',
    firstName: firstNameOf(context.name ?? m.name), firstReply: !recentOut,
  });

  if (decision.autoSend) {
    await reply(convId, m.from, decision.reply, decision.intent);
    // "Obrigado, resolveu": despedida e atendimento encerrado na hora (fecha também o chamado em espera).
    await setConversationStatus(convId, decision.intent === 'encerramento' ? 'closed' : 'auto_resolved');
    return;
  }
  // Já está na fila do atendente: não abre outro chamado nem repete o aviso.
  if (waitingHuman) return;
  // Pedido de e-mail ou do botão do app para identificar (sem caso para humano ainda): responde e segue com a IA.
  if (!decision.needsHuman && decision.reply && !verified && /e-?mail|Falar no WhatsApp/i.test(decision.reply)) {
    await reply(convId, m.from, decision.reply, decision.intent);
    return;
  }
  const { ticketCode } = await escalate({ conversationId: convId, contact, channel: 'whatsapp', intent: decision.intent, userText: m.text, reason: decision.reason, userContext: context });
  await reply(convId, m.from, ticketOpenedText(ticketCode, decision.lang), decision.intent);
}

/** Primeiro nome para o cumprimento: só a primeira palavra, só letras (o nome do perfil é texto livre). */
function firstNameOf(name: string | null | undefined): string | null {
  const w = (name ?? '').trim().split(/\s+/)[0] ?? '';
  const clean = w.replace(/[^\p{L}'-]/gu, '').slice(0, 20);
  return clean.length >= 2 ? clean.charAt(0).toUpperCase() + clean.slice(1) : null;
}

async function reply(convId: string, to: string, text: string, intent: string) {
  const r = await sendWhatsAppText(to, text);
  await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: r.ok ? text : `${text}\n\n[não enviado: ${r.error}]`, intent, autoSent: r.ok, externalId: r.id });
}
