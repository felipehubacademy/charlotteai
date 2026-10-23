// lib/instagram-comments.ts — comentários dos posts do @queizyapp tratados pela IA.
// O cron (e o webhook, quando a Meta liberar) grava cada comentário novo como 'pendente'; a IA
// responde depois de alguns minutos (para não parecer robô), oculta spam e ofensa, e passa para a
// equipe o que precisa de uma pessoa (aparece no /admin > Instagram > Comentários).
import { aiFetch } from '@/lib/ai-models';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupportFaq } from '@/lib/support-faq';
import { logOpenAIUsage } from '@/lib/openai-usage';
import { getInstagramAuth, listComments, replyToComment, hideComment, type IgAuth } from '@/lib/instagram';

const MODEL = 'gpt-4o-mini';
const DIAS_OLHANDO = 7;      // comentários de posts publicados nos últimos N dias
const POR_RODADA = 20;       // respostas por execução do cron

type Acao = 'responder' | 'escalar' | 'ocultar' | 'ignorar';
interface Decisao { category: string; action: Acao; reply: string; note: string }

/** Atraso antes de responder: de 2 a 8 minutos, fixo por comentário. */
function atrasoMin(id: string): number {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 2 + (h % 7);
}

const PROMPT = (post: string, faq: string) => `Você responde os comentários do Instagram do Queizy (@queizyapp), um app de inglês para brasileiros. A tutora do app é a Charlotte; o Igorfina é um personagem comediante da Família Queizy.

Sobre o post comentado:
${post}

Decida o que fazer com o comentário:
- quiz: a pessoa respondeu "Queizy" (frase errada) ou "Crazy" (frase certa) num post de quiz. Diga se acertou, de forma animada, e explique em uma frase o porquê (use a resposta do post).
- ingles: escreveu em inglês ou perguntou sobre inglês. Responda com simpatia; se houver erro, mostre a forma certa com delicadeza.
- duvida_app: pergunta sobre o app (preço, como funciona, iPhone/Android, teste grátis). Responda só com o que está na FAQ abaixo; se a FAQ não cobre, convide a chamar no Direct.
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
- Não comece com o @ da pessoa (a resposta já vai no comentário dela).

Responda SOMENTE um JSON: {"category": "<categoria>", "action": "responder" | "escalar" | "ocultar" | "ignorar", "reply": "<texto ou vazio>", "note": "<motivo curto, para a equipe>"}

FAQ do app:
${faq}`;

async function decidir(comment: string, post: string): Promise<Decisao | null> {
  const { text: faq } = await getSupportFaq();
  const res = await aiFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, temperature: 0.6, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: PROMPT(post, faq) }, { role: 'user', content: `Comentário: ${comment}` }],
    }),
  });
  if (!res.ok) { console.error('[instagram-comments] IA', res.status, await res.text()); return null; }
  const j = await res.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
  logOpenAIUsage({ endpoint: 'instagram-comments', model: MODEL, promptTokens: j.usage?.prompt_tokens, completionTokens: j.usage?.completion_tokens });
  try {
    const d = JSON.parse(j.choices[0].message.content) as Partial<Decisao>;
    const action = (['responder', 'escalar', 'ocultar', 'ignorar'] as const).includes(d.action as Acao) ? d.action as Acao : 'ignorar';
    return { category: String(d.category ?? 'outro'), action, reply: String(d.reply ?? '').trim().slice(0, 300), note: String(d.note ?? '') };
  } catch { return null; }
}

/** Grava comentários novos (dos nossos posts recentes) como pendentes. */
export async function collectComments(auth: IgAuth): Promise<number> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - DIAS_OLHANDO * 86400000).toISOString();
  const { data: posts } = await supabase.from('instagram_posts').select('id, ig_media_id').eq('status', 'publicado').gte('published_at', since).not('ig_media_id', 'is', null);
  let novos = 0;
  for (const p of (posts ?? []) as { id: string; ig_media_id: string }[]) {
    const r = await listComments(auth, p.ig_media_id);
    if (!r.ok) { console.error('[instagram-comments] listar', p.ig_media_id, r.error); continue; }
    const rows = r.data.filter(c => c.username !== auth.username && c.fromId !== auth.igUserId)
      .map(c => ({ id: c.id, post_id: p.id, media_id: p.ig_media_id, username: c.username, text: c.text, commented_at: c.timestamp }));
    if (!rows.length) continue;
    const { data } = await supabase.from('instagram_comments').upsert(rows as never, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    novos += (data ?? []).length;
  }
  return novos;
}

/** Trata os pendentes que já passaram do atraso. */
export async function handlePendingComments(auth: IgAuth): Promise<Record<string, number>> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('instagram_comments')
    .select('id, text, username, commented_at, created_at, instagram_posts(caption, context, linha)')
    .eq('action', 'pendente').order('created_at').limit(POR_RODADA * 2);
  const out: Record<string, number> = {};
  let feitos = 0;
  for (const c of (data ?? []) as unknown as { id: string; text: string; username: string | null; commented_at: string | null; created_at: string; instagram_posts: { caption: string; context: string | null; linha: string | null } | null }[]) {
    if (feitos >= POR_RODADA) break;
    const desde = new Date(c.commented_at ?? c.created_at).getTime();
    if (Date.now() - desde < atrasoMin(c.id) * 60000) continue;
    feitos++;
    const p = c.instagram_posts;
    const post = p ? `Linha: ${p.linha ?? '-'}\nLegenda: ${p.caption}\n${p.context ? `Contexto: ${p.context}` : ''}` : 'Post sem dados.';
    const d = await decidir(c.text, post);
    if (!d) { await supabase.from('instagram_comments').update({ action: 'erro', note: 'IA não respondeu' } as never).eq('id', c.id); continue; }
    const patch: Record<string, unknown> = { category: d.category, note: d.note, handled_at: new Date().toISOString() };
    if ((d.action === 'responder' || d.action === 'escalar') && d.reply) {
      const r = await replyToComment(auth, c.id, d.reply);
      Object.assign(patch, r.ok ? { reply_text: d.reply, reply_id: r.data, replied_by: 'ia' } : { note: `${d.note} | falhou: ${r.error}` });
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
