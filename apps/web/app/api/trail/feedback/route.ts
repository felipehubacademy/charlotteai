// /api/trail/feedback — correção no fim do Role-play e do Guided Chat (Bearer do aluno).
//   POST { level, moduleId, unitId, activity: 'roleplay'|'chat', topic, lines: string[], lang: 'pt'|'en' }
//   → { errorFree, corrections: [{ said, correct, tip }] } (até 3) e grava em trail_feedback.
// A conversa em si não corrige nada (o roteiro deixa a correção para o fim).
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Correction = { said: string; correct: string; tip: string };

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const activity = body.activity === 'roleplay' ? 'roleplay' : body.activity === 'chat' ? 'chat' : null;
  const level = String(body.level ?? 'Novice');
  const moduleId = String(body.moduleId ?? '');
  const unitId = String(body.unitId ?? '');
  const pt = body.lang !== 'en';
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .map((l: unknown) => String(l ?? '').trim()).filter((l: string) => l.length > 1).slice(0, 20).map((l: string) => l.slice(0, 300));
  if (!activity || !moduleId || !unitId) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (!lines.length) return NextResponse.json({ errorFree: true, corrections: [] });

  const tipLang = pt ? 'Brazilian Portuguese (with correct accents)' : 'English';
  const system = `You review what an English learner (${level} level) said in a short practice conversation${body.topic ? ` about "${String(body.topic).slice(0, 80)}"` : ''}.
Find real English mistakes only: grammar, wrong word, word order, missing words. Ignore punctuation, capitalization, contractions vs. full forms, and speech-to-text noise (repeated words, cut sentences, filler words). Do not rewrite sentences that are already correct and natural.
Return JSON: {"corrections":[{"said":"<the student's exact sentence>","correct":"<the corrected sentence>","tip":"<one short reason in ${tipLang}, max 90 characters>"}]}
At most 3 corrections, the most useful first. If there are no real mistakes, return {"corrections":[]}.`;

  let corrections: Correction[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: lines.map((l: string, i: number) => `${i + 1}. ${l}`).join('\n') }],
    });
    logOpenAIUsage({
      userId: user.id, endpoint: '/api/trail/feedback', model: 'gpt-4o-mini',
      promptTokens: completion.usage?.prompt_tokens, completionTokens: completion.usage?.completion_tokens, totalTokens: completion.usage?.total_tokens,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as { corrections?: Partial<Correction>[] };
    corrections = (parsed.corrections ?? [])
      .filter(c => c.said && c.correct && c.said.trim().toLowerCase() !== c.correct.trim().toLowerCase())
      .slice(0, 3)
      .map(c => ({ said: String(c.said).slice(0, 300), correct: String(c.correct).slice(0, 300), tip: String(c.tip ?? '').slice(0, 140) }));
  } catch (e) {
    console.warn('[trail/feedback] review failed', e);
    return NextResponse.json({ error: 'review_failed' }, { status: 502 });
  }

  const errorFree = corrections.length === 0;
  await supabase.from('trail_feedback').insert({
    user_id: user.id, level, module_id: moduleId, unit_id: unitId, activity, lines: lines.length, error_free: errorFree, corrections,
  } as never);
  return NextResponse.json({ errorFree, corrections });
}
