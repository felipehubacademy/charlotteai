// lib/instagram-approval-alert.ts — regra do calendário do @queizyapp: as artes da semana seguinte
// (segunda a domingo) ficam prontas no domingo anterior e precisam estar aprovadas até 20h de domingo.
// Chamado pelo cron /api/cron/instagram (a cada 5 min); só age no domingo a partir das 20h (Brasília)
// e avisa uma vez por domingo: e-mail, push do /admin e WhatsApp (ALERT_WHATSAPP). Além dele, todo dia às 9h
// sai o aviso de post das próximas 24 h ainda sem aprovação (checkInstagramApprovalDaily).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { notifyAdmins } from '@/lib/admin-push';
import { reportRecipients } from '@/lib/admin-prefs';
import { sendWhatsAppText, sendAlertTemplate } from '@/lib/whatsapp';

const KIND = 'instagram_aprovacao';
const TZ = 'America/Sao_Paulo';

/** Data (AAAA-MM-DD), dia da semana (0 = domingo) e hora em Brasília. */
function agoraBr() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), hora: Number(p.hour) % 24 };
}

/** Manda o aviso por e-mail, push do /admin e WhatsApp (ALERT_WHATSAPP) e registra em ops_alerts. */
async function avisar(kind: string, msg: string, assunto: string, titulo: string, rodape: string): Promise<void> {
  const html = `<div style="font-family:-apple-system,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16131F">
    <p><b>${msg.replace(/</g, '&lt;')}</b></p>
    <p><a href="https://queizy.com/admin/instagram">Abrir o /admin &gt; Instagram</a></p>
    <p style="color:#8A8494;font-size:13px">${rodape}</p></div>`;
  let emailOk = false;
  for (const to of await reportRecipients('instagram')) emailOk = (await sendEmail({ to, subject: assunto, html }).catch(() => false)) || emailOk;
  await notifyAdmins({ title: titulo, body: msg, url: '/admin/instagram', tag: 'instagram', category: 'instagram' }).catch(() => 0);
  const wa = process.env.ALERT_WHATSAPP;
  // Texto livre só passa dentro da janela de 24 h; fora dela, o modelo aprovado.
  const waOk = wa ? (await sendWhatsAppText(wa, `${msg}\n\nqueizy.com/admin/instagram`)).ok || (await sendAlertTemplate(wa, msg)).ok : false;
  await getSupabaseAdmin().from('ops_alerts').insert({ kind, message: msg, sent_email: emailOk, sent_whatsapp: waOk } as never);
}

export async function checkInstagramApproval(force = false): Promise<{ checked: boolean; pendentes?: number; semPosts?: boolean; avisou?: boolean }> {
  const { data: hoje, dow, hora } = agoraBr();
  if (!force && (dow !== 0 || hora < 20)) return { checked: false };
  const supabase = getSupabaseAdmin();
  // Já avisou neste domingo?
  const { count: ja } = await supabase.from('ops_alerts').select('id', { count: 'exact', head: true })
    .eq('kind', KIND).gte('created_at', new Date(Date.now() - 20 * 3600000).toISOString());
  if (ja && !force) return { checked: true, avisou: false };

  // Semana seguinte: segunda 00:00 até domingo 23:59 (Brasília, UTC-3).
  const seg = new Date(`${hoje}T00:00:00-03:00`); seg.setUTCDate(seg.getUTCDate() + 1);
  const fim = new Date(seg); fim.setUTCDate(fim.getUTCDate() + 7);
  const { data } = await supabase.from('instagram_posts').select('status').gte('scheduled_at', seg.toISOString()).lt('scheduled_at', fim.toISOString()).neq('status', 'cancelado');
  const posts = (data ?? []) as { status: string }[];
  const pendentes = posts.filter(p => p.status === 'rascunho').length;
  const semPosts = posts.length === 0;
  if (!pendentes && !semPosts) return { checked: true, pendentes: 0, avisou: false };

  const dia = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
  const ultimo = new Date(fim.getTime() - 1);
  const msg = semPosts
    ? `Instagram: a semana de ${dia(seg)} a ${dia(ultimo)} ainda não tem nenhum post no /admin. As artes deveriam estar prontas hoje.`
    : `Instagram: ${pendentes} post(s) da semana de ${dia(seg)} a ${dia(ultimo)} ainda aguardam aprovação. Sem aprovação, eles não saem.`;

  await avisar(KIND, msg, 'Queizy: Instagram da semana sem aprovação', 'Instagram da semana sem aprovação',
    'Regra do calendário: a semana seguinte fica pronta no domingo e precisa ser aprovada até 20h.');
  return { checked: true, pendentes, semPosts, avisou: true };
}

const KIND_DIA = 'instagram_aprovacao_dia';
const HORA_DIA = 9;

/** Todo dia às 9h (Brasília): posts das próximas 24 h ainda em rascunho, e os das últimas 24 h que já
 *  deixaram de sair por falta de aprovação. O aviso de domingo sozinho deixou a semana de 09/11 parada
 *  dois dias sem ninguém saber. Avisa uma vez por dia. */
export async function checkInstagramApprovalDaily(force = false): Promise<{ checked: boolean; proximos?: number; perdidos?: number; avisou?: boolean }> {
  const { hora } = agoraBr();
  if (!force && hora !== HORA_DIA) return { checked: false };
  const supabase = getSupabaseAdmin();
  const { count: ja } = await supabase.from('ops_alerts').select('id', { count: 'exact', head: true })
    .eq('kind', KIND_DIA).gte('created_at', new Date(Date.now() - 20 * 3600000).toISOString());
  if (ja && !force) return { checked: true, avisou: false };

  const agora = Date.now();
  const { data, error } = await supabase.from('instagram_posts').select('scheduled_at')
    .eq('status', 'rascunho')
    .gte('scheduled_at', new Date(agora - 24 * 3600000).toISOString())
    .lt('scheduled_at', new Date(agora + 24 * 3600000).toISOString())
    .order('scheduled_at');
  if (error) throw new Error(`instagram-approval-daily: ${error.message}`);
  const datas = ((data ?? []) as { scheduled_at: string }[]).map(p => new Date(p.scheduled_at).getTime());
  const perdidos = datas.filter(t => t <= agora).length;
  const futuros = datas.filter(t => t > agora);
  if (!perdidos && !futuros.length) return { checked: true, proximos: 0, perdidos: 0, avisou: false };

  const quando = (t: number) => new Date(t).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');
  const partes: string[] = [];
  if (futuros.length) partes.push(`${futuros.length} post(s) das próximas 24 h ainda aguardam aprovação (o próximo sai ${quando(futuros[0])}). Sem aprovação, eles não saem.`);
  if (perdidos) partes.push(`${perdidos} post(s) das últimas 24 h não saíram por falta de aprovação.`);
  await avisar(KIND_DIA, `Instagram: ${partes.join(' ')}`, 'Queizy: Instagram com post sem aprovação', 'Instagram com post sem aprovação',
    'Aviso diário das 9h: aparece enquanto houver post das próximas 24 h sem aprovação.');
  return { checked: true, proximos: futuros.length, perdidos, avisou: true };
}
