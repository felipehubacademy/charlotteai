// /api/judge-objective
// Recebe transcript (Whisper) + hidden_prompt da objective e retorna se o
// aluno bateu. JSON estruturado, gpt-4o-mini = barato e rápido (~50-100ms).
//
// Input:  { transcript, hidden_prompt, expected_response_en, level: 'Novice' | 'Inter' | 'Advanced' }
// Output: { passed: boolean, feedback_pt: string, feedback_en: string }

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, hidden_prompt, expected_response_en, level } = body ?? {};

    if (typeof transcript !== 'string' || typeof hidden_prompt !== 'string') {
      return NextResponse.json({ error: 'transcript and hidden_prompt required' }, { status: 400 });
    }

    // Empty / very short transcript → fail fast without LLM
    if (!transcript.trim() || transcript.trim().length < 2) {
      return NextResponse.json({
        passed: false,
        feedback_pt: 'Não te entendi. Tenta de novo.',
        feedback_en: "Didn't catch that. Try again.",
      });
    }

    const system = `You are a forgiving English teacher judging a Novice English learner.
Decide if the student said something that MEETS the OBJECTIVE.
Be VERY tolerant — accept any reasonable attempt, including:
- Single words ("good" alone counts if the objective is "say how you're doing")
- Bad pronunciation / Whisper mishears (e.g. "goody" -> "good")
- Translated meaning (e.g. "great" instead of "good")
- Imperfect grammar
- Mix of Portuguese + English

Only FAIL if the student clearly didn't try, said something completely unrelated, or stayed silent.

Return JSON: { "passed": boolean, "feedback_pt": "...", "feedback_en": "..." }

feedback_pt: short, encouraging, in Brazilian Portuguese (Novice level).
  - On pass: "Boa! Você acertou." or similar
  - On fail: explain what was expected, suggesting the target phrase
feedback_en: same but in English.`;

    const user = `OBJECTIVE: ${hidden_prompt}
EXPECTED RESPONSE (target phrase): ${expected_response_en ?? '(none)'}
STUDENT LEVEL: ${level ?? 'Novice'}
WHAT THE STUDENT SAID: "${transcript}"

Did the student meet the objective? Return JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user   },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: { passed?: unknown; feedback_pt?: unknown; feedback_en?: unknown };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return NextResponse.json({
      passed:      Boolean(parsed.passed),
      feedback_pt: typeof parsed.feedback_pt === 'string' ? parsed.feedback_pt : 'Tenta de novo.',
      feedback_en: typeof parsed.feedback_en === 'string' ? parsed.feedback_en : 'Try again.',
    });
  } catch (e) {
    console.error('[judge-objective] error', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
