export const dynamic = 'force-dynamic';

/**
 * app/api/email/unsubscribe/route.ts
 * Descadastro de 1 clique dos emails de marketing (LGPD). Sem login: valida um
 * token HMAC do id do usuario. GET ?u=<id>&t=<token>. So afeta comunicacoes de
 * marketing — emails transacionais (reset de senha, welcome) continuam normais.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyUnsub } from '@/lib/unsubscribe';

function page(title: string, message: string, status: number, extra = ''): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title></head>
<body style="margin:0;background:#f4f3fa;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#16153A;">
  <div style="max-width:460px;margin:0 auto;padding:80px 24px;text-align:center;">
    <img src="https://charlotte.hubacademybr.com/charlotte-avatar.png" width="72" height="72" style="border-radius:50%;" alt="Charlotte" />
    <h1 style="font-size:24px;margin:28px 0 12px;letter-spacing:-0.3px;">${title}</h1>
    <p style="font-size:16px;color:#515154;line-height:1.6;margin:0;">${message}</p>
    ${extra}
    <p style="font-size:12px;color:#86868b;margin-top:48px;">Charlotte &mdash; Hub Academy Ltda</p>
  </div>
</body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') ?? '';
  const t = req.nextUrl.searchParams.get('t') ?? '';
  const resub = req.nextUrl.searchParams.get('resub') === '1';

  if (!verifyUnsub(u, t)) {
    return page(
      'Link inválido',
      'Este link não é válido ou expirou. Se precisar, fale com a equipe da Hub Academy.',
      400,
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('charlotte_users')
      .update({ marketing_opt_out: !resub })
      .eq('id', u);
    if (error) {
      return page('Algo deu errado', 'Não conseguimos concluir agora. Tente novamente em instantes.', 500);
    }
  } catch {
    return page('Algo deu errado', 'Não conseguimos concluir agora. Tente novamente em instantes.', 500);
  }

  if (resub) {
    return page(
      'Que bom te ver de volta!',
      'Pronto — você voltará a receber nossas novidades por email.',
      200,
    );
  }

  // Página de descadastro com opção de recadastro (1 clique)
  const resubUrl = `${req.nextUrl.origin}${req.nextUrl.pathname}?u=${encodeURIComponent(u)}&t=${t}&resub=1`;
  const extra = `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;">
      Foi um engano? <a href="${resubUrl}" style="color:#16153A;font-weight:600;text-decoration:underline;">Clique aqui para continuar recebendo nossos emails</a>.
    </p>`;
  return page(
    'Você foi descadastrado',
    'Pronto — você não receberá mais nossos emails de novidades. Emails essenciais da sua conta (como redefinição de senha) continuam sendo enviados normalmente.',
    200,
    extra,
  );
}
