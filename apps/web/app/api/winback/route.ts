export const dynamic = 'force-dynamic';

/**
 * app/api/winback/route.ts
 * Resposta de 1 toque da campanha de volta ("O que te fez parar?"). Sem login: valida o token HMAC
 * do id do aluno (lib/winback.ts). GET ?u=<id>&t=<token>&a=<resposta>. A primeira resposta vale e
 * credita 5 minutos de ligação por voz; tocar de novo só mostra a página de obrigado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyWinback, isWinbackAnswer, WINBACK_REWARD_SECONDS } from '@/lib/winback';
import { SMART_LINK } from '@/lib/email-brand';

function page(title: string, message: string, status: number, extra = ''): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title></head>
<body style="margin:0;background:#FAF7F0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#16131F;">
  <div style="max-width:460px;margin:0 auto;padding:80px 24px;text-align:center;">
    <img src="https://queizy.com/images/queizy-logo.png" height="32" style="height:32px;" alt="Queizy" />
    <h1 style="font-size:24px;margin:28px 0 12px;letter-spacing:-0.3px;">${title}</h1>
    <p style="font-size:16px;color:#515154;line-height:1.6;margin:0;">${message}</p>
    ${extra}
    <p style="font-size:12px;color:#86868b;margin-top:48px;">Queizy &mdash; Hub Academy Ltda</p>
  </div>
</body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const openButton = `<a href="${SMART_LINK}" style="display:inline-block;margin-top:28px;background:#16131F;color:#FFFFFF;font-weight:700;font-size:16px;text-decoration:none;padding:15px 30px;border-radius:14px;">Abrir o Queizy</a>`;

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') ?? '';
  const t = req.nextUrl.searchParams.get('t') ?? '';
  const a = req.nextUrl.searchParams.get('a') ?? '';

  if (!verifyWinback(u, t) || !isWinbackAnswer(a)) {
    return page('Link inválido', 'Este link não é válido. Se precisar, responda o e-mail que a gente ajuda.', 400);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: saved, error } = await supabase
      .from('winback_answers')
      .upsert({ user_id: u, answer: a } as never, { onConflict: 'user_id', ignoreDuplicates: true })
      .select('user_id');
    if (error) return page('Algo deu errado', 'Não conseguimos registrar agora. Tente de novo em instantes.', 500);

    // Primeira resposta: credita os 5 minutos (somam ao saldo bônus, que não zera no mês).
    if ((saved ?? []).length) {
      const { data: user } = await supabase.from('charlotte_users').select('live_voice_bonus_seconds').eq('id', u).maybeSingle();
      if (user) {
        const bonus = Number((user as { live_voice_bonus_seconds: number | null }).live_voice_bonus_seconds ?? 0);
        const { error: upErr } = await supabase.from('charlotte_users')
          .update({ live_voice_bonus_seconds: bonus + WINBACK_REWARD_SECONDS } as never).eq('id', u);
        if (!upErr) await supabase.from('winback_answers').update({ rewarded_at: new Date().toISOString() } as never).eq('user_id', u);
      }
    }
  } catch {
    return page('Algo deu errado', 'Não conseguimos registrar agora. Tente de novo em instantes.', 500);
  }

  return page(
    'Obrigado pela resposta!',
    'Seus 5 minutos de ligação por voz já estão na sua conta. E o seu tópico grátis de hoje está te esperando na trilha.',
    200,
    openButton,
  );
}
