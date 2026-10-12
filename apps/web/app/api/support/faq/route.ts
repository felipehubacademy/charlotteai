/**
 * app/api/support/faq/route.ts — FAQ pública do suporte (sem login).
 * GET ?lang=pt|en            perguntas marcadas "Mostrar no app" (tela Ajuda e suporte do app)
 * GET ?scope=all             toda a FAQ ativa em português (usada pelo check do GitHub Actions
 *                            que confere se os rótulos citados ainda existem no app)
 * Cache de 5 min na CDN.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const all = p.get('scope') === 'all';
  const en = !all && p.get('lang') === 'en';
  let q = getSupabaseAdmin().from('support_faq')
    .select('section, question, answer, section_en, question_en, answer_en')
    .eq('is_active', true).order('sort', { ascending: true }).order('created_at', { ascending: true });
  if (!all) q = q.eq('show_in_app', true);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'indisponível' }, { status: 503 });
  type Row = { section: string; question: string; answer: string; section_en: string | null; question_en: string | null; answer_en: string | null };
  const entries = ((data ?? []) as Row[])
    // Em inglês, pergunta sem tradução ainda fica de fora (não mostra português para quem usa inglês).
    .filter(r => !en || (r.question_en && r.answer_en))
    .map(r => en
      ? { section: r.section_en || r.section, question: r.question_en!, answer: r.answer_en! }
      : { section: r.section, question: r.question, answer: r.answer });
  return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
