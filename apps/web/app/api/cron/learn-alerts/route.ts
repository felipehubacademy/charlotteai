// /api/cron/learn-alerts — alerta diário de "Onde os alunos travam" (lib/learn-stuck), últimas 24h.
// Só manda e-mail quando há alerta. Vai para os administradores ativos da equipe (admin_members).
// POST { dryRun?: true, days?: number }   header Authorization: Bearer <CRON_SECRET_TOKEN> ou x-admin-secret.
// Agendado todo dia pelo GitHub Actions (.github/workflows/learn-alerts.yml).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { stuckReport } from '@/lib/learn-stuck';
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
  if (!report.alerts.length) return NextResponse.json({ sent: 0, alerts: 0, totals: report.totals });

  const { data } = await getSupabaseAdmin().from('admin_members').select('email').eq('role', 'admin').eq('active', true);
  const to = ((data ?? []) as { email: string | null }[]).map(m => m.email).filter((e): e is string => !!e);
  const t = report.totals;
  const html = base([
    h1('Onde os alunos travaram'),
    p(`Últimas ${days === 1 ? '24 horas' : `${days} dias`}: ${t.attempts} tentativas de ${t.students} aluno(s), ${t.fails} reprovações, ${t.skips} pulos e ${t.exits} saídas no meio.`),
    `<ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.6;color:#16131F;">${report.alerts.slice(0, 15).map(a => `<li style="margin-bottom:8px;">${esc(a)}</li>`).join('')}</ul>`,
    btn('Abrir no /admin', 'https://queizy.com/admin/learning'),
  ].join(''));
  if (body?.dryRun === true) return NextResponse.json({ dryRun: true, to, alerts: report.alerts });
  let sent = 0;
  for (const addr of to) {
    if (await sendEmail({ to: addr, subject: `Queizy: ${report.alerts.length} ponto(s) onde os alunos travaram`, html })) sent++;
  }
  return NextResponse.json({ sent, alerts: report.alerts.length });
}
