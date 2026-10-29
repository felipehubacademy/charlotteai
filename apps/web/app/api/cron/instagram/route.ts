// /api/cron/instagram — a cada 5 min (vercel.json): publicação agendada, comentários e chave do @queizyapp.
//   1. Prepara (cria o contêiner na Meta) os posts APROVADOS que saem nos próximos 20 min;
//      vídeo leva alguns minutos para a Meta processar, por isso começa antes da hora.
//   2. Publica os preparados cuja hora chegou e cujo contêiner já está pronto.
//   3. Busca comentários novos e deixa a IA tratar os pendentes (lib/instagram-comments).
//   4. Renova a chave de acesso quando estiver perto de vencer.
//   5. Domingo a partir das 20h: avisa se a semana seguinte não estiver toda aprovada (lib/instagram-approval-alert).
// Só sai o que foi aprovado no /admin > Instagram. ?dry=1 mostra o que faria, sem publicar.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getInstagramAuth, createContainer, containerStatus, publishContainer, refreshInstagramTokenIfNeeded, type IgMedia } from '@/lib/instagram';
import { runInstagramComments } from '@/lib/instagram-comments';
import { checkInstagramApproval } from '@/lib/instagram-approval-alert';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const ANTECEDENCIA_MIN = 20;
const MAX_TENTATIVAS = 3;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

type Post = { id: string; source_key: string | null; kind: 'image' | 'carousel' | 'reels'; caption: string; media: IgMedia[]; cover_url: string | null; scheduled_at: string; status: string; ig_container_id: string | null; attempts: number };

async function run(dry: boolean) {
  const supabase = getSupabaseAdmin();
  const auth = await getInstagramAuth();
  if (!auth) return { error: 'Instagram não configurado (INSTAGRAM_ACCESS_TOKEN)' };
  const agora = Date.now();
  const log: string[] = [];
  const falha = async (p: Post, erro: string) => {
    const tentativas = p.attempts + 1;
    // Erro passageiro: volta para 'aprovado' e tenta de novo na próxima rodada (até MAX_TENTATIVAS).
    await supabase.from('instagram_posts').update({
      status: tentativas >= MAX_TENTATIVAS ? 'erro' : 'aprovado', ig_container_id: null, attempts: tentativas, error: erro, updated_at: new Date().toISOString(),
    } as never).eq('id', p.id);
    log.push(`${p.source_key ?? p.id}: erro (${tentativas}/${MAX_TENTATIVAS}) ${erro}`);
  };

  // 1. Preparar os aprovados que saem em breve (ou que ficaram para trás há menos de 6 h).
  const ate = new Date(agora + ANTECEDENCIA_MIN * 60000).toISOString();
  const desde = new Date(agora - 6 * 3600000).toISOString();
  const { data: aprovados } = await supabase.from('instagram_posts').select('*').eq('status', 'aprovado').lte('scheduled_at', ate).gte('scheduled_at', desde).order('scheduled_at');
  for (const p of (aprovados ?? []) as Post[]) {
    if (dry) { log.push(`${p.source_key}: prepararia (${p.kind})`); continue; }
    const r = await createContainer(auth, p);
    if (!r.ok) { await falha(p, r.error); continue; }
    await supabase.from('instagram_posts').update({ status: 'preparado', ig_container_id: r.data, error: null, updated_at: new Date().toISOString() } as never).eq('id', p.id);
    log.push(`${p.source_key}: preparado`);
  }

  // 2. Publicar os preparados cuja hora chegou.
  const { data: prontos } = await supabase.from('instagram_posts').select('*').eq('status', 'preparado').lte('scheduled_at', new Date(agora).toISOString()).order('scheduled_at');
  for (const p of (prontos ?? []) as Post[]) {
    if (!p.ig_container_id) { await falha(p, 'sem contêiner'); continue; }
    const st = await containerStatus(auth, p.ig_container_id);
    if (!st.ok) { await falha(p, st.error); continue; }
    if (st.data === 'IN_PROGRESS') { log.push(`${p.source_key}: a Meta ainda processa o vídeo`); continue; }
    if (st.data !== 'FINISHED' && st.data !== 'PUBLISHED') { await falha(p, `contêiner ${st.data}`); continue; }
    if (dry) { log.push(`${p.source_key}: publicaria`); continue; }
    const pub = await publishContainer(auth, p.ig_container_id);
    if (!pub.ok) { await falha(p, pub.error); continue; }
    await supabase.from('instagram_posts').update({
      status: 'publicado', ig_media_id: pub.data.mediaId, permalink: pub.data.permalink, published_at: new Date().toISOString(), error: null, updated_at: new Date().toISOString(),
    } as never).eq('id', p.id);
    log.push(`${p.source_key}: publicado ${pub.data.permalink ?? ''}`);
  }

  // 3. Comentários; 4. chave.
  const comentarios = dry ? null : await runInstagramComments();
  const chave = dry ? null : await refreshInstagramTokenIfNeeded();
  const aprovacao = dry ? null : await checkInstagramApproval().catch(e => ({ checked: false, erro: String(e) }));
  return { conta: auth.username, log, comentarios, chave, aprovacao, dry };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await run(req.nextUrl.searchParams.get('dry') === '1'));
}
export const POST = GET;
