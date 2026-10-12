// lib/support-agent.ts
// Núcleo do agente de suporte (canal-agnóstico). Recebe a mensagem do usuário +
// contexto + histórico, consulta a FAQ e decide: responder sozinho (só intents
// da whitelist — Fase 1) ou escalar para um humano.
import { getSupportFaq } from './support-faq';
import { logOpenAIUsage } from './openai-usage';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Intents que o agente PODE responder sozinho (Fase 1). Todo o resto escala.
export const AUTO_INTENTS = new Set([
  'reset_senha',
  'como_cancelar',
  'planos_precos',
  'como_usar',
  'restaurar_compra',
  'acesso_login',
  'saudacao',
  'onde_fica',      // onde encontrar algo no app (XP, nível, metas, Live Voice...)
  'problema_uso',   // algo não funciona como esperado e a FAQ tem o passo a passo
]);

export interface SupportUserContext {
  identified: boolean;
  name?: string | null;
  email?: string | null;
  level?: string | null;              // Novice | Inter | Advanced
  subscription_status?: string | null;
  has_access?: boolean | null;
  userId?: string | null;
  totalXP?: number | null;
  streakDays?: number | null;
  liveVoiceMinutesLeft?: number | null;
  platform?: string | null;           // ios | android
  appVersion?: string | null;
}

export interface SupportTurn { role: 'user' | 'assistant'; content: string; }

export interface AgentDecision {
  intent: string;
  reply: string;          // resposta em PT-BR (usada se auto_send)
  needsHuman: boolean;    // o modelo achou que precisa de humano
  reason: string;         // por que escalar (se aplicável)
  autoSend: boolean;      // decisão final: enviar automaticamente?
}

function systemPrompt(ctx: SupportUserContext, faq: string, channel?: string): string {
  const extra = ctx.identified ? [
    ctx.totalXP != null ? `XP total ${ctx.totalXP}` : null,
    ctx.streakDays != null ? `sequência de ${ctx.streakDays} dia(s)` : null,
    ctx.liveVoiceMinutesLeft != null ? `${ctx.liveVoiceMinutesLeft} min de Live Voice restantes neste mês` : null,
    ctx.platform ? `celular ${ctx.platform === 'ios' ? 'iPhone' : ctx.platform === 'android' ? 'Android' : ctx.platform}` : null,
    ctx.appVersion ? `app versão ${ctx.appVersion}` : null,
  ].filter(Boolean).join(', ') : '';
  const who = ctx.identified
    ? `Usuário identificado: ${ctx.name ?? 'sem nome'} (${ctx.email ?? 'sem email'}), nível ${ctx.level ?? '—'}, assinatura "${ctx.subscription_status ?? '—'}", acesso ${ctx.has_access ? 'ativo' : 'inativo'}${extra ? `; ${extra}` : ''}. Use esses dados quando ajudarem (ex.: "seu nível é Novice", "você tem 3 min de Live Voice").`
    : 'Usuário NÃO identificado na base (não achamos o cadastro pelo contato).';

  return `Você é a atendente de suporte do Queizy (app de inglês com IA da Hub Academy; antes se chamava Charlotte AI, e a tutora dentro do app se chama Charlotte).
Fale em português do Brasil, com acentuação e gramática perfeitas, tom gentil, claro e objetivo.

REGRAS:
- Responda APENAS com base na FAQ abaixo. NUNCA invente preços, políticas ou passos que não estejam na FAQ.
- Se a dúvida não estiver claramente coberta pela FAQ, ou envolver ação na conta do usuário (reembolso, cobrança específica, exclusão de conta, problema técnico que você não resolve, reclamação/insatisfação), marque needsHuman=true.
- Dúvidas de uso do app ("onde vejo meu XP", "não acho meu nível", "como ligo para a Charlotte", "não vejo tal tela") são respondidas com o "Guia do app" e os "Problemas comuns" da FAQ: diga onde fica, com os nomes e ícones exatos da FAQ, ou dê o passo a passo.
- Na PRIMEIRA vez que o usuário relata que algo não funciona ou não aparece (não vê o XP, não consegue ligar para a Charlotte, microfone não funciona etc.) e a FAQ tem o passo a passo: use problema_uso, responda com os passos e needsHuman=false. No fim, convide a responder se não resolver. Não escale nesse primeiro momento.
- Use os dados do usuário identificado para personalizar: diga o nível dele, o XP total atual, os minutos de Live Voice restantes e o tipo de celular (iPhone ou Android, mostrando só o caminho daquele sistema). Ex.: se ele tem 0 min de Live Voice, a causa provável é o fim dos minutos do mês.
- Se o usuário já tentou o passo a passo e continua com o problema, ou relata erro, travamento ou dado errado na conta (XP sumiu ou diminuiu, progresso perdido), use bug_tecnico e needsHuman=true.
- Se o usuário pede uma função que não existe na FAQ, não prometa nada: agradeça a sugestão, diga que vai para a equipe e use intent sugestao (needsHuman=false).
- Seja breve (no máximo alguns parágrafos curtos). Não peça dados sensíveis (senha, cartão).${channel === 'whatsapp' ? `
- Canal WhatsApp: mensagens curtas e diretas, sem títulos nem listas longas; use *negrito* só se ajudar. Se o usuário não foi identificado e o caso envolve a conta dele, peça o e-mail do cadastro no app.` : ''}
- ${who}

Classifique a intenção em UM destes intents:
reset_senha, como_cancelar, planos_precos, como_usar, onde_fica, problema_uso, restaurar_compra, acesso_login, saudacao, sugestao, reembolso, cobranca, excluir_conta, bug_tecnico, reclamacao, outro.

Responda SOMENTE um JSON com as chaves:
{"intent": "<um dos intents>", "reply": "<resposta em PT-BR para o usuário>", "needsHuman": <true|false>, "reason": "<por que precisa de humano, ou vazio>"}

FAQ:
${faq}`;
}

export async function runSupportAgent(input: {
  userText: string;
  history?: SupportTurn[];
  context: SupportUserContext;
  channel?: string;
}): Promise<AgentDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { intent: 'outro', reply: '', needsHuman: true, reason: 'OPENAI_API_KEY ausente', autoSend: false };
  }

  const { text: faq } = await getSupportFaq();
  const messages = [
    { role: 'system', content: systemPrompt(input.context, faq, input.channel) },
    ...(input.history ?? []).slice(-8),
    { role: 'user', content: input.userText },
  ];

  let parsed: { intent?: string; reply?: string; needsHuman?: boolean; reason?: string } = {};
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.usage) logOpenAIUsage({ userId: input.context.userId ?? null, endpoint: 'support-agent', model: MODEL, promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens, totalTokens: json.usage.total_tokens });
    parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
  } catch (e) {
    return { intent: 'outro', reply: '', needsHuman: true, reason: `Falha no agente: ${e instanceof Error ? e.message : String(e)}`, autoSend: false };
  }

  const intent = String(parsed.intent ?? 'outro');
  const needsHuman = parsed.needsHuman === true;
  const reply = String(parsed.reply ?? '').trim();

  // Só auto-envia se o modelo não pediu humano E o intent está na whitelist E há resposta.
  // Sugestão de função: agradece e registra (a análise da conversa leva para o /admin).
  const autoSend = !needsHuman && (AUTO_INTENTS.has(intent) || intent === 'sugestao') && reply.length > 0;

  return {
    intent,
    reply,
    needsHuman,
    reason: String(parsed.reason ?? ''),
    autoSend,
  };
}
