// /api/progress/evolution — "Minha evolução" do aluno (Bearer token).
//   GET ?lang=pt|en
// Compara os últimos 30 dias com os 30 anteriores: acerto na trilha, pronúncia,
// gramática, pontos fortes e pontos de atenção (com o tópico para treinar),
// série semanal e um resumo da semana escrito pela Charlotte (IA, um por semana
// e idioma, guardado em evolution_summaries).
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logOpenAIUsage } from '@/lib/openai-usage';
import {
  DAY, isStudy, pct, pronunciation, grammar, byExercise, byTopic, currentStreak,
  type HistRow, type MsgRow,
} from '@/lib/learning-stats';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Referência pública (EF English Proficiency Index 2025). Entra como dado para
// a Charlotte usar no resumo semanal quando fizer sentido, não como card fixo.
const BENCHMARK_FACT = {
  pt: 'EF EPI 2025: o Brasil ficou em 75º lugar entre 123 países (482 pontos), abaixo da média mundial (488).',
  en: 'EF EPI 2025: Brazil placed 75th of 123 countries (482 points), below the global average (488).',
};

// Trilha nova (learn_history_v2): uma nota por atividade. Só Grammar e
// Listening & Speaking têm nota; Role-play e Chat contam como concluído.
type V2Row = { level: string; module_id: string; unit_id: string; activity_type: string; score: number | string | null; updated_at: string };
const V2_PASS: Record<string, number> = { grammar: 70, speaking: 60 };
const v2Graded = (rows: V2Row[]) => rows.filter(r => r.activity_type in V2_PASS && r.score != null && !Number.isNaN(Number(r.score)));
const v2Avg = (rows: V2Row[]) => { const g = v2Graded(rows); return g.length ? Math.round(g.reduce((a, r) => a + Number(r.score), 0) / g.length) : null; };
/** Junta o acerto da trilha antiga (por resposta) com a nota média da nova (por atividade). */
function mergeAcc(a: number | null, na: number, b: number | null, nb: number): number | null {
  if (a == null || !na) return nb ? b : null;
  if (b == null || !nb) return a;
  return Math.round((a * na + b * nb) / (na + nb));
}

/** Segunda-feira 00:00 de Brasília (YYYY-MM-DD). */
function weekStart(d = new Date()): string {
  const br = new Date(d.getTime() - 3 * 3600000);
  const dow = (br.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() - dow)).toISOString().slice(0, 10);
}

async function authUser(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return null;
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  return data?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'pt';
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const since60 = new Date(now - 60 * DAY).toISOString();
  const since56 = new Date(now - 56 * DAY).toISOString();
  const cut30 = now - 30 * DAY;

  const [userR, progR, histR, msgR, pracR, v2R] = await Promise.all([
    supabase.from('charlotte_users').select('name, charlotte_level').eq('id', user.id).maybeSingle(),
    supabase.from('charlotte_progress').select('total_xp, streak_days, last_practice_date').eq('user_id', user.id).maybeSingle(),
    supabase.from('learn_history').select('user_id, level, module_index, topic_index, exercise_type, is_correct, answered_at').eq('user_id', user.id).gte('answered_at', since60).limit(10000),
    supabase.from('chat_messages').select('user_id, role, mode, content, created_at').eq('user_id', user.id).in('mode', ['pronunciation', 'grammar']).gte('created_at', since60).order('created_at', { ascending: false }).limit(3000),
    supabase.from('charlotte_practices').select('practice_type, created_at').eq('user_id', user.id).gte('created_at', since56).limit(10000),
    supabase.from('learn_history_v2').select('level, module_id, unit_id, activity_type, score, updated_at').eq('user_id', user.id).gte('updated_at', since60).limit(5000),
  ]);

  const u = userR.data as { name: string | null; charlotte_level: string | null } | null;
  const prog = progR.data as { total_xp: number; streak_days: number; last_practice_date: string | null } | null;
  const hist = (histR.data ?? []) as HistRow[];
  const msgs = (msgR.data ?? []) as MsgRow[];
  const practices = ((pracR.data ?? []) as { practice_type: string; created_at: string }[]).filter(p => isStudy(p.practice_type));

  const v2 = (v2R.data ?? []) as V2Row[];
  const isRecent = (iso: string) => new Date(iso).getTime() >= cut30;
  const v2Now = v2.filter(r => isRecent(r.updated_at));
  const v2Prev = v2.filter(r => !isRecent(r.updated_at));
  const histNow = hist.filter(h => isRecent(h.answered_at));
  const histPrev = hist.filter(h => !isRecent(h.answered_at));
  const msgsNow = msgs.filter(m => isRecent(m.created_at));
  const msgsPrev = msgs.filter(m => !isRecent(m.created_at));

  const trailNow = mergeAcc(pct(histNow.filter(h => h.is_correct).length, histNow.length), histNow.length, v2Avg(v2Now), v2Graded(v2Now).length);
  const trailPrev = mergeAcc(pct(histPrev.filter(h => h.is_correct).length, histPrev.length), histPrev.length, v2Avg(v2Prev), v2Graded(v2Prev).length);
  const pronNow = pronunciation(msgsNow);
  const pronPrev = pronunciation(msgsPrev);
  const gramNow = grammar(msgsNow);
  const gramPrev = grammar(msgsPrev);

  // Pontos fortes e de atenção (últimos 60 dias, para ter volume).
  const topics = byTopic(hist, 5);
  const strengths = [...topics].filter(t => t.accuracy >= 80 && t.answers >= 8).sort((a, b) => b.accuracy - a.accuracy).slice(0, 4);
  const focus = topics.filter(t => t.accuracy <= 65).slice(0, 4);
  const exercises = byExercise(hist).filter(e => e.answers >= 5);
  // Trilha nova: atividades abaixo da nota de aprovação, piores primeiro.
  const focusV2 = v2Graded(v2)
    .filter(r => Number(r.score) < V2_PASS[r.activity_type])
    .sort((a, b) => Number(a.score) - Number(b.score))
    .slice(0, 4)
    .map(r => ({ level: r.level, moduleId: r.module_id, unitId: r.unit_id, activity: r.activity_type, accuracy: Math.round(Number(r.score)) }));

  // Série das últimas 8 semanas.
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    const inW = (iso: string) => { const t = new Date(iso).getTime(); return t >= start && t < end; };
    const h = hist.filter(x => inW(x.answered_at));
    const w2 = v2.filter(x => inW(x.updated_at));
    const p = pronunciation(msgs.filter(m => inW(m.created_at)));
    return {
      start: new Date(start).toISOString().slice(0, 10),
      practices: practices.filter(x => inW(x.created_at)).length,
      trailAccuracy: mergeAcc(pct(h.filter(x => x.is_correct).length, h.length), h.length, v2Avg(w2), v2Graded(w2).length),
      pronunciation: p.avg,
    };
  }).reverse();

  const data = {
    name: (u?.name ?? '').trim().split(/\s+/)[0] || null,
    level: u?.charlotte_level ?? null,
    streak: currentStreak(prog?.streak_days, prog?.last_practice_date),
    xp: prog?.total_xp ?? 0,
    trail: { accuracy: trailNow, previous: trailPrev, answers: histNow.length + v2Graded(v2Now).length },
    pronunciation: { avg: pronNow.avg, previous: pronPrev.avg, attempts: pronNow.items.length, words: pronNow.topWords.slice(0, 8) },
    grammar: { errorFree: gramNow.errorFree, previous: gramPrev.errorFree, analyzed: gramNow.analyzed, recent: gramNow.corrections.slice(0, 4) },
    strengths, focus, focusV2, exercises, weeks,
    // Compatibilidade: o build 123 ainda mostra o card e lê este campo até o OTA chegar.
    benchmark: { source: 'EF EPI 2025', text: BENCHMARK_FACT[lang] },
  };

  const summary = await weeklySummary(user.id, lang, data, gramNow.corrections.slice(0, 12));
  return NextResponse.json({ ...data, summary });
}

type EvolutionData = {
  name: string | null; level: string | null; streak: number; xp: number;
  trail: { accuracy: number | null; previous: number | null; answers: number };
  pronunciation: { avg: number | null; previous: number | null; attempts: number; words: { word: string; count: number }[] };
  grammar: { errorFree: number | null; previous: number | null; analyzed: number };
  strengths: { topic: string; accuracy: number }[];
  focus: { topic: string; accuracy: number }[];
  weeks: { practices: number }[];
};

async function weeklySummary(userId: string, lang: 'pt' | 'en', d: EvolutionData, corrections: { wrong: string; right: string }[]): Promise<string> {
  const supabase = getSupabaseAdmin();
  const week = weekStart();
  const { data: cached } = await supabase.from('evolution_summaries').select('text').eq('user_id', userId).eq('week_start', week).eq('lang', lang).maybeSingle();
  if (cached) return (cached as { text: string }).text;

  const hasData = d.trail.answers >= 10 || d.pronunciation.attempts >= 3 || d.grammar.analyzed >= 3;
  const name = d.name ?? (lang === 'pt' ? 'você' : 'you');
  if (!hasData) {
    // Sem histórico suficiente: texto fixo, sem custo de IA (não guarda, para gerar quando houver dados).
    return lang === 'pt'
      ? `Oi, ${name}! Ainda estou te conhecendo. Faça alguns tópicos da trilha e umas frases de pronúncia, e eu te mostro aqui onde você está mandando bem e o que vale treinar.`
      : `Hi, ${name}! I'm still getting to know you. Do a few trail topics and some pronunciation phrases, and I'll show you here what you're nailing and what's worth practicing.`;
  }

  const facts = {
    name: d.name, level: d.level, streakDays: d.streak,
    trailAccuracyLast30d: d.trail.accuracy, trailAccuracyPrevious30d: d.trail.previous,
    pronunciationAvgLast30d: d.pronunciation.avg, pronunciationAvgPrevious30d: d.pronunciation.previous,
    mispronouncedWords: d.pronunciation.words.map(w => w.word),
    grammarErrorFreeLast30d: d.grammar.errorFree, grammarErrorFreePrevious30d: d.grammar.previous,
    strongTopics: d.strengths.map(s => `${s.topic} (${s.accuracy}%)`),
    focusTopics: d.focus.map(f => `${f.topic} (${f.accuracy}%)`),
    recentGrammarCorrections: corrections.map(c => `${c.wrong} -> ${c.right}`),
    publicBenchmark: BENCHMARK_FACT[lang],
    practicesThisWeek: d.weeks[d.weeks.length - 1]?.practices ?? 0,
    practicesLastWeek: d.weeks[d.weeks.length - 2]?.practices ?? 0,
  };

  const system = lang === 'pt'
    ? 'Você é a Charlotte, tutora de inglês do app Queizy, falando com o aluno como uma amiga animada, num balão de conversa. Português do Brasil coloquial e com acentuação correta, tratando por "você" e pelo primeiro nome. No máximo 3 frases curtas e 45 palavras. Comemore UM número concreto dos dados, aponte UMA coisa para treinar com uma dica rápida e feche com um empurrãozinho. Se combinar, mencione o dado público (publicBenchmark) em poucas palavras, citando EF EPI; senão, ignore. A nota de pronúncia vai de 0 a 100 (escreva "nota 92", nunca "92%"); acerto na trilha e gramática sem erro são porcentagens. Use só os dados fornecidos, nunca invente números. Sem emojis, sem listas, sem saudação, sem tom de relatório (nada de "sessões", "métricas", "desempenho").'
    : "You are Charlotte, the English tutor in the Queizy app, talking to the student like an upbeat friend, in a chat bubble. Casual English, using their first name. At most 3 short sentences and 45 words. Celebrate ONE concrete number from the data, point out ONE thing to practice with a quick tip, and close with a little push. If it fits, mention the public data (publicBenchmark) in a few words, citing EF EPI; otherwise ignore it. The pronunciation score is 0 to 100 (write \"a score of 92\", never \"92%\"); trail accuracy and grammar error-free are percentages. Use only the data given, never invent numbers. No emojis, no lists, no greeting, no report tone (no \"sessions\", \"metrics\", \"performance\")."


  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      max_tokens: 140,
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(facts) }],
    });
    logOpenAIUsage({
      userId, endpoint: '/api/progress/evolution', model: 'gpt-4.1-mini',
      promptTokens: completion.usage?.prompt_tokens, completionTokens: completion.usage?.completion_tokens, totalTokens: completion.usage?.total_tokens,
    });
    const text = (completion.choices[0]?.message?.content ?? '').trim();
    if (text) {
      await supabase.from('evolution_summaries').upsert({ user_id: userId, week_start: week, lang, text } as never);
      return text;
    }
  } catch (e) {
    console.warn('[evolution] resumo falhou:', e);
  }
  return lang === 'pt'
    ? `${name}, você está construindo uma rotina de estudo. Continue praticando um pouco todo dia e acompanhe aqui a sua evolução.`
    : `${name}, you're building a study routine. Keep practicing a little every day and follow your progress here.`;
}
