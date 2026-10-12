// lib/support-service.ts
// Persistência + atribuição + escalonamento do suporte. Server-only (service role).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail as graphSendEmail } from '@/lib/microsoft-graph-email-service';
import { SupportUserContext } from '@/lib/support-agent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://queizy.com';

export async function findUserContext(email?: string | null): Promise<SupportUserContext> {
  if (!email) return { identified: false };
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('charlotte_users')
    .select('name, email, charlotte_level, subscription_status')
    .eq('email', email.toLowerCase()).maybeSingle();
  const u = data as { name: string | null; email: string; charlotte_level: string | null; subscription_status: string | null } | null;
  if (!u) return { identified: false, email };
  return {
    identified: true,
    name: u.name, email: u.email, level: u.charlotte_level,
    subscription_status: u.subscription_status,
    has_access: ['active', 'trial', 'cancelled'].includes(u.subscription_status ?? ''),
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
  conversationId: string; direction: 'in' | 'out'; author: 'user' | 'agent' | 'human';
  body: string; intent?: string; autoSent?: boolean; graphMessageId?: string; externalId?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from('support_messages').insert({
    conversation_id: args.conversationId, direction: args.direction, author: args.author,
    body: args.body, intent: args.intent ?? null, auto_sent: args.autoSent ?? false,
    graph_message_id: args.graphMessageId ?? null, external_id: args.externalId ?? null,
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
}): Promise<{ assignedTo: string | null }> {
  const agent = await pickAgent();
  await setConversationStatus(args.conversationId, 'escalated', agent?.id ?? null);
  await getSupabaseAdmin().from('support_conversations').update({ sla_notified_at: null } as never).eq('id', args.conversationId);
  return { assignedTo: agent?.email ?? null };
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

/** Corpo HTML das respostas por e-mail do suporte (agente e atendente). */
export function supportReplyHtml(text: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  return `<div style="font-family:-apple-system,Arial,sans-serif;color:#1d1d1f;font-size:15px;line-height:1.6;">${safe}
    <p style="margin-top:20px;color:#86868b;font-size:12px;">Equipe Queizy — Hub Academy Ltda</p></div>`;
}
