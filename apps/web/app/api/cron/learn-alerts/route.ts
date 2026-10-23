// /api/cron/learn-alerts — alerta diário de "Onde os alunos travam" (lib/learn-stuck), últimas 24h.
// Só manda e-mail quando há alerta. Vai para os administradores ativos da equipe (admin_members).
// POST { dryRun?: true, days?: number }   header Authorization: Bearer <CRON_SECRET_TOKEN> ou x-admin-secret.
// Agendado todo dia pelo GitHub Actions (.github/workflows/learn-alerts.yml).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { stuckReport } from '@/lib/learn-stuck';
import { listReports, REASON_PT, SCREEN_PT, exerciseText } from '@/lib/exercise-reports';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { base, h1, p, btn } from '@/lib/email-brand';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const days = Math.min(7, Math.max(1, Number(body?.days) || 1));
  const report = await stuckReport(days);
  // Reportes dos alunos pela bandeira dos exercícios no mesmo período (só os ainda abertos).
  const reports = await listReports({ days, status: 'open' });
  if (!report.alerts.length && !reports.length) return NextResponse.json({ sent: 0, alerts: 0, reports: 0, totals: report.totals });

  const { data } = await getSupabaseAdmin().from('admin_members').select('email').eq('role', 'admin').eq('active', true);
  const to = ((data ?? []) as { email: string | null }[]).map(m => m.email).filter((e): e is string => !!e);
  const t = report.totals;
  const html = base([
    h1('Onde os alunos travaram'),
    p(`Últimas ${days === 1 ? '24 horas' : `${days} dias`}: ${t.attempts} tentativas de ${t.students} aluno(s), ${t.fails} reprovações, ${t.skips} pulos e ${t.exits} saídas no meio.`),
    ...([
      ['Possível falha do app (conferir primeiro)', 'O aluno parece ter acertado e o corretor ou o reconhecimento de voz reprovou.', report.alertGroups.app],
      ['Conteúdo difícil', 'Parte grande dos alunos que fizeram o exercício errou de verdade. Avaliar se vale suavizar.', report.alertGroups.content],
      ['Saídas no meio', '', report.alertGroups.exits],
      ['Microfone e reconhecimento de voz', '', report.alertGroups.tech],
    ] as [string, string, string[]][]).filter(([, , list]) => list.length).map(([title, note, list]) =>
      p(`<strong>${title} (${list.length})</strong>${note ? `<br><span style="color:#6B6878;">${note}</span>` : ''}`) +
      `<ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.6;color:#16131F;">${list.slice(0, 10).map(a => `<li style="margin-bottom:8px;">${esc(a)}</li>`).join('')}</ul>`),
    reports.length
      ? p(`<strong>Reportados pelos alunos (${reports.length})</strong>`) +
        `<ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.6;color:#16131F;">${reports.slice(0, 15).map(r => {
          const where = [SCREEN_PT[r.screen] ?? r.screen, r.level, r.module_id, r.unit_id].filter(Boolean).join(' · ');
          const extra = [r.user_answer ? `respondeu "${r.user_answer}"` : '', r.transcript ? `o app entendeu "${r.transcript}"` : '', r.comment ? `"${r.comment}"` : ''].filter(Boolean).join(' · ');
          return `<li style="margin-bottom:8px;">${esc(`${REASON_PT[r.reason] ?? r.reason} — ${where}: "${exerciseText(r) || 'sem texto'}"${extra ? ` · ${extra}` : ''}`)}</li>`;
        }).join('')}</ul>`
      : '',
    btn('Abrir no /admin', 'https://queizy.com/admin/learning'),
  ].join(''));
  if (body?.dryRun === true) return NextResponse.json({ dryRun: true, to, alertGroups: report.alertGroups, reports: reports.length });
  let sent = 0;
  for (const addr of to) {
    const subject = report.alerts.length
      ? `Queizy: ${report.alerts.length} ponto(s) onde os alunos travaram${reports.length ? ` e ${reports.length} reporte(s)` : ''}`
      : `Queizy: ${reports.length} reporte(s) dos alunos nos exercícios`;
    if (await sendEmail({ to: addr, subject, html })) sent++;
  }
  return NextResponse.json({ sent, alerts: report.alerts.length, reports: reports.length });
}
