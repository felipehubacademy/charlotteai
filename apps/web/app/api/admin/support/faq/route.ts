export const dynamic = 'force-dynamic';

/**
 * app/api/admin/support/faq/route.ts
 * FAQ que a IA do suporte consulta (tabela support_faq). Mudanças valem em até 1 min.
 * GET                                  lista tudo (ativas e desligadas)
 * POST { action: 'save', id?, section, question, answer, sort?, is_active?, show_in_app? }  cria ou edita
 *                                    (se aparece no app, gera a versão em inglês quando o texto muda)
 * POST { action: 'delete', id }        apaga
 * POST { action: 'seed' }              carrega a FAQ padrão (só se a tabela estiver vazia)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SUPPORT_FAQ_SEED, invalidateFaqCache } from '@/lib/support-faq';
import { translateFaqToEnglish } from '@/lib/support-faq-translate';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || !can(admin.role, 'support')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from('support_faq')
    .select('id, section, question, answer, sort, is_active, show_in_app, question_en, answer_en, source, updated_by, updated_at')
    .order('sort', { ascending: true }).order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || !can(admin.role, 'support')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  const who = admin.email ?? admin.name;

  if (body.action === 'seed') {
    const { count } = await supabase.from('support_faq').select('id', { count: 'exact', head: true });
    if (count) return NextResponse.json({ error: 'A FAQ já tem perguntas.' }, { status: 409 });
    const rows = SUPPORT_FAQ_SEED.map((e, i) => ({ ...e, sort: (i + 1) * 10, source: 'seed', updated_by: who }));
    const { error } = await supabase.from('support_faq').insert(rows as never);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateFaqCache();
    await audit(admin, 'support_faq_seed', 'support_faq', null, { count: rows.length });
    return NextResponse.json({ ok: true, inserted: rows.length });
  }

  if (body.action === 'delete') {
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const { error } = await supabase.from('support_faq').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateFaqCache();
    await audit(admin, 'support_faq_delete', 'support_faq', id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'save') {
    const section = String(body.section ?? '').trim() || 'Geral';
    const question = String(body.question ?? '').trim();
    const answer = String(body.answer ?? '').trim();
    if (!question || !answer) return NextResponse.json({ error: 'Pergunta e resposta são obrigatórias.' }, { status: 400 });
    const row: Record<string, unknown> = {
      section, question, answer, updated_by: who, updated_at: new Date().toISOString(),
      is_active: body.is_active !== false,
    };
    if (body.sort != null && Number.isFinite(Number(body.sort))) row.sort = Number(body.sort);
    else if (!body.id) {
      // Pergunta nova entra no fim da própria seção (seção nova vai para o fim da FAQ).
      const { data: last } = await supabase.from('support_faq').select('sort').eq('section', section).order('sort', { ascending: false }).limit(1);
      const { data: max } = await supabase.from('support_faq').select('sort').order('sort', { ascending: false }).limit(1);
      row.sort = last?.[0] ? (last[0] as { sort: number }).sort + 1 : ((max?.[0] as { sort: number } | undefined)?.sort ?? 0) + 10;
    }
    const { data: prev } = body.id
      ? await supabase.from('support_faq').select('section, question, answer, question_en, show_in_app').eq('id', String(body.id)).maybeSingle()
      : { data: null };
    const p = prev as { section: string; question: string; answer: string; question_en: string | null; show_in_app: boolean } | null;
    const inApp = body.show_in_app !== undefined ? body.show_in_app === true : (p?.show_in_app ?? false);
    row.show_in_app = inApp;
    // Aparece no app: gera o inglês se o texto mudou (ou ainda não existe).
    if (inApp) {
      if (!p || !p.question_en || p.section !== section || p.question !== question || p.answer !== answer) {
        const tr = await translateFaqToEnglish({ section, question, answer });
        if (tr) { row.section_en = tr.section; row.question_en = tr.question; row.answer_en = tr.answer; }
      }
    }
    const q = body.id
      ? supabase.from('support_faq').update(row as never).eq('id', String(body.id)).select('id').single()
      : supabase.from('support_faq').insert({ ...row, source: 'manual' } as never).select('id').single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateFaqCache();
    await audit(admin, body.id ? 'support_faq_update' : 'support_faq_create', 'support_faq', (data as { id: string }).id, { section, question });
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
