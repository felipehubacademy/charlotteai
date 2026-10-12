// lib/support-app.ts — chat do Suporte Queizy dentro do app (não usa a Charlotte, que é a tutora).
// Mesmo cérebro do WhatsApp: IA responde pela FAQ, o que ela não resolve vira ticket no
// /admin e o atendente responde pelo /admin (a resposta aparece no chat + push).
// O aluno está logado, então é sempre identificado e confirmado.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runSupportAgent, type SupportTurn } from '@/lib/support-agent';
import { findUserContext, upsertConversation, logMessage, setConversationStatus, escalate } from '@/lib/support-service';
import { sendDirectPush } from '@/lib/rally';

const HOLDING_PT = 'Vou passar o seu caso para alguém da equipe. Assim que responderem, você recebe um aviso e a resposta aparece aqui.';
const HOLDING_EN = "I'll pass your case to someone on the team. As soon as they reply, you'll get a notification and the answer will show up here.";
const WAITING_PT = 'Recebido! A equipe já está com o seu caso e responde por aqui.';
const WAITING_EN = 'Got it! The team already has your case and will reply here.';

export interface AppChatMessage { id: string; author: 'user' | 'agent' | 'human'; body: string; created_at: string }

async function appConversation(userId: string) {
  const { data } = await getSupabaseAdmin().from('support_conversations').select('id, status')
    .eq('channel', 'app').eq('external_id', userId).maybeSingle();
  return data as { id: string; status: string } | null;
}

/** Histórico do chat do aluno (últimas 100 mensagens) e a situação do atendimento. */
export async function getAppChat(userId: string): Promise<{ status: string | null; messages: AppChatMessage[] }> {
  const conv = await appConversation(userId);
  if (!conv) return { status: null, messages: [] };
  const { data } = await getSupabaseAdmin().from('support_messages').select('id, author, body, created_at')
    .eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(100);
  return { status: conv.status, messages: ((data ?? []) as AppChatMessage[]).reverse() };
}

/** Mensagem do aluno no chat: registra, responde pela IA ou escala. Devolve o chat atualizado. */
export async function handleAppMessage(userId: string, rawText: string, lang: 'pt' | 'en') {
  const text = rawText.trim().slice(0, 2000);
  if (!text) return getAppChat(userId);
  const supabase = getSupabaseAdmin();
  const before = await appConversation(userId);
  const context = { ...(await findUserContext(null, userId)), verified: true };
  const contact = context.name ? `${context.name} (${context.email ?? 'app'})` : (context.email ?? 'Aluno no app');
  const convId = await upsertConversation({ channel: 'app', externalId: userId, contact, userId });
  await supabase.from('support_conversations').update({ user_verified: true } as never).eq('id', convId);
  await logMessage({ conversationId: convId, direction: 'in', author: 'user', body: text });

  // Atendente cuidando: só confirma o recebimento (uma vez por rodada) e segue na fila.
  if (before?.status === 'escalated') {
    const { data: last } = await supabase.from('support_messages').select('author, body')
      .eq('conversation_id', convId).eq('direction', 'out').order('created_at', { ascending: false }).limit(1);
    const l = last?.[0] as { author: string; body: string } | undefined;
    const waiting = lang === 'en' ? WAITING_EN : WAITING_PT;
    if (l?.author !== 'human' && l?.body !== waiting) await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: waiting, autoSent: true });
    return getAppChat(userId);
  }

  const { data: hist } = await supabase.from('support_messages').select('direction, body')
    .eq('conversation_id', convId).order('created_at', { ascending: false }).limit(9);
  const history: SupportTurn[] = ((hist ?? []) as { direction: string; body: string }[]).slice(1).reverse()
    .map(h => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }));
  const { count: recentOut } = await supabase.from('support_messages').select('id', { count: 'exact', head: true })
    .eq('conversation_id', convId).eq('direction', 'out').gte('created_at', new Date(Date.now() - 2 * 3600000).toISOString());

  const decision = await runSupportAgent({
    userText: text, history, context, channel: 'app', lang,
    firstName: (context.name ?? '').trim().split(/\s+/)[0] || null, firstReply: !recentOut,
  });

  // Mesmo critério do WhatsApp: resposta automática só para os assuntos liberados; o resto vira ticket.
  if (decision.autoSend) {
    await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: decision.reply, intent: decision.intent, autoSent: true });
    await setConversationStatus(convId, decision.intent === 'encerramento' ? 'closed' : 'auto_resolved');
  } else {
    await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: lang === 'en' ? HOLDING_EN : HOLDING_PT, intent: decision.intent, autoSent: true });
    await escalate({ conversationId: convId, contact, channel: 'app', intent: decision.intent, userText: text, reason: decision.reason, userContext: context });
  }
  return getAppChat(userId);
}

/** Resposta do atendente (pelo /admin) chega no chat do app: avisa o aluno por push. */
export async function notifyAppReply(userId: string, body: string): Promise<{ pushed: boolean }> {
  const { data } = await getSupabaseAdmin().from('charlotte_users').select('expo_push_token, app_language').eq('id', userId).maybeSingle();
  const u = data as { expo_push_token: string | null; app_language: string | null } | null;
  if (!u?.expo_push_token) return { pushed: false };
  const en = (u.app_language ?? '').toLowerCase().startsWith('en');
  await sendDirectPush(u.expo_push_token,
    en ? 'Queizy team replied' : 'A equipe do Queizy respondeu',
    body.length > 120 ? `${body.slice(0, 117)}…` : body,
    { type: 'support_reply' });
  return { pushed: true };
}
