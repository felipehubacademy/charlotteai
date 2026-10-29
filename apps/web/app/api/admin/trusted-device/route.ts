// POST /api/admin/trusted-device — "Confiar neste computador por 30 dias".
// Só depois do código das duas etapas (token aal2): devolve uma chave que o navegador guarda e manda
// no header x-admin-device. No banco fica só o hash (admin_trusted_devices).
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAdmin, hashDeviceToken, TRUSTED_DEVICE_DAYS, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || admin.legacy || !admin.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = req.headers.get('authorization') ?? '';
  const aal = (() => { try { return JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString()).aal; } catch { return null; } })();
  if (aal !== 'aal2') return NextResponse.json({ error: 'Confirme o código das duas etapas antes.' }, { status: 403 });

  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 86400000);
  const { error } = await getSupabaseAdmin().from('admin_trusted_devices').insert({
    user_id: admin.userId, token_hash: hashDeviceToken(token),
    user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300), expires_at: expires.toISOString(),
  } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(admin, 'admin.trust_device', 'admin_member', admin.userId, { until: expires.toISOString() });
  return NextResponse.json({ token, expiresAt: expires.toISOString() });
}
