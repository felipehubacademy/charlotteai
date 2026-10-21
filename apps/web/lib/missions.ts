// lib/missions.ts — missões do dia e desafio da semana: fonte única (app, push e crédito de XP).
//
// - Biblioteca de modelos (não missões escritas à mão): cada modelo tem meta por nível, onde fazer,
//   destino no app e o que mede. Por dia saem 3 missões (trilha + prática extra + constância);
//   por semana, 1 desafio.
// - Rodízio determinístico por aluno: a ordem de cada grupo é embaralhada por ciclo, então o mesmo
//   modelo não se repete até o grupo inteiro passar (7 dias na trilha, 11 semanas no desafio).
//   A ordem é própria de cada aluno, então colegas não recebem as mesmas missões no mesmo dia.
//   O desafio da semana só depende do aluno e da semana, para o push anunciar o mesmo que o app mostra.
// - O progresso é medido aqui, a partir do banco (o app não diz o que foi cumprido), e o XP é
//   creditado uma vez por período (índice único practices_goal_reward_once em charlotte.practices).
import type { SupabaseClient } from '@supabase/supabase-js';

export type MissionLevel = 'Novice' | 'Inter' | 'Advanced';
type Slot = 'trail' | 'extra' | 'habit' | 'week';
type Metric =
  | 'trail_acts' | 'roleplay' | 'guided_chat' | 'speaking' | 'grammar80' | 'topics'
  | 'vocab_reviews' | 'words_saved' | 'practice_msgs' | 'grammar_msgs' | 'audio_msgs'
  | 'xp' | 'active_days' | 'practiced';
type Bi = { pt: string; en: string };

interface Ctx { level: MissionLevel; vocabCount: number; streak: number }

interface Template {
  id: string;
  slot: Slot;
  metric: Metric;
  target: (lvl: MissionLevel) => number;
  xp: number;
  /** Variações do título (o rodízio escolhe uma); {n} = meta. */
  label: { pt: string[]; en: string[] };
  /** Onde fazer, com os nomes exatos do app. */
  where: Bi;
  unit: { one: Bi; many: Bi };
  /** Destino no app ao tocar na missão. */
  dest: string;
  /** Família de ícone/cor no app. */
  family: 'trail' | 'practice' | 'audio' | 'vocab' | 'xp' | 'streak';
  levels?: MissionLevel[];
  eligible?: (c: Ctx) => boolean;
}

const HOME = '/(app)/(tabs)';
const PRACTICE = '/(app)/(tabs)/practice';
const VOCAB = '/(app)/(tabs)/vocabulary';
const ACT = { one: { pt: 'atividade', en: 'activity' }, many: { pt: 'atividades', en: 'activities' } };
const TRAIL_WHERE = { pt: 'Na Tela Inicial, na sua trilha', en: 'On Home, in your trail' };
const n = (v: number) => () => v;

// ── Missões do dia ──────────────────────────────────────────────────────────
const DAILY: Template[] = [
  // Trilha (um por dia, sempre)
  { id: 'trail_1', slot: 'trail', metric: 'trail_acts', target: n(1), xp: 15, family: 'trail', dest: HOME, unit: ACT, where: TRAIL_WHERE,
    label: { pt: ['Conclua 1 atividade da trilha', 'Avance 1 atividade na trilha'], en: ['Complete 1 trail activity', 'Move 1 activity forward on your trail'] } },
  { id: 'trail_2', slot: 'trail', metric: 'trail_acts', target: n(2), xp: 25, family: 'trail', dest: HOME, unit: ACT, where: TRAIL_WHERE,
    label: { pt: ['Conclua 2 atividades da trilha', 'Avance 2 atividades na trilha'], en: ['Complete 2 trail activities', 'Move 2 activities forward on your trail'] } },
  { id: 'trail_3', slot: 'trail', metric: 'trail_acts', target: n(3), xp: 35, family: 'trail', dest: HOME, unit: ACT, where: TRAIL_WHERE,
    label: { pt: ['Conclua 3 atividades da trilha'], en: ['Complete 3 trail activities'] } },
  { id: 'roleplay_1', slot: 'trail', metric: 'roleplay', target: n(1), xp: 20, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, na atividade Role-play (vale refazer)', en: 'On your trail, in a Role-play activity (redo counts)' },
    label: { pt: ['Faça um Role-play da trilha', 'Encare um Role-play hoje'], en: ['Do a Role-play on your trail', 'Take on a Role-play today'] } },
  { id: 'chat_1', slot: 'trail', metric: 'guided_chat', target: n(1), xp: 20, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, na atividade Guided Chat (vale refazer)', en: 'On your trail, in a Guided Chat activity (redo counts)' },
    label: { pt: ['Faça um Guided Chat da trilha', 'Cumpra a missão de um Guided Chat'], en: ['Do a Guided Chat on your trail', 'Finish a Guided Chat mission'] } },
  { id: 'speaking_1', slot: 'trail', metric: 'speaking', target: n(1), xp: 15, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, na atividade Listening & Speaking (vale refazer)', en: 'On your trail, in a Listening & Speaking activity (redo counts)' },
    label: { pt: ['Faça um Listening & Speaking da trilha', 'Treine a pronúncia na trilha'], en: ['Do a Listening & Speaking on your trail', 'Practice pronunciation on your trail'] } },
  { id: 'grammar80_1', slot: 'trail', metric: 'grammar80', target: n(1), xp: 20, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, na atividade Gramática (vale refazer)', en: 'On your trail, in a Grammar activity (redo counts)' },
    label: { pt: ['Tire 80% ou mais numa Gramática da trilha'], en: ['Score 80% or more in a trail Grammar'] } },

  // Prática extra (rotativa)
  { id: 'vocab_5', slot: 'extra', metric: 'vocab_reviews', target: n(5), xp: 15, family: 'vocab', dest: VOCAB,
    unit: { one: { pt: 'palavra', en: 'word' }, many: { pt: 'palavras', en: 'words' } },
    where: { pt: 'No Vocabulário, em Revisar', en: 'In Vocabulary, under Review' },
    label: { pt: ['Revise 5 palavras do seu Vocabulário'], en: ['Review 5 words from your Vocabulary'] },
    eligible: c => c.vocabCount >= 5 },
  { id: 'words_2', slot: 'extra', metric: 'words_saved', target: n(2), xp: 15, family: 'vocab', dest: VOCAB,
    unit: { one: { pt: 'palavra', en: 'word' }, many: { pt: 'palavras', en: 'words' } },
    where: { pt: 'No Vocabulário, em Adicionar (ou salvando palavras nas conversas)', en: 'In Vocabulary, under Add (or saving words in conversations)' },
    label: { pt: ['Salve 2 palavras novas no Vocabulário'], en: ['Save 2 new words to your Vocabulary'] } },
  { id: 'practice_msgs', slot: 'extra', metric: 'practice_msgs', target: l => (l === 'Novice' ? 3 : 5), xp: 20, family: 'practice', dest: PRACTICE,
    unit: { one: { pt: 'mensagem', en: 'message' }, many: { pt: 'mensagens', en: 'messages' } },
    where: { pt: 'No Practice, no Free Chat (texto ou áudio)', en: 'In Practice, in Free Chat (text or voice)' },
    label: { pt: ['Envie {n} mensagens no Practice', 'Converse no Practice: {n} mensagens'], en: ['Send {n} messages in Practice', 'Chat in Practice: {n} messages'] } },
  { id: 'grammar_msgs', slot: 'extra', metric: 'grammar_msgs', target: n(3), xp: 15, family: 'practice', dest: PRACTICE,
    unit: { one: { pt: 'frase', en: 'sentence' }, many: { pt: 'frases', en: 'sentences' } },
    where: { pt: 'No Practice, no modo Gramática', en: 'In Practice, in Grammar mode' },
    label: { pt: ['Envie 3 frases no modo Gramática do Practice'], en: ['Send 3 sentences in Practice Grammar mode'] } },
  { id: 'audio_3', slot: 'extra', metric: 'audio_msgs', target: n(3), xp: 20, family: 'audio', dest: PRACTICE, levels: ['Inter', 'Advanced'],
    unit: { one: { pt: 'áudio', en: 'voice message' }, many: { pt: 'áudios', en: 'voice messages' } },
    where: { pt: 'No Practice, segurando o microfone', en: 'In Practice, holding the mic' },
    label: { pt: ['Grave 3 áudios no Practice'], en: ['Record 3 voice messages in Practice'] } },

  // Constância (rotativa)
  { id: 'xp_a', slot: 'habit', metric: 'xp', target: l => (l === 'Novice' ? 30 : 50), xp: 10, family: 'xp', dest: HOME,
    unit: { one: { pt: 'XP', en: 'XP' }, many: { pt: 'XP', en: 'XP' } },
    where: { pt: 'Qualquer atividade conta: trilha, Practice ou Vocabulário', en: 'Any activity counts: trail, Practice or Vocabulary' },
    label: { pt: ['Ganhe {n} XP hoje'], en: ['Earn {n} XP today'] } },
  { id: 'xp_b', slot: 'habit', metric: 'xp', target: l => (l === 'Novice' ? 60 : 100), xp: 20, family: 'xp', dest: HOME,
    unit: { one: { pt: 'XP', en: 'XP' }, many: { pt: 'XP', en: 'XP' } },
    where: { pt: 'Qualquer atividade conta: trilha, Practice ou Vocabulário', en: 'Any activity counts: trail, Practice or Vocabulary' },
    label: { pt: ['Ganhe {n} XP hoje', 'Chegue a {n} XP hoje'], en: ['Earn {n} XP today', 'Reach {n} XP today'] } },
  { id: 'streak_keep', slot: 'habit', metric: 'practiced', target: n(1), xp: 15, family: 'streak', dest: HOME,
    unit: { one: { pt: 'dia', en: 'day' }, many: { pt: 'dias', en: 'days' } },
    where: { pt: 'Qualquer atividade de hoje conta', en: 'Any activity today counts' },
    label: { pt: ['Estude hoje e mantenha sua sequência'], en: ['Study today and keep your streak'] },
    eligible: c => c.streak >= 1 },
];

// ── Desafio da semana (sem regra de elegibilidade: o push precisa saber qual é sem medir nada) ──
const WEEKLY: Template[] = [
  { id: 'w_trail_8', slot: 'week', metric: 'trail_acts', target: n(8), xp: 100, family: 'trail', dest: HOME, unit: ACT, where: TRAIL_WHERE,
    label: { pt: ['Conclua 8 atividades da trilha'], en: ['Complete 8 trail activities'] } },
  { id: 'w_trail_12', slot: 'week', metric: 'trail_acts', target: n(12), xp: 140, family: 'trail', dest: HOME, unit: ACT, where: TRAIL_WHERE,
    label: { pt: ['Conclua 12 atividades da trilha'], en: ['Complete 12 trail activities'] } },
  { id: 'w_topic_1', slot: 'week', metric: 'topics', target: n(1), xp: 100, family: 'trail', dest: HOME,
    unit: { one: { pt: 'tópico', en: 'topic' }, many: { pt: 'tópicos', en: 'topics' } },
    where: { pt: 'Na trilha: as 4 atividades de um tópico', en: 'On your trail: all 4 activities of a topic' },
    label: { pt: ['Conclua um tópico inteiro da trilha'], en: ['Finish a whole trail topic'] } },
  { id: 'w_topic_2', slot: 'week', metric: 'topics', target: n(2), xp: 150, family: 'trail', dest: HOME,
    unit: { one: { pt: 'tópico', en: 'topic' }, many: { pt: 'tópicos', en: 'topics' } },
    where: { pt: 'Na trilha: as 4 atividades de cada tópico', en: 'On your trail: all 4 activities of each topic' },
    label: { pt: ['Conclua 2 tópicos inteiros da trilha'], en: ['Finish 2 whole trail topics'] } },
  { id: 'w_days_5', slot: 'week', metric: 'active_days', target: n(5), xp: 100, family: 'streak', dest: HOME,
    unit: { one: { pt: 'dia', en: 'day' }, many: { pt: 'dias', en: 'days' } },
    where: { pt: 'Qualquer atividade conta, um pouco por dia', en: 'Any activity counts, a little each day' },
    label: { pt: ['Estude em 5 dias diferentes'], en: ['Study on 5 different days'] } },
  { id: 'w_xp', slot: 'week', metric: 'xp', target: l => (l === 'Novice' ? 300 : 500), xp: 120, family: 'xp', dest: HOME,
    unit: { one: { pt: 'XP', en: 'XP' }, many: { pt: 'XP', en: 'XP' } },
    where: { pt: 'Qualquer atividade conta: trilha, Practice ou Vocabulário', en: 'Any activity counts: trail, Practice or Vocabulary' },
    label: { pt: ['Ganhe {n} XP nesta semana'], en: ['Earn {n} XP this week'] } },
  { id: 'w_practice', slot: 'week', metric: 'practice_msgs', target: l => (l === 'Novice' ? 20 : 30), xp: 90, family: 'practice', dest: PRACTICE,
    unit: { one: { pt: 'mensagem', en: 'message' }, many: { pt: 'mensagens', en: 'messages' } },
    where: { pt: 'No Practice (Free Chat ou Gramática)', en: 'In Practice (Free Chat or Grammar)' },
    label: { pt: ['Envie {n} mensagens no Practice'], en: ['Send {n} messages in Practice'] } },
  { id: 'w_roleplay_3', slot: 'week', metric: 'roleplay', target: n(3), xp: 100, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, nas atividades Role-play (vale refazer)', en: 'On your trail, in Role-play activities (redo counts)' },
    label: { pt: ['Faça 3 Role-plays da trilha'], en: ['Do 3 Role-plays on your trail'] } },
  { id: 'w_chat_3', slot: 'week', metric: 'guided_chat', target: n(3), xp: 100, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, nas atividades Guided Chat (vale refazer)', en: 'On your trail, in Guided Chat activities (redo counts)' },
    label: { pt: ['Faça 3 Guided Chats da trilha'], en: ['Do 3 Guided Chats on your trail'] } },
  { id: 'w_grammar80_4', slot: 'week', metric: 'grammar80', target: n(4), xp: 110, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, nas atividades Gramática (vale refazer)', en: 'On your trail, in Grammar activities (redo counts)' },
    label: { pt: ['Tire 80% ou mais em 4 Gramáticas da trilha'], en: ['Score 80% or more in 4 trail Grammars'] } },
  { id: 'w_speaking_4', slot: 'week', metric: 'speaking', target: n(4), xp: 100, family: 'trail', dest: HOME, unit: ACT,
    where: { pt: 'Na trilha, nas atividades Listening & Speaking (vale refazer)', en: 'On your trail, in Listening & Speaking activities (redo counts)' },
    label: { pt: ['Faça 4 Listening & Speaking da trilha'], en: ['Do 4 Listening & Speaking on your trail'] } },
];

export const MISSION_TEMPLATES = [...DAILY, ...WEEKLY];

// ── Datas no fuso do aluno ──────────────────────────────────────────────────
const DEFAULT_TZ = 'America/Sao_Paulo';
function safeTz(tz?: string | null): string {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz || DEFAULT_TZ }); return tz || DEFAULT_TZ; } catch { return DEFAULT_TZ; }
}
function ymdIn(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function offsetMin(at: Date, tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}
/** Meia-noite local de AAAA-MM-DD, em UTC. */
function localMidnight(ymd: string, tz: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  return new Date(guess.getTime() - offsetMin(guess, tz) * 60000);
}
const dayIndexOf = (ymd: string) => Math.round(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86400000);
const ymdOfIndex = (i: number) => new Date(i * 86400000).toISOString().slice(0, 10);

export interface Periods { tz: string; today: string; weekStart: string; dayStartUtc: Date; weekStartUtc: Date; dayIdx: number; weekIdx: number }
export function periodsFor(tzRaw?: string | null, now = new Date()): Periods {
  const tz = safeTz(tzRaw);
  const today = ymdIn(now, tz);
  const dayIdx = dayIndexOf(today);
  const dow = (new Date(dayIdx * 86400000).getUTCDay() + 6) % 7; // segunda = 0
  const weekStart = ymdOfIndex(dayIdx - dow);
  return { tz, today, weekStart, dayStartUtc: localMidnight(today, tz), weekStartUtc: localMidnight(weekStart, tz), dayIdx, weekIdx: Math.floor((dayIdx - dow) / 7) };
}

// ── Rodízio ─────────────────────────────────────────────────────────────────
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shuffled<T>(arr: T[], seed: number): T[] {
  const out = [...arr]; let s = seed || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
/** Modelo do índice (dia ou semana): ordem fixa por aluno, percorrida em ciclo; um modelo só volta
 *  depois que o grupo inteiro passou (se um não vale para o aluno, entra o próximo da ordem). */
function pick(pool: Template[], userId: string, key: string, idx: number, ok: (t: Template) => boolean): Template | null {
  if (!pool.length) return null;
  const order = shuffled(pool, hash(`${userId}|${key}`));
  for (let k = 0; k < order.length; k++) {
    const t = order[(idx + k) % order.length];
    if (ok(t)) return t;
  }
  return null;
}

export function pickDaily(userId: string, p: Periods, c: Ctx): Template[] {
  const forLevel = (t: Template) => !t.levels || t.levels.includes(c.level);
  const ok = (t: Template) => forLevel(t) && (!t.eligible || t.eligible(c));
  return (['trail', 'extra', 'habit'] as Slot[])
    .map(slot => pick(DAILY.filter(t => t.slot === slot && forLevel(t)), userId, slot, p.dayIdx, ok))
    .filter((t): t is Template => !!t);
}
export function pickWeekly(userId: string, p: Periods): Template {
  return pick(WEEKLY, userId, 'week', p.weekIdx, () => true)!;
}

// ── Textos ──────────────────────────────────────────────────────────────────
export function missionTexts(t: Template, lvl: MissionLevel, userId: string, periodKey: string) {
  const target = t.target(lvl);
  const v = hash(`${userId}|${t.id}|${periodKey}`);
  const pt = t.label.pt[v % t.label.pt.length].replace('{n}', String(target));
  const en = t.label.en[v % t.label.en.length].replace('{n}', String(target));
  return {
    target,
    title: { pt, en },
    where: t.where,
    unit: target === 1 ? t.unit.one : t.unit.many,
  };
}

// ── Medição ─────────────────────────────────────────────────────────────────
const REWARD_RE = /^(mission|weekly)_reward_/;
const MSG_TYPES = ['text_message', 'audio_message', 'grammar_message'];
type Counts = Record<Metric, number>;

interface Raw {
  practices: { practice_type: string; xp_earned: number | null; created_at: string }[];
  history: { level: string; module_id: string; unit_id: string; activity_type: string; score: number | null; updated_at: string }[];
  unitRows: { level: string; module_id: string; unit_id: string; activity_type: string; updated_at: string }[];
  words: { created_at: string }[];
}

function countsSince(r: Raw, since: Date, tz: string): Counts {
  const s = since.getTime();
  const pr = r.practices.filter(x => new Date(x.created_at).getTime() >= s);
  const real = pr.filter(x => !REWARD_RE.test(x.practice_type));
  const hist = r.history.filter(x => new Date(x.updated_at).getTime() >= s);
  const uniq = (rows: typeof hist) => new Set(rows.map(h => `${h.level}|${h.module_id}|${h.unit_id}|${h.activity_type}`)).size;
  const byType = (a: string) => uniq(hist.filter(h => h.activity_type === a));
  // Tópico inteiro: as 4 atividades concluídas, com a última delas dentro do período.
  const units = new Map<string, { acts: Set<string>; last: number }>();
  for (const u of r.unitRows) {
    const k = `${u.level}|${u.module_id}|${u.unit_id}`;
    const e = units.get(k) ?? { acts: new Set<string>(), last: 0 };
    e.acts.add(u.activity_type); e.last = Math.max(e.last, new Date(u.updated_at).getTime());
    units.set(k, e);
  }
  const topics = [...units.values()].filter(e => e.acts.size >= 4 && e.last >= s).length;
  const days = new Set([...real.map(x => ymdIn(new Date(x.created_at), tz)), ...hist.map(h => ymdIn(new Date(h.updated_at), tz))]);
  return {
    trail_acts: uniq(hist),
    roleplay: byType('roleplay'),
    guided_chat: byType('chat'),
    speaking: byType('speaking'),
    grammar80: uniq(hist.filter(h => h.activity_type === 'grammar' && Number(h.score ?? 0) >= 80)),
    topics,
    vocab_reviews: real.filter(x => x.practice_type === 'vocab_review').length,
    words_saved: r.words.filter(w => new Date(w.created_at).getTime() >= s).length,
    practice_msgs: real.filter(x => MSG_TYPES.includes(x.practice_type)).length,
    grammar_msgs: real.filter(x => x.practice_type === 'grammar_message').length,
    audio_msgs: real.filter(x => x.practice_type === 'audio_message').length,
    xp: real.reduce((a, x) => a + (x.xp_earned ?? 0), 0),
    active_days: days.size,
    practiced: days.size > 0 ? 1 : 0,
  };
}

// ── API: estado das metas + crédito ─────────────────────────────────────────
export interface MissionOut {
  id: string; kind: 'mission' | 'weekly'; family: Template['family'];
  title: Bi; where: Bi; unit: Bi;
  target: number; current: number; completed: boolean; xp: number; dest: string;
}
export interface GoalsState {
  today: string; weekStart: string;
  daily: MissionOut[]; weekly: MissionOut;
  todayXP: number;
  /** Creditados nesta chamada (para a comemoração no app). */
  granted: { kind: 'mission' | 'weekly'; id: string; xp: number; title: Bi }[];
  /** As 3 do dia ficaram completas nesta chamada. */
  dailyAllDoneNow: boolean;
}

export async function goalsFor(supabase: SupabaseClient, userId: string, opts: { credit: boolean }): Promise<GoalsState> {
  const { data: u } = await supabase.from('charlotte_users').select('charlotte_level, timezone').eq('id', userId).maybeSingle();
  const user = (u ?? {}) as { charlotte_level?: string | null; timezone?: string | null };
  const level = (['Novice', 'Inter', 'Advanced'].includes(user.charlotte_level ?? '') ? user.charlotte_level : 'Novice') as MissionLevel;
  const p = periodsFor(user.timezone);
  const since = p.weekStartUtc.toISOString();

  const [prac, hist, words, prog, vocab] = await Promise.all([
    supabase.from('charlotte_practices').select('practice_type, xp_earned, created_at').eq('user_id', userId).gte('created_at', since),
    supabase.from('learn_history_v2').select('level, module_id, unit_id, activity_type, score, updated_at').eq('user_id', userId).eq('completed', true).gte('updated_at', since),
    supabase.from('user_vocabulary').select('created_at').eq('user_id', userId).gte('created_at', since),
    supabase.from('charlotte_progress').select('streak_days').eq('user_id', userId).maybeSingle(),
    supabase.from('user_vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  const history = (hist.data ?? []) as Raw['history'];
  const touched = [...new Set(history.map(h => h.unit_id))];
  const unitRows = touched.length
    ? ((await supabase.from('learn_history_v2').select('level, module_id, unit_id, activity_type, updated_at').eq('user_id', userId).eq('completed', true).in('unit_id', touched)).data ?? []) as Raw['unitRows']
    : [];
  const raw: Raw = { practices: (prac.data ?? []) as Raw['practices'], history, unitRows, words: (words.data ?? []) as Raw['words'] };

  const ctx: Ctx = { level, vocabCount: vocab.count ?? 0, streak: (prog.data as { streak_days?: number } | null)?.streak_days ?? 0 };
  const day = countsSince(raw, p.dayStartUtc, p.tz);
  const week = countsSince(raw, p.weekStartUtc, p.tz);
  const paid = new Set(raw.practices.map(x => x.practice_type));

  const build = (t: Template, kind: 'mission' | 'weekly', c: Counts, period: string): MissionOut => {
    const tx = missionTexts(t, level, userId, period);
    const current = Math.min(c[t.metric], tx.target);
    return { id: t.id, kind, family: t.family, title: tx.title, where: tx.where, unit: tx.unit, target: tx.target, current, completed: c[t.metric] >= tx.target, xp: t.xp, dest: t.dest };
  };
  const daily = pickDaily(userId, p, ctx).map(t => build(t, 'mission', day, p.today));
  const weekly = build(pickWeekly(userId, p), 'weekly', week, p.weekStart);

  const granted: GoalsState['granted'] = [];
  if (opts.credit) {
    const todo = [
      ...daily.filter(m => m.completed).map(m => ({ m, key: `mission_reward_${m.id}_${p.today}` })),
      ...(weekly.completed ? [{ m: weekly, key: `weekly_reward_${weekly.id}_${p.weekStart}` }] : []),
    ].filter(x => !paid.has(x.key));
    for (const { m, key } of todo) {
      const { error } = await supabase.from('charlotte_practices').insert({ user_id: userId, practice_type: key, xp_earned: m.xp } as never);
      if (!error) granted.push({ kind: m.kind, id: m.id, xp: m.xp, title: m.title }); // erro = já pago (índice único)
    }
  }
  const dailyAllDoneNow = daily.length > 0 && daily.every(m => m.completed) && granted.some(g => g.kind === 'mission');
  const todayXP = raw.practices.filter(x => new Date(x.created_at).getTime() >= p.dayStartUtc.getTime()).reduce((a, x) => a + (x.xp_earned ?? 0), 0)
    + granted.reduce((a, g) => a + g.xp, 0);

  return { today: p.today, weekStart: p.weekStart, daily, weekly, todayXP, granted, dailyAllDoneNow };
}
