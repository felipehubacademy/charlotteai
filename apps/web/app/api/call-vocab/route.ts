// /api/call-vocab — "Palavras desta ligação": no fim de uma ligação por voz (Charlotte ou Família), até 5
// palavras ou expressões do dia a dia que apareceram na conversa e valem guardar no Vocabulário do aluno.
//   POST { lines: [{ who: 'ai' | 'user', text }] }  (Bearer do aluno)  →  { items: [{ term, category, definition, example, example_pt? }] }
// Significado pelo nível (conteúdo pedagógico): Novice em português com a tradução do exemplo; Inter e
// Advanced em inglês. Não grava nada: o aluno escolhe salvar no app (source 'charlotte').
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
// Básico demais para guardar em qualquer nível (o modelo às vezes deixa passar).
const TOO_BASIC = new Set(['hi', 'hello', 'hey', 'bye', 'goodbye', 'thank you', 'thanks', 'yes', 'no', 'ok', 'okay', 'please',
  'sorry', 'go home', 'good', 'nice', 'see you', 'see you later', 'good morning', 'good night', 'how are you', "i'm fine"]);

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ items: [] });

  const body = await req.json().catch(() => ({}));
  const lines = (Array.isArray(body.lines) ? body.lines : []).slice(-200)
    .map((l: any) => ({ who: l?.who === 'ai' ? 'ai' : 'user', text: String(l?.text ?? '').replace(/<\/?[A-Za-z]+>/g, '').trim().slice(0, 600) }))
    .filter((l: { text: string }) => l.text && !/^[.\s…]+$/.test(l.text));
  const userWords = lines.filter((l: { who: string }) => l.who === 'user').map((l: { text: string }) => l.text).join(' ').split(/\s+/).filter(Boolean).length;
  if (lines.length < 4 || userWords < 6) return NextResponse.json({ items: [] });

  const { data: u } = await supabase.from('charlotte_users').select('charlotte_level').eq('id', auth.user.id).maybeSingle();
  const level = (u as { charlotte_level?: string } | null)?.charlotte_level ?? 'Inter';
  const pt = level === 'Novice';
  const transcript = lines.map((l: { who: string; text: string }) => `${l.who === 'ai' ? 'Tutor' : 'Student'}: ${l.text}`).join('\n').slice(-7000);

  const system = `From a voice call between an English student (${level} level, Brazilian) and an English tutor, pick up to 5 items
worth saving to the student's vocabulary: everyday words, collocations, phrasal verbs or common idioms that
(a) the TUTOR used and are useful for this student's level, or (b) the student struggled with, asked about or said in Portuguese.
Only things a typical adult uses in everyday conversation: no jargon, no rare words, no names, no sentence fragments,
nothing too basic for the level (never "hi", "thank you", "yes", "go home"; for Inter/Advanced also skip words like "good", "house", "work").
If the student said something in Portuguese or translated literally from Portuguese (e.g. "turn the night" for "virar a noite"),
the term is the CORRECT English way to say it ("stay up all night"), never the student's mistake.
Each item:
- term: short (max 4 words), dictionary form.
- category: "word" | "idiom" | "phrasal_verb".
- definition: ${pt ? 'short meaning in Brazilian Portuguese with correct accents, max 80 chars' : 'short learner-friendly meaning in English, max 90 chars'}.
- example: the sentence from the call where it appeared (fix small errors), max 110 chars.
${pt ? '- example_pt: the example translated into natural Brazilian Portuguese with correct accents.\n' : ''}Return JSON {"items":[...]}; empty list if nothing is worth saving. No emojis.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4.1-mini', temperature: 0.2, max_tokens: 700, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: transcript }],
      }),
    });
    if (!r.ok) return NextResponse.json({ items: [] });
    const j = await r.json();
    logOpenAIUsage({ userId: auth.user.id, endpoint: '/api/call-vocab', model: 'gpt-4.1-mini',
      promptTokens: j.usage?.prompt_tokens, completionTokens: j.usage?.completion_tokens, totalTokens: j.usage?.total_tokens });
    const raw = JSON.parse(j.choices?.[0]?.message?.content ?? '{}').items;
    const seen = new Set<string>();
    const items = (Array.isArray(raw) ? raw : []).map((i: any) => ({
      term: clip(i?.term, 60),
      category: ['word', 'idiom', 'phrasal_verb'].includes(i?.category) ? i.category : 'word',
      definition: clip(i?.definition, 120),
      example: clip(i?.example, 160),
      ...(pt ? { example_pt: clip(i?.example_pt, 180) } : {}),
    })).filter((i: { term: string; definition: string }) => {
      const k = i.term.toLowerCase();
      if (!i.term || !i.definition || /[+]/.test(i.term) || seen.has(k) || TOO_BASIC.has(k.replace(/[!?.]+$/, ''))) return false;
      seen.add(k); return true;
    }).slice(0, 5);
    return NextResponse.json({ items, level });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
