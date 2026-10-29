// lib/admin-prefs.ts — preferências de cada pessoa da gestão (/admin > Minha conta) e os filtros
// que os alertas (push) e os e-mails da gestão usam antes de enviar.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { AdminRole } from '@/lib/admin-roles';

export type PushCategory = 'checkout' | 'ticket_new' | 'ticket_sla' | 'capacity' | 'ai_costs' | 'instagram' | 'emails';
export type EmailReport = 'ai_costs' | 'learn_alerts' | 'checkout' | 'capacity' | 'instagram';

export const PUSH_CATEGORIES: { key: PushCategory; label: string; critical: boolean }[] = [
  { key: 'checkout', label: 'Problema no checkout ou nos pagamentos', critical: true },
  { key: 'ticket_new', label: 'Chamado novo para atendente', critical: false },
  { key: 'ticket_sla', label: 'Chamado sem resposta há 2 horas', critical: false },
  { key: 'capacity', label: 'Banco perto do limite', critical: true },
  { key: 'emails', label: 'E-mail de boas-vindas atrasado', critical: true },
  { key: 'ai_costs', label: 'Custos de IA acima do esperado', critical: false },
  { key: 'instagram', label: 'Instagram: semana seguinte sem aprovação (domingo, 20h)', critical: false },
];
export const EMAIL_REPORTS: { key: EmailReport; label: string }[] = [
  { key: 'ai_costs', label: 'Custos de IA (diário, 8h)' },
  { key: 'learn_alerts', label: 'Onde os alunos travaram (diário)' },
  { key: 'checkout', label: 'Alertas do checkout' },
  { key: 'capacity', label: 'Banco perto do limite' },
  { key: 'instagram', label: 'Instagram: semana seguinte sem aprovação (domingo, 20h)' },
];

export interface AdminPrefs {
  push_alerts: Partial<Record<PushCategory, boolean>>;
  quiet_start: number | null;
  quiet_end: number | null;
  quiet_allow_critical: boolean;
  email_reports: Partial<Record<EmailReport, boolean>>;
  home_path: string | null;
}
export const DEFAULT_PREFS: AdminPrefs = {
  push_alerts: {}, quiet_start: null, quiet_end: null, quiet_allow_critical: true, email_reports: {}, home_path: null,
};

export async function loadPrefs(userIds: string[]): Promise<Map<string, AdminPrefs>> {
  const out = new Map<string, AdminPrefs>();
  if (!userIds.length) return out;
  const { data } = await getSupabaseAdmin().from('admin_prefs').select('*').in('user_id', userIds);
  for (const r of (data ?? []) as unknown as (AdminPrefs & { user_id: string })[]) out.set(r.user_id, { ...DEFAULT_PREFS, ...r });
  return out;
}

const brtHour = (d = new Date()) => Number(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false })) % 24;

/** Dentro do horário de silêncio? (ex.: 22 → 8 atravessa a meia-noite) */
export function inQuiet(p: AdminPrefs, now = new Date()): boolean {
  if (p.quiet_start == null || p.quiet_end == null || p.quiet_start === p.quiet_end) return false;
  const h = brtHour(now);
  return p.quiet_start < p.quiet_end ? h >= p.quiet_start && h < p.quiet_end : h >= p.quiet_start || h < p.quiet_end;
}

/** A pessoa quer este alerta agora? (categoria ligada e fora do silêncio, salvo crítico liberado) */
export function wantsPush(p: AdminPrefs | undefined, category: PushCategory): boolean {
  const pr = p ?? DEFAULT_PREFS;
  if (pr.push_alerts[category] === false) return false;
  const critical = PUSH_CATEGORIES.find(c => c.key === category)?.critical ?? false;
  if (inQuiet(pr) && !(critical && pr.quiet_allow_critical)) return false;
  return true;
}

/** E-mails de quem recebe este relatório: membros ativos dos papéis indicados que não desligaram. */
export async function reportRecipients(report: EmailReport, roles: AdminRole[] = ['admin']): Promise<string[]> {
  const { data } = await getSupabaseAdmin().from('admin_members').select('email, user_id').eq('active', true).in('role', roles);
  const members = ((data ?? []) as { email: string | null; user_id: string | null }[]).filter(m => !!m.email);
  const prefs = await loadPrefs(members.map(m => m.user_id).filter((x): x is string => !!x));
  return members.filter(m => !m.user_id || prefs.get(m.user_id)?.email_reports[report] !== false).map(m => m.email!);
}
