// lib/familyCall.ts — ligação ao vivo com a Família Queizy (ElevenLabs Agents, servidor em
// apps/web/lib/family-call.ts e /api/family-call/session).
//
// Sem módulo nativo novo: o cliente do ElevenLabs (@elevenlabs/client) e o do LiveKit são JS e
// precisam só de um WebRTC; usamos o react-native-webrtc que a ligação da Charlotte já usa, sem
// trocar nada no áudio dela. O SDK oficial para RN (@elevenlabs/react-native) traria o WebRTC do
// LiveKit, que muda o processamento de áudio do app inteiro; por isso não é usado.
// Tudo aqui só roda quando o aluno liga para alguém da Família, nunca ao abrir o app.
import { PixelRatio, Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

let globalsReady = false;
/** Globais que o cliente do LiveKit espera (o mesmo que o registerGlobals do @livekit/react-native faz). */
function ensureGlobals() {
  if (globalsReady) return;
  globalsReady = true;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('fast-text-encoding');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-webrtc').registerGlobals(); // RTCPeerConnection, mediaDevices etc. do react-native-webrtc
  const g = global as any;
  g.LiveKitReactNativeGlobal = { platform: Platform.OS, devicePixelRatio: PixelRatio.get() };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-url-polyfill').setupURLPolyfill();
  if (g.navigator && g.navigator.userAgent === undefined) g.navigator.userAgent = g.navigator.product ?? 'Unknown';
  if (!g.crypto) g.crypto = {};
  if (!g.crypto.randomUUID) {
    g.crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch: string) => {
      const r = (Math.random() * 16) | 0;
      return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  if (typeof g.ReadableStream === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ws = require('web-streams-polyfill');
    g.ReadableStream = ws.ReadableStream; g.WritableStream = ws.WritableStream;
    g.TransformStream = ws.TransformStream; g.CountQueuingStrategy = ws.CountQueuingStrategy;
  }
}

let strategyReady = false;
/** Estratégia de sessão do cliente do ElevenLabs no RN: só a conexão WebRTC; o áudio toca direto no WebRTC. */
function ensureStrategy() {
  if (strategyReady) return;
  strategyReady = true;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const internal = require('@elevenlabs/client/internal');
  internal.setSetupStrategy(async (options: any) => {
    const connection = await internal.createConnection({ ...options, connectionType: 'webrtc' });
    return internal.setupWebRTCSession(connection);
  });
}

export interface FamilyCallStart {
  token: string; agentId: string; prompt: string; firstMessage: string;
  characterName: string; remainingSeconds: number;
}

/** Pede ao servidor a ligação (confere minutos e a liberação) — erro 'monthly_pool_exhausted' / 'not_available'. */
export async function requestFamilyCall(character: string, topic?: string | null): Promise<FamilyCallStart> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_signed_in');
  const r = await fetch(`${API_BASE_URL}/api/family-call/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ character, topic }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'failed');
  return j as FamilyCallStart;
}

export interface FamilyCallHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onMessage?: (m: { source: 'ai' | 'user'; message: string }) => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
  onError?: (msg: string) => void;
}

/** Abre a conversa com o agente. Devolve a conversa (endSession, setMicMuted). */
export async function startFamilyConversation(s: FamilyCallStart, h: FamilyCallHandlers) {
  ensureGlobals();
  ensureStrategy();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Conversation } = require('@elevenlabs/client');
  return Conversation.startSession({
    conversationToken: s.token,
    connectionType: 'webrtc',
    overrides: { agent: { prompt: { prompt: s.prompt }, firstMessage: s.firstMessage, language: 'en' } },
    onConnect: () => h.onConnect?.(),
    onDisconnect: (d: any) => h.onDisconnect?.(d?.reason),
    onMessage: (m: any) => h.onMessage?.({ source: m.source === 'ai' ? 'ai' : 'user', message: String(m.message ?? '') }),
    onModeChange: (m: any) => h.onModeChange?.(m?.mode === 'speaking' ? 'speaking' : 'listening'),
    onError: (msg: any) => h.onError?.(String(msg)),
  });
}
