export const dynamic = 'force-dynamic';

/**
 * app/api/admin/release-broadcast/route.ts
 *
 * Disparo unico de aviso "nova versao disponivel" (release 1.1.0 / build 119).
 * Canais: push (Expo, quem tem token) + email (Resend, todos com email).
 * Copy em PT-BR unico para todos (decisao de produto 2026-09-14).
 *
 * POST body (JSON):
 *   { "dryRun": true }              -> so conta a audiencia, nao envia
 *   { "channels": ["push","email"] } -> quais canais (default ambos)
 *   { "force": true }               -> ignora a guarda de "ja enviado nas ultimas 24h"
 *
 * Auth: header x-admin-secret ou ?secret= igual a ADMIN_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SimpleEmailService } from '@/lib/simple-email-service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';
const LOG_TYPE = 'release_update';

const PUSH_TITLE = 'Charlotte atualizada';
const PUSH_BODY =
  'Uma nova versão já está disponível com melhorias na conversa por voz e estabilidade. Atualize pela App Store ou Google Play.';

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

interface Row {
  id: string;
  name: string | null;
  email: string | null;
  expo_push_token: string | null;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const dryRun: boolean = body?.dryRun === true;
  const force: boolean = body?.force === true;
  const channels: string[] = Array.isArray(body?.channels) && body.channels.length
    ? body.channels
    : ['push', 'email'];

  // ── Diagnostico de email (nao envia em massa) ──────────────────────────────
  // { diag:true }            -> so reporta se a chave/remetente estao configurados
  // { diag:true, to:"x@y" }  -> tenta 1 envio e devolve o erro cru do provedor
  if (body?.diag === true) {
    const hasKey = !!process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Charlotte <noreply@hubacademybr.com>';
    let test: unknown = 'nenhum (passe { to } para testar 1 envio)';
    if (body?.to) {
      const tpl = SimpleEmailService.getReleaseUpdateTemplate('Teste');
      test = await SimpleEmailService.sendEmailDetailed(body.to, tpl);
    }
    return NextResponse.json({ diag: true, hasKey, fromEmail, test });
  }

  const supabase = getSupabaseAdmin();

  // ── Guarda de idempotencia: nao reenviar se ja houve release_update < 24h ──
  if (!force && !dryRun) {
    const ago24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('notification_type', LOG_TYPE)
      .gte('created_at', ago24h);
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        skipped: true,
        reason: `Ja houve um disparo '${LOG_TYPE}' nas ultimas 24h (${count}). Use force:true para reenviar.`,
      });
    }
  }

  // ── Audiencia ──────────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('charlotte_users')
    .select('id, name, email, expo_push_token');
  if (error) {
    return NextResponse.json({ error: `Falha ao buscar usuarios: ${error.message}` }, { status: 500 });
  }
  const rows = (data ?? []) as Row[];

  const pushRows = rows.filter(r => r.expo_push_token?.startsWith('ExponentPushToken['));
  const emailRows = rows.filter(r => !!r.email);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      totalUsers: rows.length,
      wouldPush: channels.includes('push') ? pushRows.length : 0,
      wouldEmail: channels.includes('email') ? emailRows.length : 0,
    });
  }

  const result: Record<string, unknown> = { channels };

  // ── PUSH (Expo) ──────────────────────────────────────────────────────────
  if (channels.includes('push')) {
    let sent = 0, errors = 0;
    const BATCH = 100;
    const tokens = pushRows.map(r => r.expo_push_token!) as string[];
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const messages = batch.map(to => ({
        to, title: PUSH_TITLE, body: PUSH_BODY,
        sound: 'default' as const, priority: 'high' as const,
        data: { type: LOG_TYPE },
      }));
      try {
        const resp = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(messages),
        });
        const json = await resp.json();
        for (const r of (json.data ?? [])) {
          if (r.status === 'ok') sent++; else errors++;
        }
      } catch (e) {
        errors += batch.length;
        console.error('release-broadcast push batch error:', e);
      }
    }
    result.push = { sent, errors, targeted: tokens.length };

    // log best-effort
    try {
      await supabase.from('notification_logs').insert(
        pushRows.map(r => ({
          user_id: r.id,
          notification_type: LOG_TYPE,
          status: 'sent',
          message_title: PUSH_TITLE,
          message_body: PUSH_BODY,
          platform: 'expo',
        })),
      );
    } catch (e) {
      console.warn('release-broadcast log warn:', e);
    }
  }

  // ── EMAIL (Resend) ─────────────────────────────────────────────────────────
  if (channels.includes('email')) {
    let sent = 0, errors = 0;
    for (const r of emailRows) {
      const tpl = SimpleEmailService.getReleaseUpdateTemplate(r.name);
      const ok = await SimpleEmailService.sendEmail(r.email!, tpl);
      if (ok) sent++; else errors++;
    }
    result.email = { sent, errors, targeted: emailRows.length };
  }

  return NextResponse.json({ ok: true, ...result });
}
