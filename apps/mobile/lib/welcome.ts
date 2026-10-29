// lib/welcome.ts — abertura de conta nova (app/(app)/charlotte-intro.tsx): a Charlotte dá oi pelo nome,
// o aluno escolhe o ritmo, aceita o desafio dos 7 dias, passa pelo aviso de IA e cai direto na 1ª lição.
//
// Voz: a fala com o nome é gerada no servidor (/api/tts, ~2 s). Começa logo no cadastro
// (prefetchWelcomeVoice) para estar pronta quando a tela abrir; se não chegar a tempo, toca a gravada
// (assets/audio/voice/welcome_pt.mp3 / welcome_en.mp3, mesma voz e mesmo texto sem o nome).
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { listModules } from '@/lib/curriculum-v2/loader';
import type { Level as V2Level } from '@/lib/curriculum-v2/types';
import { systemIsPt } from '@/lib/systemLang';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export const WELCOME_FALLBACK_PT = require('@/assets/audio/voice/welcome_pt.mp3');
export const WELCOME_FALLBACK_EN = require('@/assets/audio/voice/welcome_en.mp3');

// A abertura nova vale a partir daqui para quem ainda não passou pela abertura (conta nova); antes disso,
// só para quem tem o selo de teste 'welcome_v2' (beta_features), para conferir nos aparelhos primeiro.
const WELCOME_V2_FROM = '2026-10-29T17:00:00Z'; // 29/10/2026, 14h de Brasília
export function welcomeV2Enabled(profile: { created_at?: string | null; beta_features?: string[] | null } | null | undefined): boolean {
  if (!profile) return false;
  if ((profile.beta_features ?? []).includes('welcome_v2')) return true;
  return Date.now() >= Date.parse(WELCOME_V2_FROM);
}

/** Opções de ritmo diário (minutos → lições por dia). */
export const RHYTHM_OPTIONS = [
  { minutes: 5,  lessons: 1, pt: 'Leve',    en: 'Light'   },
  { minutes: 10, lessons: 2, pt: 'Ideal',   en: 'Ideal'   },
  { minutes: 15, lessons: 3, pt: 'Intenso', en: 'Intense' },
] as const;
export const DEFAULT_RHYTHM = 10;

/** Primeiro nome, com inicial maiúscula ("felipe xavier" → "Felipe"). Vazio se não houver nome. */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first || first.includes('@') || first.length > 20) return '';
  return first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1).toLocaleLowerCase('pt-BR');
}

export function welcomeLine(name: string): string {
  if (systemIsPt) return `Oi${name ? `, ${name}` : ''}! Eu sou a Charlotte, sua tutora. Em cinco minutos você vai falar sua primeira frase em inglês. Bora?`;
  return `Hi${name ? `, ${name}` : ''}! I'm Charlotte, your tutor. In five minutes you'll say your first sentence in English. Ready?`;
}

// Uma geração por nome (o cadastro começa, a tela de boas-vindas aproveita).
const pending = new Map<string, Promise<string | null>>();

/** Gera a fala com o nome e grava num arquivo local. Resolve com o caminho, ou null se falhar. */
export function prefetchWelcomeVoice(rawName: string | null | undefined): Promise<string | null> {
  const name = firstName(rawName);
  if (!name) return Promise.resolve(null);
  const key = `${systemIsPt ? 'pt' : 'en'}:${name}`;
  const hit = pending.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: welcomeLine(name), source: 'welcome' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.audio) return null;
      const ext = String(data.mimeType ?? '').includes('mpeg') ? 'mp3' : 'flac';
      const uri = `${FileSystem.cacheDirectory}welcome-voice.${ext}`;
      await FileSystem.writeAsStringAsync(uri, data.audio, { encoding: 'base64' as any });
      return uri;
    } catch { return null; }
  })();
  pending.set(key, p);
  return p;
}

// ── Marcas por conta neste aparelho ─────────────────────────────────────────────
// "first lesson pending": a abertura terminou; o aviso de IA leva direto à 1ª lição, e a lição mostra a
// dica de boas-vindas e a comemoração de primeira lição. Some quando a 1ª lição termina.
const firstLessonKey = (uid: string) => `welcome_first_lesson_${uid}`;
const rhythmKey = (uid: string) => `daily_rhythm_minutes_${uid}`;

export async function markFirstLessonPending(uid: string): Promise<void> {
  await SecureStore.setItemAsync(firstLessonKey(uid), '1').catch(() => {});
}
export async function isFirstLessonPending(uid: string): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(firstLessonKey(uid)).catch(() => null));
}
export async function clearFirstLessonPending(uid: string): Promise<void> {
  await SecureStore.deleteItemAsync(firstLessonKey(uid)).catch(() => {});
}

export async function saveRhythm(uid: string, minutes: number): Promise<void> {
  await SecureStore.setItemAsync(rhythmKey(uid), String(minutes)).catch(() => {});
}
export async function getRhythm(uid: string): Promise<number> {
  const v = Number(await SecureStore.getItemAsync(rhythmKey(uid)).catch(() => null));
  return RHYTHM_OPTIONS.some(o => o.minutes === v) ? v : DEFAULT_RHYTHM;
}

/** A 1ª lição: a Gramática do primeiro tópico da trilha do nível. */
export function firstLessonRoute(level: string | null | undefined) {
  const lvl = (level ?? 'Novice') as V2Level;
  const mod = listModules(lvl)[0] ?? listModules('Novice')[0];
  const unit = mod?.units[0];
  if (!mod || !unit) return null;
  return {
    pathname: '/(app)/learn-session' as const,
    params: { v: 'v2', level: lvl, moduleId: mod.id, unitId: unit.id, activity: 'grammar', first: '1' },
  };
}
