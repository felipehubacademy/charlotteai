// lib/support-agent.ts
import { aiFetch } from '@/lib/ai-models';
// Núcleo do agente de suporte (canal-agnóstico). Recebe a mensagem do usuário +
// contexto + histórico, consulta a FAQ e decide: responder sozinho (só intents
// da whitelist — Fase 1) ou escalar para um humano.
import { getSupportFaq } from './support-faq';
import { logOpenAIUsage } from './openai-usage';
import glossary from './app-ui-glossary.json';
import { resolveSupportEmailFix, type SupportFixResult } from './email-fix';
import { sendAccessLink, checkStoreSubscription } from './support-access';

const GLOSSARY = glossary as Record<string, string>;

const LABELS_BY_LENGTH = Object.keys(GLOSSARY).filter(k => k.length >= 3).sort((a, b) => b.length - a.length);
/** Troca rótulos do app citados entre aspas pelo nome em inglês ("Seu progresso" → "Your progress"). */
export function toEnglishLabels(text: string): string {
  return text.replace(/(["“'])([^"”'\n]{3,60})(["”'])/g, (all, open, label, close) => {
    const key = LABELS_BY_LENGTH.find(k => k.toLowerCase() === label.trim().toLowerCase());
    return key ? `${open}${GLOSSARY[key]}${close}` : all;
  });
}

/** Idioma de um texto curto do aluno (para mensagens geradas pelo código). */
export function guessLang(text: string, fallback: 'pt' | 'en' = 'pt'): 'pt' | 'en' {
  const t = ` ${text.toLowerCase()} `;
  if (/[ãõçáéíóúâêô]/.test(t) || /\s(não|nao|eu|meu|minha|você|voce|quero|preciso|obrigad[oa]|como|onde|tenho|está|esta|oi|olá|ola)\s/.test(t)) return 'pt';
  if (/\s(i|my|the|how|where|what|can't|cannot|please|thanks|hello|hi|need|want)\s/.test(t)) return 'en';
  return fallback;
}

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
  'encerramento',   // aluno agradece ou diz que resolveu: despedida e encerra o atendimento
  'reembolso',      // só quando a FAQ tem o caminho (needsHuman=false); o resto escala
  'excluir_conta',  // a FAQ tem o passo a passo; se não deu certo, o modelo marca needsHuman
  'email_errado',   // assinou pelo site com o e-mail errado: o código localiza, confere e corrige (lib/email-fix)
]);

// Status da assinatura em palavras (o modelo não sabe que "none" é a degustação).
function subscriptionLabel(s?: string | null): string {
  switch (s) {
    case 'none': case null: case undefined: case '':
      return 'degustação (conta sem assinatura: o primeiro módulo da trilha, 10 mensagens no Practice e 3 minutos de Live Voice, uma vez só; NÃO tem minutos mensais nem pode comprar pacotes de minutos; para continuar, assina um plano)';
    case 'trial': return '7 dias grátis de uma assinatura (5 minutos de Live Voice)';
    case 'active': return 'Premium ativo';
    case 'cancelled': return 'cancelada (renovação desligada; o acesso continua até o fim do período já pago)';
    case 'expired': return 'vencida (sem acesso; precisa assinar de novo)';
    case 'institutional': return 'Premium ativo';
    default: return `"${s}"`;
  }
}

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
  placementTestDone?: boolean | null;
  platform?: string | null;           // ios | android
  appVersion?: string | null;
  verified?: boolean;                 // confirmado pelo código do app (ou e-mail do próprio remetente)
  emailNotFound?: string | null;      // e-mail digitado que não tem cadastro
}

export interface SupportTurn { role: 'user' | 'assistant'; content: string; }

export interface AgentDecision {
  intent: string;
  reply: string;          // resposta ao aluno, no idioma da mensagem dele (usada se auto_send)
  lang: 'pt' | 'en';      // idioma em que a IA respondeu (= idioma da mensagem do aluno)
  needsHuman: boolean;    // o modelo achou que precisa de humano
  reason: string;         // por que escalar (se aplicável)
  autoSend: boolean;      // decisão final: enviar automaticamente?
}

interface Tone { firstName?: string | null; firstReply?: boolean }

function systemPrompt(ctx: SupportUserContext, faq: string, channel?: string, tone: Tone = {}, lang: 'pt' | 'en' = 'pt'): string {
  const extra = ctx.identified ? [
    ctx.totalXP != null ? `XP total ${ctx.totalXP}` : null,
    ctx.streakDays != null ? `sequência de ${ctx.streakDays} dia(s)` : null,
    ctx.liveVoiceMinutesLeft != null
      ? `${ctx.liveVoiceMinutesLeft} min de Live Voice restantes ${!ctx.subscription_status || ctx.subscription_status === 'none' ? '(da degustação, não renovam)' : 'neste mês'}`
      : null,
    ctx.placementTestDone != null ? (ctx.placementTestDone ? 'já fez o teste de nível' : 'ainda não fez o teste de nível') : null,
    ctx.platform ? `celular ${ctx.platform === 'ios' ? 'iPhone' : ctx.platform === 'android' ? 'Android' : ctx.platform}` : null,
    ctx.appVersion ? `app versão ${ctx.appVersion}` : null,
  ].filter(Boolean).join(', ') : '';
  const APP_BUTTON = 'no app, em Perfil > Ajuda > Ajuda e suporte > Falar no WhatsApp (assim a conta é reconhecida na hora)';
  const who = ctx.identified && ctx.verified !== false
    ? `Usuário identificado: ${ctx.name ?? 'sem nome'} (${ctx.email ?? 'sem email'}), nível ${ctx.level ?? '—'}, assinatura: ${subscriptionLabel(ctx.subscription_status)}, acesso ${ctx.has_access ? 'ativo' : 'inativo'}${extra ? `; ${extra}` : ''}. Use esses dados quando ajudarem (ex.: "seu nível é Novice", "você tem 3 min de Live Voice").`
    : ctx.identified
    ? `O contato digitou um e-mail que tem cadastro, mas isso NÃO comprova que é o dono da conta. NUNCA revele dados da conta (nome, nível, XP, minutos, assinatura, se a conta existe ou não). Dúvidas de uso: responda normalmente. Se ele só quer ver um dado da própria conta (nível, XP, minutos, sequência), diga onde ver no app, com o caminho da FAQ, needsHuman=false. Outro assunto da conta: diga que um atendente vai conferir, ou sugira chamar ${APP_BUTTON}.`
    : ctx.emailNotFound
    ? `O contato informou o e-mail "${ctx.emailNotFound}", que não bate com nenhum cadastro. NÃO diga se o e-mail tem ou não cadastro (isso revelaria quem usa o app): peça para conferir se é o mesmo e-mail que aparece no app, em Perfil (logo abaixo do nome), ou para chamar ${APP_BUTTON}.`
    : `Usuário NÃO identificado. Dúvidas de uso: responda sem pedir nada. Se o caso envolve a conta dele, peça o e-mail do cadastro no app ou sugira chamar ${APP_BUTTON}.`;

  // Mesmo no chat do app, quem fala é o suporte (a Charlotte é a tutora; não se apresentar como ela).
  const identity = `Você é a atendente de suporte do Queizy (app de inglês com IA da Hub Academy; antes se chamava Charlotte AI, e a tutora dentro do app se chama Charlotte). Você NÃO é a Charlotte: fale como a equipe de suporte do Queizy (pode usar "nós", "a gente").`;
  // Idioma da RESPOSTA = idioma da mensagem do aluno. Nomes de telas e botões = idioma do
  // celular dele, porque é o que aparece na tela (lang = idioma do aparelho; WhatsApp/e-mail: pt).
  const shown = lang === 'en'
    ? Object.entries(GLOSSARY).filter(([pt]) => pt.length >= 3 && faq.includes(pt)).slice(0, 150)
    : [];
  const language = `Responda no MESMO idioma da última mensagem do usuário: português do Brasil (com acentuação e gramática perfeitas) ou inglês natural. Tom gentil, claro e objetivo. A FAQ está em português; se responder em inglês, traduza os fatos.
${lang === 'en'
    ? `O celular do usuário está em INGLÊS: ao citar telas, botões e menus, use SEMPRE o nome em inglês que aparece no app, mesmo respondendo em português (ex.: "toque em \"Your progress\""). Nomes no app (português → inglês):
${shown.map(([pt, en]) => `${pt} → ${en}`).join('\n')}`
    : 'Ao citar telas, botões e menus, use os nomes exatos da FAQ (é como aparecem no app).'}
`;
  return `${identity}
${language}

REGRAS:
- Responda APENAS com base na FAQ abaixo. NUNCA invente preços, políticas ou passos que não estejam na FAQ.
- Se a resposta está na FAQ, mesmo que em outras palavras ou espalhada em mais de um item, responda (ex.: quem assinou pelo site usa o app em qualquer celular entrando com o mesmo e-mail). Se o assunto NÃO aparece na FAQ, NÃO deduza, não "chute" pelo bom senso e não sugira caminhos para o aluno descobrir sozinho: diga em uma frase que vai confirmar com a equipe, needsHuman=true, intent outro. (Ex.: uma política, prazo ou função que não aparece em nenhum item da FAQ.) Pedido de função nova ou de outro curso ("vocês podiam ter...", "vai ter espanhol?") não é dúvida: siga a regra de sugestão abaixo.
- Mensagem vaga, sem pergunta concreta ("uma informação", "tenho uma dúvida", "preciso de ajuda", "oi, tudo bem?", "é sobre pagamento"): NÃO abra chamado. Use intent saudacao, needsHuman=false, e pergunte em uma frase qual é a dúvida. Vale também quando falta um detalhe para responder (ex.: em qual parte do app o problema acontece).
- Pedido para falar com uma pessoa ("atendente", "quero falar com um humano"): needsHuman=true, intent outro, mesmo sem outra pergunta.
- Empresas, escolas, parcerias, imprensa ou quem quer ser afiliado/parceiro: needsHuman=true, intent outro (a equipe responde).
- Não presuma nada que não está nos dados do usuário (ex.: se já fez o teste de nível, onde assinou). Quando a resposta depende de onde ele assinou (App Store, Google Play ou site queizy.com) e isso não está claro, dê os caminhos de forma curta ou pergunte onde assinou.
- Se a FAQ já explica como o próprio usuário resolve (ex.: pedir reembolso da assinatura do site pelo app, cancelar, restaurar compra), responda com o passo a passo e needsHuman=false, mesmo que o assunto seja reembolso ou cobrança.
- Marque needsHuman=true só quando a FAQ não cobre a dúvida, ou quando é preciso alguém agir na conta: o passo a passo da FAQ não funcionou, cobrança indevida ou contestada, reembolso fora do prazo, recusado ou já pedido que não chegou, exclusão de conta que não deu certo, problema técnico que você não resolve, reclamação ou insatisfação.
- Dúvidas de uso do app ("onde vejo meu XP", "não acho meu nível", "como ligo para a Charlotte", "não vejo tal tela") são respondidas com o "Guia do app" e os "Problemas comuns" da FAQ: diga onde fica, com os nomes e ícones exatos da FAQ, ou dê o passo a passo.
- Na PRIMEIRA vez que o usuário relata que algo não funciona ou não aparece (não vê o XP, não consegue ligar para a Charlotte, microfone não funciona etc.) e a FAQ tem o passo a passo: use problema_uso, responda com os passos e needsHuman=false. No fim, convide a responder se não resolver. Não escale nesse primeiro momento.
- Use os dados do usuário identificado para personalizar: diga o nível dele, o XP total atual, os minutos de Live Voice restantes e o tipo de celular (iPhone ou Android, mostrando só o caminho daquele sistema). Ex.: se ele tem 0 min de Live Voice, a causa provável é o fim dos minutos do mês.
- Se o usuário já tentou o passo a passo e continua com o problema, ou relata erro, travamento ou dado errado na conta (XP sumiu ou diminuiu, progresso perdido), use bug_tecnico e needsHuman=true.
- Assinou pelo site (queizy.com/assinar) e digitou o e-mail errado, ou pagou pelo site e não recebeu o acesso / não consegue entrar porque o e-mail estava errado: intent email_errado, needsHuman=false. Preencha "emailFix" com o que a pessoa disse em TODA a conversa: correctEmail (o e-mail certo dela), wrongEmail (o que foi digitado na compra, se souber), fullName (nome completo usado no pagamento) e cardLast4 (só os 4 últimos dígitos do cartão, se pagou no cartão). Campo não informado = null. NUNCA peça o número inteiro do cartão, CPF ou senha. O "reply" pode ficar vazio: o sistema confere a compra e responde.
- Esqueceu a senha, não consegue entrar ou não recebeu o e-mail para criar a senha: intent reset_senha (ou acesso_login), needsHuman=false. Preencha "accessEmail" com o e-mail que a pessoa diz usar na conta (null se não disse). O sistema manda o link para esse e-mail e responde.
- Assinou pelo app (App Store ou Google Play) e o acesso não foi liberado / continua bloqueado: intent restaurar_compra, needsHuman=false, e responda com o passo a passo da FAQ (Restaurar compras). O sistema também confere a assinatura na loja.
- Se o usuário pede uma função que não existe na FAQ, não prometa nada: agradeça a sugestão, diga que vai para a equipe e use intent sugestao (needsHuman=false).
- Seja breve (no máximo alguns parágrafos curtos). Texto corrido, sem Markdown (sem **, # ou listas com marcação), salvo onde dito abaixo. Não peça dados sensíveis (senha, cartão).
- Tom humano e acolhedor, como uma pessoa da equipe (sem parecer robô, sem repetir frases prontas).${tone.firstReply ? `
- Esta é a primeira resposta do atendimento: comece cumprimentando, no idioma da resposta${tone.firstName ? `, pelo primeiro nome ("Oi, ${tone.firstName}!" ou "Hi, ${tone.firstName}!")` : ' ("Oi!" ou "Hi!")'}.` : `
- O atendimento já começou: não cumprimente de novo nem repita o nome.`}
- Quando responder uma dúvida (needsHuman=false, intent diferente de encerramento), a ÚLTIMA frase da resposta TEM de ser UMA pergunta curta terminando com "?", para saber se resolveu, variando a forma (ex.: "Consegui ajudar?", "Ficou alguma dúvida?", "Deu certo por aí?"). Não termine com "Se precisar, é só avisar" nem frase parecida.
- Se o usuário só agradece ou diz que resolveu ("obrigado", "era isso", "resolveu", "valeu"), use intent encerramento: despeça-se em uma frase curta (ex.: "Que bom! Se precisar, é só chamar por aqui.") sem pergunta no fim, needsHuman=false.${channel === 'whatsapp' || channel === 'app' || channel === 'instagram' ? `
- Canal ${channel === 'instagram' ? 'Direct do Instagram' : 'WhatsApp ou chat do app'}: mensagens curtas e diretas, sem títulos nem listas longas.${channel === 'whatsapp' ? ' Use *negrito* só se ajudar.' : ' Não use asteriscos nem nenhuma marcação (a conversa mostra texto puro).'}` : ''}
- ${who}

Classifique a intenção em UM destes intents:
reset_senha, como_cancelar, planos_precos, como_usar, onde_fica, problema_uso, restaurar_compra, acesso_login, saudacao, sugestao, encerramento, reembolso, cobranca, excluir_conta, email_errado, bug_tecnico, reclamacao, outro.

Responda SOMENTE um JSON com as chaves:
{"intent": "<um dos intents>", "reply": "<resposta para o usuário, no idioma da mensagem dele>", "lang": "pt" | "en" (idioma da sua resposta), "needsHuman": <true|false>, "reason": "<por que precisa de humano, ou vazio>", "emailFix": {"correctEmail": null, "wrongEmail": null, "fullName": null, "cardLast4": null} (só no intent email_errado), "accessEmail": null (só em reset_senha / acesso_login)}

FAQ:
${faq}`;
}

export async function runSupportAgent(input: {
  userText: string;
  history?: SupportTurn[];
  context: SupportUserContext;
  channel?: string;
  firstName?: string | null;   // primeiro nome (ex.: perfil do WhatsApp)
  firstReply?: boolean;        // primeira resposta do atendimento: cumprimenta pelo nome
  lang?: 'pt' | 'en';          // idioma da resposta (chat do app segue o idioma do aparelho)
  contactEmail?: string | null; // canal e-mail: o remetente (é o e-mail certo de quem comprou com o errado)
}): Promise<AgentDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { intent: 'outro', reply: '', lang: guessLang(input.userText, input.lang ?? 'pt'), needsHuman: true, reason: 'OPENAI_API_KEY ausente', autoSend: false };
  }

  const { text: faq } = await getSupportFaq();
  const messages = [
    { role: 'system', content: systemPrompt(input.context, faq, input.channel, { firstName: input.firstName, firstReply: input.firstReply }, input.lang ?? 'pt') },
    ...(input.history ?? []).slice(-8),
    { role: 'user', content: input.userText },
  ];

  let parsed: { intent?: string; reply?: string; lang?: string; needsHuman?: boolean; reason?: string; emailFix?: Record<string, string | null>; accessEmail?: string | null } = {};
  try {
    const res = await aiFetch(OPENAI_URL, {
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
    return { intent: 'outro', reply: '', lang: guessLang(input.userText, input.lang ?? 'pt'), needsHuman: true, reason: `Falha no agente: ${e instanceof Error ? e.message : String(e)}`, autoSend: false };
  }

  const intent = String(parsed.intent ?? 'outro');
  let needsHuman = parsed.needsHuman === true;
  let reply = String(parsed.reply ?? '').trim();
  let reason = String(parsed.reason ?? '');
  const replyLang: 'pt' | 'en' = parsed.lang === 'en' || parsed.lang === 'pt' ? parsed.lang : guessLang(input.userText, input.lang ?? 'pt');

  // Senha / acesso: manda o link para o próprio e-mail da conta. A resposta não diz se o e-mail tem conta.
  if ((intent === 'reset_senha' || intent === 'acesso_login') && !needsHuman) {
    const email = (parsed.accessEmail || input.contactEmail || (input.context.verified !== false ? input.context.email : null) || '').trim();
    if (!email) {
      reply = replyLang === 'en'
        ? 'I can send you a link to create a new password right now. What email do you use in the app?'
        : 'Consigo te mandar agora um link para criar uma senha nova. Qual é o e-mail que você usa no app?';
    } else {
      const r = await sendAccessLink(email).catch(() => 'failed' as const);
      if (r === 'failed') { needsHuman = true; reason = `Falha ao mandar o link de acesso para ${email}.`; }
      else if (r === 'invalid') {
        reply = replyLang === 'en' ? 'That email looks incomplete. Could you send it again?' : 'Esse e-mail parece incompleto. Pode mandar de novo?';
      } else {
        reply = replyLang === 'en'
          ? `Done! If ${email} is the email on your account, we just sent it a link to create a new password (check spam and promotions too). Then sign in to the app with this email. If nothing arrives in a few minutes, the account may use another email: tell me which one.`
          : `Pronto! Se ${email} for o e-mail da sua conta, acabamos de mandar para ele um link para criar uma senha nova (confira também o spam e as promoções). Depois é só entrar no app com esse e-mail. Se não chegar nada em alguns minutos, a conta pode estar em outro e-mail: me diga qual.`;
      }
    }
  }

  // Assinatura da loja não liberou: confere no RevenueCat e libera na hora, se estiver ativa.
  if (intent === 'restaurar_compra' && !needsHuman && input.context.userId) {
    const r = await checkStoreSubscription(input.context.userId).catch(() => ({ status: 'unavailable' as const }));
    const verified = input.context.verified !== false;
    if (r.status === 'activated' || r.status === 'already_active') {
      reply = verified
        ? (replyLang === 'en'
          ? 'I checked your subscription in the store and it is active: your access is released. Close the app completely and open it again.'
          : 'Conferi a sua assinatura na loja e ela está ativa: o acesso já está liberado. Feche o app por completo e abra de novo.')
        : (replyLang === 'en'
          ? 'Done: we checked and updated the access for this account. Close the app completely and open it again.'
          : 'Pronto: conferimos e atualizamos o acesso dessa conta. Feche o app por completo e abra de novo.');
    }
    // not_found / expired / unavailable: fica o passo a passo da FAQ (Restaurar compras).
  }

  // E-mail errado na compra pelo site: o código localiza a compra, confere que é da pessoa e corrige.
  if (intent === 'email_errado') {
    const f = parsed.emailFix ?? {};
    const fix: SupportFixResult = await resolveSupportEmailFix({
      correctEmail: f.correctEmail || input.contactEmail || null,
      wrongEmail: f.wrongEmail ?? null, fullName: f.fullName ?? null, cardLast4: f.cardLast4 ?? null,
    }).catch(e => ({ status: 'escalate' as const, reason: `Falha ao conferir: ${e instanceof Error ? e.message : String(e)}` }));
    if (fix.status === 'fixed') {
      needsHuman = false;
      reply = replyLang === 'en'
        ? `Done! We found your purchase and changed your account email to ${fix.email}. We just sent the link to create your password to that address: then sign in to the app with this email.`
        : `Pronto! Encontramos a sua compra e corrigimos o e-mail da conta para ${fix.email}. Acabamos de mandar para ele o link para criar a senha: depois é só entrar no app com esse e-mail.`;
    } else if (fix.status === 'need_info') {
      needsHuman = false;
      const askEmail = fix.missing.includes('correctEmail');
      reply = replyLang === 'en'
        ? `I can fix that. To find your purchase and confirm it's yours, please send me${askEmail ? ' your correct email,' : ''} the email typed at checkout (even if it was wrong), the full name used for the payment and, if you paid by card, only the last 4 digits of the card.`
        : `Consigo resolver isso. Para eu achar a sua compra e confirmar que é sua, me mande${askEmail ? ' o seu e-mail certo,' : ''} o e-mail que foi digitado na compra (mesmo errado), o nome completo usado no pagamento e, se pagou no cartão, só os 4 últimos dígitos dele.`;
    } else {
      needsHuman = true;
      reason = `E-mail errado na compra pelo site: ${fix.reason}`;
    }
  }

  // Só auto-envia se o modelo não pediu humano E o intent está na whitelist E há resposta.
  // Sugestão de função: agradece e registra (a análise da conversa leva para o /admin).
  const autoSend = !needsHuman && (AUTO_INTENTS.has(intent) || intent === 'sugestao') && reply.length > 0;
  // Celular em inglês: telas e botões citados entre aspas saem com o nome que aparece no app.
  let finalReply = input.lang === 'en' ? toEnglishLabels(reply) : reply;
  // Resposta a uma dúvida termina com uma pergunta (mantém a conversa e mostra se resolveu).
  if (autoSend && !['encerramento', 'saudacao', 'sugestao', 'email_errado'].includes(intent) && !/\?\s*$/.test(reply)) {
    const asks = replyLang === 'en'
      ? ['Did that help?', 'Any other questions?', 'Did it work?', 'Is that what you needed?']
      : ['Consegui ajudar?', 'Ficou alguma dúvida?', 'Deu certo por aí?', 'Era isso que você precisava?'];
    finalReply = `${finalReply.replace(/\s*(Se precisar[^.!?]*[.!]|Qualquer (coisa|dúvida)[^.!?]*[.!])\s*$/i, '').trim()}\n\n${asks[Math.floor(Math.random() * asks.length)]}`;
  }

  return {
    intent,
    reply: finalReply,
    lang: replyLang,
    needsHuman,
    reason,
    autoSend,
  };
}
