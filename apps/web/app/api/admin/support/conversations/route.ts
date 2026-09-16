export const dynamic = 'force-dynamic';

/**
 * app/api/admin/support/conversations/route.ts
 * Fila de conversas de suporte. Auth por x-admin-secret.
 * GET ?status=open|escalated|auto_resolved|closed (opcional)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';
function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = req.nextUrl.searchParams.get('status') ?? '';
  const supabase = getSupabaseAdmin();

  let q = supabase
    .from('support_conversations')
    .select('id, channel, external_id, contact, subject, status, assigned_agent_id, created_at, last_message_at, support_agents(name)')
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data: convs, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (convs ?? []) as any[];
  const ids = rows.map(c => c.id);

  // Última mensagem de cada conversa (mapeia em memória)
  const lastByConv = new Map<string, { body: string; direction: string; intent: string | null }>();
  if (ids.length) {
    const { data: msgs } = await supabase
      .from('support_messages')
      .select('conversation_id, body, direction, intent, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(400);
    for (const m of (msgs ?? []) as any[]) {
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, { body: m.body, direction: m.direction, intent: m.intent });
      }
    }
  }

  // contadores por status
  const { data: allStatus } = await supabase.from('support_conversations').select('status');
  const counts: Record<string, number> = {};
  for (const r of (allStatus ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const conversations = rows.map(c => ({
    id: c.id,
    channel: c.channel,
    contact: c.contact,
    subject: c.subject,
    status: c.status,
    agentName: c.support_agents?.name ?? null,
    createdAt: c.created_at,
    lastMessageAt: c.last_message_at,
    last: lastByConv.get(c.id) ?? null,
  }));

  return NextResponse.json({ conversations, counts });
}
