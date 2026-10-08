// lib/analytics.ts
// Analytics leve baseado em Supabase — zero dependências externas, LGPD-compliant.
// Eventos são inseridos em charlotte.analytics_events (tabela criada na migration).
// Fire-and-forget: nunca bloqueia a UI.

import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type AnalyticsEvent =
  | 'app_open'
  | 'placement_test_done'
  | 'lesson_started'
  | 'lesson_completed'
  | 'exercise_completed'
  | 'exercise_error'
  | 'chat_message_sent'
  | 'live_voice_started'
  | 'live_voice_ended'
  | 'live_voice_paused_inactivity'
  | 'subscription_purchased'
  | 'subscription_restored'
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'share_streak'
  | 'share_achievement'
  | 'share_card'
  | 'share_invite_link'
  | 'account_deleted'
  | 'notification_tapped';

interface EventProps {
  [key: string]: string | number | boolean | null;
}

let _userId: string | null = null;
let _userLevel: string | null = null;

/** Chamar uma vez após login para associar eventos ao user. */
export function identifyUser(userId: string, level: string): void {
  _userId = userId;
  _userLevel = level;
}

/** Registra um evento (fire-and-forget). */
export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (!_userId) return; // Não registrar eventos anônimos

  const payload = {
    user_id:    _userId,
    event_name: event,
    user_level: _userLevel,
    platform:   Platform.OS,
    app_version: Constants.expoConfig?.version ?? '1.0.0',
    properties: props ? JSON.stringify(props) : null,
  };

  // Fire-and-forget — sem await, sem bloquear
  supabase.from('charlotte_analytics_events').insert(payload)
    .then(({ error }) => {
      if (error) console.warn('[analytics] insert error:', error.message);
    }, () => {}); // silenciar erros de rede
}

/** Atalho para eventos com duração (ex: sessão de live voice). */
export function trackDuration(event: AnalyticsEvent, durationSec: number, props?: EventProps): void {
  track(event, { ...props, duration_seconds: durationSec });
}
