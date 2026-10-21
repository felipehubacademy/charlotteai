// lib/support-insights.ts — análise das conversas de suporte com IA (server-only).
import { aiFetch } from '@/lib/ai-models';
// Cada conversa parada há mais de 1 h ganha uma linha em support_insights: categoria,
// assunto, tela do app, sentimento, quem resolveu, lacuna da FAQ (com a entrada
// sugerida), problema de UX e pedido de função. Roda de hora em hora no agendador e
// alimenta a aba Insights do /admin/suporte. Se a conversa recebe mensagens novas,
// a análise é refeita (mantendo a decisão já tomada sobre a sugestão de FAQ).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupportFaq } from '@/lib/support-faq';
import { logOpenAIUsage } from '@/lib/openai-usage';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const IDLE_MS = 3600000;         // conversa parada há 1 h
const LOOKBACK_DAYS = 30;

export const INSIGHT_CATEGORIES = ['conta', 'assinatura', 'duvida_uso', 'bug', 'conteudo', 'sugestao', 'elogio', 'outro'] as const;
export const INSIGHT_SCREENS = ['inicio', 'trilha', 'live_voice', 'practice', 'vocabulario', 'perfil', 'progresso', 'metas', 'ranking', 'estudar_junto', 'assinatura', 'login', 'notificacoes', 'outro'] as const;

interface Msg { direction: string; author: string; body: string; intent: string | null; created_at: string }

function prompt(faqQuestions: string[]): string {
  return `Você analisa conversas de suporte do Queizy (app de inglês com IA; a tutora se chama Charlotte) para a equipe de produto.
Escreva em português do Brasil, com acentuação correta. Seja factual: use só o que está na conversa.

Responda SOMENTE um JSON com as chaves:
{
 "category": um de ${INSIGHT_CATEGORIES.join(', ')},
 "topic": assunto curto e normalizado, até 6 palavras, sem nome do aluno (ex.: "não encontra o XP", "Live Voice não conecta", "pedido de reembolso"),
 "screen": tela do app envolvida, um de ${INSIGHT_SCREENS.join(', ')},
 "sentiment": "positivo" | "neutro" | "negativo",
 "resolution": "ia" (a resposta automática resolveu), "humano" (um atendente resolveu), "sem_resposta" (ninguém respondeu de verdade) ou "em_aberto" (respondido, mas o problema continua),
 "summary": 1 frase sobre o que o aluno queria e como terminou,
 "faq_gap": true se a dúvida NÃO está bem coberta pelas perguntas da FAQ abaixo (ou a resposta automática errou, ficou genérica ou precisou de atendente para algo que poderia estar na FAQ); false caso contrário,
 "faq_question": se faq_gap, a pergunta como o aluno faria; senão "",
 "faq_answer": se faq_gap e houver mensagem de ATENDENTE com a explicação, escreva a resposta da FAQ reescrevendo o que o ATENDENTE disse (genérica, sem nome do aluno, em 1 a 4 frases); se nenhum ATENDENTE explicou, "" (nunca invente passos, preços ou políticas),
 "ux_issue": se a dúvida indica que algo no app é difícil de achar ou de entender (ex.: "não acha o nível na Tela Inicial"), descreva em 1 frase; senão "",
 "feature_request": se o aluno pediu uma função que não existe, descreva em 1 frase; senão ""
}

Perguntas que a FAQ já cobre:
${faqQuestions.map(q => `- ${q}`).join('\n')}`;
}

function transcript(msgs: Msg[]): string {
  const who: Record<string, string> = { user: 'ALUNO', agent: 'IA', human: 'ATENDENTE' };
  return msgs.map(m => `${who[m.author] ?? m.author}${m.intent ? ` [${m.intent}]` : ''}: ${m.body.slice(0, 1500)}`).join('\n\n').slice(0, 12000);
}

const pick = <T extends readonly string[]>(v: unknown, list: T, fallback: T[number]): T[number] =>
  (list as readonly string[]).includes(String(v)) ? (String(v) as T[number]) : fallback;
const str = (v: unknown, max = 400) => String(v ?? '').trim().slice(0, max) || null;

export async function analyzeConversation(conversationId: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;
  const supabase = getSupabaseAdmin();
  const [{ data: msgsRaw }, { data: conv }, { data: prev }] = await Promise.all([
    supabase.from('support_messages').select('direction, author, body, intent, created_at')
      .eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(60),
    supabase.from('support_conversations').select('user_id').eq('id', conversationId).maybeSingle(),
    supabase.from('support_insights').select('faq_status').eq('conversation_id', conversationId).maybeSingle(),
  ]);
  const msgs = (msgsRaw ?? []) as Msg[];
  if (!msgs.some(m => m.direction === 'in')) return false;

  const { questions } = await getSupportFaq();
  let j: Record<string, unknown> = {};
  try {
    const res = await aiFetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0.2, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: prompt(questions) }, { role: 'user', content: transcript(msgs) }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const json = await res.json();
    if (json.usage) logOpenAIUsage({ userId: (conv as { user_id: string | null } | null)?.user_id ?? null, endpoint: 'support-insights', model: MODEL, promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens, totalTokens: json.usage.total_tokens });
    j = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
  } catch (e) {
    console.error('[support-insights]', conversationId, e);
    return false;
  }

  const faqGap = j.faq_gap === true && !!str(j.faq_question);
  const prevStatus = (prev as { faq_status: string | null } | null)?.faq_status ?? null;
  // Sugestão já aprovada ou descartada no /admin não volta para a fila.
  const decided = prevStatus === 'approved' || prevStatus === 'dismissed';
  const row: Record<string, unknown> = {
    conversation_id: conversationId,
    analyzed_at: new Date().toISOString(),
    messages_count: msgs.length,
    category: pick(j.category, INSIGHT_CATEGORIES, 'outro'),
    topic: str(j.topic, 80),
    screen: pick(j.screen, INSIGHT_SCREENS, 'outro'),
    sentiment: pick(j.sentiment, ['positivo', 'neutro', 'negativo'] as const, 'neutro'),
    resolution: pick(j.resolution, ['ia', 'humano', 'sem_resposta', 'em_aberto'] as const, 'em_aberto'),
    summary: str(j.summary, 300),
    ux_issue: str(j.ux_issue, 300),
    feature_request: str(j.feature_request, 300),
    model: MODEL,
  };
  if (!decided) {
    row.faq_gap = faqGap;
    row.faq_question = faqGap ? str(j.faq_question, 200) : null;
    row.faq_answer = faqGap ? str(j.faq_answer, 2000) : null;
    row.faq_status = faqGap ? 'pending' : null;
  }
  const { error } = await supabase.from('support_insights').upsert(row as never, { onConflict: 'conversation_id' });
  if (error) { console.error('[support-insights] upsert', error.message); return false; }
  return true;
}

/** Analisa conversas paradas há 1 h sem análise (ou com mensagens novas desde a última). */
export async function analyzePendingConversations(limit = 25, budgetMs = 80_000): Promise<{ analyzed: number; pending: number }> {
  const t0 = Date.now();
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const idle = new Date(Date.now() - IDLE_MS).toISOString();
  const { data: convs } = await supabase.from('support_conversations').select('id, last_message_at')
    .gte('last_message_at', since).lte('last_message_at', idle)
    .order('last_message_at', { ascending: false }).limit(500);
  const list = (convs ?? []) as { id: string; last_message_at: string }[];
  if (!list.length) return { analyzed: 0, pending: 0 };
  const { data: done } = await supabase.from('support_insights').select('conversation_id, analyzed_at')
    .in('conversation_id', list.map(c => c.id));
  const at = new Map(((done ?? []) as { conversation_id: string; analyzed_at: string }[]).map(d => [d.conversation_id, d.analyzed_at]));
  const todo = list.filter(c => !at.has(c.id) || at.get(c.id)! < c.last_message_at);
  let analyzed = 0;
  // Teto de tempo: o agendador roda dentro de uma função de 120 s junto com as outras tarefas.
  for (const c of todo.slice(0, limit)) {
    if (Date.now() - t0 > budgetMs) break;
    if (await analyzeConversation(c.id)) analyzed++;
  }
  return { analyzed, pending: Math.max(0, todo.length - analyzed) };
}
