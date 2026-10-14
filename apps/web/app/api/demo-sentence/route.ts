// app/api/demo-sentence/route.ts
// Generates a short, natural English sentence using a mispronounced word.
// Used by the pronunciation pipeline to create demo TTS audio that puts
// the word in real-world context instead of just repeating it in isolation.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ fetch: aiFetch,
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { words, userId } = body as { words: string[]; userId?: string };

    if (!words || words.length === 0) {
      return NextResponse.json({ error: 'words array is required' }, { status: 400 });
    }

    // Ask GPT for one short, natural sentence per word
    const wordList = words.map((w, i) => `${i + 1}. ${w}`).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an English pronunciation coach. For each word provided, write ONE short, natural, everyday English sentence (8–12 words) that uses that word naturally. Return ONLY the sentences as a numbered list — no extra commentary, no blank lines, nothing else.',
        },
        {
          role: 'user',
          content: `Words:\n${wordList}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    logOpenAIUsage({
      userId: userId ?? null,
      endpoint: '/api/demo-sentence',
      model: 'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';

    // Parse numbered list → array of sentences
    const sentences = raw
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 0);

    return NextResponse.json({ success: true, sentences });
  } catch (error: any) {
    console.error('demo-sentence error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sentences', details: error?.message },
      { status: 500 }
    );
  }
}
