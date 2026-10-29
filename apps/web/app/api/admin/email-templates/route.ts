// app/api/admin/email-templates/route.ts
// Retorna os HTMLs prontos para colar no Supabase Auth Email Templates. Só para a gestão logada.
// GET /api/admin/email-templates

import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_TEMPLATES } from '@/lib/supabase-email-templates';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'team');
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json(SUPABASE_TEMPLATES);
}
