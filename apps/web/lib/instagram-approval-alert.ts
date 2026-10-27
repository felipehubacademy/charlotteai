// lib/instagram-approval-alert.ts — regra do calendário do @queizyapp: as artes da semana seguinte
// (segunda a domingo) ficam prontas no domingo anterior e precisam estar aprovadas até 20h de domingo.
// Chamado pelo cron /api/cron/instagram (a cada 5 min); só age no domingo a partir das 20h (Brasília)
// e avisa uma vez por domingo: e-mail, push do /admin e WhatsApp (ALERT_WHATSAPP).
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

  const html = `<div style="font-family:-apple-system,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16131F">
    <p><b>${msg.replace(/</g, '&lt;')}</b></p>
    <p><a href="https://queizy.com/admin/instagram">Abrir o /admin &gt; Instagram</a></p>
    <p style="color:#8A8494;font-size:13px">Regra do calendário: a semana seguinte fica pronta no domingo e precisa ser aprovada até 20h.</p></div>`;
  let emailOk = false;
  for (const to of await reportRecipients('instagram')) emailOk = (await sendEmail({ to, subject: 'Queizy: Instagram da semana sem aprovação', html }).catch(() => false)) || emailOk;
  await notifyAdmins({ title: 'Instagram da semana sem aprovação', body: msg, url: '/admin/instagram', tag: 'instagram', category: 'instagram' }).catch(() => 0);
  const wa = process.env.ALERT_WHATSAPP;
  // Texto livre só passa dentro da janela de 24 h; fora dela, o modelo aprovado.
  const waOk = wa ? (await sendWhatsAppText(wa, `${msg}\n\nqueizy.com/admin/instagram`)).ok || (await sendAlertTemplate(wa, msg)).ok : false;
  await supabase.from('ops_alerts').insert({ kind: KIND, message: msg, sent_email: emailOk, sent_whatsapp: waOk } as never);
  return { checked: true, pendentes, semPosts, avisou: true };
}
