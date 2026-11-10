// lib/ai-cost-report.ts — custos de IA (tarefa ai_costs do scheduler, às 8h), do dia anterior a ontem (já fechado
// na OpenAI). Grava todo dia para o /admin; e-mail e alerta no celular só quando há alerta.
// Valores REAIS: OpenAI pela API de custos da organização (por item) e ElevenLabs pela assinatura.
// O registro interno (openai_usage) subestima: não conta o Live Voice nem as escritas de cache.
// Alerta: OpenAI do dia acima do teto. ElevenLabs só informa o consumo (a recarga automática está ligada).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { notifyAdmins } from '@/lib/admin-push';
import { reportRecipients } from '@/lib/admin-prefs';
import { base, h1, p, btn, note } from '@/lib/email-brand';
import { fxToBrl } from '@/lib/fx';
import { openaiCostDays } from '@/lib/provider-costs';

const OPENAI_DAILY_LIMIT_USD = Number(process.env.AI_DAILY_ALERT_USD || 5);
const DAY = 86400000;

/** Dia relatado (YYYY-MM-DD). É ANTEONTEM: a OpenAI leva cerca de um
 *  dia para lançar os custos dos modelos de texto (às 8h do dia seguinte eles ainda vinham zerados, só o áudio
 *  aparecia). A API agrupa por dia UTC. */
function reportDay(): { day: string } {
  const nowBrt = new Date(Date.now() - 3 * 3600000);
  const day = new Date(Date.UTC(nowBrt.getUTCFullYear(), nowBrt.getUTCMonth(), nowBrt.getUTCDate()) - 2 * DAY);
  return { day: day.toISOString().slice(0, 10) };
}

async function openaiDay(day: string): Promise<{ usd: number; lines: { name: string; usd: number }[] } | null> {
  const c = await openaiCostDays();
  if (!c.value) { if (c.error) throw new Error(c.error); return null; }
  const found = c.value.find(d => d.date === day);
  // Dia sem linha numa leitura atual é dia sem gasto; numa leitura antiga, ainda não se sabe.
  if (!found && c.stale) throw new Error(c.error ?? 'leitura antiga sem esse dia');
  return found ? { usd: found.usd, lines: found.lines } : { usd: 0, lines: [] };
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
  const { day } = reportDay();
  // Trava: só quem criar a linha do dia manda o e-mail.
  const { data: claimed } = await supabase.from('ai_cost_daily').upsert({ day } as never, { onConflict: 'day', ignoreDuplicates: true }).select('day');
  if (!opts.force && !(claimed ?? []).length) return { sent: false, reason: 'já enviado' };

  let openaiError: string | undefined;
  const [oa, el, fx] = await Promise.all([openaiDay(day).catch(e => { console.error('[ai-cost-report] openai', e); openaiError = String(e?.message ?? e); return null; }), elevenSub().catch(() => null), fxToBrl('USD').catch(() => 5.5)]);
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
    // Passou do plano: a recarga automática está cobrindo, não existe data em que os créditos acabam.
    const runOut = left > 0 && perDay && perDay > 0 ? new Date(Date.now() + (left / perDay) * DAY) : null;
    elevenLine = `ElevenLabs (plano ${el.plan}): ${el.used.toLocaleString('pt-BR')} de ${el.limit.toLocaleString('pt-BR')} créditos (${pct}%)`
      + (perDay ? `, cerca de ${Math.round(perDay).toLocaleString('pt-BR')} por dia` : '')
      + (el.resetAt ? `. Renova em ${dateBr(el.resetAt)}` : '')
      + (runOut ? `; nesse ritmo o plano acaba em ${dateBr(runOut)} e a recarga automática cobre o resto.` : left <= 0 ? '; acima do plano, coberto pela recarga automática.' : '.');
  }

  await supabase.from('ai_cost_daily').update({
    openai_usd: oa?.usd ?? null, openai_lines: oa?.lines ?? null,
    eleven_used: el?.used ?? null, eleven_limit: el?.limit ?? null, eleven_reset_at: el?.resetAt?.toISOString() ?? null,
    alerts, sent_at: new Date().toISOString(),
  } as never).eq('day', day);

  // A caixa do suporte não recebe: lá todo e-mail vira chamado.
  // Quem recebe: administradores que não desligaram este relatório em Minha conta (suporte@ fica de fora).
  // Sem alerta, os números ficam só no /admin.
  if (!alerts.length && !opts.force) return { sent: false, reason: 'sem alerta', openaiUsd: oa?.usd ?? null, openaiError };

  const to = (await reportRecipients('ai_costs')).filter(e => !/^suporte@/i.test(e));
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
  if (alerts.length) await notifyAdmins({ title: 'Custos de IA: atenção', body: alerts.join(' ').slice(0, 300), url: '/admin/finance', tag: 'ai-costs', category: 'ai_costs' }).catch(() => 0);
  return { sent: sent > 0, openaiUsd: oa?.usd ?? null, openaiError };
}
