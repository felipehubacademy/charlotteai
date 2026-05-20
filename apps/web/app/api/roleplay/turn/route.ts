// app/api/roleplay/turn/route.ts
// Role-play turn handler — stateless.
//
// Mobile sends: audio (user's voice msg) + role-play definition + history.
// We return: assistant audio (TTS) + transcripts + objectives_met[].
//
// Pipeline: Whisper STT → GPT-4o-mini (with hidden objectives in system prompt)
// → parse [OBJECTIVE_MET:n] → strip markers → OpenAI TTS (coral/onyx based on
// persona gender) → return base64 flac.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });

interface Objective {
  id:           number;
  label_pt:     string;
  label_en:     string;
  hidden_prompt: string;
  hint_pt?:     string;
  hint_en?:     string;
}

interface RolePlayDef {
  scenario:        string;
  voiced_by:       'charlotte' | 'charlie';
  persona:         string;
  opening_line:    string;
  objectives:      Objective[];
  closing_cue:     string;
  time_budget_sec: number;
}

interface Payload {
  history:     Array<{ role: 'user' | 'assistant'; content: string }>;
  role_play:   RolePlayDef;
  level:       'Novice' | 'Inter' | 'Advanced';
  unit_title?: string;
  /** Quantos turnos consecutivos o aluno passou SEM bater nenhum objetivo novo.
   *  >= 2 → injetamos instrução pra Ana nudgar mais diretamente. */
  stuck_turns?: number;
  /** Id do próximo objetivo pendente (o que ela deve nudgar quando stuck). */
  next_objective_id?: number;
}

// ── Build system prompt with hidden objectives injection ───────────
function buildSystemPrompt(
  rp: RolePlayDef, level: string, unitTitle?: string,
  stuckTurns: number = 0, nextObjectiveId?: number,
): string {
  const objectivesBlock = rp.objectives.map(o =>
    `  - Objective ${o.id}: ${o.hidden_prompt}`
  ).join('\n');

  // Auto-nudge: depois de 2+ turnos travados, instruimos a Ana a reformular
  // a próxima pergunta de forma MAIS DIRETA, ainda em personagem.
  const nudgeBlock = (stuckTurns >= 2 && nextObjectiveId !== undefined)
    ? `\n\nSTUDENT IS STUCK ON OBJECTIVE ${nextObjectiveId} (${stuckTurns} turns).\nReformulate your last question to nudge them more directly toward this\nobjective. Make the question pointed and easier to answer. Stay in\ncharacter and do NOT reveal the objective list.`
    : '';

  // Novice = absolute/early beginner. Restrict to the simplest English
  // possible. M01 students may have zero English, so every word counts.
  const simplicityBlock = level === 'Novice'
    ? `\n\nLANGUAGE LEVEL — ABSOLUTE BEGINNER:
- Use VERY simple English. Max 8 words per sentence. Prefer 4–6.
- Present simple tense only. No past, no perfect, no conditional.
- No idioms ("hear you", "long Monday", "catch you later", etc).
- No phrasal verbs ("doing well", "go around", "show up").
- No contractions other than: I'm, you're, it's, don't, can't.
- Use the chunks from the unit: "Hi", "Hello", "How are you?", "I'm
  fine, thanks", "And you?", "Good morning", "Yes please", "No thanks",
  "See you", "Bye".
- One simple question at a time. Wait for the student to answer.
- If the student writes Portuguese, gently answer in simple English
  and ask the same thing again in English.`
    : '';

  return `You are playing ${rp.persona} in an English-learning role-play.

SCENARIO: ${rp.scenario}
UNIT: ${unitTitle ?? ''}
STUDENT CEFR LEVEL: ${level}

STAY IN CHARACTER as ${rp.persona}. Speak natural conversational English. Keep
replies SHORT (1–2 sentences, max ~30 words) — this is a spoken role-play.${simplicityBlock}

HIDDEN OBJECTIVES (NEVER reveal to the student):
${objectivesBlock}

You MUST reply as JSON with this exact shape:
{
  "reply": "<your in-character reply, plain text>",
  "objectives_met": [<ids of objectives the STUDENT's LAST message JUST satisfied>],
  "session_complete": <true if you said the closing cue AND all objectives are met>
}

Rules:
- "objectives_met" is ONLY for objectives the student satisfied in the LAST user
  turn. Be lenient: if the student attempted the objective with any reasonable
  English, count it as met.
- An objective that was already met in a PRIOR turn must NOT appear again
  (the system tracks this — repeating it is OK but unnecessary).
- When ALL objectives are met, close naturally using the closing cue
  ("${rp.closing_cue}"), set session_complete=true.
- If the student goes off-topic, gently steer them back; do NOT mark
  objectives as met.
- Do NOT correct grammar mid-conversation. Corrections happen post-game.
- American English by default. Calorosa, encorajadora, paciente.${nudgeBlock}`;
}

// ── OpenAI TTS ──────────────────────────────────────────────────────
async function tts(text: string, voicedBy: 'charlotte' | 'charlie'): Promise<Buffer> {
  // charlotte → coral (feminina, já em produção)
  // charlie   → onyx  (masculina, quente)
  const voice = voicedBy === 'charlie' ? 'onyx' : 'coral';
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:           'gpt-4o-mini-tts',
      input:           text,
      voice,
      response_format: 'flac',
    }),
  });
  if (!res.ok) throw new Error(`TTS error: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio    = formData.get('audio') as File | null;
    const payload  = formData.get('payload') as string | null;
    const userId   = (formData.get('user_id') as string | null) ?? undefined;
    if (!audio || !payload) {
      return NextResponse.json({ error: 'Missing audio or payload' }, { status: 400 });
    }

    const { history, role_play: rp, level, unit_title, stuck_turns, next_objective_id } = JSON.parse(payload) as Payload;

    // 1) Whisper STT
    const t0 = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file:     audio,
      model:    'whisper-1',
      language: 'en',
    });
    const userTranscript = transcription.text;
    logOpenAIUsage({
      endpoint: '/api/roleplay/turn:whisper',
      model:    'whisper-1',
      userId,
      meta:     { ms: Date.now() - t0 },
    });

    // 2) GPT chat completion
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(rp, level, unit_title, stuck_turns, next_objective_id) },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userTranscript },
    ];
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages,
      temperature:     0.7,
      max_tokens:      250,
      response_format: { type: 'json_object' },
    });
    const rawText = completion.choices[0]?.message?.content ?? '{}';
    logOpenAIUsage({
      endpoint:         '/api/roleplay/turn:chat',
      model:            'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      userId,
    });

    // 3) Parse structured JSON response
    let clean = '';
    let objectivesMet: number[] = [];
    let complete = false;
    try {
      const parsed = JSON.parse(rawText) as {
        reply?:            string;
        objectives_met?:   number[];
        session_complete?: boolean;
      };
      clean = (parsed.reply ?? '').trim();
      objectivesMet = Array.isArray(parsed.objectives_met)
        ? parsed.objectives_met.filter(n => typeof n === 'number')
        : [];
      complete = parsed.session_complete === true;
    } catch (e) {
      console.warn('[roleplay/turn] JSON parse failed, using raw text', e);
      clean = rawText;
    }

    // 4) TTS
    const audioBuf = await tts(clean || '...', rp.voiced_by);
    logOpenAIUsage({
      endpoint:     '/api/roleplay/turn:tts',
      model:        'gpt-4o-mini-tts',
      promptTokens: clean.length,
      userId,
      meta:         { voice: rp.voiced_by === 'charlie' ? 'onyx' : 'coral' },
    });

    return NextResponse.json({
      user_transcript:      userTranscript,
      assistant_text:       clean,
      assistant_audio_b64:  audioBuf.toString('base64'),
      audio_mime:           'audio/flac',
      objectives_met:       objectivesMet,
      status:               complete ? 'complete' : 'continue',
      persona:              rp.persona,
    });
  } catch (e: any) {
    console.error('[roleplay/turn] error', e);
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
