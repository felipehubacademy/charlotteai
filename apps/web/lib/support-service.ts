// lib/support-service.ts
// Persistência + atribuição + escalonamento do suporte. Server-only (service role).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail as graphSendEmail } from '@/lib/microsoft-graph-email-service';
import { SupportUserContext } from '@/lib/support-agent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://charlotte.hubacademybr.com';

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
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: existingRaw } = await supabase
    .from('support_conversations').select('id')
    .eq('channel', args.channel).eq('external_id', args.externalId).maybeSingle();
  const existing = existingRaw as { id: string } | null;
  if (existing?.id) {
    await supabase.from('support_conversations')
      .update({ last_message_at: now, updated_at: now, status: 'open' }).eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from('support_conversations').insert({
    channel: args.channel, external_id: args.externalId, contact: args.contact,
    subject: args.subject ?? null, user_id: args.userId ?? null,
    status: 'open', last_message_at: now,
  }).select('id').single();
  if (error) throw new Error(`upsertConversation: ${error.message}`);
  return (data as { id: string }).id;
}

export async function logMessage(args: {
  conversationId: string; direction: 'in' | 'out'; author: 'user' | 'agent' | 'human';
  body: string; intent?: string; autoSent?: boolean; graphMessageId?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from('support_messages').insert({
    conversation_id: args.conversationId, direction: args.direction, author: args.author,
    body: args.body, intent: args.intent ?? null, auto_sent: args.autoSent ?? false,
    graph_message_id: args.graphMessageId ?? null,
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

// Escala: atribui atendente, notifica por email (WhatsApp entra depois) e marca a conversa.
export async function escalate(args: {
  conversationId: string; contact: string; channel: string; intent: string;
  userText: string; reason: string; userContext: SupportUserContext;
}): Promise<{ assignedTo: string | null }> {
  const agent = await pickAgent();
  await setConversationStatus(args.conversationId, 'escalated', agent?.id ?? null);

  const to = agent?.email || 'charlotte@hubacademybr.com';
  const quem = args.userContext.identified
    ? `${args.userContext.name ?? ''} (${args.userContext.email ?? args.contact}) · nível ${args.userContext.level ?? '—'} · assinatura ${args.userContext.subscription_status ?? '—'}`
    : `Não identificado (${args.contact})`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#16153A;">
      <h2>Novo caso de suporte (${args.channel})</h2>
      <p><strong>De:</strong> ${quem}</p>
      <p><strong>Intent:</strong> ${args.intent} &nbsp; <strong>Motivo:</strong> ${args.reason || '—'}</p>
      <p><strong>Mensagem:</strong></p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333;">${args.userText.replace(/</g, '&lt;')}</blockquote>
      <p><a href="${APP_URL}/admin/support">Abrir a fila de suporte no /admin</a></p>
      ${agent ? `<p style="color:#888;font-size:12px;">Atribuído a: ${agent.name}</p>` : '<p style="color:#c00;font-size:12px;">Nenhum atendente cadastrado — cadastre em /admin/support.</p>'}
    </div>`;
  await graphSendEmail({ to, subject: `[Suporte] ${args.intent} — ${args.contact}`, html });
  return { assignedTo: agent?.email ?? null };
}
