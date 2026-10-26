// lib/ai-cost-report.ts — e-mail diário de custos de IA (tarefa ai_costs do scheduler, às 8h), do dia
// anterior a ontem (já fechado na OpenAI).
// Valores REAIS: OpenAI pela API de custos da organização (por item) e ElevenLabs pela assinatura.
// O registro interno (openai_usage) subestima: não conta o Live Voice nem as escritas de cache.
// Alertas: ElevenLabs passou de 80/90/95% ou vai acabar antes de renovar; OpenAI do dia acima do teto.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { notifyAdmins } from '@/lib/admin-push';
import { base, h1, p, btn, note } from '@/lib/email-brand';
import { fxToBrl } from '@/lib/fx';

const OPENAI_DAILY_LIMIT_USD = Number(process.env.AI_DAILY_ALERT_USD || 5);
const ELEVEN_STEPS = [95, 90, 80]; // 80%: hora de ligar a recarga automática (o Felipe liga na mão)
const DAY = 86400000;

/** Dia relatado (YYYY-MM-DD) e o intervalo dele em segundos. É ANTEONTEM: a OpenAI leva cerca de um
 *  dia para lançar os custos dos modelos de texto (às 8h do dia seguinte eles ainda vinham zerados, só o áudio
 *  aparecia). A API agrupa por dia UTC, então o intervalo vai de 00:00 a 24:00 UTC desse dia. */
function reportDay(): { day: string; start: number; end: number } {
  const nowBrt = new Date(Date.now() - 3 * 3600000);
  const day = new Date(Date.UTC(nowBrt.getUTCFullYear(), nowBrt.getUTCMonth(), nowBrt.getUTCDate()) - 2 * DAY);
  const start = day.getTime() / 1000;
  return { day: day.toISOString().slice(0, 10), start, end: start + 86400 };
}

async function openaiDay(start: number, end: number): Promise<{ usd: number; lines: { name: string; usd: number }[] } | null> {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return null;
  const url = new URL('https://api.openai.com/v1/organization/costs');
  url.searchParams.set('start_time', String(start));
  url.searchParams.set('end_time', String(end));
  url.searchParams.set('bucket_width', '1d');
  url.searchParams.append('group_by', 'line_item');
  const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!r.ok) throw new Error(`OpenAI costs ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const lines = new Map<string, number>();
  for (const bucket of j.data ?? []) for (const res of bucket.results ?? []) {
    const name = res.line_item ?? 'Outros';
    lines.set(name, (lines.get(name) ?? 0) + Number(res.amount?.value ?? 0));
  }
  const arr = [...lines.entries()].map(([name, usd]) => ({ name, usd })).sort((a, b) => b.usd - a.usd);
  return { usd: arr.reduce((s, l) => s + l.usd, 0), lines: arr };
}

async function elevenSub(): Promise<{ used: number; limit: number; resetAt: Date | null; plan: string } | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key }, cache: 'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  return {
    used: Number(j.character_count ?? 0), limit: Number(j.character_limit ?? 0), plan: j.tier ?? '—',
    resetAt: j.next_character_count_reset_unix ? new Date(j.next_character_count_reset_unix * 1000) : null,
  };
}

const usd = (v: number) => `US$ ${v.toFixed(2).replace('.', ',')}`;
const dateBr = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

/** Roda às 8h (Brasília) ou forçado; manda um e-mail por dia no máximo. */
export async function runAiCostReport(opts: { force?: boolean } = {}): Promise<{ sent: boolean; reason?: string; openaiUsd?: number | null; openaiError?: string }> {
  const hourBrt = new Date(Date.now() - 3 * 3600000).getUTCHours();
  if (!opts.force && hourBrt !== 8) return { sent: false, reason: 'fora do horário' };
  const supabase = getSupabaseAdmin();
  const { day, start, end } = reportDay();
  // Trava: só quem criar a linha do dia manda o e-mail.
  const { data: claimed } = await supabase.from('ai_cost_daily').upsert({ day } as never, { onConflict: 'day', ignoreDuplicates: true }).select('day');
  if (!opts.force && !(claimed ?? []).length) return { sent: false, reason: 'já enviado' };

  let openaiError: string | undefined;
  const [oa, el, fx] = await Promise.all([openaiDay(start, end).catch(e => { console.error('[ai-cost-report] openai', e); openaiError = String(e?.message ?? e); return null; }), elevenSub().catch(() => null), fxToBrl('USD').catch(() => 5.5)]);
  const alerts: string[] = [];

  const dayLabel = dateBr(new Date(Date.parse(day) + 12 * 3600000));
  if (oa && oa.usd > OPENAI_DAILY_LIMIT_USD) alerts.push(`OpenAI gastou ${usd(oa.usd)} em ${dayLabel}, acima do teto de ${usd(OPENAI_DAILY_LIMIT_USD)} por dia.`);

  let elevenLine = 'ElevenLabs: não foi possível ler a assinatura.';
  if (el && el.limit > 0) {
    const pct = Math.round((el.used / el.limit) * 100);
    // Ritmo: diferença para o dia anterior gravado; sem histórico, média desde o início do ciclo (30 dias antes da renovação).
    const { data: prev } = await supabase.from('ai_cost_daily').select('day, eleven_used').lt('day', day).not('eleven_used', 'is', null).order('day', { ascending: false }).limit(1);
    const last = ((prev ?? []) as { day: string; eleven_used: number }[])[0];
    let perDay: number | null = null;
    if (last && el.used >= last.eleven_used) perDay = (el.used - last.eleven_used) / Math.max(1, (Date.parse(day) - Date.parse(last.day)) / DAY);
    else if (el.resetAt) perDay = el.used / Math.max(1, (Date.now() - (el.resetAt.getTime() - 30 * DAY)) / DAY);
    const left = el.limit - el.used;
    const runOut = perDay && perDay > 0 ? new Date(Date.now() + (left / perDay) * DAY) : null;
    elevenLine = `ElevenLabs (plano ${el.plan}): ${el.used.toLocaleString('pt-BR')} de ${el.limit.toLocaleString('pt-BR')} créditos (${pct}%)`
      + (perDay ? `, cerca de ${Math.round(perDay).toLocaleString('pt-BR')} por dia` : '')
      + (el.resetAt ? `. Renova em ${dateBr(el.resetAt)}` : '')
      + (runOut ? `; nesse ritmo acaba em ${dateBr(runOut)}.` : '.');
    const step = ELEVEN_STEPS.find(s => pct >= s);
    if (step) alerts.push(`ElevenLabs passou de ${step}% dos créditos do ciclo (${pct}%). Ligue a recarga automática no painel da ElevenLabs.`);
    if (runOut && el.resetAt && runOut < el.resetAt) alerts.push(`ElevenLabs: nesse ritmo os créditos acabam em ${dateBr(runOut)}, antes da renovação em ${dateBr(el.resetAt)}. Sem recarga automática, as vozes dos personagens e as ligações param.`);
  }

  await supabase.from('ai_cost_daily').update({
    openai_usd: oa?.usd ?? null, openai_lines: oa?.lines ?? null,
    eleven_used: el?.used ?? null, eleven_limit: el?.limit ?? null, eleven_reset_at: el?.resetAt?.toISOString() ?? null,
    alerts, sent_at: new Date().toISOString(),
  } as never).eq('day', day);

  const { data: admins } = await supabase.from('admin_members').select('email').eq('role', 'admin').eq('active', true);
  // A caixa do suporte não recebe: lá todo e-mail vira chamado.
  const to = ((admins ?? []) as { email: string | null }[]).map(a => a.email).filter((e): e is string => !!e && !/^suporte@/i.test(e));
  const dayBr = dayLabel;
  const top = (oa?.lines ?? []).filter(l => l.usd >= 0.05).slice(0, 6);
  const html = base([
    h1(`Custos de IA de ${dayBr}`),
    alerts.length
      ? `<div style="background:#FFE9EF;border-radius:14px;padding:14px 16px;margin:0 0 18px;text-align:left;font-size:14px;line-height:1.55;color:#16131F;"><strong>Atenção</strong><ul style="margin:6px 0 0;padding-left:18px;">${alerts.map(a => `<li style="margin-bottom:4px;">${a}</li>`).join('')}</ul></div>`
      : '',
    p(oa ? `OpenAI (valor real): <strong style="color:#16131F;">${usd(oa.usd)}</strong>, cerca de R$ ${(oa.usd * fx).toFixed(2).replace('.', ',')}.` : 'OpenAI: não foi possível ler o custo real.'),
    top.length ? `<table style="margin:0 auto 18px;font-size:13.5px;color:#3A3546;border-collapse:collapse;">${top.map(l => `<tr><td style="padding:3px 14px 3px 0;text-align:left;">${l.name}</td><td style="padding:3px 0;text-align:right;white-space:nowrap;">${usd(l.usd)}</td></tr>`).join('')}</table>` : '',
    p(elevenLine),
    btn('Ver no Financeiro', 'https://queizy.com/admin/finance'),
    note(`O valor da OpenAI é do dia anterior a ontem: ela leva cerca de um dia para fechar os custos. Os créditos da ElevenLabs são de agora.<br>Teto diário da OpenAI para alerta: ${usd(OPENAI_DAILY_LIMIT_USD)}. Alertas da ElevenLabs em 80%, 90% e 95% do ciclo.`),
  ].join(''));
  const subject = `${alerts.length ? 'Atenção: ' : ''}Custos de IA de ${dayBr}: OpenAI ${oa ? usd(oa.usd) : '—'}${el && el.limit ? `, ElevenLabs ${Math.round((el.used / el.limit) * 100)}%` : ''}`;
  let sent = 0;
  for (const addr of to) if (await sendEmail({ to: addr, subject, html }).catch(() => false)) sent++;
  if (alerts.length) await notifyAdmins({ title: 'Custos de IA: atenção', body: alerts.join(' ').slice(0, 300), url: '/admin/finance', tag: 'ai-costs' }).catch(() => 0);
  return { sent: sent > 0, openaiUsd: oa?.usd ?? null, openaiError };
}
