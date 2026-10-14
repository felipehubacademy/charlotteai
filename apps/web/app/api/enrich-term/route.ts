/**
 * GET /api/enrich-term?term=bus&level=Novice
 *
 * Returns definition, example, phonetic and category for a vocabulary term.
 *
 * Cache strategy (mirrors tts-cached):
 *   1. Check vocabulary_master table — return immediately if found
 *   2. Generate via GPT-4o-mini (both PT + EN in one call)
 *   3. Save to vocabulary_master
 *   4. Return fields appropriate for the requested level
 *
 * Response: { success: true, data: { definition, example, example_translation, phonetic, category }, cached: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openai = new OpenAI({ fetch: aiFetch, apiKey: process.env.OPENAI_API_KEY || '' });

function normalizeTerm(term: string): string {
  return term.toLowerCase().trim();
}

export async function GET(req: NextRequest) {
  const raw    = req.nextUrl.searchParams.get('term')?.trim();
  const level  = req.nextUrl.searchParams.get('level') ?? 'Inter';
  const userId = req.nextUrl.searchParams.get('userId');

  if (!raw) {
    return NextResponse.json({ error: 'Missing term' }, { status: 400 });
  }

  const term = normalizeTerm(raw);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── 1. Check master cache ──────────────────────────────────────────────────
  const { data: master } = await supabase
    .from('vocabulary_master')
    .select('definition_en, definition_pt, example, example_translation_pt, phonetic, category')
    .eq('term', term)
    .maybeSingle();

  if (master) {
    return NextResponse.json({
      success: true,
      cached: true,
      data: {
        definition:          level === 'Novice' ? master.definition_pt : master.definition_en,
        example:             master.example,
        example_translation: level === 'Novice' ? master.example_translation_pt : null,
        phonetic:            master.phonetic,
        category:            master.category,
      },
    });
  }

  // ── 2. Generate via GPT — both PT and EN in one call ──────────────────────
  const systemPrompt = `You are an English vocabulary assistant.
Given a term, first decide if it is a real English word, phrase, idiom, phrasal verb, or grammatical structure.

If the term is NOT valid (misspelled, gibberish, or not English):
  Return ONLY: {"invalid":true,"suggestion":"corrected term if you can guess one, otherwise empty string"}

If the term IS valid, return a JSON object with ALL of these fields:
- definition_en: string — monolingual English definition, B2/C1 dictionary style
- definition_pt: string — Portuguese (Brazil) definition, simple A2 level for learners
- example: string — rich, natural English example sentence
- example_translation_pt: string — the example translated to Brazilian Portuguese
- phonetic: string — IPA transcription (e.g. /wɜːrd/)
- category: one of "word" | "idiom" | "phrasal_verb" | "grammar"

Return ONLY the raw JSON object, no markdown, no explanation.`;

  let parsed: Record<string, unknown> = {};
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Term: "${raw.trim()}"` },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    logOpenAIUsage({
      userId,
      endpoint: '/api/enrich-term',
      model: 'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const raw_resp = completion.choices[0]?.message?.content ?? '{}';
    try {
      parsed = JSON.parse(raw_resp);
    } catch {
      const stripped = raw_resp.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(stripped);
    }
  } catch (err) {
    console.error('[enrich-term] GPT error:', err);
    return NextResponse.json({ error: 'Failed to generate vocabulary data' }, { status: 500 });
  }

  // ── 2b. Invalid term — return without saving to cache ─────────────────────
  if (parsed.invalid === true) {
    return NextResponse.json({
      success: false,
      error: 'invalid_term',
      suggestion: String(parsed.suggestion ?? ''),
    }, { status: 422 });
  }

  // ── 3. Save to master ──────────────────────────────────────────────────────
  const row = {
    term,
    definition_en:          String(parsed.definition_en          ?? ''),
    definition_pt:          String(parsed.definition_pt          ?? ''),
    example:                String(parsed.example                ?? ''),
    example_translation_pt: String(parsed.example_translation_pt ?? ''),
    phonetic:               String(parsed.phonetic               ?? ''),
    category:               String(parsed.category               ?? 'word'),
  };

  await supabase
    .from('vocabulary_master')
    .upsert(row, { onConflict: 'term' });

  // ── 4. Return fields for requested level ───────────────────────────────────
  return NextResponse.json({
    success: true,
    cached: false,
    data: {
      definition:          level === 'Novice' ? row.definition_pt : row.definition_en,
      example:             row.example,
      example_translation: level === 'Novice' ? row.example_translation_pt : null,
      phonetic:            row.phonetic,
      category:            row.category,
    },
  });
}
