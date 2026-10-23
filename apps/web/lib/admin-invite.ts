// lib/admin-invite.ts — e-mail de convite para a gestão (/admin): papel, acessos e link para criar a senha.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { adminInviteTemplate } from '@/lib/email-templates';
import { AREAS, PERMISSIONS, ROLES, type AdminRole } from '@/lib/admin-roles';

export async function sendAdminInvite(opts: { email: string; name: string | null; role: AdminRole }): Promise<boolean> {
  const role = ROLES.find(r => r.id === opts.role);
  if (!role) return false;
  const areas = PERMISSIONS[opts.role].map(a => AREAS.find(x => x.id === a)?.label).filter((l): l is string => !!l);
  // Link de senha (mesma página do site), avisando que é para a gestão: no fim leva ao /admin, não ao app.
  const { data: link, error } = await getSupabaseAdmin().auth.admin.generateLink({
    type: 'recovery', email: opts.email, options: { redirectTo: 'https://queizy.com/open?next=admin' },
  });
  if (error || !link?.properties?.action_link) { console.error('[admin-invite] link', error?.message); return false; }
  const { subject, html } = adminInviteTemplate({
    name: opts.name, email: opts.email, roleLabel: role.label, roleDesc: role.desc, areas, passwordUrl: link.properties.action_link,
  });
  return sendEmail({ to: opts.email, subject, html }).catch(() => false);
}
