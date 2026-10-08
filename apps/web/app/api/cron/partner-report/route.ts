// /api/cron/partner-report — dia 1 de cada mês: envia à equipe de gestão o relatório
// do mês anterior (uma vez por mês). Chamado pelo GitHub Actions com CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildPartnerReport, renderPartnerReportHtml, partnerReportRecipients, previousPeriod } from '@/lib/partner-report';
import { sendEmail } from '@/lib/microsoft-graph-email-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const period = previousPeriod();
  const supabase = getSupabaseAdmin();
  const { data: already } = await supabase.from('partner_reports').select('sent_at').eq('period', period).maybeSingle();
  if ((already as { sent_at: string | null } | null)?.sent_at) {
    return NextResponse.json({ skipped: 'already_sent', period });
  }
  const report = await buildPartnerReport(period);
  const html = renderPartnerReportHtml(report);
  const to = await partnerReportRecipients();
  const results = await Promise.all(to.map(addr => sendEmail({ to: addr, subject: `Queizy · relatório de ${report.label}`, html })));
  const ok = to.filter((_, i) => results[i]);
  await supabase.from('partner_reports').upsert({ period, data: report, sent_to: ok, sent_at: new Date().toISOString() } as never, { onConflict: 'period' });
  return NextResponse.json({ period, sentTo: ok });
}
