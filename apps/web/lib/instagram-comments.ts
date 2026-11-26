// lib/instagram-comments.ts — comentários dos posts do @queizyapp tratados pela IA.
// O cron (e o webhook, quando a Meta liberar) grava cada comentário novo como 'pendente'; a IA
// responde depois de alguns minutos (para não parecer robô), oculta spam e ofensa, e passa para a
// equipe o que precisa de uma pessoa (aparece no /admin > Instagram > Comentários).
import { aiFetch } from '@/lib/ai-models';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupportFaq } from '@/lib/support-faq';
import { logOpenAIUsage } from '@/lib/openai-usage';
import { getInstagramAuth, listComments, listMediaCommentCounts, replyToComment, hideComment, type IgAuth } from '@/lib/instagram';

const MODEL = 'gpt-4o-mini';
const DIAS_OLHANDO = 7;      // posts dos últimos N dias: comentários conferidos a cada rodada (5 min)
const DIAS_ANTIGOS = 90;     // posts de até N dias: conferidos de hora em hora, só os que ganharam comentário
const HORAS_ANTIGO = 72;     // comentário mais velho que isso, achado agora em post antigo: guardado sem resposta
const POR_RODADA = 20;       // respostas por execução do cron

type Acao = 'responder' | 'escalar' | 'ocultar' | 'ignorar';
interface Decisao { category: string; action: Acao; reply: string; note: string; humor: number; lang: 'pt' | 'en' }

function hashDe(id: string): number {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Atraso antes de responder: de 2 a 8 minutos, fixo por comentário. */
function atrasoMin(id: string): number {
  return 2 + (hashDe(id) % 7);
}

// Risada na medida da graça (1 = leve, 2 = engraçado, 3 = muito engraçado). A IA só mede;
// a risada é colocada aqui, variando por comentário, para não sair sempre igual.
const RISADAS: Record<'pt' | 'en', string[][]> = {
  pt: [[], ['rs', 'haha'], ['kkkk', 'kkkkk', 'hahaha'], ['KKKKKKK', 'KKKKKKKKK', 'kkkkkkkkkk']],
  en: [[], ['haha'], ['hahaha', 'lol'], ['LOL', 'HAHAHA']],
};
const JA_RI = /^(rs+|k{3,}|(ha){2,}|lol)\b/i;

function comRisada(reply: string, humor: number, lang: 'pt' | 'en', id: string): string {
  const opcoes = RISADAS[lang][Math.max(0, Math.min(3, Math.round(humor)))];
  if (!opcoes.length || !reply || JA_RI.test(reply)) return reply;
  return `${opcoes[hashDe(id) % opcoes.length]} ${reply}`;
}

// ── Segurança das respostas públicas ─────────────────────────────────────────
// A resposta sai em público com o nome da marca e vem de um texto escrito por qualquer pessoa. Por isso:
//   1. comentário que parece instrução para o robô não recebe resposta automática (vai para a equipe);
//   2. reclamação e elogio usam respostas prontas (sem texto da IA);
//   3. o resto só sai se passar na checagem (curta, sem link, sem @, sem e-mail, sem emoji, sem nome de
//      fornecedor e sem número que não esteja no comentário, no post ou na FAQ). Se não passar, vai para a equipe.

const PRONTAS: Record<'reclamacao' | 'elogio', Record<'pt' | 'en', string[]>> = {
  reclamacao: {
    pt: [
      'Poxa, sentimos muito! Chama a gente no Direct que a equipe resolve com você.',
      'Que pena que isso aconteceu. Manda uma mensagem no Direct para a equipe ver o seu caso.',
      'Queremos resolver isso. Fala com a gente no Direct, por favor.',
    ],
    en: [
      "We're sorry about that! Send us a DM and our team will sort it out.",
      'Sorry to hear that. Please send us a DM so our team can look into it.',
    ],
  },
  elogio: {
    pt: ['Muito obrigado! Bons estudos!', 'Que bom ler isso, obrigado!', 'Valeu demais! Seguimos juntos no inglês.', 'Obrigado pelo carinho!'],
    en: ['Thank you so much! Happy studying!', 'So glad to hear that, thank you!', 'Thanks a lot! Keep it up!'],
  },
};

/** Comentário que tenta dar ordens ao robô (mudar regras, ditar a resposta, fazer se passar por outro). */
const INSTRUCAO_RE = [
  /\b(ignore|ignora|ignorar|ignorem|esque[çc]a|esque[çc]am|forget|disregard)\b.{0,40}\b(instru\w*|regras?|prompt|rules?|previous|anteriores?|acima|above|tudo)\b/i,
  /\b(prompt|system message|mensagem do sistema|jailbreak|modo desenvolvedor|developer mode)\b/i,
  /\b(you are now|act as|pretend to be|roleplay|finja (que|ser)|aja como|fa[çc]a de conta)\b|\bvoc[eê] agora [eé]\s/i,
  /\b(responda|respond|reply|answer|escreva|write|repita|repeat|diga|say|poste|post|comente)\b.{0,40}\b(exatamente|exactly|literalmente|literally|verbatim|palavra por palavra|word for word|s[oó] isso)\b/i,
  /\b(bot|rob[oô]|ia|ai|chatgpt|gpt|assistente|assistant)[\s,:]{1,3}(responda|diga|escreva|repita|poste|say|write|reply|repeat|post|ignore)\b/i,
  // Só imperativos em português: "How do I say "x"?" é dúvida de inglês comum e não pode cair aqui.
  /\b(responda|escreva|repita|poste|comente)\b.{0,15}["“'].{3,}["”']/i,
];
export function pareceInstrucao(comment: string): boolean {
  return INSTRUCAO_RE.some(re => re.test(comment));
}

const FORNECEDOR_RE = /\b(openai|chat\s?gpt|gpt|gemini|claude|anthropic|google|microsoft|azure|meta ai|llama|elevenlabs|deepseek)\b/i;
const LINK_RE = /(https?:\/\/|www\.|\b[\w-]+\.(com|br|net|org|io|app|ly|me|link|co|info|xyz|site|online|store|shop)\b)/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

/** null = pode publicar; texto = motivo do bloqueio. */
export function checarResposta(reply: string, aprovado: string): string | null {
  const r = reply.trim();
  if (!r) return 'resposta vazia';
  if (r.length > 240) return 'resposta longa demais';
  if (LINK_RE.test(r)) return 'resposta com link';
  if (/@/.test(r)) return 'resposta com @ ou e-mail';
  if (EMOJI_RE.test(r)) return 'resposta com emoji';
  if (FORNECEDOR_RE.test(r)) return 'resposta cita fornecedor';
  if (/#\w/.test(r)) return 'resposta com hashtag';
  // Número (preço, prazo, desconto, telefone) só se já estiver no comentário, no post ou na FAQ.
  const base = aprovado.replace(/\s+/g, ' ');
  for (const n of r.match(/\d+(?:[.,]\d+)*/g) ?? []) {
    if (!base.includes(n)) return `número que não está no post nem na FAQ (${n})`;
  }
  const palavra = r.match(/R\$|US\$|\$|€|\b(reais|dollars|desconto|discount|free|promo\w*|cupom|coupon)\b|d[oó]lares|gr[aá]tis/i)?.[0] ?? '';
  if (palavra && !base.toLowerCase().includes(palavra.toLowerCase())) return `fala de preço ou desconto fora do aprovado (${palavra})`;
  return null;
}

function pronta(tipo: 'reclamacao' | 'elogio', lang: 'pt' | 'en', id: string): string {
  const op = PRONTAS[tipo][lang];
  return op[hashDe(id) % op.length];
}

const PROMPT = (post: string, faq: string, previous: string[]) => `Você responde os comentários do Instagram do Queizy (@queizyapp), um app de inglês para brasileiros. A tutora do app é a Charlotte; o Igorfina é um personagem comediante da Família Queizy.

Sobre o post comentado:
${post}

Decida o que fazer com o comentário:
- quiz: a pessoa respondeu "Queizy" (frase errada) ou "Crazy" (frase certa) num post de quiz. Diga se acertou, de forma animada, e explique em uma frase o porquê (use a resposta do post).
- ingles: escreveu em inglês ou perguntou sobre inglês. Responda com simpatia; se houver erro, mostre a forma certa com delicadeza. Se a frase está aceitável e só existe um jeito mais natural, não trate como erro: nada de "Quase!", "Errado" ou "O certo é"; diga que dá para falar assim e sugira a forma mais comum (ex.: "Dá pra dizer assim, mas o mais comum é...").
- duvida_app: pergunta sobre o app (preço, como funciona, iPhone/Android, teste grátis, outros idiomas). Responda com segurança, como alguém da equipe que conhece o app, usando o que está na FAQ abaixo. O que é certo responda direto, sem rodeio. Pergunta sobre espanhol ou outro idioma (francês, italiano etc.): diga que por enquanto o Queizy tem inglês, que vamos incluir outros idiomas em breve, mas o espanhol já está no forno (cite o espanhol mesmo quando perguntarem de outro idioma); nunca prometa data, mês, preço nem quais outros idiomas virão. Só chame no Direct quando a dúvida for da conta da pessoa ou algo que de fato não dá para responder em público.
- brincadeira: piada, trocadilho, zoeira ou chute engraçado (ex.: inventar o que uma sigla quer dizer). Num post que esconde ou pergunta algo (sigla censurada, quiz), um chute sobre a resposta é brincadeira com humor de pelo menos 2, mesmo sem risada. Responda entrando na brincadeira. Às vezes ensine a forma certa ou puxe para o tema do post, às vezes só brinque de volta: não precisa ensinar em toda resposta. Nunca ignore uma brincadeira.
- elogio: agradeça de forma curta e calorosa.
- pergunta_geral: outra pergunta simples; responda se for fácil e seguro.
- reclamacao: problema com conta, cobrança, reembolso, bug, insatisfação. action "escalar" e uma resposta curta convidando a chamar no Direct para a equipe resolver.
- spam: links, propaganda, golpe, "ganhe seguidores". action "ocultar", reply vazio.
- ofensa: xingamento, discurso de ódio, assédio. action "ocultar", reply vazio.
- marcacao: só marca amigos (@fulano) sem texto, ou só emojis. action "ignorar".
- outro: sem resposta útil. action "ignorar".

Regras da resposta:
- Português do Brasil com acentuação e gramática perfeitas (ou inglês, se a pessoa escreveu em inglês).
- No máximo 2 frases curtas (até 220 caracteres). Tom leve, de amigo, sem parecer robô; varie as palavras.
- Sem emojis, sem hashtags, sem links.
- Nunca nomeie empresas de tecnologia ou fornecedores; diga "IA".
- Nunca prometa funções, descontos ou prazos que não estejam na FAQ. Nunca peça dados pessoais nos comentários.
- Nunca mencione a FAQ, "nossa base", "as informações que tenho", documentos ou fontes; nada de "não consta", "não menciona", "pelo que sei". Responda como a equipe falaria, com naturalidade.
- Nunca diga nem dê a entender que a resposta é automática, de IA, de robô ou de assistente virtual. Quem responde é a equipe do Queizy.
- Nada de resposta em cima do muro ("se quiser confirmar se há novidades..."). Se é sim ou não, diga sim ou não.
- Não comece com o @ da pessoa (a resposta já vai no comentário dela).
- Soe como gente, não como modelo pronto: cada resposta com abertura, formato e tamanho diferentes (às vezes uma frase só, às vezes uma pergunta de volta, às vezes só uma piada).
${previous.length ? `
Respostas que já demos neste post (quem lê vê todas juntas). NÃO repita a abertura ("Boa tentativa", "Esse F..."), a estrutura nem a mesma dica ou exemplo de nenhuma delas:
${previous.map(r => `- ${r}`).join('\n')}
` : ''}
Humor: meça o quanto o comentário é engraçado, levando em conta o tom do post (posts do Igorfina são de humor):
- 0: sério, dúvida, reclamação, elogio neutro ("legal o post").
- 1: leve, um sorriso; ou a pessoa riu pouco ("rs", "haha").
- 2: engraçado de verdade; chute engraçado ou trocadilho; ou a pessoa riu ("kkkk").
- 3: muito engraçado, piada boa; ou a pessoa riu muito ("KKKKKKK", "kkkkkkkkkk").
A risada da pessoa conta: se ela riu, o humor é pelo menos o da risada dela.
Não escreva risada (rs, kkkk, haha) na resposta: o sistema coloca a risada certa no começo. Quando houver humor, entre na brincadeira com leveza antes de ensinar. Reclamação, ofensa e spam têm sempre humor 0.

Responda SOMENTE um JSON: {"category": "<categoria>", "action": "responder" | "escalar" | "ocultar" | "ignorar", "reply": "<texto ou vazio>", "humor": 0 | 1 | 2 | 3, "lang": "pt" | "en" (idioma da resposta), "note": "<motivo curto, para a equipe>"}

FAQ do app:
${faq}`;

export async function decidir(comment: string, post: string, previous: string[] = []): Promise<Decisao | null> {
  // Parece instrução para o robô: nem passa pela IA, vai para a equipe.
  if (pareceInstrucao(comment)) {
    return { category: 'instrucao', action: 'escalar', reply: '', note: 'Comentário parece instrução para o robô: sem resposta automática', humor: 0, lang: 'pt' };
  }
  const { text: faq } = await getSupportFaq();
  const res = await aiFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, temperature: 0.8, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: PROMPT(post, faq, previous) }, { role: 'user', content: `Comentário: ${comment}` }],
    }),
  });
  if (!res.ok) { console.error('[instagram-comments] IA', res.status, await res.text()); return null; }
  const j = await res.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
  logOpenAIUsage({ endpoint: 'instagram-comments', model: MODEL, promptTokens: j.usage?.prompt_tokens, completionTokens: j.usage?.completion_tokens });
  try {
    const d = JSON.parse(j.choices[0].message.content) as Partial<Decisao>;
    const action = (['responder', 'escalar', 'ocultar', 'ignorar'] as const).includes(d.action as Acao) ? d.action as Acao : 'ignorar';
    const humor = ['reclamacao', 'spam', 'ofensa'].includes(String(d.category)) ? 0 : Number(d.humor) || 0;
    const category = String(d.category ?? 'outro');
    const lang: 'pt' | 'en' = d.lang === 'en' ? 'en' : 'pt';
    let reply = String(d.reply ?? '').trim();
    let note = String(d.note ?? '');
    // Reclamação e elogio: resposta pronta (o texto da IA não vai para o público).
    if (category === 'reclamacao' && action === 'escalar') reply = pronta('reclamacao', lang, comment);
    else if (category === 'elogio' && action === 'responder') reply = pronta('elogio', lang, comment);
    else if (reply && (action === 'responder' || action === 'escalar')) {
      const bloqueio = checarResposta(reply, `${comment}\n${post}\n${faq}`);
      if (bloqueio) {
        // Não publica: a equipe vê a sugestão no /admin e decide.
        return { category, action: 'escalar', reply: '', note: `Resposta da IA bloqueada (${bloqueio}): "${reply.slice(0, 300)}" | ${note}`, humor: 0, lang };
      }
    }
    return { category, action, reply, note, humor, lang };
  } catch { return null; }
}

type PostRef = { id: string; ig_media_id: string };

/** Busca os comentários de um post e grava os novos. Os mais velhos que HORAS_ANTIGO (post antigo
 *  conferido pela primeira vez) entram como 'ignorado': responder semanas depois soaria estranho. */
async function collectFrom(auth: IgAuth, p: PostRef): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const r = await listComments(auth, p.ig_media_id);
  if (!r.ok) { console.error('[instagram-comments] listar', p.ig_media_id, r.error); return null; }
  const corte = Date.now() - HORAS_ANTIGO * 3600000;
  const rows = r.data.filter(c => c.username !== auth.username && c.fromId !== auth.igUserId)
    .map(c => ({
      id: c.id, post_id: p.id, media_id: p.ig_media_id, username: c.username, text: c.text, commented_at: c.timestamp,
      // Todas as linhas com as mesmas colunas: no envio em lote, coluna ausente vira null (e action é obrigatória).
      ...(new Date(c.timestamp).getTime() < corte
        ? { action: 'ignorado', note: 'Comentário antigo achado depois; sem resposta automática' }
        : { action: 'pendente', note: null }),
    }));
  if (!rows.length) return 0;
  const { data, error } = await supabase.from('instagram_comments').upsert(rows as never, { onConflict: 'id', ignoreDuplicates: true }).select('id');
  if (error) { console.error('[instagram-comments] gravar', p.ig_media_id, error.message); return null; }
  return (data ?? []).length;
}

/** Grava comentários novos como pendentes: posts recentes a cada rodada; os de até DIAS_ANTIGOS dias
 *  de hora em hora, abrindo só os posts em que o total de comentários na Meta subiu. */
export async function collectComments(auth: IgAuth): Promise<number> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - DIAS_OLHANDO * 86400000).toISOString();
  const { data: posts } = await supabase.from('instagram_posts').select('id, ig_media_id').eq('status', 'publicado').gte('published_at', since).not('ig_media_id', 'is', null);
  let novos = 0;
  for (const p of (posts ?? []) as PostRef[]) novos += (await collectFrom(auth, p)) ?? 0;

  // Posts antigos: uma conferência por hora (uma chamada traz o total de todos os posts).
  const sinceOld = new Date(Date.now() - DIAS_ANTIGOS * 86400000);
  const { data: old } = await supabase.from('instagram_posts').select('id, ig_media_id, comments_count, comments_checked_at')
    .eq('status', 'publicado').lt('published_at', since).gte('published_at', sinceOld.toISOString()).not('ig_media_id', 'is', null);
  const antigos = (old ?? []) as (PostRef & { comments_count: number | null; comments_checked_at: string | null })[];
  const ultima = Math.max(0, ...antigos.map(p => (p.comments_checked_at ? new Date(p.comments_checked_at).getTime() : 0)));
  if (!antigos.length || Date.now() - ultima < 3600000) return novos;
  const counts = await listMediaCommentCounts(auth, sinceOld);
  if (!counts.ok) { console.error('[instagram-comments] totais', counts.error); return novos; }
  const total = new Map(counts.data.map(m => [m.id, m.count]));
  const agora = new Date().toISOString();
  for (const p of antigos) {
    const n = total.get(p.ig_media_id);
    if (n == null) continue;
    if (p.comments_count == null || n > p.comments_count) {
      const r = await collectFrom(auth, p);
      if (r == null) continue; // falhou: guarda o total só depois de buscar, para tentar de novo na próxima hora
      novos += r;
    }
    await supabase.from('instagram_posts').update({ comments_count: n, comments_checked_at: agora } as never).eq('id', p.id);
  }
  return novos;
}

/** Trata os pendentes que já passaram do atraso. */
export async function handlePendingComments(auth: IgAuth): Promise<Record<string, number>> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('instagram_comments')
    .select('id, text, username, media_id, commented_at, created_at, instagram_posts(caption, context, linha)')
    .eq('action', 'pendente').order('created_at').limit(POR_RODADA * 2);
  const out: Record<string, number> = {};
  let feitos = 0;
  for (const c of (data ?? []) as unknown as { id: string; text: string; username: string | null; media_id: string; commented_at: string | null; created_at: string; instagram_posts: { caption: string; context: string | null; linha: string | null } | null }[]) {
    if (feitos >= POR_RODADA) break;
    const desde = new Date(c.commented_at ?? c.created_at).getTime();
    if (Date.now() - desde < atrasoMin(c.id) * 60000) continue;
    feitos++;
    // Só GIF, figurinha ou imagem: a API entrega o comentário sem texto e a IA não vê o que tem nele.
    // Vai para a equipe decidir no /admin (pode ser elogio ou ofensa).
    if (!(c.text ?? '').trim()) {
      await supabase.from('instagram_comments').update({ action: 'escalado', category: 'midia', note: 'Só GIF/imagem: a IA não vê, conferir no Instagram e ocultar se for ofensivo', handled_at: new Date().toISOString() } as never).eq('id', c.id);
      out.escalado = (out.escalado ?? 0) + 1;
      continue;
    }
    const p = c.instagram_posts;
    const post = p ? `Linha: ${p.linha ?? '-'}\nLegenda: ${p.caption}\n${p.context ? `Contexto: ${p.context}` : ''}` : 'Post sem dados.';
    // Últimas respostas no mesmo post, para a IA não repetir abertura, formato e dica.
    const { data: prev } = await supabase.from('instagram_comments').select('reply_text')
      .eq('media_id', c.media_id).not('reply_text', 'is', null)
      .order('handled_at', { ascending: false }).limit(8);
    const previous = ((prev ?? []) as { reply_text: string }[]).map(r => r.reply_text);
    const d = await decidir(c.text, post, previous);
    if (!d) { await supabase.from('instagram_comments').update({ action: 'erro', note: 'IA não respondeu' } as never).eq('id', c.id); continue; }
    const patch: Record<string, unknown> = { category: d.category, note: d.humor ? `${d.note} | humor ${d.humor}` : d.note, handled_at: new Date().toISOString() };
    if ((d.action === 'responder' || d.action === 'escalar') && d.reply) {
      const texto = d.action === 'escalar' ? d.reply : comRisada(d.reply, d.humor, d.lang, c.id);
      const r = await replyToComment(auth, c.id, texto);
      Object.assign(patch, r.ok ? { reply_text: texto, reply_id: r.data, replied_by: 'ia' } : { note: `${d.note} | falhou: ${r.error}` });
      patch.action = r.ok ? (d.action === 'escalar' ? 'escalado' : 'respondido') : 'erro';
    } else if (d.action === 'escalar') {
      patch.action = 'escalado';
    } else if (d.action === 'ocultar') {
      const r = await hideComment(auth, c.id);
      patch.action = r.ok ? 'oculto' : 'erro';
      if (!r.ok) patch.note = `${d.note} | falhou: ${r.error}`;
    } else {
      patch.action = 'ignorado';
    }
    await supabase.from('instagram_comments').update(patch as never).eq('id', c.id);
    out[patch.action as string] = (out[patch.action as string] ?? 0) + 1;
  }
  return out;
}

/** Rodada completa (cron): busca comentários novos e trata os pendentes. */
export async function runInstagramComments(): Promise<{ novos: number; tratados: Record<string, number> } | { error: string }> {
  const auth = await getInstagramAuth();
  if (!auth) return { error: 'Instagram não configurado' };
  const novos = await collectComments(auth);
  const tratados = await handlePendingComments(auth);
  return { novos, tratados };
}
