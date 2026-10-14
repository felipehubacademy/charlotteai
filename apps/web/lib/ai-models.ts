// lib/ai-models.ts — ponto único dos modelos de texto da OpenAI.
//
// O código chama os nomes antigos (gpt-4o-mini, gpt-4.1-mini, gpt-4o). Aqui decidimos para qual
// modelo cada um vai de verdade (MODEL_REMAP) e adaptamos os parâmetros que os modelos novos não
// aceitam. A OpenAI desliga gpt-4o, gpt-4o mini, gpt-4.1 e gpt-4.1 mini em 14/01/2027
// (substituto indicado: gpt-6-luna).
//
// Trocar de modelo = mudar MODEL_REMAP (ou a env AI_MODEL_REMAP, ex.: "gpt-4o-mini=gpt-6-luna,gpt-4o=gpt-6-luna").
// Todas as chamadas passam por aiFetch: SDK (new OpenAI({ fetch: aiFetch })) e fetch direto.

const DEFAULT_REMAP: Record<string, string> = {
  // Virada em 2026-10-14, depois do teste lado a lado (qualidade igual ou melhor, mais barato).
  // Para voltar um modelo: AI_MODEL_REMAP na Vercel, ex.: "gpt-4o-mini=gpt-4o-mini".
  'gpt-4o-mini': 'gpt-6-luna',
  'gpt-4.1-mini': 'gpt-6-luna',
  'gpt-4o': 'gpt-6-luna',
};

function envRemap(): Record<string, string> {
  const raw = process.env.AI_MODEL_REMAP ?? '';
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [from, to] = pair.split('=').map(s => s?.trim());
    if (from && to) out[from] = to;
  }
  return out;
}

/** Mapa em vigor (lido a cada chamada: a env muda sem novo deploy de código). */
export function modelRemap(): Record<string, string> {
  return { ...DEFAULT_REMAP, ...envRemap() };
}

/** Modelo que de fato atende quem pediu `model`. */
export function resolveModel(model: string): string {
  return modelRemap()[model] ?? model;
}

/**
 * Transcrição do áudio do aluno. A OpenAI desliga whisper-1 e gpt-4o-transcribe em 26/02/2027;
 * gpt-transcribe é o substituto (US$ 0,0045/min, mais barato que o whisper). Ele só aceita
 * response_format json/text (sem verbose_json); a duração vem em usage.seconds.
 * Voltar sem deploy: env TRANSCRIBE_MODEL=whisper-1.
 */
export const transcribeModel = () => process.env.TRANSCRIBE_MODEL || 'gpt-transcribe';

/** Segundos de áudio cobrados, de qualquer formato de resposta (json novo ou verbose_json antigo). */
export function transcribedSeconds(t: unknown): number {
  const r = t as { duration?: number; usage?: { seconds?: number } };
  return r?.usage?.seconds ?? r?.duration ?? 0;
}

/** Família nova (gpt-5 em diante): sem temperature/top_p customizados e com max_completion_tokens. */
export function isReasoningModel(model: string): boolean {
  return /^(gpt-5|gpt-6|o\d)/.test(model);
}

/** Ajusta o corpo de /v1/chat/completions para o modelo de destino. */
export function adaptChatBody<T extends Record<string, any>>(body: T): T {
  if (!body || typeof body.model !== 'string') return body;
  const target = resolveModel(body.model);
  const out: Record<string, any> = { ...body, model: target };
  if (isReasoningModel(target)) {
    delete out.temperature;
    delete out.top_p;
    delete out.presence_penalty;
    delete out.frequency_penalty;
    if (out.max_tokens != null && out.max_completion_tokens == null) out.max_completion_tokens = out.max_tokens;
    delete out.max_tokens;
    // Respostas curtas e rápidas, como os modelos antigos: sem raciocínio longo.
    if (out.reasoning_effort == null) out.reasoning_effort = 'none';
    // Os modelos novos gostam de **negrito**; o app mostra texto puro. Avisa uma vez, no topo.
    if (Array.isArray(out.messages)) {
      out.messages = [{ role: 'system', content: 'Write plain text only: never use Markdown (no **, no #, no bullet markup) unless the instructions below explicitly ask for it.' }, ...out.messages];
    }
  }
  return out as T;
}

/** fetch que adapta as chamadas de chat; o resto passa direto. */
export const aiFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (url.includes('/chat/completions') && init?.body && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body);
      const next = JSON.stringify(adaptChatBody(body));
      if (next === init.body) return fetch(input, init);
      // O corpo mudou de tamanho: tira o content-length antigo (o fetch recalcula).
      const headers = new Headers(init.headers);
      headers.delete('content-length');
      if (!process.env.AI_DEBUG) return fetch(input, { ...init, headers, body: next });
      const t = Date.now(); const res = await fetch(input, { ...init, headers, body: next });
      const j = await res.clone().json().catch(() => ({}));
      try {
        const b = JSON.parse(next) as Record<string, any>;
        const sys = String(b.messages?.[0]?.content ?? '').slice(0, 50).replace(/\s+/g, ' ');
        console.log('[AI_DEBUG]', b.model, b.response_format?.type ?? 'text', Date.now() - t, 'ms', 'in', j?.usage?.prompt_tokens, 'out', j?.usage?.completion_tokens, '|', sys);
      } catch { /* só diagnóstico */ }
      return res;
    } catch { /* corpo não-JSON: segue igual */ }
  }
  return fetch(input, init);
};
