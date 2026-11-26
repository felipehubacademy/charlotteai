// app/api/test-microsoft-graph-email/route.ts
// Envia todos os templates de email para teste. Protegido por ADMIN_SECRET.
// POST { "to": "email@exemplo.com", "type": "all" | "invite" | "welcome" | "reset" | "trial" | "expired" | "auth_signup" | "auth_recovery" | "auth_magic" | "auth_email_change" }

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { safeEqual } from '@/lib/secret-auth';
import {
  inviteTemplate,
  welcomeSubscriberTemplate,
  resetPasswordTemplate,
  trialExpiringTemplate,
  subscriptionExpiredTemplate,
} from '@/lib/email-templates';
import {
  confirmSignup,
  resetPassword  as authResetPassword,
  magicLink,
  emailChange,
} from '@/lib/supabase-email-templates';

const DEMO_URL = 'https://charlotte.hubacademybr.com';

// Substitui {{ .ConfirmationURL }} nos templates de auth
function fillAuthTemplate(html: string): string {
  return html.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, DEMO_URL);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') ?? '';
  if (!process.env.ADMIN_SECRET || !safeEqual(secret, process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to, type = 'all' } = await req.json();
  if (!to) return NextResponse.json({ error: 'to is required' }, { status: 400 });

  // ── Templates de negocio ──────────────────────────────────────────────────
  const businessTemplates = {
    invite:  inviteTemplate({ name: 'Felipe', email: to, tempPassword: 'Teste@1234' }),
    welcome: welcomeSubscriberTemplate({ name: 'Felipe', level: 'Intermediate', trialEndsAt: '16 de abril de 2026' }),
    reset:   resetPasswordTemplate({ name: 'Felipe', resetUrl: `${DEMO_URL}/reset-password?token=exemplo` }),
    trial:   trialExpiringTemplate({ name: 'Felipe', expiresAt: '16 de abril de 2026' }),
    expired: subscriptionExpiredTemplate({ name: 'Felipe' }),
  };

  // ── Templates do Supabase Auth Hook ──────────────────────────────────────
  const authTemplates = {
    auth_signup:       { subject: 'Confirme seu email \u2014 Charlotte',            html: fillAuthTemplate(confirmSignup) },
    auth_recovery:     { subject: 'Redefini\u00e7\u00e3o de senha \u2014 Charlotte', html: fillAuthTemplate(authResetPassword) },
    auth_magic:        { subject: 'Seu link de acesso \u2014 Charlotte',            html: fillAuthTemplate(magicLink) },
    auth_email_change: { subject: 'Confirme seu novo email \u2014 Charlotte',       html: fillAuthTemplate(emailChange) },
  };

  const allTemplates = { ...businessTemplates, ...authTemplates };

  const toSend: [string, { subject: string; html: string }][] =
    type === 'all'
      ? Object.entries(allTemplates)
      : [[type, allTemplates[type as keyof typeof allTemplates]]].filter(([, t]) => t) as any;

  if (!toSend.length) {
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }

  const results: Record<string, boolean> = {};

  for (const [name, tmpl] of toSend) {
    results[name] = await sendEmail({ to, subject: tmpl.subject, html: tmpl.html });
    // Pequeno delay para nao sobrecarregar o Graph
    await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ success: true, results });
}
