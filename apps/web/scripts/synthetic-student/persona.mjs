// Persona builder — gera prompt do "aluno absolute zero" com vocab atual.

const BASE_PERSONA = `
You are Felipe, a 35-year-old Brazilian who has NEVER formally studied English.
Your native language is Portuguese (PT-BR). You only recognize a few universal
words you've heard in life: "ok", "yes", "no", "hi", "bye", numbers (because of
soccer scores). You cannot form sentences in English on your own.

CRITICAL: You know ONLY the chunks you've already learned through this course
(listed below). Anything outside this list, you DO NOT KNOW. Do not invent or
guess vocabulary you haven't learned — be authentically beginner.

When you encounter an exercise you don't know:
- Try to use the chunks you DO know
- If totally lost, type in Portuguese
- Make natural beginner mistakes: wrong word order, missing articles, wrong
  pronouns, dropping -s on 3rd person, mixing "I" and "me"
- Sometimes type with mobile keyboard mistakes (typos, missing capitals)

You are eager and enthusiastic, but you make mistakes. Never claim to know more
than you've actually learned.
`.trim();

export function buildPersonaPrompt(learnedChunks) {
  const chunksList = learnedChunks.size === 0
    ? '(You haven\'t learned any chunks yet — only know "ok", "yes", "no", "hi", "bye")'
    : Array.from(learnedChunks).map(c => `- ${c}`).join('\n');

  return `${BASE_PERSONA}

CHUNKS YOU HAVE LEARNED SO FAR (from completed units):
${chunksList}
`.trim();
}

// Generate a beginner attempt at answering a grammar exercise
export async function answerGrammarExercise(openaiKey, exercise, learnedChunks, attemptNum = 1) {
  const persona = buildPersonaPrompt(learnedChunks);

  const exerciseText = formatExerciseForPrompt(exercise);

  const userPrompt = `
EXERCISE (Portuguese instructions, English content):
Type: ${exercise.type}
${exerciseText}

${attemptNum > 1 ? `Previous attempt was WRONG. The hint is: ${exercise.hint ?? '(none given)'}\nTry differently.` : ''}

Provide your answer in JSON format:
{ "answer": "<your attempt>", "thought": "<short PT-BR explanation of what you tried and why>" }

Remember: you're a BEGINNER. If you don't know, guess based on chunks above,
or type in Portuguese.
`.trim();

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 200,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(content);
    return { answer: parsed.answer ?? '', thought: parsed.thought ?? '' };
  } catch {
    return { answer: content, thought: '(parse fail)' };
  }
}

function formatExerciseForPrompt(ex) {
  const parts = [];
  if (ex.sentence) parts.push(`Sentence: ${ex.sentence}`);
  if (ex.passage) parts.push(`Passage: ${ex.passage}`);
  if (ex.question) parts.push(`Question: ${ex.question}`);
  if (ex.options) parts.push(`Options: ${ex.options.join(' / ')}`);
  if (ex.choices) parts.push(`Choices: ${ex.choices.join(', ')}`);
  if (ex.hint) parts.push(`Hint (visible to student if they tap): ${ex.hint}`);
  return parts.join('\n');
}
