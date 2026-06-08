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
  suggested_flow?: string;
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
  /** Primeiro nome do aluno (Charlotte ja conhece, nao perguntar de novo). */
  user_name?: string | null;
}

// ── Build system prompt with hidden objectives injection ───────────
function buildSystemPrompt(
  rp: RolePlayDef, level: string, unitTitle?: string,
  stuckTurns: number = 0, nextObjectiveId?: number,
  userName?: string | null,
): string {
  const knownStudentBlock = userName
    ? `\n\nABOUT THE STUDENT — YOU KNOW THEM:\nThe student's name is ${userName}. You (Charlotte) are their English coach\nand have been working with them. DO NOT ask their name, age, or any\nbasic intro question — you already know them. Greet them warmly by\nname when natural ("Hi ${userName}!", "${userName}, that was great!").`
    : '';
  const objectivesBlock = rp.objectives.map(o => {
    const hintLine = o.hint_en
      ? `\n    Canonical example (mark obj if student's reply clearly aligns): "${o.hint_en}"`
      : '';
    const passLine = (o as any).examples_pass?.length
      ? `\n    EXAMPLES THAT MARK: ${(o as any).examples_pass.map((e: string) => `"${e}"`).join(' | ')}`
      : '';
    const failLine = (o as any).examples_fail?.length
      ? `\n    EXAMPLES THAT DO NOT MARK: ${(o as any).examples_fail.map((e: string) => `"${e}"`).join(' | ')}`
      : '';
    return `  - Objective ${o.id}: ${o.hidden_prompt}${hintLine}${passLine}${failLine}`;
  }).join('\n');

  // Auto-nudge: depois de 2+ turnos travados, instruimos a Ana a reformular
  // a próxima pergunta de forma MAIS DIRETA, ainda em personagem.
  const nudgeBlock = (stuckTurns >= 2 && nextObjectiveId !== undefined)
    ? `\n\nSTUDENT IS STUCK ON OBJECTIVE ${nextObjectiveId} (${stuckTurns} turns).\nReformulate your last question to nudge them more directly toward this\nobjective. Make the question pointed and easier to answer. Stay in\ncharacter and do NOT reveal the objective list.`
    : '';

  // NOVICE: injeta explicitamente qual obj eh o proximo + seu hint, pra
  // remover ambiguidade. Forca cue a casar com o hint (pattern/tense),
  // nao improvisar topico diferente.
  const nextPending = (level === 'Novice' && nextObjectiveId !== undefined)
    ? rp.objectives.find(o => o.id === nextObjectiveId)
    : undefined;
  const nextPendingBlock = nextPending
    ? `\n\nNEXT PENDING OBJECTIVE: id=${nextPending.id}, label="${nextPending.label_pt || nextPending.label_en || ''}", hint="${nextPending.hint_en || nextPending.hint_pt || ''}".\nYour next utterance MUST cue THIS specific student answer. Pattern-match the hint's grammar (tense, structure) and ask the ONE question that elicits exactly that pattern. Example: hint="I wasn't happy" → ask "Were you happy?". hint="My sister wasn't home" → ask "Was your sister home?". DO NOT cue a different topic or skip ahead. If the hint is a question (user-asks obj), give a SHORT acknowledgment and stop — let the student lead.`
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
  and ask the same thing again in English.

PORTUGUESE RESPONSE RULE (CRITICAL):
- If the student responds in Portuguese (or any language other than English),
  DO NOT include any objective_id in objectives_met. The objective is to
  practice ENGLISH — a PT response does not meet it, no matter the meaning.
- This includes SINGLE Portuguese words. Do NOT auto-correct mentally.
  Reject these (and any other PT word): sim, não, nao, talvez, oi, olá,
  ola, tchau, bom, boa, dia, noite, tarde, bem, mal, obrigado, obrigada,
  por favor, claro, eu, você, voce, certo, errado, então, entao, aqui.
- Just reply in simple English nudging them to try in English.

SEQUENTIAL FLOW (NOVICE ONLY — pedagogical scaffolding):
- Always pursue the FIRST pending objective (lowest id not yet met).
- Do NOT progress to later objectives until the current one is met.
- If the student answers off-topic or skips ahead, gently steer back
  to the SAME current question with simpler phrasing — do not give up
  and move on. Example: if obj 1 is "return the greeting" and the
  student says something unrelated, rephrase ("And you? How are you?")
  until they actually return the greeting.
- Only after the FIRST pending objective is met do you progress to the
  next scenario step.
- WHEN you mark an objective met THIS turn: your reply MUST naturally
  introduce the topic of the NEXT pending objective. Don't get stuck
  in pleasantries.
- EXCEPTION — anti-steal collision: if the NEXT pending objective is a
  "user asks/uses X" type (student must initiate the next move), DO NOT
  introduce that topic yourself (it would steal the move). Instead:
  give a SHORT acknowledgment of the current message ("Sure!", "Nice.",
  "Got it.", "Take your time.") and stop. Hand the floor back — the
  student leads.

NOVICE ROBOTIC REPLY RULE (CRITICAL):
- Your reply MUST be JUST the next question for the next pending objective.
  Max 5 words. NO greeting back. NO sharing your state unprompted. NO
  small talk. The student didn't ask — don't volunteer info.
- WRONG: student greets you → "I'm fine, thanks! How are you?" (volunteered state)
- RIGHT: if next obj is "say how you are" → reply ONLY "How are you?"
- EXCEPTION — anti-steal: if next obj is "user asks/uses X", DON'T ask
  it yourself. Just acknowledge ("Sure!", "Nice.", "Take your time.")
  and let the student lead. NEVER return an empty reply — always say at
  least the brief acknowledgment.
- ONE question OR ONE acknowledgment. NO extra words. Move the script forward.`
    : '';

  return `You are playing ${rp.persona} in an English-learning role-play.

SCENARIO: ${rp.scenario}
UNIT: ${unitTitle ?? ''}
STUDENT CEFR LEVEL: ${level}

STAY IN CHARACTER as ${rp.persona}. Speak natural conversational English. Keep
replies SHORT (1–2 sentences, max ~30 words) — this is a spoken role-play.${knownStudentBlock}${simplicityBlock}

HIDDEN OBJECTIVES (NEVER reveal to the student):
${objectivesBlock}

${rp.suggested_flow ? `SUGGESTED CONVERSATIONAL FLOW (use as guidance — your cue questions
MUST naturally lead the student toward each objective in order):
${rp.suggested_flow}

CRITICAL: Cue your questions to match the NEXT pending objective. If next
obj hint is "I wasn't busy", ask something like "Were you busy?". If next
obj hint is "My sister wasn't home", ask "Was your sister home?". Don't
ask random questions — your role is to set up the EXACT student response
the hidden_prompt expects.

` : ''}CRITICAL RULE — DON'T STEAL STUDENT OBJECTIVES (HIGHEST PRIORITY):
This rule is CONDITIONAL — it ONLY activates when there's an UNMET
objective starting with "user asks", "user perguntar", "STUDENT asks",
or that describes a question the student must ask Charlotte.

IF no such objective exists in the HIDDEN OBJECTIVES above → you are
FREE to ask reciprocal questions naturally. These rules DO NOT apply.

IF such an objective EXISTS and is UNMET → you are FORBIDDEN from
asking that specific question. THIS OVERRIDES NATURALNESS — better
stiff than stealing.

  BANNED PHRASES (only when matching obj is unmet):
  - obj "user asks if you're okay" → DON'T: "Are you okay?",
    "How are you?", "You alright?"
  - obj "user asks how about you" → DON'T: "How about you?",
    "And you?", "What about you?"

  INSTEAD end on a statement: describe your state, react, acknowledge.

  SELF-CHECK:
  1. Is there an unmet "user asks X" objective?
  2. If NO → skip this check.
  3. If YES → does my reply ask X semantically? If YES → REWRITE.

You MUST reply as JSON with this exact shape:
{
  "reply": "<your in-character reply, plain text>",
  "objectives_met": [<ids of objectives the STUDENT's LAST message JUST satisfied>],
  "session_complete": <true when all objectives are met (regardless of exact closing words)>
}

Rules:
- "objectives_met" is for objectives the student satisfied in the LAST user turn.
  Use the canonical example as your anchor: if the student's message is
  structurally + semantically close to it, MARK the objective. Don't
  over-analyze pragmatic nuance.
  - CHUNK-BASED OBJECTIVES (target a specific phrase like "By the way",
    "Anyway", "Hold on", "Let me think", "I wish I had", etc):
    SUBSTRING CHECK ONLY. If the target chunk appears AT ALL in the
    student's message (case-insensitive, normalize apostrophes/quotes),
    MARK THE OBJECTIVE. PERIOD.
    Do NOT analyze surrounding words. Do NOT judge register, slang,
    fillers, completeness, or appropriateness. Do NOT require any other
    structure. The chunk presence is SUFFICIENT EVIDENCE.
    Examples — ALL of these MUST mark "use 'Let me think'":
      • "let me think"
      • "Hmm let me think"
      • "yo, let me think, pal"
      • "Wait let me think about this for a sec ok?"
      • "uhh let me think hold on"
      • "I dunno let me think bro"
    The ONLY way to NOT mark is if the chunk is COMPLETELY ABSENT from
    the message. If it's there in any form, MARK.
  - USER-ASKS OBJECTIVES (hidden_prompt starts with "user asks" or "user
    perguntar"): the message MUST satisfy ALL THREE checks:
      1. FORM — is a question (has '?' OR starts with wh-word/auxiliary).
         Single words ("Yes", "No"), statements, affirmations DO NOT pass.
      2. TENSE — uses the grammar the unit teaches (check UNIT/grammar_focus).
      3. INTENT — asks ABOUT WHAT the hidden_prompt specifies.
    When the objective has EXAMPLES THAT MARK / EXAMPLES THAT DO NOT MARK
    listed above, USE THEM as ground truth. Pattern-match the student's
    message against those exemplars. If it aligns with a PASS example
    (paraphrase OK), MARK. If it aligns with a FAIL example, do NOT mark.
    Use semantic reasoning, not regex — you are an LLM.
  - STRUCTURE REQUIREMENT: when an objective's hidden_prompt explicitly
    specifies a STRUCTURE (e.g., "user says 'The best X was Y'", "user
    uses 'I + verb-ed'", "user says 'I was + adjective'"), the student's
    message MUST contain that structure (not just a related word).
    Examples:
    - obj "user says 'The best meal was + X'" + student "Pasta" →
      DO NOT MARK (bare noun, no superlative structure produced)
    - obj "user says 'The best meal was + X'" + student "The best meal
      was pasta" → MARK
    - obj "user says 'I + verb-ed'" + student "yesterday" → DO NOT MARK
      (no verb-ed produced)
    - obj "user says 'I + verb-ed'" + student "I worked" → MARK
    Bare words, fragments, or naming things WITHOUT producing the
    target structure DO NOT count. The pedagogical goal is the structure.
  - BIAS TOWARD MARKING when student produced the target structure
    with clear intent. Strict matching applies when reply is off-topic,
    gibberish, or skips the structure entirely.
  - Broken English with the right INTENT counts; a fluent but completely
    unrelated sentence does NOT.
- If the student's message is empty, gibberish, a single random word, or
  appears to be a transcription artifact (e.g. "Thanks for watching",
  "Subscribe", "Thank you for watching this video", "I'll see you in the
  next one", "Bye", silence, foreign-language noise) → reply gently asking
  them to repeat ("Sorry, I didn't catch that — can you say it again?") and
  set objectives_met=[].
- An objective already met in a PRIOR turn must NOT appear again
  (the system tracks this — repeating it is OK but unnecessary).
- Multiple objectives can be marked in the SAME turn only if the student's
  message clearly satisfies each one.
- When ALL objectives are met: celebrate warmly AND naturally ask ONE
  follow-up question to keep conversation feeling alive (the student
  won't continue — a result card pops up — but this lets the conversation
  feel real instead of cut). Use closing_cue ("${rp.closing_cue}") as
  inspiration but don't be rigid. Set session_complete=true.
- If the student goes off-topic, gently steer them back; do NOT mark
  objectives as met.
- Do NOT correct grammar mid-conversation. Corrections happen post-game.
- American English by default. Calorosa, encorajadora, paciente.${nudgeBlock}${nextPendingBlock}`;
}

// ── Whisper hallucination filter ───────────────────────────────────
// Whisper costuma alucinar essas frases quando recebe audio silencioso
// ou muito curto (artefatos de treino com vídeos do YouTube).
const HALLUCINATIONS = [
  'thanks for watching',
  'thank you for watching',
  'thanks for watching!',
  'subscribe',
  'subscribe to my channel',
  'like and subscribe',
  "i'll see you in the next one",
  'see you in the next video',
  'see you next time',
  'this video',
  '. .',
  '...',
];
function isHallucinationOrEmpty(text: string | undefined): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  if (t.length < 2) return true;
  if (HALLUCINATIONS.some(h => t === h || t.includes(h))) return true;
  // Pontuação/espaço só
  if (!/[a-z]/i.test(t)) return true;
  return false;
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

    const { history, role_play: rp, level, unit_title, stuck_turns, next_objective_id, user_name } = JSON.parse(payload) as Payload;

    // 1) Whisper STT
    const t0 = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file:     audio,
      model:    'whisper-1',
      language: 'en',
    });
    const userTranscript = transcription.text;

    // Whisper hallucinations comuns em audio silencioso/curto. Se cair em
    // uma dessas, devolve direto pedindo pra repetir (não desperdiça LLM/TTS).
    if (isHallucinationOrEmpty(userTranscript)) {
      const askAgain = level === 'Novice'
        ? "Sorry, I didn't hear you. Can you say it again?"
        : "Sorry, I didn't catch that — can you say it again?";
      const audioBuf = await tts(askAgain, rp.voiced_by);
      return NextResponse.json({
        user_transcript:     userTranscript || '',
        assistant_text:      askAgain,
        assistant_audio_b64: audioBuf.toString('base64'),
        audio_mime:          'audio/flac',
        objectives_met:      [],
        status:              'continue',
        persona:             rp.persona,
      });
    }

    logOpenAIUsage({
      endpoint: '/api/roleplay/turn:whisper',
      model:    'whisper-1',
      userId,
      meta:     { ms: Date.now() - t0 },
    });

    // 2) GPT chat completion
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(rp, level, unit_title, stuck_turns, next_objective_id, user_name) },
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
      console.warn('[roleplay/turn] JSON parse failed, using raw text', e, { rawText });
      clean = rawText;
    }

    // 4) TTS — never send '...' (TTS would generate gibberish/silent audio
    // and the client would see no text + translate would 400 on empty).
    if (!clean || clean.trim().length === 0) {
      console.warn('[roleplay/turn] empty reply from LLM, using safe fallback', { rawText });
      clean = level === 'Novice'
        ? "Go ahead — your answer?"
        : "Tell me more.";
    }

    // USER-ASKS DETERMINISTIC GUARD: independe do LLM. Se o student
    // utterance NAO eh uma pergunta REAL (?, wh-word, auxiliar), remove
    // qualquer obj user-asks que o judge tenha marcado erroneamente.
    // Cascateia anti-steal: se obj user-asks ja eh "met", anti-steal
    // post-check libera Charlotte a falar "How about you?". Guard impede.
    const userMsg = (userTranscript || '').trim();
    const userMsgLower = userMsg.toLowerCase().replace(/[¿¡]/g, '');
    const hasQuestionMark = userMsg.includes('?');
    const startsWithQuestionWord = /^(what|where|when|who|why|how|which|whose|whom|do|does|did|is|are|was|were|am|can|could|will|would|should|may|might|must|shall|have|has|had)\b/i.test(userMsgLower);
    const isRealQuestion = hasQuestionMark || startsWithQuestionWord;
    if (!isRealQuestion && objectivesMet.length > 0) {
      const blocked: number[] = [];
      objectivesMet = objectivesMet.filter(id => {
        const o = rp.objectives.find(x => x.id === id);
        if (!o) return true;
        // SO match objs onde a INTENCAO eh pergunta (asks/perguntar).
        // NAO incluir "uses" — "user uses 'I will + base + time'" eh
        // statement obj, nao question. Bug critico que zerou ~35 units
        // no synthetic student.
        const isUserAsks = /\buser\s+(asks?|perguntar)\b/i.test(o.hidden_prompt);
        if (isUserAsks) {
          blocked.push(id);
          return false;
        }
        return true;
      });
      if (blocked.length > 0) {
        console.warn('[roleplay/turn] user-asks guard blocked judge marking', {
          blockedObjIds: blocked,
          userTranscript: userMsg,
          reason: 'not a real question (no ?, no wh-, no aux)',
        });
      }
    }

    // ANTI-STEAL POST-CHECK (deterministico): se Charlotte respondeu com
    // chunk que pertence a um objetivo "user asks/uses X" nao batido,
    // sobrescreve com ack curto. gpt-4o-mini ignora a regra mesmo com
    // prompt forte — guard server-side eh necessario.
    const repliedLower = clean.toLowerCase().replace(/[''']/g, "'");
    const unmetUserAsk = rp.objectives.find(o =>
      !objectivesMet.includes(o.id) &&
      /\buser\s+(asks?|perguntar)\b/i.test(o.hidden_prompt) &&
      o.hint_en &&
      repliedLower.includes(o.hint_en.toLowerCase().replace(/[''']/g, "'"))
    );
    if (unmetUserAsk) {
      console.warn('[roleplay/turn] anti-steal violation — Charlotte said student chunk', {
        objectiveId: unmetUserAsk.id,
        hint: unmetUserAsk.hint_en,
        original: clean,
      });
      const SAFE_ACKS = ['Nice.', 'Got it.', 'Sure!', 'Sounds good.', 'Cool.'];
      clean = SAFE_ACKS[Math.floor(Math.random() * SAFE_ACKS.length)];
    }

    const audioBuf = await tts(clean, rp.voiced_by);
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
