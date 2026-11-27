// app/api/vocabulary/route.ts
// Generates definition, example, phonetic and category for a given term.
// Called by the Add Word modal in the RN app.

import { requestUserId } from '@/lib/request-user';
import { NextRequest, NextResponse } from 'next/server';
import { checkAiAccess } from '@/lib/entitlement';
import OpenAI from 'openai';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ fetch: aiFetch, apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(request: NextRequest) {
  try {
    const { term, level } = await request.json() as { term: string; level: string };
    const userId = await requestUserId(request);
    // Plano e limite do aluno (lib/entitlement): sem assinatura, 402; acima do limite, 429.
    const denied = await checkAiAccess(userId, 'vocabulary', request.headers.get('x-lang'));
    if (denied) return denied;
    if (typeof term === 'string' && term.length > 80) return NextResponse.json({ error: 'Term too long' }, { status: 413 });
    if (!term?.trim()) {
      return NextResponse.json({ error: 'term required' }, { status: 400 });
    }

    const isNovice = level === 'Novice';
    const isAdvanced = level === 'Advanced';

    const systemPrompt = isNovice
      ? `You are an English vocabulary assistant for Brazilian learners at A2 level.
Given a term, return a JSON object with:
- definition: string (in Portuguese, clear and simple)
- example: string (simple English sentence A2 level)
- example_translation: string (the example translated to Portuguese)
- phonetic: string (IPA transcription, e.g. /wɜːrd/)
- category: one of "word" | "idiom" | "phrasal_verb" | "grammar"
Return ONLY the raw JSON object, no markdown.`
      : `You are an English vocabulary assistant for ${isAdvanced ? 'C1' : 'B2'} level learners.
Given a term, return a JSON object with:
- definition: string (in English, monolingual dictionary style)
- example: string (rich contextual English sentence)
- example_translation: null
- phonetic: string (IPA transcription, e.g. /wɜːrd/)
- category: one of "word" | "idiom" | "phrasal_verb" | "grammar"
Return ONLY the raw JSON object, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Term: "${term.trim()}"` },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    logOpenAIUsage({
      userId: userId ?? null,
      endpoint: '/api/vocabulary',
      model: 'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Strip markdown fences if present
      const stripped = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(stripped);
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    console.error('[vocabulary] error:', err);
    return NextResponse.json({ error: 'Failed to generate vocabulary data' }, { status: 500 });
  }
}
