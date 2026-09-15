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

function page(title: string, message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title></head>
<body style="margin:0;background:#f4f3fa;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#16153A;">
  <div style="max-width:460px;margin:0 auto;padding:80px 24px;text-align:center;">
    <img src="https://charlotte.hubacademybr.com/charlotte-avatar.png" width="72" height="72" style="border-radius:50%;" alt="Charlotte" />
    <h1 style="font-size:24px;margin:28px 0 12px;letter-spacing:-0.3px;">${title}</h1>
    <p style="font-size:16px;color:#515154;line-height:1.6;margin:0;">${message}</p>
    <p style="font-size:12px;color:#86868b;margin-top:48px;">Charlotte &mdash; Hub Academy Ltda</p>
  </div>
</body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') ?? '';
  const t = req.nextUrl.searchParams.get('t') ?? '';

  if (!verifyUnsub(u, t)) {
    return page(
      'Link inválido',
      'Este link de descadastro não é válido ou expirou. Se precisar, fale com a equipe da Hub Academy.',
      400,
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('charlotte_users')
      .update({ marketing_opt_out: true })
      .eq('id', u);
    if (error) {
      return page('Algo deu errado', 'Não conseguimos concluir o descadastro agora. Tente novamente em instantes.', 500);
    }
  } catch {
    return page('Algo deu errado', 'Não conseguimos concluir o descadastro agora. Tente novamente em instantes.', 500);
  }

  return page(
    'Você foi descadastrado',
    'Pronto — você não receberá mais nossos emails de novidades. Emails essenciais da sua conta (como redefinição de senha) continuam sendo enviados normalmente.',
    200,
  );
}
