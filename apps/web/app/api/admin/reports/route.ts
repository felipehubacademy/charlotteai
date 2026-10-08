// /api/admin/reports — relatório mensal dos sócios.
//   GET  ?period=YYYY-MM          dados + HTML para prévia
//   POST { period, onlyMe? }      envia por e-mail (onlyMe = só para quem pediu)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { buildPartnerReport, renderPartnerReportHtml, partnerReportRecipients, previousPeriod } from '@/lib/partner-report';
import { sendEmail } from '@/lib/microsoft-graph-email-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const period = req.nextUrl.searchParams.get('period') ?? previousPeriod();
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
  const report = await buildPartnerReport(period);
  const { data: sent } = await getSupabaseAdmin().from('partner_reports').select('sent_at, sent_to').eq('period', period).maybeSingle();
  return NextResponse.json({ report, html: renderPartnerReportHtml(report), sent, recipients: await partnerReportRecipients() });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const period = String(body.period ?? '');
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
  const report = await buildPartnerReport(period);
  const html = renderPartnerReportHtml(report);
  const to = body.onlyMe ? [admin.email].filter(Boolean) as string[] : await partnerReportRecipients();
  if (!to.length) return NextResponse.json({ error: 'Sem destinatários' }, { status: 400 });
  const results = await Promise.all(to.map(addr => sendEmail({ to: addr, subject: `Queizy · relatório de ${report.label}`, html })));
  const ok = to.filter((_, i) => results[i]);
  if (!body.onlyMe) {
    await getSupabaseAdmin().from('partner_reports').upsert({ period, data: report, sent_to: ok, sent_at: new Date().toISOString() } as never, { onConflict: 'period' });
  }
  await audit(admin, 'report.send', 'partner_report', period, { to: ok, onlyMe: !!body.onlyMe });
  return NextResponse.json({ sentTo: ok, failed: to.filter((_, i) => !results[i]) });
}
