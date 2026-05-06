// lib/expo-notification-service.ts
// Sends push notifications to React Native (Charlotte AI) via Expo Push API

import { randomUUID } from 'crypto';
import { logOpenAIUsage } from './openai-usage';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  priority: 'high';
}

// ── Message template (placeholder {name} replaced per user) ─────────────────
interface MsgTemplate { title: string; body: string }

// Generate a pool of N variant templates in a single GPT call.
// Uses {name} placeholder — replaced per user at send time.
async function generateTemplatePool(
  type: 'reminder' | 'praise',
  isNovice: boolean,
  hasStreak: boolean,
  count = 4,
): Promise<MsgTemplate[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const lang = isNovice ? 'Portuguese (Brazil)' : 'English';
  const streakNote = hasStreak
    ? (isNovice ? 'Muitos estudantes têm sequências em risco hoje.' : 'Many students have streaks at risk today.')
    : '';

    const promptReminder = `You are Charlotte, an AI English teacher. Write ${count} different push notification variants IN FIRST PERSON inviting students to practice today.
- Use {name} as placeholder for the student's first name
- Use {streak} as placeholder for streak days (e.g. "your {streak}-day streak")— only include if it adds value
- Language: ${lang}
- Tone: warm, personal, gently motivating — like a friend checking in
- Write in FIRST PERSON as Charlotte ("I", "me", "my")
${streakNote ? `- Context: ${streakNote}` : ''}
- Title: 4-6 words max, use 1 relevant emoji (never use 🌈)
- Body: 1 sentence max (under 90 chars), include {name}, first person
- Example: "I saved a spot for you today, {name} — don't lose that {streak}-day streak!"
Return ONLY valid JSON: {"variants": [{"title": "...", "body": "..."}, ...]}`;

  const promptPraise = `You are Charlotte, a warm and encouraging English AI teacher. Write ${count} different push notification variants IN FIRST PERSON celebrating students who practiced today.
- Use {name} as placeholder for the student's first name
- Use {xp} as placeholder for XP earned today (e.g. "{xp} XP")
- Use {streak} as placeholder for streak days (e.g. "{streak}-day streak") — only include if it adds value
- Language: ${lang}
- Tone: warm, personal, genuinely proud — like a teacher celebrating effort
- Write in FIRST PERSON as Charlotte ("I", "me", "my")
- Title: 4-6 words max, use 1 relevant emoji (never use 🌈)
- Body: 1 sentence max (under 90 chars), include {name}, mention {xp}, first person
- Example: "I loved our session today, {name} — {xp} XP and your {streak}-day streak is alive!"
Return ONLY valid JSON: {"variants": [{"title": "...", "body": "..."}, ...]}`;

  if (!OPENAI_API_KEY) return [];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: type === 'reminder' ? promptReminder : promptPraise }],
        temperature: 0.9,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });
    const json = await res.json();
    // Fire-and-forget usage logging so we can watch cost vs. value.
    if (json.usage) {
      logOpenAIUsage({
        userId: 'system:scheduler',
        endpoint: '/api/notifications/scheduler',
        model: 'gpt-4o-mini',
        promptTokens: json.usage.prompt_tokens ?? 0,
        completionTokens: json.usage.completion_tokens ?? 0,
      });
    }
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
    const sanitize = (s: string) => s.replace(/🌈/g, '✨');
    if (Array.isArray(parsed.variants) && parsed.variants.length > 0)
      return parsed.variants.map((v: MsgTemplate) => ({ title: sanitize(v.title), body: sanitize(v.body) }));
  } catch (e) {
    console.warn('⚠️ [Expo] GPT pool generation failed:', e);
  }
  return [];
}

// ── GPT pools for re-engagement (Level 3) ──────────────────────────────────
// Critical re-engagement types get a fresh GPT-generated pool per run so the
// copy stays varied and human-feeling. Hardcoded templates remain as
// fallback when GPT is disabled, fails, or returns an empty pool.
const GPT_ENGAGEMENT_TYPES = new Set<string>([
  'streak_saver',
  'level_imminent',
  'micro_checkin',
  'weekly_recap',
  'reengagement_7d',
  'reengagement_14d',
]);

// Cached once per dispatcher run (key = `${type}:${locale}`) to avoid
// regenerating for every user in the same batch.
let engagementGptCache = new Map<string, MsgTemplate[]>();

function getEngagementGptPool(type: string, isNovice: boolean): MsgTemplate[] | null {
  const key = `${type}:${isNovice ? 'pt' : 'en'}`;
  return engagementGptCache.get(key) ?? null;
}

function resetEngagementGptCache(): void {
  engagementGptCache = new Map();
}

async function generateEngagementGptPool(
  type: string,
  isNovice: boolean,
  count = 4,
): Promise<MsgTemplate[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return [];

  const lang = isNovice ? 'Portuguese (Brazil)' : 'English';
  // Per-type intent — keeps the pool aligned with the push's emotional
  // register. {name}, {streak}, {xp}, {missingXp}, {milestone}, {days} are
  // available as placeholders for the renderer.
  const intents: Record<string, string> = {
    streak_saver:
      'The user built a multi-day streak and is about to break it tonight. Write 4 urgent-but-warm variants to save the streak. Mention {streak} as "{streak} days" / "{streak} dias".',
    level_imminent:
      'The user is fewer than 30 XP away from a meaningful milestone. Write 4 motivating, slightly competitive variants. Use {missingXp} and {milestone}.',
    micro_checkin:
      'A casual "Charlotte is here" check-in, like a thoughtful friend. Warm, 0% pushy. Keep it under 90 chars.',
    weekly_recap:
      'Sunday evening recap. Celebrate the user\'s week with {xp} XP and prompt next week. Warm, proud, hopeful.',
    reengagement_7d:
      'The user disappeared for 7 days. Gentle comeback invite, no guilt. Mention {xp} as "{xp} XP saved up". Short and kind.',
    reengagement_14d:
      'The user disappeared for 14 days. Warm last-call, no sales pressure. Remind them progress is preserved. Keep it personal.',
  };
  const intent = intents[type];
  if (!intent) return [];

  const prompt = `You are Charlotte, an AI English teacher. Write ${count} different push notification variants IN FIRST PERSON.
- Language: ${lang}
- Tone: warm, personal, human — never pushy or robotic
- Title: 4-6 words, 1 relevant emoji
- Body: 1 sentence under 90 chars, include {name}, first person
- Context: ${intent}
Return ONLY valid JSON: {"variants": [{"title": "...", "body": "..."}, ...]}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });
    const json = await res.json();
    if (json.usage) {
      logOpenAIUsage({
        userId: 'system:scheduler',
        endpoint: '/api/notifications/scheduler',
        model: 'gpt-4o-mini',
        promptTokens: json.usage.prompt_tokens ?? 0,
        completionTokens: json.usage.completion_tokens ?? 0,
      });
    }
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
    if (Array.isArray(parsed.variants) && parsed.variants.length > 0) return parsed.variants;
  } catch (e) {
    console.warn(`⚠️ [Engagement] GPT pool generation failed (${type}):`, e);
  }
  return [];
}

// Called by the dispatcher once per run, AFTER signal detection, BEFORE
// rendering. Figures out which GPT types are actually needed this run
// (based on plans), generates in parallel, stores in the module-level cache
// so pickReengTemplate can read via getEngagementGptPool().
async function warmEngagementGptPools(types: { type: string; needsPt: boolean; needsEn: boolean }[]): Promise<void> {
  resetEngagementGptCache();
  const jobs: Promise<void>[] = [];
  for (const { type, needsPt, needsEn } of types) {
    if (!GPT_ENGAGEMENT_TYPES.has(type)) continue;
    if (needsPt) {
      jobs.push(generateEngagementGptPool(type, true).then(pool => {
        if (pool.length) engagementGptCache.set(`${type}:pt`, pool);
      }));
    }
    if (needsEn) {
      jobs.push(generateEngagementGptPool(type, false).then(pool => {
        if (pool.length) engagementGptCache.set(`${type}:en`, pool);
      }));
    }
  }
  await Promise.allSettled(jobs);
}

// Renders a streak count with the correct unit + plural for the locale.
// Keeps templates grammatical for both streak=1 and streak>1 without
// requiring verb-agreement gymnastics per variant.
function streakDaysLabel(n: number, isNovice: boolean): string {
  if (isNovice) return n === 1 ? '1 dia' : `${n} dias`;
  return n === 1 ? '1 day' : `${n} days`;
}

// Stable hash for a template (ignoring placeholders) so we can recognise
// the same variant across users and avoid repeating it to the same user.
function variantHash(tpl: MsgTemplate): string {
  const raw = `${tpl.title}|${tpl.body}`;
  // Tiny non-crypto FNV-1a — plenty to distinguish a handful of pool variants.
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

// Pick a template, excluding any whose hash already appeared in the user's
// recent history (novelty decay), then substitute {name}/{xp}/{streak}.
// Returns both the rendered message and the variant hash so the caller can
// log which variant was sent.
function pickTemplate(
  pool: MsgTemplate[],
  fallback: MsgTemplate,
  firstName: string,
  xp?: number,
  streak?: number,
  excludeHashes: Set<string> = new Set(),
): { msg: MsgTemplate; hash: string } {
  const hasStreak = streak != null && streak > 0;
  // Se não há streak, descarta variantes que contêm {streak} para evitar "-day streak"
  const streakSafe = hasStreak ? pool : pool.filter(t => !t.title.includes('{streak}') && !t.body.includes('{streak}'));
  const base    = streakSafe.length > 0 ? streakSafe : pool;
  const eligible = base.filter(t => !excludeHashes.has(variantHash(t)));
  const source  = eligible.length > 0 ? eligible : (base.length > 0 ? base : [fallback]);
  const tpl     = source[Math.floor(Math.random() * source.length)];
  const replace = (s: string) => s
    .replace(/\{name\}/g, firstName)
    .replace(/\{xp\}/g, xp != null ? String(xp) : '')
    .replace(/\{streak\}/g, hasStreak ? String(streak) : '');
  return {
    msg: { title: replace(tpl.title), body: replace(tpl.body) },
    hash: variantHash(tpl),
  };
}

// ── Timezone helpers ────────────────────────────────────────────────────────
// Users set charlotte_users.timezone when the app foregrounds
// (AuthProvider.tsx calls deviceTimezone() → IANA zone string). NULL means
// the user has not opened the app yet — default to Sao Paulo so the existing
// Brazil-heavy base is never silently dropped.
const DEFAULT_TZ = 'America/Sao_Paulo';

/** YYYY-MM-DD no fuso especificado — usado para comparar com last_practice_date. */
function localDateForTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz || DEFAULT_TZ }).format(new Date());
}

function localHourInTz(utc: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
      .formatToParts(utc);
    const h = parts.find(p => p.type === 'hour')?.value ?? '0';
    const n = parseInt(h, 10);
    return Number.isFinite(n) ? n % 24 : 0;
  } catch {
    return localHourInTz(utc, DEFAULT_TZ);
  }
}

function localDayInTz(utc: Date, tz: string): number {
  try {
    // 'en-US' weekday short: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(utc);
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd] ?? 0;
  } catch {
    return localDayInTz(utc, DEFAULT_TZ);
  }
}

// Filter users (with optional timezone field) to those whose local hour
// matches targetHour right now. If targetDayOfWeek is supplied, also check
// that the user's local weekday matches (used by weekly_challenge).
function usersAtLocalHour<T extends { id: string; timezone?: string | null }>(
  users: T[],
  targetHour: number,
  targetDayOfWeek?: number,
): T[] {
  const now = new Date();
  return users.filter(u => {
    const tz = u.timezone || DEFAULT_TZ;
    if (localHourInTz(now, tz) !== targetHour) return false;
    if (targetDayOfWeek != null && localDayInTz(now, tz) !== targetDayOfWeek) return false;
    return true;
  });
}

// ── Log / frequency-cap / novelty-decay helpers ─────────────────────────────
// All three share the notifications.notification_logs table (see
// supabase/migrations/20260423_extend_notification_logs_for_rn.sql).

interface NotificationType {
  id:
    // Core daily pipeline
    | 'streak_reminder' | 'daily_reminder' | 'charlotte_message'
    | 'xp_milestone' | 'goal_reminder' | 'weekly_challenge'
    // Prevention (Camada 1)
    | 'streak_saver' | 'streak_milestone_ahead' | 'level_imminent'
    | 'micro_checkin' | 'cadence_drop' | 'weekly_recap' | 'charlotte_checkin'
    // Revenue
    | 'trial_ending_72h' | 'trial_ending_24h' | 'sub_expired_1d'
    // Winback
    | 'streak_broken'
    | 'reengagement_3d' | 'reengagement_7d' | 'reengagement_14d' | 'reengagement_30d';
}

// Max sends per user per UTC day, per type. For core types 1/day is a safety
// net (the cron fires once a day). For re-engagement types, 1/day is the
// intent — the dispatcher picks ONE signal and emits it. xp_milestone is the
// exception because a user can legitimately hit multiple milestones per day.
const FREQUENCY_CAP: Record<NotificationType['id'], number> = {
  streak_reminder:        1,
  daily_reminder:         1,
  charlotte_message:      1,
  xp_milestone:           3,
  goal_reminder:          1,
  weekly_challenge:       1,
  streak_saver:           1,
  streak_milestone_ahead: 1,
  level_imminent:         1,
  micro_checkin:          1,
  cadence_drop:           1,
  weekly_recap:           1,
  charlotte_checkin:      1,
  trial_ending_72h:       1,
  trial_ending_24h:       1,
  sub_expired_1d:         1,
  streak_broken:          1,
  reengagement_3d:        1,
  reengagement_7d:        1,
  reengagement_14d:       1,
  reengagement_30d:       1,
};

// Re-engagement types are mutually exclusive: the dispatcher picks AT MOST
// ONE per user per day. This set lets filterWeeklyEngagementCap short-circuit
// when the user already got ANY re-engagement push today/this week.
const ENGAGEMENT_TYPES = new Set<NotificationType['id']>([
  'streak_saver', 'streak_milestone_ahead', 'level_imminent',
  'micro_checkin', 'cadence_drop', 'weekly_recap', 'charlotte_checkin',
  'trial_ending_72h', 'trial_ending_24h', 'sub_expired_1d',
  'streak_broken',
  'reengagement_3d', 'reengagement_7d', 'reengagement_14d', 'reengagement_30d',
]);

// How many of the user's most recent variants to exclude when picking a
// template (novelty decay). 3 = "don't repeat the last 3 we sent them".
const NOVELTY_WINDOW = 3;

// Returns the set of userIds that have already received `type` today and
// should be skipped. Single round-trip for the whole send batch.
async function filterFrequencyCap(
  supabase: any,
  userIds: string[],
  type: NotificationType['id'],
): Promise<string[]> {
  if (!userIds.length) return userIds;
  const cap = FREQUENCY_CAP[type];
  // Rolling 24h window instead of UTC midnight — avoids double-sends for users
  // in negative-offset timezones (e.g., Americas) where UTC midnight falls in
  // the middle of their local day.
  const since24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('notification_logs')
    .select('user_id')
    .in('user_id', userIds)
    .eq('notification_type', type)
    .eq('status', 'sent')
    .gte('created_at', since24hAgo.toISOString());

  if (error) {
    console.warn(`⚠️ [Expo] frequency-cap query error (${type}):`, error.message);
    return userIds; // fail open — better to send than to silently block
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return userIds.filter(uid => (counts.get(uid) ?? 0) < cap);
}

// Recent variant hashes per user, for pickTemplate's exclude list.
async function fetchRecentVariantHashes(
  supabase: any,
  userIds: string[],
  type: NotificationType['id'],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (!userIds.length) return out;
  // Last 14 days is more than enough — templates refresh daily via GPT
  // anyway, so older hashes are unlikely to reappear.
  const since = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
  const { data, error } = await supabase
    .from('notification_logs')
    .select('user_id, metadata, created_at')
    .in('user_id', userIds)
    .eq('notification_type', type)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn(`⚠️ [Expo] recent-variants query error (${type}):`, error.message);
    return out;
  }
  for (const row of (data ?? []) as any[]) {
    const hash = row.metadata?.variant_hash;
    if (!hash) continue;
    const set = out.get(row.user_id) ?? new Set<string>();
    if (set.size < NOVELTY_WINDOW) set.add(hash);
    out.set(row.user_id, set);
  }
  return out;
}

// One row per (user, send attempt). Written after sendExpoPush returns.
async function logRnPushes(
  supabase: any,
  rows: Array<{
    userId: string;
    type: NotificationType['id'];
    variantHash?: string;
    platform?: string;
    status?: 'sent' | 'failed';
    title?: string;
    body?: string;
    errorMessage?: string;
  }>,
): Promise<void> {
  if (!rows.length) return;
  // Generate ids client-side — the public.notification_logs view path does
  // not always propagate the underlying gen_random_uuid() default on insert.
  const payload = rows.map(r => ({
    id:                 randomUUID(),
    user_id:            r.userId,
    notification_type:  r.type,
    status:             r.status ?? 'sent',
    message_title:      r.title ?? null,
    message_body:       r.body ?? null,
    platform:           r.platform ?? 'ios', // Expo push covers both; platform is opaque here
    error_message:      r.errorMessage ?? null,
    metadata:           r.variantHash ? { variant_hash: r.variantHash } : null,
  }));
  const { error } = await supabase
    .from('notification_logs')
    .insert(payload);
  if (error) {
    console.warn('⚠️ [Expo] notification_logs insert error:', error.message);
  }
}

// ── Core send function ───────────────────────────────────────────────────────
async function sendExpoPush(
  messages: ExpoMessage[],
  supabase?: any,
): Promise<{ sent: number; errors: number }> {
  if (messages.length === 0) return { sent: 0, errors: 0 };

  let sent = 0;
  let errors = 0;
  const BATCH_SIZE = 100;
  const invalidTokens: string[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const result = await response.json();
      const items = result.data ?? [];
      // Per-token accounting — Expo returns one status entry per message
      // in the same order as the request batch.
      items.forEach((r: any, idx: number) => {
        if (r.status === 'ok') {
          sent += 1;
        } else {
          errors += 1;
          const token = batch[idx]?.to ?? '';
          const details = r.details ? ` details=${JSON.stringify(r.details)}` : '';
          console.error(`❌ [Expo] token=${token.slice(0, 30)} error="${r.message ?? 'unknown'}"${details}`);
          // Collect tokens for users who uninstalled or revoked credentials —
          // these are gone for good, drop them from the DB.
          if (r.details?.error === 'DeviceNotRegistered' && token) {
            invalidTokens.push(token);
          }
        }
      });
    } catch (e) {
      console.error('❌ Expo Push batch error:', e);
      errors += batch.length;
    }
  }

  // Token cleanup — null out dead tokens so we stop trying to send to them.
  if (supabase && invalidTokens.length > 0) {
    try {
      const { error } = await supabase
        .from('charlotte_users')
        .update({ expo_push_token: null })
        .in('expo_push_token', invalidTokens);
      if (error) {
        console.warn('⚠️ [Expo] token cleanup error:', error.message);
      } else {
        console.log(`🧹 [Expo] Cleared ${invalidTokens.length} dead token(s)`);
      }
    } catch (e) {
      console.warn('⚠️ [Expo] token cleanup exception:', e);
    }
  }

  return { sent, errors };
}

// ── helpers ──────────────────────────────────────────────────────────────────

interface NotifUser {
  id: string;
  name: string | null;
  expo_push_token: string;
  charlotte_level: string | null;
  timezone: string | null;
}

/** Fetch charlotte_users rows for a list of user_ids (token + name + level + tz). */
async function fetchCharlotteUsers(supabase: any, userIds: string[]): Promise<NotifUser[]> {
  if (!userIds.length) return [];
  const { data } = await supabase
    .from('charlotte_users')
    .select('id, name, expo_push_token, charlotte_level, timezone')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);
  return (data ?? []).filter((u: any) => u.expo_push_token?.startsWith('ExponentPushToken[')) as NotifUser[];
}

// ── Per-type target LOCAL hour (in each user's own timezone) ────────────────
// The scheduler runs hourly; each sender drops users whose local hour does
// not match these constants. Monday 9 is weekday 1.
const TARGET_HOUR_DAILY    = 11;
const TARGET_HOUR_GOAL     = 16;
const TARGET_HOUR_STREAK   = 18;
const TARGET_HOUR_PRAISE   = 18;
const TARGET_HOUR_WEEKLY   = 9;
const WEEKLY_DAY_OF_WEEK   = 1; // Monday

// ── 1. Streak reminders ──────────────────────────────────────────────────────
export async function sendStreakReminders(supabase: any): Promise<void> {
  console.log('🔥 [Expo] Checking streak reminders...');
  try {
    const now = new Date();
    const todayUTC     = now.toISOString().split('T')[0];
    const yesterdayUTC = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    // Streak "em risco" = praticou ontem (last_practice_date = yesterday) mas ainda não hoje.
    // Se last_practice_date < ontem, o streak já quebrou — não enviar reminder.
    // Usamos UTC como aproximação server-side; a filtragem por hora local (usersAtLocalHour) garante
    // que a notificação chega no horário certo para cada fuso.
    const { data: atRisk, error: atRiskErr } = await supabase
      .from('charlotte_progress')
      .select('user_id, streak_days, last_practice_date')
      .gt('streak_days', 0)
      .eq('last_practice_date', yesterdayUTC); // praticou ontem = streak vivo mas em risco hoje
    if (atRiskErr) { console.error('❌ [Expo] at-risk query error:', atRiskErr.message); return; }

    if (!atRisk?.length) { console.log('✅ [Expo] No streak risks today'); return; }

    const allUserIds = atRisk.map((r: any) => r.user_id);
    const allowedIds = await filterFrequencyCap(supabase, allUserIds, 'streak_reminder');
    const skipped = allUserIds.length - allowedIds.length;
    if (skipped > 0) console.log(`⏭️ [Expo] streak: skipping ${skipped} user(s) at daily cap`);
    if (!allowedIds.length) return;

    const allUsers = await fetchCharlotteUsers(supabase, allowedIds);
    const cuUsers = usersAtLocalHour(allUsers, TARGET_HOUR_STREAK);
    if (!cuUsers.length) { console.log(`⏱️ [Expo] streak: no users at local ${TARGET_HOUR_STREAK}h this run`); return; }
    const streakMap = Object.fromEntries(atRisk.map((r: any) => [r.user_id, r.streak_days]));

    // Novelty decay — exclude the last N variants each user has already seen.
    const recentHashes = await fetchRecentVariantHashes(
      supabase,
      cuUsers.map((u: any) => u.id),
      'streak_reminder',
    );

    const hashByUser: Record<string, string> = {};
    const messages: ExpoMessage[] = [];
    const senders: any[] = [];
    for (const u of cuUsers) {
      const isNovice = u.charlotte_level === 'Novice';
      const firstName = u.name?.split(/[\s\-]+/)[0] ?? 'there';
      const days = streakMap[u.id] ?? 1;
      const picked = pickCoreTemplate(
        'streak_reminder',
        isNovice,
        { name: firstName, streak: days, streakDays: streakDaysLabel(days, isNovice) },
        recentHashes.get(u.id) ?? new Set(),
      );
      if (!picked) continue;
      hashByUser[u.id] = picked.hash;
      messages.push({
        to: u.expo_push_token,
        title: picked.msg.title,
        body: picked.msg.body,
        data: { screen: 'chat', type: 'streak_reminder' },
        sound: 'default',
        priority: 'high',
      });
      senders.push(u);
    }

    const { sent, errors } = await sendExpoPush(messages, supabase);
    console.log(`✅ [Expo] Streak reminders: ${sent} sent, ${errors} errors`);
    await logRnPushes(supabase, senders.map((u: any, i: number) => ({
      userId: u.id,
      type: 'streak_reminder',
      variantHash: hashByUser[u.id],
      title: messages[i]?.title,
      body:  messages[i]?.body,
    })));
  } catch (e) {
    console.error('❌ [Expo] Streak reminder error:', e);
  }
}

// ── 2. Daily reminder ────────────────────────────────────────────────────────
export async function sendDailyReminders(supabase: any): Promise<void> {
  console.log('⏰ [Expo] Sending daily reminders...');
  try {
    // 1) last_practice_date de cada usuário (fuso-aware via trigger).
    const { data: progressRows } = await supabase
      .from('charlotte_progress')
      .select('user_id, last_practice_date');
    const lastPracticeMap = new Map<string, string>(
      (progressRows ?? []).map((r: any) => [String(r.user_id), r.last_practice_date ?? ''])
    );

    // 2) Todos os usuários com token e timezone.
    const { data: cuUsers, error: usersErr } = await supabase
      .from('charlotte_users')
      .select('id, name, expo_push_token, charlotte_level, timezone')
      .not('expo_push_token', 'is', null);
    if (usersErr) { console.error('❌ [Expo] users query error:', usersErr.message); return; }

    // 3) Filtrar quem ainda não praticou hoje no seu próprio fuso.
    const withToken = (cuUsers ?? []).filter((u: any) => {
      if (!u.expo_push_token?.startsWith('ExponentPushToken[')) return false;
      const localToday = localDateForTz(u.timezone);
      return lastPracticeMap.get(String(u.id)) !== localToday;
    });
    if (!withToken.length) { console.log('✅ [Expo] No eligible users for daily reminder'); return; }

    const tzFiltered = usersAtLocalHour(withToken, TARGET_HOUR_DAILY);
    if (!tzFiltered.length) { console.log(`⏱️ [Expo] daily: no users at local ${TARGET_HOUR_DAILY}h this run`); return; }

    const allowedIds = await filterFrequencyCap(
      supabase,
      tzFiltered.map((u: any) => u.id),
      'daily_reminder',
    );
    const skipped = tzFiltered.length - allowedIds.length;
    if (skipped > 0) console.log(`⏭️ [Expo] daily: skipping ${skipped} user(s) at daily cap`);
    const allowed = new Set(allowedIds);
    const eligible = tzFiltered.filter((u: any) => allowed.has(u.id));
    if (!eligible.length) return;

    const { data: progRows } = await supabase
      .from('charlotte_progress')
      .select('user_id, streak_days')
      .in('user_id', allowedIds);
    const streakMap = Object.fromEntries((progRows ?? []).map((r: any) => [r.user_id, r.streak_days ?? 0]));

    const hasAnyStreak = eligible.some((u: any) => (streakMap[u.id] ?? 0) > 0);

    // Generate 2 pools (Novice PT + Advanced EN) — 2 GPT calls total regardless of user count
    const [poolNovice, poolAdvanced, recentHashes] = await Promise.all([
      generateTemplatePool('reminder', true,  hasAnyStreak),
      generateTemplatePool('reminder', false, hasAnyStreak),
      fetchRecentVariantHashes(supabase, allowedIds, 'daily_reminder'),
    ]);

    const fallbackNovice   = { title: '📚 Hora de praticar!', body: '{name}, a Charlotte está esperando por você hoje!' };
    const fallbackAdvanced = { title: '📚 Time to practice!', body: '{name}, Charlotte is ready for you today!' };

    console.log(`⏰ [Expo] Sending reminders to ${eligible.length} users...`);

    const perUserHash: Record<string, string> = {};
    const messages: ExpoMessage[] = eligible.map((u: any) => {
      const firstName = u.name?.split(/[\s\-]+/)[0] ?? 'there';
      const isNovice  = u.charlotte_level === 'Novice';
      const streak    = streakMap[u.id] ?? 0;
      const { msg, hash } = pickTemplate(
        isNovice ? poolNovice : poolAdvanced,
        isNovice ? fallbackNovice : fallbackAdvanced,
        firstName,
        undefined,
        streak > 0 ? streak : undefined,
        recentHashes.get(u.id) ?? new Set(),
      );
      perUserHash[u.id] = hash;
      return { to: u.expo_push_token, ...msg, data: { screen: 'chat', type: 'daily_reminder' }, sound: 'default', priority: 'high' };
    });

    const { sent, errors } = await sendExpoPush(messages, supabase);
    console.log(`✅ [Expo] Daily reminders: ${sent} sent, ${errors} errors`);
    await logRnPushes(supabase, eligible.map((u: any, i: number) => ({
      userId: u.id,
      type: 'daily_reminder',
      variantHash: perUserHash[u.id],
      title: messages[i]?.title,
      body:  messages[i]?.body,
    })));
  } catch (e) {
    console.error('❌ [Expo] Daily reminder error:', e);
  }
}

// ── 3. Charlotte message (motivational) ─────────────────────────────────────
export async function sendCharlotteMessages(supabase: any): Promise<void> {
  console.log('💬 [Expo] Sending Charlotte praise messages...');
  try {
    // Quem praticou hoje no seu próprio fuso: last_practice_date = localToday(tz).
    const { data: progressRows } = await supabase
      .from('charlotte_progress')
      .select('user_id, last_practice_date');
    if (!progressRows?.length) { console.log('✅ [Expo] No practice data yet'); return; }

    const { data: allUsers } = await supabase
      .from('charlotte_users')
      .select('id, name, expo_push_token, charlotte_level, timezone')
      .not('expo_push_token', 'is', null);

    const progressByUser = new Map<string, string>(
      progressRows.map((r: any) => [String(r.user_id), r.last_practice_date ?? ''])
    );

    const practicedTodayUsers = (allUsers ?? []).filter((u: any) => {
      if (!u.expo_push_token?.startsWith('ExponentPushToken[')) return false;
      const localToday = localDateForTz(u.timezone);
      return progressByUser.get(String(u.id)) === localToday;
    });
    if (!practicedTodayUsers.length) { console.log('✅ [Expo] No users practiced today yet'); return; }

    const rawUsers = practicedTodayUsers;
    if (!rawUsers.length) return;

    const tzFiltered = usersAtLocalHour(rawUsers, TARGET_HOUR_PRAISE);
    if (!tzFiltered.length) { console.log(`⏱️ [Expo] praise: no users at local ${TARGET_HOUR_PRAISE}h this run`); return; }

    const allowedIds = await filterFrequencyCap(
      supabase,
      tzFiltered.map((u: any) => u.id),
      'charlotte_message',
    );
    const skipped = tzFiltered.length - allowedIds.length;
    if (skipped > 0) console.log(`⏭️ [Expo] praise: skipping ${skipped} user(s) at daily cap`);
    const allowed = new Set(allowedIds);
    const cuUsers = tzFiltered.filter((u: any) => allowed.has(u.id));
    if (!cuUsers.length) return;

    // Fetch XP and streak per user
    const { data: progRows } = await supabase
      .from('charlotte_progress')
      .select('user_id, streak_days, total_xp')
      .in('user_id', allowedIds);
    const xpMap     = Object.fromEntries((progRows ?? []).map((r: any) => [r.user_id, r.total_xp ?? 0]));
    const streakMap = Object.fromEntries((progRows ?? []).map((r: any) => [r.user_id, r.streak_days ?? 0]));

    // Fetch last 48h of practices — covers all user timezones regardless of UTC offset.
    // XP is then counted per user based on their own local date (same pattern used everywhere).
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: todayRows } = await supabase
      .from('charlotte_practices')
      .select('user_id, xp_earned, created_at')
      .gte('created_at', since48h)
      .in('user_id', allowedIds);
    const userTzMap = Object.fromEntries(cuUsers.map((u: any) => [String(u.id), u.timezone as string]));
    const todayXpMap: Record<string, number> = {};
    for (const r of (todayRows ?? [])) {
      const tz          = userTzMap[r.user_id] ?? DEFAULT_TZ;
      const localToday  = localDateForTz(tz);
      const practiceDay = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(r.created_at));
      if (practiceDay === localToday) {
        todayXpMap[r.user_id] = (todayXpMap[r.user_id] ?? 0) + (r.xp_earned ?? 0);
      }
    }

    // Generate 2 pools (Novice PT + Advanced EN) — 2 GPT calls total
    const [poolNovice, poolAdvanced, recentHashes] = await Promise.all([
      generateTemplatePool('praise', true,  false),
      generateTemplatePool('praise', false, false),
      fetchRecentVariantHashes(supabase, allowedIds, 'charlotte_message'),
    ]);

    const fallbackNovice   = { title: 'Ótimo trabalho hoje!', body: '{name}, você praticou hoje e ganhou {xp} XP! Continue assim.' };
    const fallbackAdvanced = { title: 'Great work today!',    body: '{name}, you practiced today and earned {xp} XP! Keep it up.' };

    console.log(`💬 [Expo] Sending praise to ${cuUsers.length} users...`);

    const perUserHash: Record<string, string> = {};
    const messages: ExpoMessage[] = cuUsers.map((u: any) => {
      const firstName = u.name?.split(/[\s\-]+/)[0] ?? 'there';
      const isNovice  = u.charlotte_level === 'Novice';
      const xp        = todayXpMap[u.id] ?? 0;
      const streak    = streakMap[u.id] ?? 0;
      const { msg, hash } = pickTemplate(
        isNovice ? poolNovice : poolAdvanced,
        isNovice ? fallbackNovice : fallbackAdvanced,
        firstName,
        xp > 0 ? xp : undefined,
        streak > 0 ? streak : undefined,
        recentHashes.get(u.id) ?? new Set(),
      );
      perUserHash[u.id] = hash;
      return { to: u.expo_push_token, ...msg, data: { screen: 'chat', type: 'charlotte_message' }, sound: 'default', priority: 'high' };
    });

    const { sent, errors } = await sendExpoPush(messages, supabase);
    console.log(`✅ [Expo] Charlotte praise: ${sent} sent, ${errors} errors`);
    await logRnPushes(supabase, cuUsers.map((u: any, i: number) => ({
      userId: u.id,
      type: 'charlotte_message',
      variantHash: perUserHash[u.id],
      title: messages[i]?.title,
      body:  messages[i]?.body,
    })));
  } catch (e) {
    console.error('❌ [Expo] Charlotte message error:', e);
  }
}

// ── 4. XP milestone (called from server after XP is awarded) ────────────────
export async function sendXPMilestoneNotification(
  supabase: any,
  userId: string,
  milestone: number
): Promise<void> {
  try {
    const { data: user } = await supabase
      .from('charlotte_users')
      .select('expo_push_token, name')
      .eq('id', userId)
      .single();

    if (!user?.expo_push_token?.startsWith('ExponentPushToken[')) return;

    const allowed = await filterFrequencyCap(supabase, [userId], 'xp_milestone');
    if (!allowed.length) {
      console.log(`⏭️ [Expo] xp_milestone ${milestone} skipped — user at daily cap`);
      return;
    }

    const firstName = user.name?.split(' ')[0] ?? 'Você';
    const isNovice  = (user as any).charlotte_level === 'Novice';
    const recent = await fetchRecentVariantHashes(supabase, [userId], 'xp_milestone');
    const picked = pickCoreTemplate(
      'xp_milestone',
      isNovice,
      { name: firstName, milestone: milestone.toLocaleString(isNovice ? 'pt-BR' : 'en-US') },
      recent.get(userId) ?? new Set(),
    );
    if (!picked) return;

    await sendExpoPush([{
      to: user.expo_push_token,
      title: picked.msg.title,
      body:  picked.msg.body,
      data:  { screen: 'chat', type: 'xp_milestone', milestone },
      sound: 'default',
      priority: 'high',
    }], supabase);

    console.log(`✅ [Expo] XP milestone ${milestone} sent to ${userId}`);
    await logRnPushes(supabase, [{
      userId, type: 'xp_milestone',
      variantHash: picked.hash,
      title: picked.msg.title, body: picked.msg.body,
    }]);
  } catch (e) {
    console.error('❌ [Expo] XP milestone error:', e);
  }
}

// ── 5. Goal reminders ────────────────────────────────────────────────────────
// Users close to their weekly XP goal (80–99% of WEEKLY_XP_GOAL) get a nudge
// in late afternoon. Helps convert near-misses into completed weeks.
const WEEKLY_XP_GOAL = 100;

export async function sendGoalReminders(supabase: any): Promise<void> {
  console.log('🎯 [Expo] Checking goal reminders...');
  try {
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7)); // Mon start

    // Sum XP per user this week
    const { data: rows, error } = await supabase
      .from('charlotte_practices')
      .select('user_id, xp_earned')
      .gte('created_at', weekStart.toISOString());
    if (error) { console.error('❌ [Expo] goal query error:', error.message); return; }

    const xpByUser = new Map<string, number>();
    for (const r of (rows ?? []) as any[]) {
      xpByUser.set(r.user_id, (xpByUser.get(r.user_id) ?? 0) + (r.xp_earned ?? 0));
    }

    const near = Array.from(xpByUser.entries())
      .filter(([, xp]) => xp >= WEEKLY_XP_GOAL * 0.8 && xp < WEEKLY_XP_GOAL)
      .map(([userId, xp]) => ({ userId, xp, missing: WEEKLY_XP_GOAL - xp }));

    if (!near.length) { console.log('✅ [Expo] No users near weekly goal'); return; }

    const allUsers = await fetchCharlotteUsers(supabase, near.map(n => n.userId));
    const tzFiltered = usersAtLocalHour(allUsers, TARGET_HOUR_GOAL);
    if (!tzFiltered.length) { console.log(`⏱️ [Expo] goal: no users at local ${TARGET_HOUR_GOAL}h this run`); return; }

    const allowedIds = await filterFrequencyCap(
      supabase,
      tzFiltered.map((u: any) => u.id),
      'goal_reminder',
    );
    const skipped = tzFiltered.length - allowedIds.length;
    if (skipped > 0) console.log(`⏭️ [Expo] goal: skipping ${skipped} user(s) at daily cap`);
    if (!allowedIds.length) return;

    const allowed = new Set(allowedIds);
    const cuUsers = tzFiltered.filter((u: any) => allowed.has(u.id));
    const missingMap = Object.fromEntries(near.map(n => [n.userId, n.missing]));

    const recentHashes = await fetchRecentVariantHashes(
      supabase,
      cuUsers.map((u: any) => u.id),
      'goal_reminder',
    );

    const hashByUser: Record<string, string> = {};
    const messages: ExpoMessage[] = [];
    const senders: any[] = [];
    for (const u of cuUsers) {
      const firstName = u.name?.split(/[\s\-]+/)[0] ?? 'there';
      const isNovice  = u.charlotte_level === 'Novice';
      const missing   = missingMap[u.id] ?? 0;
      const picked = pickCoreTemplate(
        'goal_reminder',
        isNovice,
        { name: firstName, missingXp: missing },
        recentHashes.get(u.id) ?? new Set(),
      );
      if (!picked) continue;
      hashByUser[u.id] = picked.hash;
      messages.push({
        to: u.expo_push_token,
        title: picked.msg.title,
        body:  picked.msg.body,
        data:  { screen: 'chat', type: 'goal_reminder', missingXP: missing },
        sound: 'default',
        priority: 'high',
      });
      senders.push(u);
    }

    const { sent, errors } = await sendExpoPush(messages, supabase);
    console.log(`✅ [Expo] Goal reminders: ${sent} sent, ${errors} errors`);
    await logRnPushes(supabase, senders.map((u: any, i: number) => ({
      userId: u.id,
      type: 'goal_reminder',
      variantHash: hashByUser[u.id],
      title: messages[i]?.title,
      body:  messages[i]?.body,
    })));
  } catch (e) {
    console.error('❌ [Expo] Goal reminder error:', e);
  }
}

// ── 6. Weekly challenge ──────────────────────────────────────────────────────
// Monday morning broadcast to users who practiced at least once last week.
// Challenge title rotates deterministically by ISO week number so everyone
// receives the same theme at the same time.
const WEEKLY_CHALLENGES_PT = [
  { title: '💪 Desafio da semana', body: 'Essa semana, fale 3 frases em inglês sobre seu final de semana!' },
  { title: '🎧 Desafio da semana', body: 'Ouça a Charlotte e repita 5 frases com entonação natural.' },
  { title: '📝 Desafio da semana', body: 'Escreva um parágrafo sobre um hobby usando o passado simples.' },
  { title: '🗣️ Desafio da semana', body: 'Conte uma história curta em 1 minuto — sem pausas!' },
  { title: '🔁 Desafio da semana', body: 'Use 3 phrasal verbs novos em conversas esta semana.' },
  { title: '✨ Desafio da semana', body: 'Pronuncie as vogais longas/curtas em 5 palavras diferentes.' },
  { title: '🎯 Desafio da semana', body: 'Faça 5 sessões de chat de pelo menos 3 minutos cada.' },
  { title: '🔥 Desafio da semana', body: 'Complete 7 dias de streak — um pouquinho por dia!' },
];
const WEEKLY_CHALLENGES_EN = [
  { title: '💪 Weekly challenge', body: 'This week, say 3 sentences about your weekend in English!' },
  { title: '🎧 Weekly challenge', body: 'Listen to Charlotte and repeat 5 phrases with natural intonation.' },
  { title: '📝 Weekly challenge', body: 'Write a paragraph about a hobby using the simple past.' },
  { title: '🗣️ Weekly challenge', body: 'Tell a short story in 1 minute — no pauses!' },
  { title: '🔁 Weekly challenge', body: 'Use 3 new phrasal verbs in conversations this week.' },
  { title: '✨ Weekly challenge', body: 'Pronounce long/short vowels in 5 different words.' },
  { title: '🎯 Weekly challenge', body: 'Do 5 chat sessions of at least 3 minutes each.' },
  { title: '🔥 Weekly challenge', body: 'Keep a 7-day streak — a little every day!' },
];

function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function sendWeeklyChallenges(supabase: any): Promise<void> {
  console.log('💪 [Expo] Sending weekly challenges...');
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 86400000);

    // Users active in last 7 days
    const { data: activeRows, error: activeErr } = await supabase
      .from('charlotte_practices')
      .select('user_id')
      .gte('created_at', lastWeek.toISOString());
    if (activeErr) { console.error('❌ [Expo] active-users query error:', activeErr.message); return; }
    const activeIds = [...new Set((activeRows ?? []).map((r: any) => r.user_id))] as string[];
    if (!activeIds.length) { console.log('✅ [Expo] No active users last week'); return; }

    const allUsers = await fetchCharlotteUsers(supabase, activeIds);
    const tzFiltered = usersAtLocalHour(allUsers, TARGET_HOUR_WEEKLY, WEEKLY_DAY_OF_WEEK);
    if (!tzFiltered.length) {
      console.log(`⏱️ [Expo] weekly: no users at Mon ${TARGET_HOUR_WEEKLY}h local this run`);
      return;
    }

    const allowedIds = await filterFrequencyCap(supabase, tzFiltered.map((u: any) => u.id), 'weekly_challenge');
    const skipped = tzFiltered.length - allowedIds.length;
    if (skipped > 0) console.log(`⏭️ [Expo] weekly: skipping ${skipped} user(s) at daily cap`);
    if (!allowedIds.length) return;

    const allowed = new Set(allowedIds);
    const cuUsers = tzFiltered.filter((u: any) => allowed.has(u.id));
    if (!cuUsers.length) return;

    const weekIdx = isoWeekNumber(now) % WEEKLY_CHALLENGES_PT.length;
    const chPt = WEEKLY_CHALLENGES_PT[weekIdx];
    const chEn = WEEKLY_CHALLENGES_EN[weekIdx];

    const messages: ExpoMessage[] = cuUsers.map((u: any) => {
      const isNovice = u.charlotte_level === 'Novice';
      const ch = isNovice ? chPt : chEn;
      return {
        to: u.expo_push_token,
        title: ch.title,
        body: ch.body,
        data: { screen: 'chat', type: 'weekly_challenge', weekIdx },
        sound: 'default',
        priority: 'high',
      };
    });

    const { sent, errors } = await sendExpoPush(messages, supabase);
    console.log(`✅ [Expo] Weekly challenges: ${sent} sent, ${errors} errors (week ${weekIdx})`);
    await logRnPushes(supabase, cuUsers.map((u: any, i: number) => ({
      userId: u.id,
      type: 'weekly_challenge',
      title: messages[i]?.title,
      body:  messages[i]?.body,
    })));
  } catch (e) {
    console.error('❌ [Expo] Weekly challenge error:', e);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ══ RE-ENGAGEMENT DISPATCHER ════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
//
// Single dispatcher that covers every re-engagement signal. For each active
// user the dispatcher computes all applicable signals for the user's CURRENT
// local hour, picks the single highest-priority one, and emits it. Frequency
// cap (1/day/type) plus the mutually-exclusive ENGAGEMENT_TYPES set guarantee
// a user sees at most ONE re-engagement push per day on top of the core
// daily/praise/streak/goal cadence.

const XP_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000];

function nextXpMilestone(totalXp: number): { value: number; delta: number } | null {
  for (const m of XP_MILESTONES) {
    if (totalXp < m) return { value: m, delta: m - totalXp };
  }
  return null;
}

function daysBetweenUtc(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86400000);
}

// Compute the user's most common practice hour in their OWN timezone from
// recent history (last ~30 practices). Returns null if not enough data.
function usualLocalPracticeHour(timestamps: string[], tz: string): number | null {
  if (timestamps.length < 5) return null;
  const hist: Record<number, number> = {};
  for (const ts of timestamps) {
    try {
      const h = localHourInTz(new Date(ts), tz);
      hist[h] = (hist[h] ?? 0) + 1;
    } catch { /* ignore malformed */ }
  }
  let best = -1, bestCount = 0;
  for (const [hStr, c] of Object.entries(hist)) {
    if (c > bestCount) { bestCount = c; best = parseInt(hStr, 10); }
  }
  return best >= 0 ? best : null;
}

// Target hour for each re-engagement type (USER local hour).
const ENGAGEMENT_TARGET_HOUR: Record<string, number> = {
  trial_ending_72h:      10,
  trial_ending_24h:      10,
  sub_expired_1d:        11,
  streak_saver:          20,
  streak_milestone_ahead: 20,
  streak_broken:         12,
  level_imminent:        17,
  cadence_drop:          12,
  weekly_recap:          19, // Sunday only
  charlotte_checkin:     15, // Tuesday and Thursday
  reengagement_3d:       12,
  reengagement_7d:       12,
  reengagement_14d:      12,
  reengagement_30d:      12,
  // micro_checkin: dynamic, uses user's usual practice hour + 2h
};

// Priority (highest first). When multiple signals fire in the same hour,
// dispatcher emits the first match.
const ENGAGEMENT_PRIORITY: NotificationType['id'][] = [
  'sub_expired_1d',
  'trial_ending_24h',
  'trial_ending_72h',
  'streak_saver',
  'streak_milestone_ahead',
  'streak_broken',
  'reengagement_30d',
  'reengagement_14d',
  'level_imminent',
  'cadence_drop',
  'micro_checkin',
  'reengagement_7d',
  'weekly_recap',
  'charlotte_checkin',
  'reengagement_3d',
];

interface EngagementUser {
  id: string;
  name: string | null;
  expo_push_token: string;
  charlotte_level: string | null;
  timezone: string | null;
  last_practice_at: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  is_institutional: boolean | null;
  total_xp: number;
  streak_days: number;
  practiced_today: boolean;
  practices_this_week: number;
  practices_prev_4weeks_avg: number;
  recent_practice_timestamps: string[];
  previous_streak_days: number; // streak as of yesterday's cron
}

// Render a template with standard placeholders.
function renderTemplate(
  tpl: { title: string; body: string },
  vars: Record<string, string | number | undefined>,
): { title: string; body: string } {
  const replace = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : '',
  );
  return { title: replace(tpl.title), body: replace(tpl.body) };
}

// Hardcoded template pools per type. Each has PT (Novice) and EN
// (Inter/Advanced) variants; dispatcher picks a random one per send.
// Placeholders: {name}, {streak}, {xp}, {milestone}, {missingXp}, {days}.
interface ReengTemplates {
  pt: { title: string; body: string }[];
  en: { title: string; body: string }[];
}

const ENGAGEMENT_TEMPLATES: Record<string, ReengTemplates> = {
  streak_saver: {
    pt: [
      { title: '🔥 Segura essa sequência!', body: '{name}, você está a poucas horas de quebrar seus {streak} dias. Bora salvar?' },
      { title: '⏰ Sua sequência tá em risco', body: 'Ainda dá tempo, {name}! {streak} dias esperam você voltar hoje.' },
      { title: '🔥 Não deixa a sequência morrer', body: '{streak} dias em jogo, {name}. 2 minutinhos salvam.' },
      { title: '💪 {streak} dias merecem mais 1', body: '{name}, você construiu algo. Não deixa a meia-noite levar.' },
      { title: '⚡ Chama a atenção da Charlotte', body: '{name}, uma sessão curta agora mantém sua chama acesa.' },
    ],
    en: [
      { title: '🔥 Save your streak!', body: '{name}, a few hours left before your {streak}-day streak ends. Save it now?' },
      { title: '⏰ Your streak is at risk', body: 'Still time, {name}! Your {streak}-day streak is waiting.' },
      { title: '🔥 Don\'t break the chain', body: '{streak} days on the line, {name}. 2 minutes to save it.' },
      { title: '💪 {streak} days deserve one more', body: '{name}, you built something. Don\'t let midnight take it.' },
      { title: '⚡ Keep the fire alive', body: '{name}, one quick session keeps your momentum going.' },
    ],
  },
  streak_milestone_ahead: {
    pt: [
      { title: '🎯 Amanhã é marco!', body: '{name}, praticar hoje te leva pra {days} dias consecutivos amanhã. Bora fechar?' },
      { title: '✨ Próxima parada: {days} dias', body: '{name}, cada dia de prática conta pra chegar lá.' },
      { title: '🚀 Tá pertinho de {days} dias', body: '{name}, mais um dia e você desbloqueia um marco.' },
      { title: '🎉 Amanhã você celebra', body: '{name}, só falta hoje pra cravar {days} dias.' },
    ],
    en: [
      { title: '🎯 Milestone tomorrow!', body: '{name}, practice today to hit {days} days in a row tomorrow.' },
      { title: '✨ Next stop: {days} days', body: '{name}, every session counts toward that milestone.' },
      { title: '🚀 Almost at {days} days', body: '{name}, one more day and you unlock a milestone.' },
      { title: '🎉 Tomorrow you celebrate', body: '{name}, today\'s the last step to lock in {days} days.' },
    ],
  },
  streak_broken: {
    pt: [
      { title: '💫 Uma sequência quebra, outra começa', body: '{name}, vamos do zero juntos? A primeira é a mais importante.' },
      { title: '🌱 Recomeça hoje', body: 'A Charlotte ainda está aqui, {name}. Que tal retomar?' },
      { title: '☀️ Novo dia, nova sequência', body: '{name}, o ontem passou. Hoje começa de novo.' },
      { title: '💙 Sem julgamento', body: 'A Charlotte não vai a lugar nenhum, {name}. Bora começar de novo?' },
    ],
    en: [
      { title: '💫 One streak ends, another begins', body: '{name}, let\'s start fresh? Day one is the most important.' },
      { title: '🌱 Start again today', body: 'Charlotte is still here, {name}. How about picking it back up?' },
      { title: '☀️ New day, new streak', body: '{name}, yesterday\'s gone. Today starts over.' },
      { title: '💙 No judgement here', body: 'Charlotte isn\'t going anywhere, {name}. Ready to start again?' },
    ],
  },
  level_imminent: {
    pt: [
      { title: '🎯 Falta pouco pra {milestone} XP', body: 'Só {missingXp} XP, {name}. Uma sessão curta te leva lá.' },
      { title: '✨ {missingXp} XP pro próximo marco', body: '{name}, você está na reta final pra {milestone} XP!' },
      { title: '🚀 Tá na reta final', body: '{name}, {missingXp} XP e pronto — {milestone} é seu.' },
      { title: '⚡ Cruzou a linha?', body: 'Não ainda, {name}. Faltam {missingXp} XP pra {milestone}.' },
      { title: '🏆 Uma sessão resolve', body: '{name}, {missingXp} XP separam você de {milestone}. Bora?' },
    ],
    en: [
      { title: '🎯 Just {missingXp} XP to {milestone}', body: 'You\'re nearly there, {name}. One short session does it.' },
      { title: '✨ {missingXp} XP from your next milestone', body: '{name}, so close to {milestone} XP — go get it!' },
      { title: '🚀 On the final stretch', body: '{name}, {missingXp} XP and {milestone} is yours.' },
      { title: '⚡ Line crossed yet?', body: 'Not quite, {name}. {missingXp} XP to go for {milestone}.' },
      { title: '🏆 One session away', body: '{name}, {missingXp} XP between you and {milestone}. Let\'s go?' },
    ],
  },
  micro_checkin: {
    pt: [
      { title: '👋 Oi, {name}', body: 'Tô por aqui se você tiver uns 2 minutinhos hoje.' },
      { title: '💬 Charlotte pergunta...', body: '{name}, como foi o dia? Vamos praticar um pouquinho?' },
      { title: '🌿 Pausa rápida?', body: '{name}, que tal respirar e treinar um pouco de inglês?' },
      { title: '☕ Brecha na agenda?', body: '{name}, tenho 5 frases separadas pra você.' },
      { title: '💭 Lembrei de você', body: 'Uma sessão curta, {name}. Promessa rápida.' },
    ],
    en: [
      { title: '👋 Hey, {name}', body: 'I\'m here if you have a couple of minutes today.' },
      { title: '💬 Charlotte here', body: '{name}, how\'s your day going? A quick session?' },
      { title: '🌿 Quick break?', body: '{name}, how about a breather and some English?' },
      { title: '☕ Got a moment?', body: '{name}, I\'ve got 5 sentences ready for you.' },
      { title: '💭 Thought of you', body: 'A quick session, {name}. Fast promise.' },
    ],
  },
  cadence_drop: {
    pt: [
      { title: '🌿 Semana corrida?', body: '{name}, só uma sessão curta hoje pra retomar o flow.' },
      { title: '💡 Que tal uma pausa produtiva?', body: 'Poucos minutos, {name}, e sua semana já volta aos trilhos.' },
      { title: '🕰 Sentindo a falta do ritmo?', body: '{name}, pequeno passo hoje, grande progresso amanhã.' },
      { title: '🔁 Retoma o flow', body: '{name}, uma sessão curta traz tudo de volta.' },
    ],
    en: [
      { title: '🌿 Busy week?', body: '{name}, just one quick session today to get back in the flow.' },
      { title: '💡 Take a productive break', body: 'A few minutes, {name}, and your week is back on track.' },
      { title: '🕰 Missing the rhythm?', body: '{name}, small step today, big progress tomorrow.' },
      { title: '🔁 Get back in the flow', body: '{name}, one short session brings it all back.' },
    ],
  },
  weekly_recap: {
    pt: [
      { title: '📊 Sua semana com a Charlotte', body: '{xp} XP, ótimo trabalho {name}! Bora repetir na próxima?' },
      { title: '✨ Semana fechada', body: '{name}, você somou {xp} XP. Que tal planejar a próxima?' },
      { title: '📈 Domingo de balanço', body: '{name}, {xp} XP esta semana. Segunda é novo capítulo.' },
      { title: '🌟 Você chegou longe', body: 'Semana com {xp} XP, {name}. Vamos repetir?' },
    ],
    en: [
      { title: '📊 Your week with Charlotte', body: '{xp} XP, great work {name}! Ready for the next one?' },
      { title: '✨ Week wrapped', body: '{name}, you earned {xp} XP. Let\'s plan the next one?' },
      { title: '📈 Sunday recap', body: '{name}, {xp} XP this week. Monday is a new chapter.' },
      { title: '🌟 You came a long way', body: '{xp} XP this week, {name}. Let\'s do it again?' },
    ],
  },
  charlotte_checkin: {
    pt: [
      { title: '💭 Pensei em você hoje', body: '{name}, 2 minutinhos de inglês?' },
      { title: '☕ Oi, {name}', body: 'Só passando pra ver como está. Vamos praticar?' },
      { title: '✨ Saudade de você', body: 'Vamos conversar, {name}? Só uma sessão curta.' },
      { title: '💬 Aqui do outro lado', body: '{name}, tudo bem? Bora treinar um pouquinho?' },
      { title: '🌙 Até à noite...', body: '{name}, qualquer horinha é horinha de inglês.' },
    ],
    en: [
      { title: '💭 Thinking of you today', body: '{name}, got 2 minutes for some English?' },
      { title: '☕ Hey, {name}', body: 'Just checking in. Want to practice?' },
      { title: '✨ Miss you', body: 'Let\'s chat, {name}? Just a quick session.' },
      { title: '💬 From this side', body: '{name}, all good? Let\'s train a bit?' },
      { title: '🌙 Any time is English time', body: '{name}, even small moments count.' },
    ],
  },
  trial_ending_72h: {
    pt: [
      { title: '⏳ 3 dias restantes no teste', body: '{name}, continue sem interrupção. Seu progresso merece!' },
      { title: '✨ Seu teste grátis acaba em 3 dias', body: '{name}, mantenha o ritmo com a Charlotte.' },
      { title: '🎯 3 dias pra decidir', body: '{name}, sua jornada continua com um clique.' },
      { title: '💙 72h pra escolher seguir', body: '{name}, olha tudo que já construiu.' },
    ],
    en: [
      { title: '⏳ 3 days left in your trial', body: '{name}, keep going without interruption.' },
      { title: '✨ Your free trial ends in 3 days', body: '{name}, keep the momentum with Charlotte.' },
      { title: '🎯 3 days to decide', body: '{name}, your journey continues with one tap.' },
      { title: '💙 72h to choose to keep going', body: '{name}, look at everything you\'ve built.' },
    ],
  },
  trial_ending_24h: {
    pt: [
      { title: '⏰ Último dia do teste', body: '{name}, amanhã termina — continue por R$ 29,90/mês.' },
      { title: '🚨 24h restantes', body: '{name}, você já evoluiu tanto. Não pare agora.' },
      { title: '💙 Última chance hoje', body: '{name}, amanhã tudo muda. Continue conosco?' },
      { title: '⏳ 24h e conta', body: '{name}, sua jornada vale continuar.' },
    ],
    en: [
      { title: '⏰ Final day of your trial', body: '{name}, it ends tomorrow — continue for $5.99/month.' },
      { title: '🚨 24h left', body: '{name}, you\'ve made so much progress. Don\'t stop now.' },
      { title: '💙 Last chance today', body: '{name}, everything changes tomorrow. Stay with us?' },
      { title: '⏳ 24h and counting', body: '{name}, your journey is worth continuing.' },
    ],
  },
  sub_expired_1d: {
    pt: [
      { title: '💙 Sentimos sua falta', body: '{name}, a Charlotte está esperando. Volta?' },
      { title: '👋 Bem-vindo de volta', body: 'Reative sua assinatura, {name}, e continue de onde parou.' },
      { title: '🔔 Sua conta ficou quieta', body: '{name}, reative e recupere sua jornada.' },
      { title: '🎁 Oferta de boas-vindas', body: '{name}, volta hoje e veja um presente esperando.' },
    ],
    en: [
      { title: '💙 We miss you', body: '{name}, Charlotte is waiting. Come back?' },
      { title: '👋 Welcome back', body: 'Reactivate your subscription, {name}, and pick up where you left off.' },
      { title: '🔔 Your account went quiet', body: '{name}, reactivate and pick up where you left off.' },
      { title: '🎁 Welcome-back offer', body: '{name}, come back today and see what\'s waiting.' },
    ],
  },
  reengagement_3d: {
    pt: [
      { title: '👋 Charlotte sentiu sua falta', body: '{name}, 3 dias sem praticar. Que tal voltar hoje?' },
      { title: '💬 Tudo bem aí?', body: '{name}, a Charlotte está pensando em você.' },
      { title: '🌿 3 dias em pausa', body: '{name}, só uma sessão curta e o ritmo volta.' },
      { title: '☕ Bateu saudade?', body: '{name}, a Charlotte tá aqui quando quiser.' },
    ],
    en: [
      { title: '👋 Charlotte misses you', body: '{name}, 3 days without practice. Come back today?' },
      { title: '💬 Everything okay?', body: '{name}, Charlotte\'s been thinking about you.' },
      { title: '🌿 3 days on pause', body: '{name}, just one short session gets the rhythm back.' },
      { title: '☕ Missing it yet?', body: '{name}, Charlotte\'s here whenever you\'re ready.' },
    ],
  },
  reengagement_7d: {
    pt: [
      { title: '🌱 Seu progresso espera', body: '{name}, você tem {xp} XP guardados. Bora retomar?' },
      { title: '✨ Uma semana sem ver você', body: '{name}, a Charlotte quer continuar sua jornada.' },
      { title: '📖 Sua história inglesa continua', body: '{name}, próximo capítulo em poucos minutos.' },
      { title: '🎯 Lembrou do inglês?', body: '{name}, uma semana passou. Bora botar em dia?' },
    ],
    en: [
      { title: '🌱 Your progress is waiting', body: '{name}, you have {xp} XP saved up. Let\'s keep going?' },
      { title: '✨ Been a week', body: '{name}, Charlotte wants to continue your journey.' },
      { title: '📖 Your English story continues', body: '{name}, next chapter just a few minutes away.' },
      { title: '🎯 Thinking about English?', body: '{name}, a week passed. Let\'s catch up?' },
    ],
  },
  reengagement_14d: {
    pt: [
      { title: '💙 Não desista agora', body: '{name}, uma sessão curta hoje faz toda a diferença.' },
      { title: '🔥 Sua jornada está pausada', body: 'Volta, {name}. A Charlotte está aqui.' },
      { title: '🌊 2 semanas passaram', body: '{name}, o que você construiu ainda espera você.' },
      { title: '☀️ Bora reacender?', body: '{name}, o caminho está aberto quando quiser voltar.' },
    ],
    en: [
      { title: '💙 Don\'t give up now', body: '{name}, one short session today makes all the difference.' },
      { title: '🔥 Your journey is on pause', body: 'Come back, {name}. Charlotte is here.' },
      { title: '🌊 2 weeks have passed', body: '{name}, what you built is still waiting for you.' },
      { title: '☀️ Light it up again?', body: '{name}, the path is open whenever you\'re ready.' },
    ],
  },
  reengagement_30d: {
    pt: [
      { title: '🎁 Uma mensagem especial pra você', body: '{name}, a Charlotte preparou algo. Abra o app?' },
      { title: '💫 Ainda dá tempo de voltar', body: 'Seu inglês continua esperando, {name}. Só você começa de novo.' },
      { title: '🌅 Novo começo disponível', body: '{name}, um mês é só um momento. Retoma hoje?' },
      { title: '💌 Última carta da Charlotte', body: '{name}, a porta segue aberta — quando quiser.' },
    ],
    en: [
      { title: '🎁 A special message for you', body: '{name}, Charlotte prepared something. Open the app?' },
      { title: '💫 Still time to come back', body: 'Your English is waiting, {name}. Only you can restart.' },
      { title: '🌅 New beginning available', body: '{name}, a month is just a moment. Start again today?' },
      { title: '💌 Charlotte\'s last note', body: '{name}, the door stays open — whenever you\'re ready.' },
    ],
  },
};

// ── Hardcoded pools for CORE types that previously had a single template.
// streak_reminder, goal_reminder and xp_milestone emit high-volume daily
// copy; keep multiple variants so the same message never hits a user more
// than once in a short window. Placeholders: {name}, {streak}, {missingXp},
// {milestone}.
const CORE_TEMPLATES: Record<string, ReengTemplates> = {
  streak_reminder: {
    pt: [
      { title: '🔥 Streak em risco!', body: 'Sua sequência de {streakDays} está em risco. Pratique agora com a Charlotte!' },
      { title: '⏰ Última chance hoje', body: '{name}, sua sequência de {streakDays} merece continuar. Uma sessão curta agora salva.' },
      { title: '🔥 Não quebra sua sequência', body: '{name}, cada dia constrói o próximo. {streakDays} esperando você.' },
      { title: '💪 {streakDays} de orgulho', body: '{name}, mantém o ritmo. Poucos minutinhos fazem toda a diferença.' },
      { title: '⚡ Mantenha a chama', body: '{name}, sua sequência de {streakDays} merece mais um hoje.' },
      { title: '🌟 Segura esse ritmo', body: '{streakDays}, {name}. Não vamos deixar esfriar agora.' },
    ],
    en: [
      { title: '🔥 Streak at risk!', body: 'Your {streak}-day streak is at risk. Practice with Charlotte now!' },
      { title: '⏰ Last chance today', body: '{name}, your streak deserves to continue. A quick session now saves it.' },
      { title: '🔥 Don\'t break the chain', body: '{name}, each day builds the next. {streakDays} waiting for you.' },
      { title: '💪 {streakDays} of pride', body: '{name}, keep the rhythm. A few minutes make all the difference.' },
      { title: '⚡ Keep the fire going', body: '{name}, your {streak}-day streak deserves one more today.' },
      { title: '🌟 Hold the momentum', body: '{streakDays}, {name}. Let\'s not let it cool down now.' },
    ],
  },
  goal_reminder: {
    pt: [
      { title: '🎯 Meta quase lá!', body: '{name}, só {missingXp} XP para completar sua meta semanal!' },
      { title: '✨ Reta final da semana', body: '{name}, {missingXp} XP e você fecha a semana com chave de ouro.' },
      { title: '🚀 Falta pouco', body: '{missingXp} XP de distância da meta, {name}. Bora?' },
      { title: '💪 Você está perto', body: '{name}, só {missingXp} XP e a meta semanal é sua.' },
      { title: '🏆 Meta ao alcance', body: '{name}, {missingXp} XP de distância. Uma sessão curta fecha.' },
      { title: '⚡ Fecha a semana', body: '{name}, {missingXp} XP até o fim. Vamos terminar forte?' },
    ],
    en: [
      { title: '🎯 Almost at your goal!', body: '{name}, only {missingXp} XP to hit your weekly goal!' },
      { title: '✨ Final stretch', body: '{name}, {missingXp} XP and you close the week strong.' },
      { title: '🚀 Nearly there', body: '{missingXp} XP between you and the goal, {name}. Let\'s go?' },
      { title: '💪 You\'re close', body: '{name}, just {missingXp} XP and the weekly goal is yours.' },
      { title: '🏆 Goal in reach', body: '{name}, {missingXp} XP to go. One short session does it.' },
      { title: '⚡ Finish the week', body: '{name}, {missingXp} XP left. Let\'s finish strong?' },
    ],
  },
  xp_milestone: {
    pt: [
      { title: '🎉 Marco alcançado!', body: '{name} chegou a {milestone} XP! Continue praticando!' },
      { title: '🏆 {milestone} XP conquistados', body: '{name}, que conquista! Vamos pro próximo nível.' },
      { title: '✨ {milestone} XP, nada mal', body: '{name}, você passou mais uma fronteira. Parabéns!' },
      { title: '🌟 Marco {milestone} XP desbloqueado', body: '{name}, segue firme. O próximo marco já tá aparecendo no horizonte.' },
    ],
    en: [
      { title: '🎉 Milestone reached!', body: '{name} hit {milestone} XP! Keep practicing!' },
      { title: '🏆 {milestone} XP earned', body: '{name}, what an achievement! On to the next level.' },
      { title: '✨ {milestone} XP, not bad at all', body: '{name}, you crossed another line. Congrats!' },
      { title: '🌟 {milestone} XP milestone unlocked', body: '{name}, keep going. The next milestone is already on the horizon.' },
    ],
  },
};

// Generic pool picker: respects novelty decay (excludeHashes of variants the
// user has received recently) and returns both the rendered message and the
// variant_hash so the caller can log it.
function pickFromPool(
  pool: { title: string; body: string }[],
  vars: Record<string, any>,
  excludeHashes: Set<string> = new Set(),
): { msg: { title: string; body: string }; hash: string } | null {
  if (!pool.length) return null;
  const eligible = pool.filter(t => !excludeHashes.has(variantHash(t)));
  const source = eligible.length > 0 ? eligible : pool;
  const tpl = source[Math.floor(Math.random() * source.length)];
  return { msg: renderTemplate(tpl, vars), hash: variantHash(tpl) };
}

function pickReengTemplate(
  type: string,
  isNovice: boolean,
  vars: Record<string, any>,
  excludeHashes: Set<string> = new Set(),
): { msg: { title: string; body: string }; hash: string } | null {
  // Prefer GPT pool if available (set by dispatcher during the run), else
  // fall back to hardcoded pool from ENGAGEMENT_TEMPLATES.
  const gpt = getEngagementGptPool(type, isNovice);
  if (gpt && gpt.length > 0) {
    const picked = pickFromPool(gpt, vars, excludeHashes);
    if (picked) return picked;
  }
  const set = ENGAGEMENT_TEMPLATES[type];
  if (!set) return null;
  const pool = isNovice ? set.pt : set.en;
  return pickFromPool(pool, vars, excludeHashes);
}

function pickCoreTemplate(
  type: 'streak_reminder' | 'goal_reminder' | 'xp_milestone',
  isNovice: boolean,
  vars: Record<string, any>,
  excludeHashes: Set<string> = new Set(),
): { msg: { title: string; body: string }; hash: string } | null {
  const set = CORE_TEMPLATES[type];
  if (!set) return null;
  const pool = isNovice ? set.pt : set.en;
  return pickFromPool(pool, vars, excludeHashes);
}

// ─ Signal detection ─────────────────────────────────────────────────────────
// Returns the single highest-priority engagement type that applies to the
// user at this instant (their current local hour), or null if none.
function detectEngagementSignal(
  user: EngagementUser,
  now: Date,
): { type: NotificationType['id']; vars: Record<string, any> } | null {
  const tz = user.timezone || DEFAULT_TZ;
  const localHour = localHourInTz(now, tz);
  const localDay  = localDayInTz(now, tz);
  const firstName = user.name?.split(/[\s\-]+/)[0] ?? 'there';
  const isNovice  = user.charlotte_level === 'Novice';

  // Iterate priority order; return first matching signal.
  for (const type of ENGAGEMENT_PRIORITY) {
    // Institutional users are admin-managed — skip revenue + winback
    if (user.is_institutional && (
      type === 'trial_ending_72h' || type === 'trial_ending_24h' ||
      type === 'sub_expired_1d'   || type.startsWith('reengagement_')
    )) continue;

    switch (type) {
      case 'sub_expired_1d': {
        if (user.subscription_status !== 'expired' || !user.subscription_expires_at) break;
        const expiredAt = new Date(user.subscription_expires_at);
        const days = daysBetweenUtc(expiredAt, now);
        if (days !== 1) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR.sub_expired_1d) break;
        return { type, vars: { name: firstName, isNovice } };
      }
      case 'trial_ending_24h':
      case 'trial_ending_72h': {
        if (!user.trial_ends_at) break;
        const endsAt = new Date(user.trial_ends_at);
        const hoursLeft = (endsAt.getTime() - now.getTime()) / 3600000;
        const targetBand = type === 'trial_ending_24h' ? [12, 36] : [60, 84];
        if (hoursLeft < targetBand[0] || hoursLeft > targetBand[1]) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR[type]) break;
        return { type, vars: { name: firstName, isNovice } };
      }
      case 'streak_saver': {
        // Yesterday still had streak ≥ 3, today not practiced, we're at 20h local.
        if (user.previous_streak_days < 3) break;
        if (user.practiced_today) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR.streak_saver) break;
        return { type, vars: { name: firstName, streak: user.streak_days || user.previous_streak_days, isNovice } };
      }
      case 'streak_milestone_ahead': {
        // Tomorrow user would hit a 7/30/100 day milestone.
        const MS = [7, 30, 100, 365];
        const upcoming = MS.find(m => user.streak_days === m - 1);
        if (!upcoming) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR.streak_milestone_ahead) break;
        return { type, vars: { name: firstName, days: upcoming, isNovice } };
      }
      case 'streak_broken': {
        // User had a streak ≥ 7 as of yesterday, now 0 → fire noon today.
        if (user.previous_streak_days < 7) break;
        if (user.streak_days > 0) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR.streak_broken) break;
        return { type, vars: { name: firstName, isNovice } };
      }
      case 'reengagement_30d':
      case 'reengagement_14d':
      case 'reengagement_7d':
      case 'reengagement_3d': {
        if (!user.last_practice_at) break;
        const days = daysBetweenUtc(new Date(user.last_practice_at), now);
        const targetDays =
          type === 'reengagement_30d' ? 30 :
          type === 'reengagement_14d' ? 14 :
          type === 'reengagement_7d'  ? 7  :
          3;
        // Exact-day fire. After 30d we stop (dispatched at priority top,
        // so 30d fires once and future days won't — no 31d/32d push).
        if (days !== targetDays) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR[type]) break;
        return { type, vars: { name: firstName, xp: user.total_xp, days, isNovice } };
      }
      case 'level_imminent': {
        const next = nextXpMilestone(user.total_xp);
        if (!next || next.delta > 30) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR.level_imminent) break;
        return { type, vars: { name: firstName, milestone: next.value, missingXp: next.delta, isNovice } };
      }
      case 'cadence_drop': {
        // This week ≥ 1 practice but ≤ 60% of previous 4-week avg, and we've
        // made it to noon without enough activity. Avoid false positives when
        // the avg itself is tiny.
        const avg = user.practices_prev_4weeks_avg;
        if (avg < 3) break;
        if (user.practices_this_week >= avg * 0.6) break;
        if (!user.last_practice_at) break;
        if (daysBetweenUtc(new Date(user.last_practice_at), now) < 2) break;
        if (localHour !== ENGAGEMENT_TARGET_HOUR.cadence_drop) break;
        return { type, vars: { name: firstName, isNovice } };
      }
      case 'micro_checkin': {
        // User's usual practice hour has passed by ≥ 2h and they still have
        // not practiced today. Keeps the "Charlotte is around" feeling.
        const usual = usualLocalPracticeHour(user.recent_practice_timestamps, tz);
        if (usual == null) break;
        if (user.practiced_today) break;
        const want = (usual + 2) % 24;
        if (localHour !== want) break;
        return { type, vars: { name: firstName, isNovice } };
      }
      case 'weekly_recap': {
        if (localDay !== 0) break; // Sunday in Intl = 0
        if (localHour !== ENGAGEMENT_TARGET_HOUR.weekly_recap) break;
        // Only fire for users who practiced at least once this week — otherwise
        // a 'xp: 0' recap is demoralising.
        if (user.practices_this_week === 0) break;
        // Approx: cumulative today-week XP is hard without extra query; show total_xp as
        // a proxy for "progress so far". Good enough for a Sunday evening nudge.
        return { type, vars: { name: firstName, xp: user.total_xp, isNovice } };
      }
      case 'charlotte_checkin': {
        if (localDay !== 2 && localDay !== 4) break; // Tue or Thu
        if (localHour !== ENGAGEMENT_TARGET_HOUR.charlotte_checkin) break;
        // Only for users who practiced in the last 4 days (still warm).
        if (!user.last_practice_at) break;
        if (daysBetweenUtc(new Date(user.last_practice_at), now) > 4) break;
        return { type, vars: { name: firstName, isNovice } };
      }
    }
  }
  return null;
}

// ─ Main sender ─────────────────────────────────────────────────────────────
export async function sendEngagementPushes(supabase: any): Promise<void> {
  console.log('🎯 [Expo] Engagement dispatcher starting...');
  try {
    const now = new Date();
    const todayUtc = now.toISOString().split('T')[0];
    const weekAgo  = new Date(now.getTime() - 7  * 86400000).toISOString();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString();

    // 1. Fetch all candidate users (with token) and their timezones.
    //    Uses the public.charlotte_users view (see migration
    //    20260423_reengagement_types.sql which recreates it to include the
    //    new last_practice_at column — custom schemas are not exposed by
    //    PostgREST in this project).
    const { data: users, error: usersErr } = await supabase
      .from('charlotte_users')
      .select('id, name, expo_push_token, charlotte_level, timezone, last_practice_at, trial_ends_at, subscription_status, subscription_expires_at, is_institutional')
      .not('expo_push_token', 'is', null);
    if (usersErr) { console.error('❌ [Engagement] users query:', usersErr.message); return; }
    const withToken = (users ?? []).filter((u: any) =>
      u.expo_push_token?.startsWith('ExponentPushToken['));
    if (!withToken.length) { console.log('🎯 [Engagement] no users with tokens'); return; }

    const userIds = withToken.map((u: any) => u.id);

    // 2. Fetch progress (streak + total_xp).
    const { data: progressRows } = await supabase
      .from('charlotte_progress')
      .select('user_id, streak_days, total_xp')
      .in('user_id', userIds);
    const progressMap = new Map<string, { streak: number; totalXp: number }>();
    for (const r of (progressRows ?? []) as any[]) {
      progressMap.set(r.user_id, { streak: r.streak_days ?? 0, totalXp: r.total_xp ?? 0 });
    }

    // 3. Fetch practices: today, this week, prev 4 weeks.
    const { data: recentPractices } = await supabase
      .from('charlotte_practices')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .gte('created_at', fourWeeksAgo);

    const todayPractices   = new Set<string>();
    const thisWeekCount    = new Map<string, number>();
    const prev4weekCount   = new Map<string, number>();
    const historyByUser    = new Map<string, string[]>();
    for (const r of (recentPractices ?? []) as any[]) {
      if (r.created_at >= `${todayUtc}T00:00:00Z`) todayPractices.add(r.user_id);
      if (r.created_at >= weekAgo) {
        thisWeekCount.set(r.user_id, (thisWeekCount.get(r.user_id) ?? 0) + 1);
      } else {
        prev4weekCount.set(r.user_id, (prev4weekCount.get(r.user_id) ?? 0) + 1);
      }
      const hist = historyByUser.get(r.user_id) ?? [];
      hist.push(r.created_at);
      historyByUser.set(r.user_id, hist);
    }

    // 4. Fetch yesterday's streak snapshot from notification_logs — proxy:
    //    we rely on charlotte_progress.streak_days being bumped BEFORE the
    //    cron fires, so yesterday's value is reconstructed as
    //    current_streak if user practiced today, else current_streak + 1
    //    (since missing a day resets to 0, a zero current with previous > 0
    //    means the streak broke today-ish — good enough signal).
    // Simpler heuristic used below: `previous_streak_days` = streak_days if
    // practiced today, otherwise streak_days (still holds until midnight of
    // the next day). This captures the "about to break" window well enough
    // for streak_saver. streak_broken relies on streak_days === 0 with a
    // recent last_practice_at (within 2 days).

    // 5. Exclude users who already received ANY engagement push today (hard
    //    cap on the whole category, not per-type).
    const { data: engagedTodayRows } = await supabase
      .from('notification_logs')
      .select('user_id, notification_type')
      .in('user_id', userIds)
      .gte('created_at', `${todayUtc}T00:00:00Z`)
      .eq('status', 'sent');
    const alreadyEngaged = new Set<string>();
    for (const r of (engagedTodayRows ?? []) as any[]) {
      if (ENGAGEMENT_TYPES.has(r.notification_type)) {
        alreadyEngaged.add(r.user_id);
      }
    }

    // 6. Build EngagementUser per candidate + run signal detection.
    type Plan = { user: EngagementUser; type: NotificationType['id']; vars: Record<string, any> };
    const plans: Plan[] = [];
    for (const raw of withToken) {
      if (alreadyEngaged.has(raw.id)) continue;
      const prog = progressMap.get(raw.id) ?? { streak: 0, totalXp: 0 };
      const thisWeek = thisWeekCount.get(raw.id) ?? 0;
      const prev4    = prev4weekCount.get(raw.id) ?? 0;
      const eu: EngagementUser = {
        id: raw.id,
        name: raw.name,
        expo_push_token: raw.expo_push_token,
        charlotte_level: raw.charlotte_level,
        timezone: raw.timezone,
        last_practice_at: raw.last_practice_at,
        trial_ends_at: raw.trial_ends_at,
        subscription_status: raw.subscription_status,
        subscription_expires_at: raw.subscription_expires_at,
        is_institutional: raw.is_institutional,
        total_xp: prog.totalXp,
        streak_days: prog.streak,
        practiced_today: todayPractices.has(raw.id),
        practices_this_week: thisWeek,
        practices_prev_4weeks_avg: prev4 / 4,
        recent_practice_timestamps: historyByUser.get(raw.id) ?? [],
        previous_streak_days: prog.streak, // see note in step 4
      };

      const signal = detectEngagementSignal(eu, now);
      if (signal) plans.push({ user: eu, type: signal.type, vars: signal.vars });
    }

    if (!plans.length) {
      console.log('🎯 [Engagement] no signals fired this hour');
      return;
    }

    // 7. Drop users at frequency cap for that specific type.
    const byType = new Map<NotificationType['id'], Plan[]>();
    for (const p of plans) {
      const arr = byType.get(p.type) ?? [];
      arr.push(p);
      byType.set(p.type, arr);
    }
    const finalPlans: Plan[] = [];
    for (const [type, ps] of byType) {
      const allowed = await filterFrequencyCap(supabase, ps.map(p => p.user.id), type);
      const allowSet = new Set(allowed);
      for (const p of ps) if (allowSet.has(p.user.id)) finalPlans.push(p);
    }
    if (!finalPlans.length) return;

    // 8. Render + batch-send per type so logRnPushes writes the right rows.
    const byTypeFinal = new Map<NotificationType['id'], Plan[]>();
    for (const p of finalPlans) {
      const arr = byTypeFinal.get(p.type) ?? [];
      arr.push(p);
      byTypeFinal.set(p.type, arr);
    }

    // 8a. Warm GPT pools for the critical types that will actually be sent
    //     this run. generateEngagementGptPool is a no-op for types not in
    //     GPT_ENGAGEMENT_TYPES, and the warm step respects per-locale need.
    const gptWarmInputs: { type: string; needsPt: boolean; needsEn: boolean }[] = [];
    for (const [type, ps] of byTypeFinal) {
      const needsPt = ps.some(p => p.user.charlotte_level === 'Novice');
      const needsEn = ps.some(p => p.user.charlotte_level !== 'Novice');
      gptWarmInputs.push({ type, needsPt, needsEn });
    }
    await warmEngagementGptPools(gptWarmInputs);

    // 8b. Fetch recent variant hashes per user per type for novelty decay.
    //     Batched once per type so the loop renders quickly.
    const recentHashesByType = new Map<NotificationType['id'], Map<string, Set<string>>>();
    for (const [type, ps] of byTypeFinal) {
      const hashes = await fetchRecentVariantHashes(
        supabase,
        ps.map(p => p.user.id),
        type,
      );
      recentHashesByType.set(type, hashes);
    }

    for (const [type, ps] of byTypeFinal) {
      const messages: ExpoMessage[] = [];
      const logRows: any[] = [];
      const hashesForType = recentHashesByType.get(type) ?? new Map();
      for (const p of ps) {
        const picked = pickReengTemplate(
          type,
          p.user.charlotte_level === 'Novice',
          p.vars,
          hashesForType.get(p.user.id) ?? new Set(),
        );
        if (!picked) continue;
        messages.push({
          to: p.user.expo_push_token,
          title: picked.msg.title,
          body:  picked.msg.body,
          data:  { screen: 'chat', type },
          sound: 'default',
          priority: 'high',
        });
        logRows.push({
          userId: p.user.id,
          type,
          variantHash: picked.hash,
          title: picked.msg.title,
          body:  picked.msg.body,
        });
      }
      if (!messages.length) continue;
      const { sent, errors } = await sendExpoPush(messages, supabase);
      console.log(`✅ [Engagement] ${type}: ${sent} sent, ${errors} errors`);
      await logRnPushes(supabase, logRows);
    }
  } catch (e) {
    console.error('❌ [Engagement] dispatcher error:', e);
  }
}
