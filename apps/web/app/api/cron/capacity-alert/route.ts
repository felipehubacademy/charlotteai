// /api/cron/capacity-alert — acompanha o uso do banco no plano gratuito e avisa os administradores
// antes do limite (para ligar o plano pago a tempo). Limites do gratuito: banco 500 MB, arquivos 1 GB.
// O tráfego de saída (5 GB/mês) não é legível por aqui: o painel do banco mostra e avisa por e-mail.
// POST { dryRun?: true }  header Authorization: Bearer <CRON_SECRET_TOKEN> ou x-admin-secret.
// Agendado todo dia pelo GitHub Actions (.github/workflows/capacity-alert.yml).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { base, h1, p, btn } from '@/lib/email-brand';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'gru1';

const MB = 1024 * 1024;
const LIMITS = { db: 500 * MB, storage: 1024 * MB };
const WARN = 0.7;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('capacity_usage');
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'sem dados' }, { status: 500 });
  const u = data as { db_bytes: number; storage_bytes: number; connections: number; max_connections: number; users: number };
  const pct = { db: u.db_bytes / LIMITS.db, storage: u.storage_bytes / LIMITS.storage, conn: u.connections / u.max_connections };
  const fmt = (n: number) => `${Math.round(n * 100)}%`;
  const report = {
    banco: `${Math.round(u.db_bytes / MB)} MB de 500 MB (${fmt(pct.db)})`,
    arquivos: `${Math.round(u.storage_bytes / MB)} MB de 1 GB (${fmt(pct.storage)})`,
    conexoes: `${u.connections} de ${u.max_connections} (${fmt(pct.conn)})`,
    contas: u.users,
  };
  const alerts: string[] = [];
  if (pct.db >= WARN) alerts.push(`Banco em ${report.banco}.`);
  if (pct.storage >= WARN) alerts.push(`Arquivos em ${report.arquivos}.`);
  if (pct.conn >= 0.8) alerts.push(`Conexões em ${report.conexoes} no momento da checagem.`);
  if (!alerts.length || body?.dryRun === true) return NextResponse.json({ alerts, report });

  const { data: admins } = await supabase.from('admin_members').select('email').eq('role', 'admin').eq('active', true);
  const to = ((admins ?? []) as { email: string | null }[]).map(m => m.email).filter((e): e is string => !!e);
  const html = base([
    h1('O banco do app está perto do limite'),
    p(`${alerts.join(' ')} O plano gratuito restringe o serviço quando passa do limite. Hora de ligar o plano pago no painel do banco (US$ 25/mês).`),
    p(`Situação completa: banco ${report.banco}; arquivos ${report.arquivos}; conexões ${report.conexoes}; ${report.contas} contas. Confira também o tráfego de saída no painel (limite de 5 GB por mês).`),
    btn('Abrir o painel do banco', 'https://supabase.com/dashboard/org/_/billing'),
  ].join(''));
  for (const addr of to) await sendEmail({ to: addr, subject: 'Queizy: banco do app perto do limite do plano gratuito', html }).catch(() => false);
  return NextResponse.json({ alerts, report, sent: to.length });
}
