export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * app/api/admin/support/insights/route.ts
 * Painel de insights do suporte (análise das conversas com IA).
 * GET ?days=30                      resumo: categorias, assuntos, UX por tela, pedidos de função, sugestões de FAQ
 * POST { action: 'run' }           analisa agora as conversas pendentes (paradas há 1 h)
 * POST { action: 'faq', conversationId, decision: 'approve' | 'dismiss', section?, question?, answer? }
 *                                  aprova (entra na FAQ na hora) ou descarta a sugestão
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { analyzePendingConversations } from '@/lib/support-insights';
import { invalidateFaqCache } from '@/lib/support-faq';

interface Row {
  conversation_id: string; analyzed_at: string; category: string | null; topic: string | null; screen: string | null;
  sentiment: string | null; resolution: string | null; summary: string | null; faq_gap: boolean;
  faq_question: string | null; faq_answer: string | null; faq_status: string | null;
  ux_issue: string | null; feature_request: string | null;
  support_conversations: { channel: string; contact: string; last_message_at: string } | null;
}

const count = (rows: Row[], key: (r: Row) => string | null) => {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([k, n]) => ({ key: k, count: n })).sort((a, b) => b.count - a.count);
};

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || !can(admin.role, 'support')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days') ?? 30)));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const supabase = getSupabaseAdmin();

  const [{ data, error }, { count: totalConvs }, { data: pendingFaq }] = await Promise.all([
    supabase.from('support_insights')
      .select('conversation_id, analyzed_at, category, topic, screen, sentiment, resolution, summary, faq_gap, faq_question, faq_answer, faq_status, ux_issue, feature_request, support_conversations!inner(channel, contact, last_message_at)')
      .gte('support_conversations.last_message_at', since)
      .order('analyzed_at', { ascending: false }).limit(2000),
    supabase.from('support_conversations').select('id', { count: 'exact', head: true }).gte('last_message_at', since),
    // Sugestões pendentes aparecem sempre, mesmo fora do período.
    supabase.from('support_insights')
      .select('conversation_id, analyzed_at, topic, faq_question, faq_answer, support_conversations(channel, contact)')
      .eq('faq_status', 'pending').order('analyzed_at', { ascending: false }).limit(100),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as unknown as Row[];

  // Assuntos: agrupa pelo texto normalizado, com uma conversa de exemplo.
  const topics = new Map<string, { topic: string; count: number; category: string | null; lastAt: string; conversationId: string }>();
  for (const r of rows) {
    if (!r.topic) continue;
    const k = r.topic.toLowerCase();
    const t = topics.get(k);
    if (t) t.count++;
    else topics.set(k, { topic: r.topic, count: 1, category: r.category, lastAt: r.analyzed_at, conversationId: r.conversation_id });
  }

  // Problemas de UX agrupados por tela.
  const ux = new Map<string, { issue: string; conversationId: string; at: string }[]>();
  for (const r of rows) {
    if (!r.ux_issue) continue;
    const s = r.screen ?? 'outro';
    if (!ux.has(s)) ux.set(s, []);
    ux.get(s)!.push({ issue: r.ux_issue, conversationId: r.conversation_id, at: r.analyzed_at });
  }

  return NextResponse.json({
    days,
    totals: { conversations: totalConvs ?? 0, analyzed: rows.length },
    byCategory: count(rows, r => r.category),
    byResolution: count(rows, r => r.resolution),
    bySentiment: count(rows, r => r.sentiment),
    topics: [...topics.values()].sort((a, b) => b.count - a.count).slice(0, 30),
    uxByScreen: [...ux.entries()].map(([screen, items]) => ({ screen, items: items.slice(0, 20), count: items.length })).sort((a, b) => b.count - a.count),
    featureRequests: rows.filter(r => r.feature_request).slice(0, 50).map(r => ({ text: r.feature_request, conversationId: r.conversation_id, at: r.analyzed_at })),
    faqSuggestions: ((pendingFaq ?? []) as any[]).map(r => ({
      conversationId: r.conversation_id, at: r.analyzed_at, topic: r.topic, question: r.faq_question, answer: r.faq_answer,
      contact: r.support_conversations?.contact ?? null, channel: r.support_conversations?.channel ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || !can(admin.role, 'support')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  if (body.action === 'run') {
    const r = await analyzePendingConversations(40, 100_000);
    return NextResponse.json({ ok: true, ...r });
  }

  if (body.action === 'faq') {
    const id = String(body.conversationId ?? '');
    if (!id) return NextResponse.json({ error: 'conversationId obrigatório' }, { status: 400 });
    if (body.decision === 'dismiss') {
      await supabase.from('support_insights').update({ faq_status: 'dismissed' } as never).eq('conversation_id', id);
      await audit(admin, 'support_faq_dismiss', 'support_insights', id);
      return NextResponse.json({ ok: true });
    }
    if (body.decision === 'approve') {
      const question = String(body.question ?? '').trim();
      const answer = String(body.answer ?? '').trim();
      const section = String(body.section ?? '').trim() || 'Geral';
      if (!question || !answer) return NextResponse.json({ error: 'Pergunta e resposta são obrigatórias.' }, { status: 400 });
      // Entra no fim da própria seção (seção nova vai para o fim da FAQ).
      const { data: last } = await supabase.from('support_faq').select('sort').eq('section', section).order('sort', { ascending: false }).limit(1);
      const { data: max } = await supabase.from('support_faq').select('sort').order('sort', { ascending: false }).limit(1);
      const sort = last?.[0] ? (last[0] as { sort: number }).sort + 1 : ((max?.[0] as { sort: number } | undefined)?.sort ?? 0) + 10;
      const { error } = await supabase.from('support_faq').insert({
        section, question, answer, sort, source: 'suggestion', updated_by: admin.email ?? admin.name,
      } as never);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabase.from('support_insights').update({ faq_status: 'approved', faq_question: question, faq_answer: answer } as never).eq('conversation_id', id);
      invalidateFaqCache();
      await audit(admin, 'support_faq_approve', 'support_insights', id, { section, question });
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
