// app/api/exercise-help/route.ts
// Charlotte explica um exercício pro aluno em PT-BR (Novice) ou EN (Inter/Advanced).
// Use-case: aluno travou no exercicio, clica "Me ajuda" e recebe explicacao
// contextual de 2-3 frases — porque a resposta certa é aquela, em que pensar
// pra acertar similar no futuro.
//
// Custo: ~$0.0005 por chamada (gpt-4o-mini, ~200 tokens out).

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });

interface Payload {
  question:        string;   // texto do exercicio (sentence/passage)
  correct_answer:  string;   // resposta certa
  user_attempt?:   string;   // o que o aluno tentou (se ja tentou)
  exercise_type?:  string;   // multiple_choice / word_bank / fill_gap / fix_error / read_answer
  options?:        string[]; // opcoes (se MCQ/word_bank)
  level:           'Novice' | 'Inter' | 'Advanced';
  user_id?:        string;
}

function buildPrompt(p: Payload, lang: 'pt' | 'en'): string {
  const langName = lang === 'pt' ? 'Brazilian Portuguese' : 'simple English';
  const studentLine = p.user_attempt
    ? `\nStudent tried: "${p.user_attempt}" — they were wrong.`
    : '\nStudent has not tried yet, they are stuck.';
  const optionsLine = p.options && p.options.length
    ? `\nThe available options were: ${p.options.join(' / ')}.`
    : '';

  return `You are Charlotte, a warm and encouraging English coach for Brazilians.
A ${p.level} student got stuck on an English exercise and asked for help.

Exercise: "${p.question}"
Correct answer: "${p.correct_answer}"
Exercise type: ${p.exercise_type ?? 'unknown'}${optionsLine}${studentLine}

Explain in ${langName} why the correct answer is right.
RULES:
- Maximum 3 short sentences. Be friendly and clear.
- Do NOT just say what the answer is — explain WHY (the rule, the pattern, the meaning).
- If student tried something wrong, briefly say why it's wrong before giving the right reasoning.
- For ${p.level === 'Novice' ? 'Novice: use simple PT-BR, mention the English chunk clearly, maybe give a tiny mnemonic or analogy. Avoid technical grammar jargon.' : p.level === 'Inter' ? 'Inter: use simple English, you can mention grammar names (auxiliary, present perfect, etc.) but keep it concrete with examples.' : 'Advanced: use natural English, can reference nuance and register.'}
- End with a small encouraging push ("Try it!" / "Você consegue!").

Reply with JUST the explanation text. No JSON, no markdown headers, no greetings.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload;
    if (!body.question || !body.correct_answer || !body.level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const lang = body.level === 'Novice' ? 'pt' : 'en';
    const prompt = buildPrompt(body, lang);

    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens:  220,
    });

    const explanation = completion.choices[0]?.message?.content?.trim() ?? '';

    logOpenAIUsage({
      endpoint:         '/api/exercise-help',
      model:            'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      userId:           body.user_id,
    });

    return NextResponse.json({ explanation, lang });
  } catch (e: any) {
    console.error('[exercise-help] error', e);
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
