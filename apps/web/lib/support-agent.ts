// lib/support-agent.ts
// Núcleo do agente de suporte (canal-agnóstico). Recebe a mensagem do usuário +
// contexto + histórico, consulta a FAQ e decide: responder sozinho (só intents
// da whitelist — Fase 1) ou escalar para um humano.
import { SUPPORT_FAQ } from './support-faq';

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
]);

export interface SupportUserContext {
  identified: boolean;
  name?: string | null;
  email?: string | null;
  level?: string | null;              // Novice | Inter | Advanced
  subscription_status?: string | null;
  has_access?: boolean | null;
}

export interface SupportTurn { role: 'user' | 'assistant'; content: string; }

export interface AgentDecision {
  intent: string;
  reply: string;          // resposta em PT-BR (usada se auto_send)
  needsHuman: boolean;    // o modelo achou que precisa de humano
  reason: string;         // por que escalar (se aplicável)
  autoSend: boolean;      // decisão final: enviar automaticamente?
}

function systemPrompt(ctx: SupportUserContext): string {
  const who = ctx.identified
    ? `Usuário identificado: ${ctx.name ?? 'sem nome'} (${ctx.email ?? 'sem email'}), nível ${ctx.level ?? '—'}, assinatura "${ctx.subscription_status ?? '—'}", acesso ${ctx.has_access ? 'ativo' : 'inativo'}.`
    : 'Usuário NÃO identificado na base (não achamos o cadastro pelo contato).';

  return `Você é a atendente de suporte da Charlotte (app de inglês com IA da Hub Academy).
Fale em português do Brasil, com acentuação e gramática perfeitas, tom gentil, claro e objetivo.

REGRAS:
- Responda APENAS com base na FAQ abaixo. NUNCA invente preços, políticas ou passos que não estejam na FAQ.
- Se a dúvida não estiver claramente coberta pela FAQ, ou envolver ação na conta do usuário (reembolso, cobrança específica, exclusão de conta, problema técnico que você não resolve, reclamação/insatisfação), marque needsHuman=true.
- Seja breve (no máximo alguns parágrafos curtos). Não peça dados sensíveis (senha, cartão).
- ${who}

Classifique a intenção em UM destes intents:
reset_senha, como_cancelar, planos_precos, como_usar, restaurar_compra, acesso_login, saudacao, reembolso, cobranca, excluir_conta, bug_tecnico, reclamacao, outro.

Responda SOMENTE um JSON com as chaves:
{"intent": "<um dos intents>", "reply": "<resposta em PT-BR para o usuário>", "needsHuman": <true|false>, "reason": "<por que precisa de humano, ou vazio>"}

FAQ:
${SUPPORT_FAQ}`;
}

export async function runSupportAgent(input: {
  userText: string;
  history?: SupportTurn[];
  context: SupportUserContext;
}): Promise<AgentDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { intent: 'outro', reply: '', needsHuman: true, reason: 'OPENAI_API_KEY ausente', autoSend: false };
  }

  const messages = [
    { role: 'system', content: systemPrompt(input.context) },
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
    parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
  } catch (e) {
    return { intent: 'outro', reply: '', needsHuman: true, reason: `Falha no agente: ${e instanceof Error ? e.message : String(e)}`, autoSend: false };
  }

  const intent = String(parsed.intent ?? 'outro');
  const needsHuman = parsed.needsHuman === true;
  const reply = String(parsed.reply ?? '').trim();

  // Fase 1: só auto-envia se o modelo não pediu humano E o intent está na whitelist E há resposta.
  const autoSend = !needsHuman && AUTO_INTENTS.has(intent) && reply.length > 0;

  return {
    intent,
    reply,
    needsHuman,
    reason: String(parsed.reason ?? ''),
    autoSend,
  };
}
