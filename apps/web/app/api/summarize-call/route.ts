// app/api/summarize-call/route.ts
// Resume a conversa de uma chamada Live Voice em 1-2 frases curtas
// e persiste em charlotte_live_calls. Idioma do resumo segue o nível:
// Novice → PT-BR, Inter + Advanced → EN (regra global da app).

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

interface Body {
  userId:           string;
  userLevel:        'Novice' | 'Inter' | 'Advanced';
  transcript:       string;
  durationSeconds:  number;
  startedAt:        string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI not configured' }, { status: 500 });
    }

    const body = (await request.json()) as Partial<Body>;
    const { userId, userLevel, transcript, durationSeconds, startedAt } = body;

    if (!userId || !userLevel || !transcript || typeof durationSeconds !== 'number' || !startedAt) {
      return NextResponse.json(
        { success: false, error: 'userId, userLevel, transcript, durationSeconds, startedAt required' },
        { status: 400 },
      );
    }

    // Conversa muito curta (<10s ou <5 palavras) → não vale resumo
    const wordCount = transcript.trim().split(/\s+/).length;
    if (durationSeconds < 10 || wordCount < 5) {
      const { data, error } = await supabase
        .from('charlotte_live_calls')
        .insert({
          user_id:          userId,
          started_at:       startedAt,
          duration_seconds: durationSeconds,
          summary:          null,
          transcript,
        })
        .select('id')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, id: data.id, summary: null });
    }

    // Regra global: apenas Novice fala português. Inter e Advanced em inglês.
    const isPt = userLevel === 'Novice';
    const summaryLang = isPt ? 'Brazilian Portuguese (PT-BR)' : 'English';

    const systemPrompt = `You are a language coach summarizing a practice conversation between a student and Charlotte (an AI English tutor). The student's level is ${userLevel}.
Summarize in ONE short sentence in ${summaryLang} (max 18 words):
- The main topic discussed
- A small note about the student's performance (vocabulary used, fluency, or a specific strength/weakness)

Examples:
- "Falaram sobre comida; você usou bem o passado simples."
- "Discussed travel plans; good vocabulary, watch verb tense agreement."
Return only the sentence, no quotes, no extra text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      max_tokens: 80,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: transcript.slice(0, 4000) },
      ],
    });

    logOpenAIUsage({
      userId,
      endpoint: '/api/summarize-call',
      model: 'gpt-4.1-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? null;

    const { data, error } = await supabase
      .from('charlotte_live_calls')
      .insert({
        user_id:          userId,
        started_at:       startedAt,
        duration_seconds: durationSeconds,
        summary,
        transcript,
      })
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id, summary });
  } catch (err) {
    console.error('[summarize-call] error:', err);
    return NextResponse.json({ success: false, error: 'Summary failed' }, { status: 500 });
  }
}
