export const dynamic = 'force-dynamic';

/**
 * app/api/admin/support-test/route.ts
 * Testa o agente de suporte SEM enviar nada. POST { text, email? }.
 * Retorna a decisão (intent, resposta, auto x escala).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runSupportAgent, SupportUserContext } from '@/lib/support-agent';

// Login próprio (Bearer) com papel que acessa 'support', ou a senha mestra antiga.
async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'support');
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const text: string = body?.text ?? '';
  const email: string | undefined = body?.email;
  if (!text) return NextResponse.json({ error: 'Passe { text }' }, { status: 400 });

  let context: SupportUserContext = { identified: false };
  if (email) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('charlotte_users')
      .select('name, email, charlotte_level, subscription_status')
      .eq('email', email).maybeSingle();
    const u = data as { name: string | null; email: string; charlotte_level: string | null; subscription_status: string | null } | null;
    if (u) {
      context = {
        identified: true,
        name: u.name, email: u.email, level: u.charlotte_level,
        subscription_status: u.subscription_status,
        has_access: u.subscription_status === 'active' || u.subscription_status === 'trial' || u.subscription_status === 'cancelled',
      };
    }
  }

  const decision = await runSupportAgent({ userText: text, context });
  return NextResponse.json({ context, decision });
}
