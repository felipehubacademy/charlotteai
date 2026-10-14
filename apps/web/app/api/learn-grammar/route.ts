import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

const openai = new OpenAI({ fetch: aiFetch, apiKey: process.env.OPENAI_API_KEY });

type ExerciseType = 'fill_gap' | 'fix_error' | 'read_answer';

const SYSTEM: Record<string, Record<ExerciseType, string>> = {
  Novice: {
    fill_gap: `You are an English teacher generating a fill-in-the-blank exercise for a beginner (A1–A2) English learner.
Generate ONE sentence with a single blank marked as _____.
Use common verbs, articles, prepositions, or simple tenses.
Return ONLY valid JSON — no markdown, no explanation outside the JSON:
{"sentence":"...","answer":"...","hint":"...","explanation":"..."}
- sentence: natural English sentence with _____ for the blank; add (verb form hint) when helpful
- answer: the exact word(s) that fill the blank
- hint: ≤8 words describing the grammar rule
- explanation: 1 sentence explaining why`,

    fix_error: `You are an English teacher generating an error-correction exercise for a beginner (A1–A2) English learner.
Generate ONE sentence with a single clear grammar error.
Focus on: subject-verb agreement, wrong tense, missing article, wrong preposition.
Return ONLY valid JSON:
{"sentence":"...","answer":"...","hint":"...","explanation":"..."}
- sentence: the sentence WITH the error
- answer: the FULL corrected sentence
- hint: ≤6 words about what kind of error
- explanation: 1 sentence explaining the correction`,

    read_answer: `You are an English teacher generating a reading comprehension exercise for a beginner (A1–A2) English learner.
Write a 2-sentence passage about everyday life, then ask one simple factual question.
Return ONLY valid JSON:
{"passage":"...","question":"...","answer":"...","explanation":"..."}
- passage: 2 simple sentences
- question: one factual question answerable from the passage
- answer: the key word or short phrase (2–4 words max)
- explanation: the full answer with context`,
  },

  Inter: {
    fill_gap: `You are an English teacher generating a fill-in-the-blank exercise for an intermediate (B1–B2) English learner.
Generate ONE sentence. Focus on: verb tenses (perfect, continuous), modal verbs, phrasal verbs, conditionals, reported speech.
Return ONLY valid JSON:
{"sentence":"...","answer":"...","hint":"...","explanation":"..."}`,

    fix_error: `You are an English teacher generating an error-correction exercise for an intermediate (B1–B2) English learner.
Generate ONE sentence with a subtle grammar error. Focus on: tense consistency, prepositions after verbs, gerund vs infinitive, articles.
Return ONLY valid JSON:
{"sentence":"...","answer":"...","hint":"...","explanation":"..."}
- answer: the FULL corrected sentence`,

    read_answer: `You are an English teacher generating a reading comprehension exercise for an intermediate (B1–B2) English learner.
Write a 3-sentence passage on a topic like work, travel, or current events, then ask an inferential question.
Return ONLY valid JSON:
{"passage":"...","question":"...","answer":"...","explanation":"..."}`,
  },

  Advanced: {
    fill_gap: `You are an English teacher generating a fill-in-the-blank exercise for an advanced (C1–C2) English learner.
Generate ONE sentence. Focus on: subjunctive, inversion, complex conditionals, formal register, nuanced prepositions.
Return ONLY valid JSON:
{"sentence":"...","answer":"...","hint":"...","explanation":"..."}`,

    fix_error: `You are an English teacher generating an error-correction exercise for an advanced (C1–C2) English learner.
Generate ONE sentence with a subtle error that even advanced learners miss. Focus on: collocation errors, register mismatches, pronoun reference, dangling modifiers.
Return ONLY valid JSON:
{"sentence":"...","answer":"...","hint":"...","explanation":"..."}
- answer: the FULL corrected sentence`,

    read_answer: `You are an English teacher generating a reading comprehension exercise for an advanced (C1–C2) English learner.
Write a 3-sentence passage on a complex topic (business, ethics, technology) with nuanced language, then ask a question requiring inference.
Return ONLY valid JSON:
{"passage":"...","question":"...","answer":"...","explanation":"..."}`,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { type, level, userId } = (await req.json()) as { type: ExerciseType; level: string; userId?: string };

    const safeLevel = (level in SYSTEM ? level : 'Inter') as string;
    const safeType: ExerciseType = (['fill_gap', 'fix_error', 'read_answer'].includes(type) ? type : 'fill_gap') as ExerciseType;

    const systemPrompt = SYSTEM[safeLevel][safeType];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate the exercise.' }],
      max_tokens: 300,
      temperature: 0.9,
      response_format: { type: 'json_object' },
    });

    logOpenAIUsage({
      userId: userId ?? null,
      endpoint: '/api/learn-grammar',
      model: 'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const exercise = JSON.parse(raw);

    return NextResponse.json({ success: true, exercise: { ...exercise, type: safeType } });
  } catch (err: any) {
    console.error('❌ learn-grammar error:', err);
    return NextResponse.json({ success: false, error: err?.message ?? 'Failed to generate exercise' }, { status: 500 });
  }
}
