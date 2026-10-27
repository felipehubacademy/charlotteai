import { redirect } from 'next/navigation';

// Denúncias agora é uma aba do Suporte.
export default function ModerationRedirect() {
  redirect('/admin/support?tab=reports');
}
