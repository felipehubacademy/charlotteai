// lib/admin-invite.ts — e-mail de convite para a gestão (/admin): papel, acessos e link para criar a senha.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { adminInviteTemplate, adminAcceptedTemplate } from '@/lib/email-templates';
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

/**
 * Primeiro acesso de um membro convidado: marca o aceite e avisa quem convidou por e-mail.
 * A marcação é atômica (só quem trocar accepted_at de nulo para agora avisa), então o aviso sai uma vez.
 */
export async function markInviteAccepted(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('admin_members').update({ accepted_at: new Date().toISOString() } as never)
    .eq('user_id', userId).is('accepted_at', null).select('email, name, role, invited_by');
  const m = ((data ?? []) as { email: string; name: string | null; role: AdminRole; invited_by: string | null }[])[0];
  if (!m?.invited_by) return;
  const { data: inv } = await supabase.from('admin_members').select('email, name').eq('user_id', m.invited_by).maybeSingle();
  const inviter = inv as { email: string; name: string | null } | null;
  if (!inviter?.email) return;
  const roleLabel = ROLES.find(r => r.id === m.role)?.label ?? m.role;
  const { subject, html } = adminAcceptedTemplate({ inviterName: inviter.name, memberName: m.name, memberEmail: m.email, roleLabel });
  await sendEmail({ to: inviter.email, subject, html }).catch(() => false);
}
