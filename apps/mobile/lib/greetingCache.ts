// lib/greetingCache.ts
// Pre-fetch cache for the home-screen AI greeting.
//
// Pattern: AuthProvider fires prefetchGreeting() the instant the user profile
// loads — BEFORE React even re-renders HomeScreen. By the time HomeScreen
// mounts and its effect runs, the API call is already in-flight (or done),
// so the greeting appears with minimal or zero waiting.
//
// Uses a plain object so mutations are always visible to importers (no stale
// closure / live-binding issues across bundler transforms).

import Constants from 'expo-constants';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ??
  'https://charlotte.hubacademybr.com';

export const greetingCache = {
  fetched:  false,   // true once a fetch was kicked off this JS session
  level:    '',      // level used for the current cached result
  text:     '',      // resolved greeting text; '' while pending or on error
  pending:  false,   // true while the API call is in-flight
};

export function resetGreetingCache(): void {
  greetingCache.fetched  = false;
  greetingCache.level    = '';
  greetingCache.text     = '';
  greetingCache.pending  = false;
}

interface PrefetchProfile {
  name: string | null;
  charlotte_level: string;
  first_welcome_done: boolean;
}

// Fire-and-forget: call as soon as profile is available.
// Safe to call multiple times — exits early if already fetched this session.
export function prefetchGreeting(profile: PrefetchProfile): void {
  if (greetingCache.fetched) return;

  greetingCache.fetched = true;
  greetingCache.level   = profile.charlotte_level;
  greetingCache.pending = true;

  const firstName = profile.name?.split(' ')[0] || profile.name || 'there';
  const level     = profile.charlotte_level as 'Novice' | 'Inter' | 'Advanced';
  // first_welcome_done is set to true by charlotte-intro.tsx before the user
  // ever reaches HomeScreen, so isNewUser is effectively always false here.
  // Kept for correctness in edge cases (e.g. onboarding interrupted).
  const isNewUser = !profile.first_welcome_done;

  // 5-second abort: prevents the fetch from hanging forever when the server
  // is slow or unreachable. The poll/timeout in HomeScreen then shows the fallback.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 5_000);

  fetch(`${API_BASE_URL}/api/greeting`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal:  controller.signal,
    body: JSON.stringify({
      firstName,
      streak:    0,   // stats not available yet; greeting falls back to motivational copy
      todayXP:   0,
      totalXP:   0,
      dailyGoal: 100,
      hour:      new Date().getHours(),
      level,
      isNewUser,
    }),
  })
    .then(res => (res.ok ? res.json() : null))
    .then((json: { message?: string } | null) => {
      if (json?.message) greetingCache.text = json.message;
    })
    .catch(() => { /* fail open — HomeScreen shows hardcoded fallback */ })
    .finally(() => {
      clearTimeout(abortTimer);
      greetingCache.pending = false;
    });
}
