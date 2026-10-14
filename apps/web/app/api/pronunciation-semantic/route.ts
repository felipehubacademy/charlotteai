// app/api/pronunciation-semantic/route.ts
//
// Detects minimal-pair / semantic errors in a pronunciation transcript.
// These are words the user actually said (correctly pronounced) but that
// don't fit the intended meaning — e.g. "word" instead of "world",
// "sheep" instead of "ship", "live" instead of "leave".
//
// The Azure SDK cannot catch these because it scores the word as heard;
// only semantic context reveals the error.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ fetch: aiFetch,
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

export interface SemanticCorrection {
  heard:   string;   // word as transcribed (wrong one)
  likely:  string;   // word the speaker most likely intended
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { text, userId } = body as { text: string; userId?: string };

    if (!text || text.trim().length < 3) {
      return NextResponse.json({ corrections: [] });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an English pronunciation coach analysing speech transcriptions.
Your task: identify words that appear semantically wrong because the speaker likely confused them with a similar-sounding word (minimal pair errors or near-homophones).

Classic examples:
- "word" when they meant "world"
- "sheep" when they meant "ship"
- "live" when they meant "leave"
- "beach" when they meant "bitch" (or vice-versa — flag only if clearly context-driven)
- "conquered" when they meant "conquer" (morphological slip from pronunciation)
- "tree" when they meant "three"

Rules:
1. Only flag words where the intended word is clearly inferable from context.
2. The heard word must be a real English word (not a nonsense transcription artefact).
3. Return an empty array [] if the sentence makes complete sense as-is.
4. Return at most 2 corrections — focus on the most impactful ones.
5. ONLY return a raw JSON array, no prose, no markdown, no code fences.

Output format: [{"heard": "word", "likely": "world"}, ...]`,
        },
        {
          role: 'user',
          content: `Transcription: "${text}"`,
        },
      ],
      temperature: 0.2,
      max_tokens: 120,
    });

    logOpenAIUsage({
      userId: userId ?? null,
      endpoint: '/api/pronunciation-semantic',
      model: 'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';

    let corrections: SemanticCorrection[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        corrections = parsed
          .filter((c: any) => c.heard && c.likely && c.heard !== c.likely)
          .slice(0, 2);
      }
    } catch {
      // GPT returned something unparseable — treat as no corrections
      corrections = [];
    }

    return NextResponse.json({ corrections });

  } catch (error: any) {
    console.error('pronunciation-semantic error:', error);
    // Non-fatal — return empty so the caller can proceed without demo
    return NextResponse.json({ corrections: [] });
  }
}
