// app/api/auth/send-email/route.ts
// Supabase "Send Email" Auth Hook — substitui o envio nativo do Supabase.
// Configurar em: Supabase Dashboard -> Authentication -> Hooks -> Send Email
// URL:    https://charlotte.hubacademybr.com/api/auth/send-email
// Secret: v1,whsec_<base64>  (mesma string do Supabase dashboard)

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import {
  confirmSignup,
  resetPassword,
  magicLink,
  emailChange,
} from '@/lib/supabase-email-templates';

const HOOK_SECRET  = process.env.SUPABASE_HOOK_SECRET ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// Default redirect: pagina web inteligente que tenta abrir o app via deep link
// e mostra botoes de App Store / Play Store se o app nao estiver instalado.
// A pagina /open le os tokens do hash (#access_token=...) e abre charlotte://auth/callback#...
const DEFAULT_REDIRECT = 'https://queizy.com/open';

// ── URL de confirmacao ────────────────────────────────────────────────────────
const ACTION_TYPE_MAP: Record<string, string> = {
  signup:               'signup',
  recovery:             'recovery',
  magiclink:            'magiclink',
  email_change_new:     'email_change',
  email_change_current: 'email_change',
  invite:               'invite',
  reauthentication:     'reauthentication',
};

function buildConfirmationUrl(emailData: Record<string, string>): string {
  // Usa sempre SUPABASE_URL (clean project URL sem /auth/v1) para evitar
  // path duplicado: emailData.site_url pode chegar como .../auth/v1
  // causando /auth/v1/auth/v1/verify.
  // Usa sempre DEFAULT_REDIRECT ignorando emailData.redirect_to
  // (o app pode passar uma URL antiga via emailRedirectTo no signUp).
  const projectUrl = SUPABASE_URL.replace(/\/auth\/v1\/?$/, '');
  const type       = ACTION_TYPE_MAP[emailData.email_action_type] ?? emailData.email_action_type;
  const url        = new URL(`${projectUrl}/auth/v1/verify`);
  url.searchParams.set('token',       emailData.token_hash ?? '');
  url.searchParams.set('type',        type);
  url.searchParams.set('redirect_to', DEFAULT_REDIRECT);
  return url.toString();
}

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES: Record<string, { subject: string; html: string }> = {
  signup:               { subject: 'Confirme seu email \u2014 Queizy',            html: confirmSignup  },
  recovery:             { subject: 'Redefini\u00e7\u00e3o de senha \u2014 Queizy', html: resetPassword  },
  magiclink:            { subject: 'Seu link de acesso \u2014 Queizy',            html: magicLink      },
  email_change_new:     { subject: 'Confirme seu novo email \u2014 Queizy',       html: emailChange    },
  email_change_current: { subject: 'Confirme seu novo email \u2014 Queizy',       html: emailChange    },
};

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verificar assinatura Standard Webhooks
  // standardwebhooks so reconhece o prefixo "whsec_", nao "v1,whsec_"
  const whSecret = HOOK_SECRET.startsWith('v1,') ? HOOK_SECRET.slice(3) : HOOK_SECRET;
  try {
    const wh = new Webhook(whSecret);
    wh.verify(rawBody, {
      'webhook-id':        req.headers.get('webhook-id')        ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
    });
  } catch (err) {
    console.error('[send-email hook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { user?: { email?: string }; email_data?: Record<string, string> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const to         = body.user?.email ?? '';
  const emailData  = body.email_data  ?? {};
  const actionType = emailData.email_action_type ?? '';

  if (!to || !actionType) {
    return NextResponse.json({ error: 'Missing email or action type' }, { status: 400 });
  }

  const tmpl = TEMPLATES[actionType];
  if (!tmpl) {
    console.warn('[send-email hook] Unmapped action type:', actionType);
    return NextResponse.json({});
  }

  const confirmationUrl = buildConfirmationUrl(emailData);
  const html = tmpl.html.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, confirmationUrl);

  const ok = await sendEmail({ to, subject: tmpl.subject, html });
  if (!ok) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({});
}
