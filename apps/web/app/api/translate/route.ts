// app/api/translate/route.ts
// Traducao server-side via GPT para usuarios Novice (Free Chat).

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';
import { pedagogicalLevel } from '@/lib/levels';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ fetch: aiFetch, apiKey: process.env.OPENAI_API_KEY });

// Cache em memoria — max 100 entradas (FIFO)
const translationCache = new Map<string, string>();

function generateCacheKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 120);
}

function evictIfNeeded() {
  if (translationCache.size >= 100) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { text, userLevel: rawLevel, userId } = body as { text?: string; userLevel?: string; userId?: string };
    const userLevel = pedagogicalLevel(rawLevel);

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'text is required' }, { status: 400 });
    }

    const cacheKey = generateCacheKey(text);
    const cached = translationCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, translatedText: cached, cached: true });
    }

    const levelHint = userLevel === 'Novice'
      ? 'The student is a beginner. Use simple, natural Portuguese.'
      : 'Use fluent Brazilian Portuguese.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the English text to Brazilian Portuguese (PT-BR). ${levelHint} Return only the translation — no explanations, no quotes.`,
        },
        { role: 'user', content: text },
      ],
    });

    logOpenAIUsage({
      userId: userId ?? null,
      endpoint: '/api/translate',
      model: 'gpt-4.1-nano',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const translatedText = completion.choices[0]?.message?.content?.trim();
    if (!translatedText) throw new Error('Empty translation response');

    evictIfNeeded();
    translationCache.set(cacheKey, translatedText);

    return NextResponse.json({ success: true, translatedText, cached: false });
  } catch (err) {
    console.error('[translate] error:', err);
    return NextResponse.json({ success: false, error: 'Translation failed' }, { status: 500 });
  }
}
