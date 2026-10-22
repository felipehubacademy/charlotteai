// lib/access-help.ts — e-mail pessoal com link novo de criar senha para quem assinou e não conseguiu entrar.
// Usado pelo /admin (ação manual) e pela verificação de hora em hora (/api/cron/access-help).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { accessHelpTemplate } from '@/lib/email-templates';

export async function sendAccessHelp(user: { id: string; name: string | null; email: string }, when: string): Promise<{ ok: boolean; subject?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: link, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email: user.email, options: { redirectTo: 'https://queizy.com/open' } });
  const url = link?.properties?.action_link;
  if (error || !url) return { ok: false, error: 'Não foi possível gerar o link.' };
  const { subject, html } = accessHelpTemplate({ name: user.name, email: user.email, when, passwordUrl: url });
  const ok = await sendEmail({ to: user.email, subject, html }).catch(() => false);
  return ok ? { ok: true, subject } : { ok: false, error: 'Não foi possível enviar o e-mail.' };
}

/** "ontem", "hoje" ou "no dia DD/MM", no fuso de Brasília. */
export function whenLabel(iso: string): string {
  const fmt = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(d);
  const d = new Date(iso), now = new Date();
  if (fmt(d) === fmt(now)) return 'hoje';
  if (fmt(d) === fmt(new Date(now.getTime() - 86_400_000))) return 'ontem';
  return `no dia ${fmt(d)}`;
}
