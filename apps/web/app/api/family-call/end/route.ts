// /api/family-call/end — salva a ligação com a Família no histórico (charlotte_live_calls, o mesmo das
// ligações da Charlotte), com transcrição, resumo e memória para a próxima conversa.
//   POST { character, impression?, startedAt, durationSeconds, lines: [{ who: 'ai' | 'user', text }] }  (Bearer do aluno)
//   impression = ligação inteira com uma imitação do personagem (histórico mostra o nome dela).
// Resumo no idioma da regra das ligações (Novice em português; Inter e Advanced em inglês), como em
// /api/summarize-call. Memória: anotações curtas em inglês para o prompt da próxima ligação. Só texto,
// sem áudio.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { CHARACTERS, impressionOf } from '@/lib/characters';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const characterId = String(body.character ?? '');
  const c = CHARACTERS[characterId as keyof typeof CHARACTERS];
  if (!c || characterId === 'charlotte') return NextResponse.json({ error: 'unknown_character' }, { status: 400 });
  const impression = impressionOf(c, body.impression);
  const lines = (Array.isArray(body.lines) ? body.lines : []).slice(0, 400)
    .map((l: any) => ({ who: l?.who === 'ai' ? 'ai' : 'user', text: String(l?.text ?? '').replace(/<\/?[A-Za-z]+>/g, '').trim().slice(0, 600) }))
    .filter((l: { text: string }) => l.text && !/^[.\s…]+$/.test(l.text));
  const durationSeconds = Math.max(0, Math.min(3600, Number(body.durationSeconds) || 0));
  const startedAt = typeof body.startedAt === 'string' ? body.startedAt : new Date().toISOString();
  if (!lines.length) return NextResponse.json({ ok: true, skipped: true });

  const transcript = lines.map((l: { who: string; text: string }) => `${l.who === 'ai' ? c.name : 'User'}: ${l.text}`).join('\n');
  const { data: u } = await supabase.from('charlotte_users').select('charlotte_level').eq('id', auth.user.id).maybeSingle();
  const level = (u as { charlotte_level?: string } | null)?.charlotte_level ?? 'Inter';

  let summary: string | null = null;
  let memory: string | null = null;
  const userWords = lines.filter((l: { who: string }) => l.who === 'user').map((l: { text: string }) => l.text).join(' ').split(/\s+/).filter(Boolean).length;
  if (durationSeconds >= 10 && userWords >= 4 && process.env.OPENAI_API_KEY) {
    const lang = level === 'Novice' ? 'Brazilian Portuguese (PT-BR)' : 'English';
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4.1-mini', temperature: 0.3, max_tokens: 220, response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `You summarize a voice call between an English student (${level} level) and ${c.name}, a comedian character from the Queizy app. Return JSON with:
- "summary": ONE short sentence in ${lang} (max 18 words) with the main topics and a small note on the student's English (a strength or something to practice). Example: "Falaram sobre academia e viagens; você usou bem o passado." / "Talked about the gym and travel; good past tense, watch prepositions."
- "memory": up to 3 short notes in English for ${c.name} to remember next call: facts the student shared (plans, likes, people, events) and open threads to follow up. Concrete, no judgments. Example: "Goes to the gym on Mondays; trip to Rio next month; ask how the job interview went."` },
            { role: 'user', content: transcript.slice(0, 6000) },
          ],
        }),
      });
      if (r.ok) {
        const j = await r.json();
        logOpenAIUsage({ userId: auth.user.id, endpoint: '/api/family-call/end', model: 'gpt-4.1-mini',
          promptTokens: j.usage?.prompt_tokens, completionTokens: j.usage?.completion_tokens, totalTokens: j.usage?.total_tokens });
        const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
        summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 300) : null;
        memory = typeof parsed.memory === 'string' ? parsed.memory.trim().slice(0, 600)
          : Array.isArray(parsed.memory) ? parsed.memory.join('; ').slice(0, 600) : null;
      }
    } catch (e) {
      console.warn('[family-call/end] summary failed', e);
    }
  }

  const { data, error } = await supabase.from('charlotte_live_calls').insert({
    user_id: auth.user.id, character: characterId, impression: impression?.id ?? null, started_at: startedAt, duration_seconds: durationSeconds,
    summary, memory, transcript,
  } as never).select('id').single();
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id, summary });
}
