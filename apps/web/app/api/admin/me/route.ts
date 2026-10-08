// GET /api/admin/me — quem está logado no admin e o que pode acessar.
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, areasFor, ROLE_LABEL } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    email: admin.email,
    name: admin.name,
    role: admin.role,
    roleLabel: ROLE_LABEL[admin.role],
    areas: areasFor(admin.role),
    legacy: admin.legacy,
  });
}
