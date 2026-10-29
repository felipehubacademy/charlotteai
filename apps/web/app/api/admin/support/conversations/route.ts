export const dynamic = 'force-dynamic';

/**
 * app/api/admin/support/conversations/route.ts
 * Fila de conversas de suporte. Auth por x-admin-secret.
 * GET ?status=open|escalated|auto_resolved|closed (opcional)
 * GET ?id=                                 conversa completa + aluno
 * POST { id, action: 'reply', body, close } responde (e-mail, WhatsApp ou chat do app + push) e registra
 * POST { id, action: 'status', status }    muda o status
 * POST { id, action: 'take' }              assume o atendimento (avisa o aluno com o nome do atendente)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { sendInstagramText } from '@/lib/instagram';
import { logMessage, setConversationStatus, supportReplyHtml, ticketTakenText } from '@/lib/support-service';
import { notifyAppReply } from '@/lib/support-app';
import { guessLang } from '@/lib/support-agent';

// Login próprio (Bearer) com papel que acessa 'support', ou a senha mestra antiga.
async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'support');
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = req.nextUrl.searchParams.get('status') ?? '';
  const supabase = getSupabaseAdmin();
  const convId = req.nextUrl.searchParams.get('id');
  if (convId) return conversationDetail(convId);

  let q = supabase
    .from('support_conversations')
    .select('id, channel, external_id, contact, subject, status, assigned_agent_id, ticket_code, taken_by, created_at, last_message_at, support_agents(name)')
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
    ticketCode: c.ticket_code ?? null,
    takenBy: c.taken_by ?? null,
    createdAt: c.created_at,
    lastMessageAt: c.last_message_at,
    last: lastByConv.get(c.id) ?? null,
  }));

  return NextResponse.json({ conversations, counts });
}

async function conversationDetail(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: conv } = await supabase.from('support_conversations')
    .select('id, channel, contact, subject, status, user_id, user_verified, ticket_code, taken_by, created_at, last_message_at, last_inbound_at, support_agents(name)').eq('id', id).maybeSingle();
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  const c = conv as any;
  const [{ data: msgs }, userR] = await Promise.all([
    supabase.from('support_messages').select('id, direction, author, author_name, body, intent, auto_sent, created_at').eq('conversation_id', id).order('created_at').limit(500),
    c.user_id
      ? supabase.from('charlotte_users').select('id, name, username, email, charlotte_level, subscription_status, is_institutional').eq('id', c.user_id).maybeSingle()
      : supabase.from('charlotte_users').select('id, name, username, email, charlotte_level, subscription_status, is_institutional').ilike('email', c.contact).maybeSingle(),
  ]);
  return NextResponse.json({
    conversation: { id: c.id, channel: c.channel, contact: c.contact, subject: c.subject, status: c.status, agentName: c.support_agents?.name ?? null, createdAt: c.created_at, lastMessageAt: c.last_message_at, lastInboundAt: c.last_inbound_at,
      // E-mail é o próprio remetente; no WhatsApp, só o código do app confirma.
      userVerified: c.channel === 'email' ? true : !!c.user_verified,
      ticketCode: c.ticket_code ?? null, takenBy: c.taken_by ?? null },
    messages: msgs ?? [],
    user: userR.data ?? null,
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || !can(admin.role, 'support')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const supabase = getSupabaseAdmin();
  const { data: conv } = await supabase.from('support_conversations').select('id, channel, contact, subject, external_id, status, ticket_code, taken_by').eq('id', id).maybeSingle();
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  const c = conv as { id: string; channel: string; contact: string; subject: string | null; external_id: string; status: string; ticket_code: string | null; taken_by: string | null };
  const firstName = !admin.legacy && admin.name ? admin.name.trim().split(/\s+/)[0] : null;

  // Assume o atendimento: registra quem é e avisa o aluno pelo canal dele.
  const take = async (): Promise<string | null> => {
    if (!firstName) return 'Entre com o seu login de atendente (não a senha mestra) para assumir com o seu nome.';
    // No idioma em que o aluno escreveu por último.
    const { data: lastIn } = await supabase.from('support_messages').select('body').eq('conversation_id', c.id)
      .eq('direction', 'in').order('created_at', { ascending: false }).limit(1);
    const text = ticketTakenText(firstName, c.ticket_code, guessLang(String((lastIn?.[0] as { body?: string } | undefined)?.body ?? '')));
    if (c.channel === 'whatsapp') {
      const r = await sendWhatsAppText(c.external_id, text);
      if (!r.ok) return `Não foi possível avisar pelo WhatsApp: ${r.error}`;
    } else if (c.channel === 'instagram') {
      const r = await sendInstagramText(c.external_id, text);
      if (!r.ok) return `Não foi possível avisar pelo Instagram: ${r.error}`;
    }
    const { data: ag } = admin.email ? await supabase.from('support_agents').select('id').ilike('email', admin.email).maybeSingle() : { data: null };
    await supabase.from('support_conversations').update({
      taken_by: firstName, taken_at: new Date().toISOString(), status: 'escalated',
      ...(ag ? { assigned_agent_id: (ag as { id: string }).id } : {}),
    } as never).eq('id', c.id);
    await logMessage({ conversationId: c.id, direction: 'out', author: 'system', body: text, authorName: firstName });
    c.taken_by = firstName;
    return null;
  };

  if (body.action === 'take') {
    const e = await take();
    if (e) return NextResponse.json({ error: e }, { status: 400 });
    await audit(admin, 'support.take', 'support_conversation', c.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'reply') {
    const text = String(body.body ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Escreva a resposta.' }, { status: 400 });
    // Primeira resposta de um atendente: assume antes (o aluno vê quem está respondendo).
    if (!c.taken_by && firstName && c.channel !== 'email') { const e = await take(); if (e) return NextResponse.json({ error: e }, { status: 502 }); }
    if (c.channel === 'whatsapp') {
      const r = await sendWhatsAppText(c.external_id, text);
      if (!r.ok) return NextResponse.json({ error: `Não foi possível enviar pelo WhatsApp: ${r.error}` }, { status: 502 });
    } else if (c.channel === 'instagram') {
      const r = await sendInstagramText(c.external_id, text);
      if (!r.ok) return NextResponse.json({ error: `Não foi possível enviar pelo Instagram: ${r.error}` }, { status: 502 });
    } else if (c.channel === 'email') {
      const subject = c.subject ? (/^re:/i.test(c.subject) ? c.subject : `Re: ${c.subject}`) : 'Queizy — Suporte';
      const ok = await sendEmail({ to: c.contact, subject, html: supportReplyHtml(text) });
      if (!ok) return NextResponse.json({ error: 'Não foi possível enviar o e-mail.' }, { status: 502 });
    } else if (c.channel !== 'app') {
      return NextResponse.json({ error: 'Canal sem resposta pelo /admin.' }, { status: 400 });
    }
    await logMessage({ conversationId: c.id, direction: 'out', author: 'human', body: text, authorName: firstName });
    // Chat do app: a resposta já aparece na conversa; o push avisa o aluno.
    if (c.channel === 'app') await notifyAppReply(c.external_id, text);
    await supabase.from('support_conversations').update({ last_message_at: new Date().toISOString() } as never).eq('id', c.id);
    // Respondido pelo atendente: o ticket segue com ele (a IA não entra) até ser encerrado.
    await setConversationStatus(c.id, body.close ? 'closed' : 'escalated');
    await audit(admin, 'support.reply', 'support_conversation', c.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'status') {
    const st = String(body.status ?? '');
    if (!['open', 'escalated', 'auto_resolved', 'closed'].includes(st)) return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    await setConversationStatus(c.id, st);
    await audit(admin, 'support.status', 'support_conversation', c.id, { status: st });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
}
