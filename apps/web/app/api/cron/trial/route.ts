// app/api/cron/trial/route.ts
// Job diario que:
//   1. Envia aviso de trial expirando para usuarios com trial_ends_at daqui a 2 dias
//   2. Marca como expired + envia email para usuarios com trial_ends_at ja vencido
//
// Protegido por CRON_SECRET (Vercel injeta automaticamente em producao).
// Para chamar manualmente: Authorization: Bearer <ADMIN_SECRET>

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { trialExpiringTemplate, subscriptionExpiredTemplate } from '@/lib/email-templates';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET      = process.env.CRON_SECRET ?? '';
const ADMIN_SECRET     = process.env.ADMIN_SECRET ?? '';

// Formata data ISO em portugues: "16 de abril de 2026"
function formatDatePT(iso: string): string {
  const months = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const d = new Date(iso);
  return `${d.getUTCDate()} de ${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export async function GET(req: NextRequest) {
  // Aceita CRON_SECRET (Vercel) ou ADMIN_SECRET (chamada manual)
  const bearer = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (bearer !== CRON_SECRET && bearer !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Datas de referencia (UTC absoluto) ───────────────────────────────────
  // O cron roda no servidor (UTC). Usamos timestamps absolutos — NÃO strings
  // de data — para não assumir que meia-noite UTC = meia-noite do usuário.
  //
  // trial_ends_at é gravado como timestamptz no Supabase (UTC absoluto).
  // Comparar com now.toISOString() é correto: "expirou se já passou deste momento".
  const now = new Date();

  // Aviso de 2 dias: trial expira entre agora e 48h a partir de agora
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const nowISO  = now.toISOString();
  const in48hISO = in48h.toISOString();

  const results = { expiring: 0, expired: 0, errors: 0 };

  // ── 1. Trial expirando nas próximas 48h ──────────────────────────────────
  // Compara timestamps absolutos UTC — correto para usuários em qualquer fuso.
  // trial_warning_sent_at = null garante deduplicacao: cron pode rodar a cada hora
  // sem reenviar email para quem ja recebeu o aviso.
  const { data: expiring } = await db
    .from('charlotte_users')
    .select('id, name, email, trial_ends_at')
    .eq('subscription_status', 'trial')
    .eq('is_institutional', false)
    .gt('trial_ends_at', nowISO)
    .lte('trial_ends_at', in48hISO)
    .is('trial_warning_sent_at', null);

  for (const user of expiring ?? []) {
    const expiresAt = formatDatePT(user.trial_ends_at);
    const { subject, html } = trialExpiringTemplate({
      name: user.name ?? user.email.split('@')[0],
      expiresAt,
    });
    const ok = await sendEmail({ to: user.email, subject, html });
    if (ok) {
      results.expiring++;
      // Marca como enviado para nao reenviar em proximas execucoes
      await db
        .from('charlotte_users')
        .update({ trial_warning_sent_at: nowISO })
        .eq('id', user.id);
    } else {
      results.errors++;
    }
  }

  // ── 2. Trial vencido: atualiza DB e envia email ───────────────────────────
  // Usa now.toISOString() — "expirou se trial_ends_at já passou deste momento".
  // Não mais "antes de meia-noite UTC do dia X" que errava por fuso horário.
  const { data: expired } = await db
    .from('charlotte_users')
    .select('id, name, email')
    .eq('subscription_status', 'trial')
    .eq('is_institutional', false)
    .lt('trial_ends_at', nowISO);

  for (const user of expired ?? []) {
    // Atualiza status no banco
    await db
      .from('charlotte_users')
      .update({ subscription_status: 'expired', is_active: false })
      .eq('id', user.id);

    const { subject, html } = subscriptionExpiredTemplate({
      name: user.name ?? user.email.split('@')[0],
    });
    const ok = await sendEmail({ to: user.email, subject, html });
    if (ok) results.expired++;
    else     results.errors++;
  }

  console.log('[cron/trial]', results);
  return NextResponse.json({ success: true, ...results });
}
