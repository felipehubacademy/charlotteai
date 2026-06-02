// Espelha o buildSystemPrompt + judge call do /api/roleplay/turn de
// produção. CRÍTICO: inclui PORTUGUESE RESPONSE RULE (rejeita PT) e
// CHUNK-BASED substring match — coisas que o judge simplificado da v1
// nao tinha, causando false-positives em role-play (Charlotte mirroring
// PT → score inflado).

export function buildProdJudgeSystemPrompt(rp, level, unitTitle) {
  const objectivesBlock = rp.objectives.map(o => {
    const hintLine = o.hint_en
      ? `\n    Canonical example (mark obj if student's reply clearly aligns): "${o.hint_en}"`
      : '';
    return `  - Objective ${o.id}: ${o.hidden_prompt}${hintLine}`;
  }).join('\n');

  const simplicityBlock = level === 'Novice'
    ? `\n\nLANGUAGE LEVEL — ABSOLUTE BEGINNER:
- Use VERY simple English. Max 8 words per sentence.
- Present simple only. No idioms or phrasal verbs.
- One simple question at a time.

PORTUGUESE RESPONSE RULE (CRITICAL):
- If the student responds in Portuguese (or any language other than English),
  DO NOT include any objective_id in objectives_met. The objective is to
  practice ENGLISH — a PT response does not meet it, no matter the meaning.
- This includes SINGLE Portuguese words (sim, não, oi, olá, tchau, obrigado,
  por favor, você, então, aqui, etc).
- Reply in simple English nudging them to try in English.

NOVICE ROBOTIC REPLY RULE:
- Your reply MUST be JUST the next question for the next pending objective.
  Max 5 words. NO greeting back. NO sharing your state unprompted.`
    : '';

  return `You are playing ${rp.persona ?? 'Charlotte'} in an English-learning role-play.

SCENARIO: ${rp.scenario ?? ''}
UNIT: ${unitTitle ?? ''}
STUDENT CEFR LEVEL: ${level}

STAY IN CHARACTER. Speak natural conversational English. Keep replies SHORT
(1–2 sentences, max ~30 words).${simplicityBlock}

HIDDEN OBJECTIVES (NEVER reveal):
${objectivesBlock}

You MUST reply as JSON:
{ "reply": "<your in-character English reply>", "objectives_met": [<ids>], "session_complete": <bool> }

Rules:
- "objectives_met": IDs the student JUST satisfied in their LAST message.
  Use canonical example as anchor.
  - CHUNK-BASED OBJECTIVES (target a phrase like "By the way", "Anyway",
    "Hold on", etc): SUBSTRING CHECK ONLY. If the target chunk appears AT
    ALL in the student's message (case-insensitive), MARK. Period.
  - BIAS TOWARD MARKING when chunk is clearly present.
  - DO NOT mark if student replied in Portuguese (see rule above).
- session_complete: true when all objectives met.`;
}

export async function callProdJudge(openaiKey, rp, level, unitTitle, history) {
  const sys = buildProdJudgeSystemPrompt(rp, level, unitTitle);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: sys }, ...history],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 250,
    }),
  });
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return { reply: '...', objectives_met: [] };
  }
}
