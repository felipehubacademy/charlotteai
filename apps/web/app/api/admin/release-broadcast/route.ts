export const dynamic = 'force-dynamic';
// 105 envios sequenciais pelo Graph podem passar de 60s — evita timeout parcial.
export const maxDuration = 300;

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
 *   { "before": "2026-10-09" }      -> só quem se cadastrou antes dessa data (ex.: quem usava o app como Charlotte)
 * Contas da equipe e de teste (@hubacademybr.com, @queizy.com) ficam sempre de fora.
 *
 * Auth: header x-admin-secret ou ?secret= igual a ADMIN_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
// Email do projeto vai por Microsoft Graph (Office 365), o MESMO caminho do
// reset de senha / signup / welcome. Template no padrao usual do projeto.
import { sendEmail as graphSendEmail } from '@/lib/microsoft-graph-email-service';
import { releaseUpdateTemplate, familyGrowsTemplate, appUpdateTemplate } from '@/lib/email-templates';
import { unsubscribeUrl } from '@/lib/unsubscribe';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Campanhas: { campaign: 'release' } (padrão, "A Charlotte agora é Queizy") ou { campaign: 'family' }
// ("A Família Queizy está crescendo": chegada do Igorfina e do Manual do F#did@) ou { campaign: 'update' }
// ("Atualize o Queizy": só quem está numa versão de loja antiga). Cada uma tem o
// próprio tipo de log, então a guarda de 24h de uma não bloqueia a outra.
const CAMPAIGNS = {
  release: {
    logType: 'release_update',
    pushTitle: 'Agora somos Queizy',
    pushBody: 'O app ganhou nome e cara nova. A Charlotte continua sua tutora. Atualize pela App Store ou Google Play.',
    template: releaseUpdateTemplate,
  },
  family: {
    logType: 'family_grows',
    pushTitle: 'A Família Queizy cresceu',
    pushBody: 'O Igorfina chegou com uma trilha só dele, cheia de imitações. Vem conhecer o Manual do F#did@!',
    template: familyGrowsTemplate,
  },
  // Só quem já abriu o app e está numa versão de loja anterior à mais recente (LATEST_STORE_VERSION).
  update: {
    logType: 'app_update',
    pushTitle: 'Atualize o Queizy',
    pushBody: 'Saiu versão nova na App Store e na Google Play, com correções e melhorias. Atualize pela loja para tudo funcionar direitinho.',
    template: appUpdateTemplate,
  },
} as const;
const LATEST_STORE_VERSION = '2.0.2';
type CampaignId = keyof typeof CAMPAIGNS;

// Login próprio (Bearer) com papel que acessa 'notifications', ou a senha mestra antiga.
async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'notifications');
}

interface Row {
  id: string;
  name: string | null;
  email: string | null;
  expo_push_token: string | null;
  marketing_opt_out: boolean | null;
  email_bounced: boolean | null;
  app_version: string | null;
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const dryRun: boolean = body?.dryRun === true;
  const force: boolean = body?.force === true;
  const channels: string[] = Array.isArray(body?.channels) && body.channels.length
    ? body.channels
    : ['push', 'email'];
  const campaignId: CampaignId = body?.campaign === 'family' || body?.campaign === 'update' ? body.campaign : 'release';
  const campaign = CAMPAIGNS[campaignId];
  const LOG_TYPE = campaign.logType;
  const PUSH_TITLE = campaign.pushTitle;
  const PUSH_BODY = campaign.pushBody;

  // ── Diagnostico de email (nao envia em massa) ──────────────────────────────
  // { diag:true }            -> so reporta se a chave/remetente estao configurados
  // { diag:true, to:"x@y" }  -> tenta 1 envio e devolve o erro cru do provedor
  if (body?.diag === true) {
    const provider = 'microsoft-graph';
    const hasCreds = !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
    let test: unknown = 'nenhum (passe { to } para testar 1 envio)';
    if (body?.to) {
      // Usa o id real do usuario (se existir) pra o link de descadastro funcionar de verdade.
      const supabase = getSupabaseAdmin();
      const res = await supabase
        .from('charlotte_users').select('id, name').eq('email', body.to).maybeSingle();
      const u = res.data as { id: string; name: string | null } | null;
      const tpl = campaign.template({
        name: u?.name ?? 'Teste',
        unsubscribeUrl: u?.id ? unsubscribeUrl(u.id) : undefined,
      });
      const ok = await graphSendEmail({ to: body.to, subject: tpl.subject, html: tpl.html });
      test = { ok, unsubUserId: u?.id ?? null };
    }
    return NextResponse.json({ diag: true, campaign: campaignId, provider, hasCreds, test });
  }

  // ── TRAVA DURA: qualquer ENVIO real exige { confirm:true } explicito. ───────
  // dryRun continua liberado (so conta) e diag ja retornou acima. Isso impede
  // que body malformado / chamada acidental / deploy antigo dispare broadcast.
  if (!dryRun && body?.confirm !== true) {
    return NextResponse.json({
      skipped: true,
      reason: 'Bloqueado: envio exige { confirm: true } explicito. NADA foi enviado.',
    });
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
    .select('id, name, email, expo_push_token, marketing_opt_out, email_bounced, app_version, created_at');
  if (error) {
    return NextResponse.json({ error: `Falha ao buscar usuarios: ${error.message}` }, { status: 500 });
  }
  const before = typeof body?.before === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.before) ? body.before : null;
  const isTeam = (e: string | null) => !!e && /@(hubacademybr\.com|queizy\.com)$/i.test(e);
  const rows = ((data ?? []) as (Row & { created_at: string })[])
    .filter(r => !isTeam(r.email))
    .filter(r => !before || r.created_at < before)
    .filter(r => campaignId !== 'update' || (!!r.app_version && r.app_version !== LATEST_STORE_VERSION));

  const pushRows = rows.filter(r => r.expo_push_token?.startsWith('ExponentPushToken['));
  // Marketing: exclui descadastrados (LGPD) e emails que ja deram bounce. Push nao e afetado.
  const emailRows = rows.filter(r => !!r.email && !r.marketing_opt_out && !r.email_bounced);
  const emailOptedOut = rows.filter(r => !!r.email && r.marketing_opt_out).length;
  const emailBounced = rows.filter(r => !!r.email && r.email_bounced).length;

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      campaign: campaignId,
      totalUsers: rows.length,
      ...(campaignId === 'update' ? { byVersion: rows.reduce<Record<string, number>>((a, r) => { a[r.app_version!] = (a[r.app_version!] ?? 0) + 1; return a; }, {}) } : {}),
      wouldPush: channels.includes('push') ? pushRows.length : 0,
      wouldEmail: channels.includes('email') ? emailRows.length : 0,
      emailOptedOut,
      emailBounced,
    });
  }

  const result: Record<string, unknown> = { campaign: campaignId, channels };

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
      const tpl = campaign.template({ name: r.name, unsubscribeUrl: unsubscribeUrl(r.id) });
      const ok = await graphSendEmail({ to: r.email!, subject: tpl.subject, html: tpl.html });
      if (ok) sent++; else errors++;
    }
    result.email = { sent, errors, targeted: emailRows.length };
  }

  return NextResponse.json({ ok: true, ...result });
}
