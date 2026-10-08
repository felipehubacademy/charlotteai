// app/api/auth/welcome/route.ts
// Dispara o email de boas-vindas ao novo subscriber apos o placement test.
// Chamado pelo app RN logo apos gravar o resultado no Supabase.
// Autenticado pelo JWT do usuario (Authorization: Bearer <access_token>).
// Nao envia para usuarios institucionais (is_institutional = true).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { welcomeSubscriberTemplate } from '@/lib/email-templates';

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Formata data ISO em portugues: "16 de abril de 2026"
function formatDatePT(iso: string): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const d = new Date(iso);
  return `${d.getUTCDate()} de ${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export async function POST(req: NextRequest) {
  // ── 1. Autenticar via JWT do usuario ──────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Valida o token com o client anon (getUser verifica a assinatura)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Buscar perfil via service role (RLS nao interfere) ─────────────────
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: profile, error: profileError } = await adminClient
    .from('charlotte_users')
    .select('name, email, charlotte_level, is_institutional, trial_ends_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[welcome] profile fetch error:', profileError?.message);
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // ── 3. Nao envia para institucionais ──────────────────────────────────────
  if (profile.is_institutional) {
    return NextResponse.json({ skipped: true, reason: 'institutional' });
  }

  // ── 4. Montar e enviar email ───────────────────────────────────────────────
  const to         = profile.email ?? user.email ?? '';
  const name       = (profile.name ?? to.split('@')[0]);
  const level      = profile.charlotte_level ?? 'Novice';
  const trialEndsAt = profile.trial_ends_at
    ? formatDatePT(profile.trial_ends_at)
    : '7 dias';

  const { subject, html } = welcomeSubscriberTemplate({ name, level, trialEndsAt });

  const ok = await sendEmail({ to, subject, html });
  if (!ok) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  console.log(`[welcome] email sent to ${to} (level: ${level})`);
  return NextResponse.json({ success: true });
}
