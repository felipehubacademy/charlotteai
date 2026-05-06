// lib/rate-limit.ts
// Per-user OpenAI rate limiting. Checks hourly and daily message counts.
// Returns a rate-limit payload (injected as Charlotte message) or null if ok.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(supabaseUrl, supabaseKey);
}

// ── Timezone helpers (server-side, no external deps) ─────────────────────────

/** Today's date as YYYY-MM-DD in the given IANA timezone. */
function localDateInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

/**
 * UTC offset in ms for a timezone at a given moment.
 * Positive = west of UTC (e.g. America/Sao_Paulo = +10_800_000).
 * Negative = east of UTC (e.g. Asia/Tokyo = -32_400_000).
 */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const localAsUTC = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second')));
  return date.getTime() - localAsUTC.getTime();
}

/** UTC Date for midnight (00:00:00) of the next local day in the given timezone. */
function nextMidnightInTz(todayLocalStr: string, tz: string): Date {
  const [y, m, d] = todayLocalStr.split('-').map(Number);
  // Use noon tomorrow for offset lookup to avoid DST-at-midnight edge cases
  const noonTomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const offsetMs = tzOffsetMs(tz, noonTomorrow);
  return new Date(Date.UTC(y, m - 1, d + 1) + offsetMs);
}

// ── Limits ───────────────────────────────────────────────────────────────────
const LIMITS = {
  trial:  { hour: 15, day: 40  },
  paid:   { hour: 40, day: 120 },
};

// ── Charlotte messages per type / mode / level ───────────────────────────────
type LimitType = 'hourly' | 'daily';
type Mode      = 'chat' | 'grammar' | 'pronunciation' | undefined;

const MESSAGES: Record<LimitType, Record<'novice' | 'other', Record<'chat' | 'grammar' | 'pronunciation', string>>> = {
  hourly: {
    novice: {
      chat:          'Ufa, você me fez falar muito hoje! Que ótimo sinal. Preciso de uma pausa rápida — volte em {X} minutos e continuamos!',
      grammar:       'Quanta dedicação! Você fez muitos exercícios seguidos. Descanse um pouco — volte em {X} minutos para continuar!',
      pronunciation: 'Sua pronúncia está melhorando a olhos vistos! Mas preciso de um descanso. Volte em {X} minutos e treinamos mais!',
    },
    other: {
      chat:          "Wow, you've been keeping me very busy today! That's great. I need a short break — come back in {X} minutes!",
      grammar:       "So much dedication! You've been grinding through exercises. Take a breather — come back in {X} minutes!",
      pronunciation: "Your pronunciation is getting better and better! I need a quick rest though — come back in {X} minutes!",
    },
  },
  daily: {
    novice: {
      chat:          'Que dia de prática incrível! Você atingiu o limite de hoje. Até amanhã para continuarmos de onde paramos!',
      grammar:       'Você arrasou nos exercícios hoje! Limite diário atingido. Descanse bem — amanhã tem mais!',
      pronunciation: 'Tanto treino de pronúncia em um dia só! Limite diário atingido. Seu cérebro precisa absorver tudo isso. Até amanhã!',
    },
    other: {
      chat:          "What an incredible practice day! You've hit your daily limit. See you tomorrow to pick up where we left off!",
      grammar:       "You absolutely crushed your grammar today! Daily limit reached. Rest well — more tomorrow!",
      pronunciation: "So much pronunciation training in one day! Daily limit reached. Your brain needs time to absorb it all. See you tomorrow!",
    },
  },
};

function getMessage(type: LimitType, level: string, mode: Mode, retryAfterMins: number): string {
  const levelKey  = level === 'Novice' ? 'novice' : 'other';
  const modeKey   = (mode === 'grammar' || mode === 'pronunciation') ? mode : 'chat';
  return MESSAGES[type][levelKey][modeKey].replace('{X}', String(retryAfterMins));
}

// ── Main check ───────────────────────────────────────────────────────────────
export async function checkRateLimit(
  userId: string,
  userLevel: string,
  mode: Mode,
): Promise<null | {
  error: 'rate_limited';
  type: LimitType;
  message: string;
  retry_after: number;   // seconds
  is_trial: boolean;
}> {
  try {
    const supabase = getServiceClient();

    // Fetch subscription status + current rate limit row in parallel
    const [{ data: userData }, { data: row }] = await Promise.all([
      supabase
        .from('charlotte_users')
        .select('subscription_status, is_institutional, timezone')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (userData?.is_institutional) return null;

    const isTrial   = userData?.subscription_status === 'trial' || !userData?.subscription_status;
    const limits    = isTrial ? LIMITS.trial : LIMITS.paid;
    const now       = new Date();
    const nowIso    = now.toISOString();
    const tz        = (userData as any)?.timezone || 'UTC';
    const todayDate = localDateInTz(tz);

    // Resolve current counts (reset stale windows)
    let hourCount = 0;
    let dayCount  = 0;
    let hourWindow = nowIso;

    if (row) {
      const windowAge = (now.getTime() - new Date(row.hour_window).getTime()) / 1000;
      hourCount  = windowAge < 3600 ? (row.hour_count ?? 0) : 0;
      hourWindow = windowAge < 3600 ? row.hour_window : nowIso;
      dayCount   = row.day_date === todayDate ? (row.day_count ?? 0) : 0;
    }

    // Check hourly limit
    if (hourCount >= limits.hour) {
      const windowStart   = new Date(hourWindow);
      const resetAt       = new Date(windowStart.getTime() + 3600 * 1000);
      const retryAfterSec = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
      const retryMins     = Math.ceil(retryAfterSec / 60);
      return {
        error:       'rate_limited',
        type:        'hourly',
        message:     getMessage('hourly', userLevel, mode, retryMins),
        retry_after: retryAfterSec,
        is_trial:    isTrial,
      };
    }

    // Check daily limit
    if (dayCount >= limits.day) {
      const midnight      = nextMidnightInTz(todayDate, tz);
      const retryAfterSec = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 1000));
      return {
        error:       'rate_limited',
        type:        'daily',
        message:     getMessage('daily', userLevel, mode, 0),
        retry_after: retryAfterSec,
        is_trial:    isTrial,
      };
    }

    // Within limits — upsert incremented counts
    const newHourCount = hourCount + 1;
    const newDayCount  = dayCount  + 1;

    await supabase
      .from('rate_limits')
      .upsert({
        user_id:     userId,
        hour_count:  newHourCount,
        hour_window: hourWindow,
        day_count:   newDayCount,
        day_date:    todayDate,
        updated_at:  nowIso,
      }, { onConflict: 'user_id' });

    return null; // not rate limited
  } catch (e) {
    // On any DB error, fail open — never block the user due to infra issues
    console.warn('[rate-limit] check failed, failing open:', e);
    return null;
  }
}
