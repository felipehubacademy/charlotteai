// lib/support-service.ts
import { base as emailBase, p as emailP, note as emailNote } from '@/lib/email-brand';
// Persistência + atribuição + escalonamento do suporte. Server-only (service role).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail as graphSendEmail } from '@/lib/microsoft-graph-email-service';
import { SupportUserContext } from '@/lib/support-agent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://queizy.com';

/** Início do mês em Brasília (AAAA-MM-01), igual ao reset do Live Voice no app. */
function brtMonthStart(): string {
  const d = new Date(Date.now() - 3 * 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** Contexto do aluno para o agente: pelo e-mail do contato ou pelo id já ligado à conversa. */
export async function findUserContext(email?: string | null, userId?: string | null): Promise<SupportUserContext> {
  if (!email && !userId) return { identified: false };
  const supabase = getSupabaseAdmin();
  const cols = 'id, name, email, charlotte_level, subscription_status, is_institutional, app_platform, app_version, live_voice_seconds_used, live_voice_reset_date, live_voice_bonus_seconds';
  const q = supabase.from('charlotte_users').select(cols);
  const { data } = userId ? await q.eq('id', userId).maybeSingle() : await q.eq('email', email!.toLowerCase()).maybeSingle();
  const u = data as {
    id: string; name: string | null; email: string; charlotte_level: string | null; subscription_status: string | null;
    is_institutional: boolean | null; app_platform: string | null; app_version: string | null;
    live_voice_seconds_used: number | null; live_voice_reset_date: string | null; live_voice_bonus_seconds: number | null;
  } | null;
  if (!u) return { identified: false, email: email ?? null };
  const { data: prog } = await supabase.from('charlotte_progress').select('total_xp, streak_days').eq('user_id', u.id).maybeSingle();
  const p = prog as { total_xp: number | null; streak_days: number | null } | null;
  // Mesma regra do app (lib/liveVoiceUsage.ts): 20 min Premium/institucional, 5 min no resto; bônus não vence.
  const pool = u.subscription_status === 'active' || u.is_institutional ? 1200 : 300;
  const used = !u.live_voice_reset_date || u.live_voice_reset_date < brtMonthStart() ? 0 : (u.live_voice_seconds_used ?? 0);
  const left = Math.max(0, pool - used) + (u.live_voice_bonus_seconds ?? 0);
  return {
    identified: true, userId: u.id,
    name: u.name, email: u.email, level: u.charlotte_level,
    subscription_status: u.subscription_status,
    has_access: !!u.is_institutional || ['active', 'trial', 'cancelled'].includes(u.subscription_status ?? ''),
    totalXP: p?.total_xp ?? 0, streakDays: p?.streak_days ?? 0,
    liveVoiceMinutesLeft: Math.floor(left / 60),
    platform: u.app_platform, appVersion: u.app_version,
  };
}

export async function isMessageProcessed(graphMessageId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from('support_messages')
    .select('id', { count: 'exact', head: true })
    .eq('graph_message_id', graphMessageId);
  return (count ?? 0) > 0;
}

export async function upsertConversation(args: {
  channel: string; externalId: string; contact: string; subject?: string; userId?: string | null;
}): Promise<string> {
  // Mensagem nova do aluno. Ticket com atendente (escalated) continua com o atendente;
  // conversa encerrada ou resolvida pela IA reabre para a IA.
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: existingRaw } = await supabase
    .from('support_conversations').select('id, status, user_id')
    .eq('channel', args.channel).eq('external_id', args.externalId).maybeSingle();
  const existing = existingRaw as { id: string; status: string; user_id: string | null } | null;
  if (existing?.id) {
    const patch: Record<string, unknown> = { last_message_at: now, last_inbound_at: now, updated_at: now };
    if (existing.status !== 'escalated') patch.status = 'open';
    if (!existing.user_id && args.userId) patch.user_id = args.userId;
    await supabase.from('support_conversations').update(patch).eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from('support_conversations').insert({
    channel: args.channel, external_id: args.externalId, contact: args.contact,
    subject: args.subject ?? null, user_id: args.userId ?? null,
    status: 'open', last_message_at: now, last_inbound_at: now,
  }).select('id').single();
  if (error) throw new Error(`upsertConversation: ${error.message}`);
  return (data as { id: string }).id;
}

export async function logMessage(args: {
  conversationId: string; direction: 'in' | 'out'; author: 'user' | 'agent' | 'human' | 'system';
  body: string; intent?: string; autoSent?: boolean; graphMessageId?: string; externalId?: string; authorName?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from('support_messages').insert({
    conversation_id: args.conversationId, direction: args.direction, author: args.author,
    body: args.body, intent: args.intent ?? null, auto_sent: args.autoSent ?? false,
    graph_message_id: args.graphMessageId ?? null, external_id: args.externalId ?? null,
    author_name: args.authorName ?? null,
  });
}

export async function setConversationStatus(id: string, status: string, agentId?: string | null): Promise<void> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (agentId !== undefined) patch.assigned_agent_id = agentId;
  await supabase.from('support_conversations').update(patch).eq('id', id);
}

interface Agent { id: string; name: string; email: string | null; whatsapp: string | null; }

// Atribuicao balanceada: entre os atendentes ativos, escolhe o com menos casos
// escalados abertos. Retorna null se nao houver atendente cadastrado.
export async function pickAgent(): Promise<Agent | null> {
  const supabase = getSupabaseAdmin();
  const { data: agents } = await supabase
    .from('support_agents').select('id, name, email, whatsapp').eq('is_active', true);
  const list = (agents ?? []) as Agent[];
  if (!list.length) return null;
  const { data: convs } = await supabase
    .from('support_conversations').select('assigned_agent_id').eq('status', 'escalated');
  const load = new Map<string, number>();
  for (const c of (convs ?? []) as { assigned_agent_id: string | null }[]) {
    if (c.assigned_agent_id) load.set(c.assigned_agent_id, (load.get(c.assigned_agent_id) ?? 0) + 1);
  }
  return list.slice().sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0];
}

// Escala: vira ticket na fila do /admin, atribuído ao atendente com menos casos.
// Sem e-mail na hora: o aviso só sai se ninguém responder (ver notifyStaleTickets).
export async function escalate(args: {
  conversationId: string; contact: string; channel: string; intent: string;
  userText: string; reason: string; userContext: SupportUserContext;
}): Promise<{ assignedTo: string | null; ticketCode: string }> {
  const agent = await pickAgent();
  await setConversationStatus(args.conversationId, 'escalated', agent?.id ?? null);
  // Número do chamado (novo a cada escalonamento) para o aluno citar; ninguém assumiu ainda.
  const ticketCode = newTicketCode();
  await getSupabaseAdmin().from('support_conversations')
    .update({ sla_notified_at: null, ticket_code: ticketCode, taken_by: null, taken_at: null } as never).eq('id', args.conversationId);
  return { assignedTo: agent?.email ?? null, ticketCode };
}

const TICKET_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sem 0/O, 1/I/L
export function newTicketCode(): string {
  return Array.from({ length: 4 }, () => TICKET_ALPHABET[Math.floor(Math.random() * TICKET_ALPHABET.length)]).join('');
}

/** Texto do aviso de abertura do chamado (WhatsApp e chat do app). */
export function ticketOpenedText(code: string, lang: 'pt' | 'en' = 'pt'): string {
  return lang === 'en'
    ? `I opened ticket #${code} with our team. As soon as someone replies, you'll get the answer here.`
    : `Abri o chamado #${code} para a nossa equipe. Assim que alguém responder, a resposta chega por aqui.`;
}

/** Aviso de quem assumiu o atendimento (mostrado ao aluno). */
export function ticketTakenText(name: string, code: string | null, lang: 'pt' | 'en' = 'pt'): string {
  return lang === 'en'
    ? `${name}, from the Queizy team, took over your case${code ? ` #${code}` : ''}.`
    : `${name}, da equipe Queizy, assumiu o seu atendimento${code ? ` (chamado #${code})` : ''}.`;
}

const SLA_HOURS = 2;

/** Hora atual em Brasília (0–23) e dia da semana (0 = domingo). */
function brtNow() {
  const d = new Date(Date.now() - 3 * 3600000);
  return { hour: d.getUTCHours(), dow: d.getUTCDay() };
}

/**
 * Último recurso: ticket escalado sem resposta do atendente há mais de 2 h → e-mail
 * para o atendente (ou para a caixa da equipe). Só em horário comercial (seg–sáb, 8h–20h);
 * fora disso espera. Um aviso por mensagem nova do aluno.
 */
export async function notifyStaleTickets(): Promise<{ notified: number }> {
  const { hour, dow } = brtNow();
  if (dow === 0 || hour < 8 || hour >= 20) return { notified: 0 };
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - SLA_HOURS * 3600000).toISOString();
  const { data } = await supabase.from('support_conversations')
    .select('id, channel, contact, subject, last_inbound_at, sla_notified_at, user_id, support_agents(name, email)')
    .eq('status', 'escalated').lte('last_inbound_at', cutoff).limit(50);
  let notified = 0;
  for (const c of (data ?? []) as any[]) {
    if (c.sla_notified_at && c.sla_notified_at >= c.last_inbound_at) continue;
    // Atendente já respondeu depois da última mensagem do aluno?
    const { data: human } = await supabase.from('support_messages').select('id')
      .eq('conversation_id', c.id).eq('author', 'human').gte('created_at', c.last_inbound_at).limit(1);
    if (human?.length) continue;
    const { data: lastIn } = await supabase.from('support_messages').select('body')
      .eq('conversation_id', c.id).eq('direction', 'in').order('created_at', { ascending: false }).limit(1);
    const to = c.support_agents?.email || 'suporte@queizy.com';
    const horas = Math.round((Date.now() - new Date(c.last_inbound_at).getTime()) / 3600000);
    const html = `
      <div style="font-family:Arial,sans-serif;color:#16131F;">
        <h2>Ticket sem resposta há ${horas} h (${c.channel === 'whatsapp' ? 'WhatsApp' : 'e-mail'})</h2>
        <p><strong>Aluno:</strong> ${c.contact}${c.subject ? ` · ${c.subject}` : ''}</p>
        <p><strong>Última mensagem:</strong></p>
        <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333;">${String(lastIn?.[0]?.body ?? '').replace(/</g, '&lt;').slice(0, 1200)}</blockquote>
        <p><a href="${APP_URL}/admin/support">Responder no /admin</a></p>
        ${c.channel === 'whatsapp' ? '<p style="color:#888;font-size:12px;">No WhatsApp, só dá para responder livremente até 24 h depois da última mensagem do aluno.</p>' : ''}
      </div>`;
    const ok = await graphSendEmail({ to, subject: `[Suporte] Sem resposta há ${horas} h — ${c.contact}`, html });
    if (ok) {
      await supabase.from('support_conversations').update({ sla_notified_at: new Date().toISOString() } as never).eq('id', c.id);
      notified++;
    }
  }
  return { notified };
}

/**
 * Encerra em silêncio (sem mensagem ao aluno) os atendimentos parados:
 * - da IA (resolvida ou aberta): 2 h sem resposta do aluno;
 * - com atendente: 24 h depois da última resposta do atendente sem retorno do aluno
 *   (é também quando o WhatsApp deixa de permitir resposta livre).
 * Se o aluno escrever depois, upsertConversation reabre como atendimento novo.
 */
export async function closeIdleConversations(): Promise<{ closed: number }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const aiCutoff = new Date(Date.now() - 2 * 3600000).toISOString();
  const { data: ai } = await supabase.from('support_conversations')
    .update({ status: 'closed', updated_at: now } as never)
    .in('status', ['auto_resolved', 'open']).lte('last_message_at', aiCutoff).select('id');
  let closed = (ai ?? []).length;

  const humanCutoff = new Date(Date.now() - 24 * 3600000).toISOString();
  const { data: esc } = await supabase.from('support_conversations').select('id')
    .eq('status', 'escalated').lte('last_message_at', humanCutoff).limit(200);
  for (const c of (esc ?? []) as { id: string }[]) {
    const { data: last } = await supabase.from('support_messages').select('author')
      .eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1);
    if ((last?.[0] as { author: string } | undefined)?.author !== 'human') continue; // aluno esperando: segue na fila
    await supabase.from('support_conversations').update({ status: 'closed', updated_at: now } as never).eq('id', c.id);
    closed++;
  }
  return { closed };
}

/** Corpo HTML das respostas por e-mail do suporte (agente e atendente). */
export function supportReplyHtml(text: string): string {
  // Mesmo visual de todos os e-mails do Queizy (lib/email-brand), com o texto alinhado à esquerda.
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  return emailBase(`${emailP(safe, false)}${emailNote('Equipe Queizy · Hub Academy Ltda. É só responder este e-mail para continuar a conversa.')}`);
}
