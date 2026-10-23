// lib/objective-judge.ts — juiz dos objetivos do Guided Chat e do Role-play.
//
// Antes o mesmo modelo escrevia a resposta e marcava os objetivos, com a regra de "seguir o
// primeiro pendente": objetivos posteriores que o aluno já tinha cumprido eram ignorados
// (ex.: "What about you?" não valia "perguntar à Charlotte" em 4 de 6 rodadas). Aqui um modelo só
// julga, cada objetivo pendente de forma independente, com raciocínio curto ligado.
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { aiFetch } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

const openai = new OpenAI({ fetch: aiFetch, apiKey: process.env.OPENAI_API_KEY || 'placeholder' });
const judgeModel = () => process.env.AI_JUDGE_MODEL || 'gpt-6-sol'; // 25/25 no teste (luna: 24/25)
const judgeEffort = () => (process.env.AI_JUDGE_EFFORT || 'none') as 'none' | 'low' | 'medium';

export interface JudgeObjective {
  id: number;
  hidden_prompt: string;
  label_en?: string;
  examples_pass?: string[];
  examples_fail?: string[];
}

export async function judgeObjectives(args: {
  objectives: JudgeObjective[];       // só os pendentes
  lastAssistant: string;              // o que a Charlotte (ou o personagem) disse antes
  studentMessage: string;
  level: string;
  persona?: string;
  userId?: string | null;
  endpoint: string;
}): Promise<number[] | null> {
  if (!args.objectives.length || !args.studentMessage.trim()) return [];
  const persona = args.persona || 'Charlotte';
  const list = args.objectives.map(o => [
    `- id ${o.id}: ${o.hidden_prompt}${o.label_en ? ` (shown to student as: "${o.label_en}")` : ''}`,
    o.examples_pass?.length ? `  counts, e.g.: ${o.examples_pass.slice(0, 4).map(e => `"${e}"`).join(' | ')}` : '',
    o.examples_fail?.length ? `  does NOT count, e.g.: ${o.examples_fail.slice(0, 3).map(e => `"${e}"`).join(' | ')}` : '',
  ].filter(Boolean).join('\n')).join('\n');

  const system = `You grade an English learner (${args.level}) in a practice chat with ${persona}.
Decide, for EACH objective below INDEPENDENTLY, whether the student's LAST message satisfies it. Order does not matter: mark every objective the message satisfies, even a later one.
How to judge:
- Meaning and intent count; exact wording does not. Small grammar slips, contractions, missing punctuation and speech-to-text noise do not block an objective, unless the objective is specifically about that structure.
- Read the message in context of what ${persona} just said. A short follow-up question that clearly turns the topic back to ${persona} ("What about you?", "And you?", "How about yours?") DOES count as asking ${persona} about that same topic.
- "User asks..." objectives need a real question from the student. Statements do not count.
- Structure objectives (e.g. "uses past continuous", "mixed conditional") need that structure actually used, at least once, in a way that makes sense.
- When unsure, decide by the main intent: would a fair teacher say the student did it?
Objectives:
${list}
Reply only JSON: {"met": [<ids satisfied by the last message>]}`;

  const user = `${persona} said: "${args.lastAssistant.slice(0, 600)}"\nStudent's last message: "${args.studentMessage.slice(0, 600)}"`;
  try {
    // O texto do juiz é o mesmo para a atividade inteira (todos os turnos e alunos). A chave de cache
    // manda essas chamadas para o mesmo lugar na OpenAI: lê o cache (barato) em vez de gravar de novo
    // (a gravação de cache do juiz era o maior item da conta em out/2026). Mesmo modelo, mesma qualidade.
    const cacheKey = `judge-${createHash('sha1').update(system).digest('hex').slice(0, 16)}`;
    const c = await openai.chat.completions.create({
      model: judgeModel(),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1200,
      reasoning_effort: judgeEffort(),
      prompt_cache_key: cacheKey,
    } as never) as OpenAI.Chat.Completions.ChatCompletion;
    logOpenAIUsage({
      endpoint: `${args.endpoint}#judge`, model: judgeModel(), userId: args.userId ?? null,
      promptTokens: c.usage?.prompt_tokens, completionTokens: c.usage?.completion_tokens,
      meta: { cached_tokens: c.usage?.prompt_tokens_details?.cached_tokens ?? 0 },
    });
    const parsed = JSON.parse(c.choices[0]?.message?.content ?? '{}') as { met?: unknown };
    const ids = new Set(args.objectives.map(o => o.id));
    return Array.isArray(parsed.met) ? (parsed.met as unknown[]).filter((n): n is number => typeof n === 'number' && ids.has(n)) : [];
  } catch (e) {
    console.warn('[objective-judge] falhou, mantém o julgamento da resposta', e);
    return null; // null = sem decisão; quem chamou usa o que já tinha
  }
}
