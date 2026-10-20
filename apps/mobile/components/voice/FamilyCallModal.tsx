// FamilyCallModal — ligação ao vivo com um membro da Família Queizy (lib/familyCall).
// Mesma estrutura e MESMAS FUNÇÕES da ligação da Charlotte (LiveVoiceModal); muda só a cor, que é a
// do personagem:
//   topo: tempo da ligação, nome, quem está falando / "Pode falar", minutos acabando (< 2 min);
//   centro: avatar com anel na voz do personagem, linha na voz do aluno, legenda da última fala
//     (tocar na fala do personagem traduz para o português);
//   botão de legenda (CC) lembrado por nível, como na Charlotte (Novice ligado, outros desligado);
//   inatividade: 45 s sem ninguém falar → "Ainda está aí? Pausando em Ns"; 75 s → pausa (a ligação
//     fecha e o tempo para); "Retomar" religa e o personagem segue o assunto de onde parou;
//   minutos do mês acabando: o personagem se despede antes de a ligação cair;
//   botões: microfone, desligar e alto-falante / fone do celular / fone de ouvido (segue a rota real).
// Áudio: mesmo roteiro da Charlotte — expo-audio em modo de gravação + CharlotteAudioSession antes de
// conectar, toque de chamada até o personagem atender, tudo desligado no fim. Os minutos saem da mesma
// cota do Live Voice. Microfone fechado durante a primeira fala do personagem (o eco dela no
// alto-falante virava uma "resposta" falsa do aluno).
// Aberta pela aba de ligação quando o membro escolhido na Família não é a Charlotte.
import React from 'react';
import { View, Modal, TouchableOpacity, Image, Animated, ActivityIndicator, useWindowDimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import CharlotteAudioSession from 'charlotte-audio-session';
import {
  PhoneSlash, MicrophoneSlash, Microphone, SpeakerHigh, Ear, Phone, ClosedCaptioning, Headphones, Pause,
  ArrowCounterClockwise,
} from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { LiveVoiceWave } from './LiveVoiceWave';
import { systemIsPt } from '@/lib/systemLang';
import { characterInfo, isImpressionReply, pickImpression, type ImpressionId } from '@/lib/characters';
import { router } from 'expo-router';
import { consumeLiveVoiceSeconds } from '@/lib/liveVoiceUsage';
import { requestFamilyCall, startFamilyConversation, familyCallStats, saveFamilyCall } from '@/lib/familyCall';
import { currentTopicTitle } from '@/lib/currentTopic';
import { visibleTracks } from '@/lib/tracks';
import { translationService } from '@/lib/translation-service';
import { useAuth } from '@/hooks/useAuth';
import { useCallLevels } from '@/lib/callLevels';
import { track } from '@/lib/analytics';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const PINK = '#FF4F8B';

// Inatividade (igual à Charlotte): 45 s → aviso; 75 s → pausa.
const INACTIVITY_WARN_SEC = 45;
const INACTIVITY_PAUSE_SEC = 75;
// Minutos acabando: o personagem é avisado para se despedir com esta folga.
const FAREWELL_LEAD_SEC = 20;
// Toque de chamada: soa no mínimo isto antes de conectar (no Android o microfone que a conversa
// abre ao conectar corta o toque; sem o mínimo, a ligação "atendia" sem tocar).
const MIN_RING_MS = 2500;

// Cores da ligação por personagem (a estrutura e as funções são as mesmas para todos).
// bg = fundo; ink = texto e ícones; sub = texto secundário; you = vez do aluno / linha da voz dele;
// chip = fundo dos selos e botões desligados; bubble = balão da fala do personagem; ring = anel do avatar.
const THEME: Record<string, { bg: string; ink: string; sub: string; you: string; chip: string; bubble: string; ring: string }> = {
  igorfina: { bg: VOLT, ink: INK, sub: 'rgba(22,19,31,0.65)', you: PINK, chip: 'rgba(22,19,31,0.08)', bubble: '#FFFFFF', ring: INK },
  default:  { bg: '#6B4BFF', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.75)', you: VOLT, chip: 'rgba(255,255,255,0.14)', bubble: '#FFFFFF', ring: '#FFFFFF' },
};
// Imitações: tag de voz do agente → selo na tela.
const IMPRESSION_BADGE: Record<string, { pt: string; en: string }> = {
  President: { pt: 'Presidente', en: 'President' },
  Hoops: { pt: 'Astro do basquete', en: 'Basketball star' },
};

type Status = 'calling' | 'connected' | 'reconnecting' | 'paused' | 'ended' | 'error';
type Line = { who: 'ai' | 'user'; text: string };

export function FamilyCallModal({ character, onClose }: { character: string | null; onClose: () => void }) {
  const isPt = systemIsPt;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  // Tela baixa (iPhone SE/8, Android pequeno): avatar e centro menores para os botões caberem.
  const compact = useWindowDimensions().height < 760;
  const AV = compact ? 104 : 120;
  const CENTER_H = compact ? 300 : 360;
  // Centro da foto dentro da área do meio. Tela baixa: foto no alto da área, para a legenda
  // (até 3 linhas + tradução) caber abaixo sem encostar nos botões.
  const AV_Y = compact ? AV / 2 + 6 : CENTER_H / 2;
  const info = characterInfo(character);
  const th = THEME[character ?? ''] ?? THEME.default;
  const level = (profile?.charlotte_level ?? 'Inter') as 'Novice' | 'Inter' | 'Advanced';

  const [attempt, setAttempt] = React.useState(0);
  const [status, setStatus] = React.useState<Status>('calling');
  const [mode, setMode] = React.useState<'speaking' | 'listening'>('listening');
  const [caption, setCaption] = React.useState<Line | null>(null);
  const [captions, setCaptions] = React.useState(level === 'Novice');
  const [translation, setTranslation] = React.useState<string | null>(null);
  const [translating, setTranslating] = React.useState(false);
  const [badge, setBadge] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [speaker, setSpeaker] = React.useState(true);
  const [onHeadphones, setOnHeadphones] = React.useState(false);
  const [secs, setSecs] = React.useState(0);
  const [warning, setWarning] = React.useState<number | null>(null); // segundos até pausar
  const [poolOut, setPoolOut] = React.useState(false);
  const [error, setError] = React.useState('');

  const convRef = React.useRef<any>(null);
  const segStartRef = React.useRef<number | null>(null);   // início do trecho atual (entre pausas)
  const firstStartRef = React.useRef<number | null>(null); // início da ligação (para o histórico)
  const usedRef = React.useRef(0);                         // segundos já gastos em trechos anteriores
  const limitRef = React.useRef(0);                        // segundos disponíveis no início do trecho
  const poolLeftRef = React.useRef(0);                     // segundos que sobram no mês depois do último trecho
  const closingRef = React.useRef(false);
  const mutedRef = React.useRef(false);
  const firstTurnRef = React.useRef(true); // microfone fechado até o fim da 1ª fala do personagem
  const transcriptRef = React.useRef<Line[]>([]); // conversa inteira (todos os trechos), para o histórico
  const resumeRef = React.useRef(false);   // o próximo "attempt" é retomada depois da pausa
  const lastActivityRef = React.useRef(Date.now());
  const farewellRef = React.useRef(false);
  const modeRef = React.useRef<'speaking' | 'listening'>('listening');
  const translationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Imitações no mesmo ritmo do Free Chat (lib/characters: isImpressionReply/pickImpression):
  // quando a próxima resposta é a vez de uma imitação, o app avisa o personagem antes dela.
  const lastUserTextRef = React.useRef('');
  const lastImpressionRef = React.useRef<ImpressionId | null>(null);
  const sessionKeyRef = React.useRef('');

  const levels = useCallLevels(status === 'connected', () => familyCallStats(convRef.current));
  const ring = React.useRef(new Animated.Value(0)).current;

  // Preferência de legenda: a mesma chave da ligação da Charlotte (por nível).
  React.useEffect(() => {
    SecureStore.getItemAsync(`live_captions_enabled_${level}`)
      .then(v => { if (v === '1') setCaptions(true); else if (v === '0') setCaptions(false); })
      .catch(() => {});
  }, [level]);
  const toggleCaptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCaptions(prev => {
      const next = !prev;
      SecureStore.setItemAsync(`live_captions_enabled_${level}`, next ? '1' : '0').catch(() => {});
      return next;
    });
  };

  // Rota de áudio real (fone Bluetooth / com fio, alto-falante, fone do celular), como na Charlotte.
  // iOS devolve a rota ativa ("Speaker", "Headphones", "BluetoothHFP"...). Android devolve a lista de
  // saídas conectadas ("speaker:...,earpiece:...,bt_sco:...") ou "uninitialized" antes da sessão:
  // lá o fone vem da lista e o alto-falante segue o que o aluno escolheu no botão.
  const syncRoute = React.useCallback(() => {
    try {
      const r = (CharlotteAudioSession.getCurrentRoute() || '').toLowerCase();
      if (!r || r === 'uninitialized') return;
      if (Platform.OS === 'android') {
        setOnHeadphones(/wired_head|bt_|usb/.test(r));
      } else {
        setOnHeadphones(r.includes('bluetooth') || r.includes('headphone'));
        setSpeaker(r.includes('speaker'));
      }
    } catch { /* noop */ }
  }, []);
  React.useEffect(() => {
    syncRoute();
    const sub = CharlotteAudioSession.addRouteChangeListener(syncRoute);
    return () => sub.remove();
  }, [syncRoute]);

  // Anel do avatar segue o volume de quem fala.
  React.useEffect(() => {
    if (status !== 'connected' || mode !== 'speaking') {
      Animated.timing(ring, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      return;
    }
    const iv = setInterval(() => {
      Animated.timing(ring, { toValue: Math.min(1, levels.remote.current), duration: 80, useNativeDriver: true }).start();
    }, 90);
    return () => clearInterval(iv);
  }, [status, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha o trecho atual (conta os segundos, desliga o áudio). Usado no fim e na pausa.
  const closeSegment = React.useCallback(async () => {
    CharlotteAudioSession.stopRingback().catch(() => {});
    try { await convRef.current?.endSession(); } catch {}
    convRef.current = null;
    CharlotteAudioSession.stop().catch(() => {});
    if (segStartRef.current) {
      const seg = Math.round((Date.now() - segStartRef.current) / 1000);
      segStartRef.current = null;
      if (seg > 0) { usedRef.current += seg; consumeLiveVoiceSeconds(seg).catch(() => {}); }
      poolLeftRef.current = Math.max(0, limitRef.current - seg);
    }
  }, []);

  const finish = React.useCallback(async (reason: string) => {
    if (closingRef.current) return;
    closingRef.current = true;
    await closeSegment();
    if (firstStartRef.current && transcriptRef.current.length) {
      saveFamilyCall({ character: character ?? '', startedAt: new Date(firstStartRef.current).toISOString(), durationSeconds: usedRef.current, lines: transcriptRef.current });
    }
    track('family_call_end', { character: character ?? '', seconds: usedRef.current, reason });
    setWarning(null);
    setStatus(s => (s === 'error' ? s : 'ended'));
  }, [character, closeSegment]);

  // Pausa por inatividade: fecha a ligação sem encerrar a conversa (o tempo para).
  const pause = React.useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await closeSegment();
    track('family_call_pause', { character: character ?? '' });
    setWarning(null);
    setStatus('paused');
  }, [character, closeSegment]);

  const setMic = (off: boolean) => { try { convRef.current?.setMicMuted(off); } catch {} };

  // Abre a ligação (de novo a cada "Ligar de novo" ou "Retomar").
  React.useEffect(() => {
    if (!character) return;
    let alive = true;
    const resuming = resumeRef.current;
    resumeRef.current = false;
    closingRef.current = false; firstTurnRef.current = true; segStartRef.current = null; farewellRef.current = false;
    if (!resuming) {
      firstStartRef.current = null; usedRef.current = 0; transcriptRef.current = [];
      lastUserTextRef.current = ''; lastImpressionRef.current = null; sessionKeyRef.current = `${character}-${Date.now()}`;
      setSecs(0); setPoolOut(false);
    }
    setStatus('calling'); setCaption(null); setTranslation(null); setBadge(null); setError(''); setMode('listening'); setWarning(null);
    // Cada conexão (nova ou "Retomar") começa com o microfone ligado, como na Charlotte.
    setMuted(false); mutedRef.current = false;
    modeRef.current = 'listening';
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) throw new Error('mic');
        await Promise.all([
          setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: true }).catch(() => {}),
          CharlotteAudioSession.start(true).catch(() => {}),
        ]);
        await CharlotteAudioSession.setSpeakerOn(true).catch(() => {});
        syncRoute();
        CharlotteAudioSession.playRingback().catch(() => {});
        const ringStartedAt = Date.now();
        // Contexto opcional: tópico atual da trilha do nível e da trilha do personagem (se o aluno estiver nela).
        const uid = profile?.id ?? '';
        const charTrack = visibleTracks(profile?.beta_features).find(t => t.character === character);
        const [topic, trackTopic] = await Promise.all([
          uid ? currentTopicTitle(uid, level) : Promise.resolve(null),
          uid && charTrack ? currentTopicTitle(uid, charTrack.id) : Promise.resolve(null),
        ]);
        const s = await requestFamilyCall(character, topic, trackTopic, resuming ? transcriptRef.current.slice(-8) : null);
        const ringLeft = MIN_RING_MS - (Date.now() - ringStartedAt);
        if (ringLeft > 0) await new Promise(r => setTimeout(r, ringLeft));
        if (!alive) return;
        limitRef.current = s.remainingSeconds;
        convRef.current = await startFamilyConversation(s, {
          onConnect: () => {
            setStatus('connected');
            segStartRef.current = Date.now();
            if (!firstStartRef.current) firstStartRef.current = segStartRef.current;
            lastActivityRef.current = Date.now();
            setMic(true); // abre só depois da primeira fala do personagem
            setTimeout(() => { if (firstTurnRef.current) { firstTurnRef.current = false; setMic(mutedRef.current); } }, 9000);
            track(resuming ? 'family_call_resume' : 'family_call_start', { character });
          },
          onDisconnect: () => { if (!closingRef.current) finish('remote'); },
          onStatusChange: st => {
            if (st === 'connecting' && segStartRef.current) setStatus('reconnecting');
            if (st === 'connected' && segStartRef.current) setStatus('connected');
          },
          onMessage: m => {
            if (!m.message) return;
            if (m.source === 'ai') {
              const tag = m.message.match(/<([A-Za-z]+)>/)?.[1];
              setBadge(tag && IMPRESSION_BADGE[tag] ? (isPt ? IMPRESSION_BADGE[tag].pt : IMPRESSION_BADGE[tag].en) : null);
            }
            const text = m.message.replace(/<\/?[A-Za-z]+>/g, '').trim();
            // "..." = transcrição provisória do aluno (ainda sem palavras): não vira legenda.
            if (!text || /^[.\s…]+$/.test(text)) return;
            // Atividade = fala do aluno (como na Charlotte). A fala do personagem não conta.
            if (m.source === 'user') lastActivityRef.current = Date.now();
            transcriptRef.current.push({ who: m.source, text });
            if (m.source === 'user') lastUserTextRef.current = text;
            if (m.source === 'ai') {
              // A abertura não conta como resposta: com N falas dele até aqui, a próxima é a resposta N.
              // Se ela é vez de imitação, avisa já (antes de o aluno terminar de falar).
              const upcoming = transcriptRef.current.filter(l => l.who === 'ai').length;
              if (!farewellRef.current && isImpressionReply(upcoming, sessionKeyRef.current)) {
                const imp = pickImpression(info, lastUserTextRef.current, lastImpressionRef.current);
                const t = imp === 'hoops' ? 'Hoops' : imp === 'president' ? 'President' : null;
                if (imp && t) {
                  lastImpressionRef.current = imp;
                  try {
                    convRef.current?.sendContextualUpdate(`IMPRESSION TIME: make your next reply your ${imp === 'hoops' ? 'basketball superstar' : 'president'} impression, the whole reply wrapped in <${t}>...</${t}>, still answering what the student says. Right after it, go back to your normal voice.`);
                  } catch { /* sem aviso, segue normal */ }
                }
              }
            }
            setTranslation(null);
            setCaption({ who: m.source, text });
          },
          onModeChange: md => {
            // Sem vibração na troca de vez (atrapalha com o celular na mão/ouvido), como na ligação da Charlotte.
            if (md === 'speaking') CharlotteAudioSession.stopRingback().catch(() => {});
            if (md === 'listening' && firstTurnRef.current) { firstTurnRef.current = false; setMic(mutedRef.current); lastActivityRef.current = Date.now(); }
            modeRef.current = md;
            setMode(md);
          },
          onError: msg => { console.warn('[family-call]', msg); },
        });
        if (!alive) { convRef.current?.endSession?.(); }
      } catch (e: any) {
        CharlotteAudioSession.stopRingback().catch(() => {});
        if (!alive) return;
        const code = String(e?.message ?? '');
        if (code === 'monthly_pool_exhausted') setPoolOut(true);
        setError(code === 'mic'
          ? (isPt ? 'Permita o microfone para ligar.' : 'Allow the microphone to call.')
          : code === 'monthly_pool_exhausted'
            ? (isPt ? 'Seus minutos de ligação deste mês acabaram.' : "You're out of call minutes this month.")
            : (isPt ? 'Não foi possível ligar agora. Tente de novo.' : "Couldn't connect right now. Try again."));
        setStatus('error');
        CharlotteAudioSession.stop().catch(() => {});
      }
    })();
    return () => { alive = false; };
  }, [character, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha tudo ao sair da tela.
  React.useEffect(() => () => { finish('unmount'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cronômetro, minutos do mês (despedida e fim) e inatividade.
  React.useEffect(() => {
    if (status !== 'connected' && status !== 'reconnecting') return;
    const iv = setInterval(() => {
      const seg = segStartRef.current ? Math.round((Date.now() - segStartRef.current) / 1000) : 0;
      setSecs(usedRef.current + seg);
      const left = limitRef.current - seg;
      // Minutos acabando: pede a despedida; a ligação cai quando ele termina de falar (ou no limite + 12 s).
      if (limitRef.current && left <= FAREWELL_LEAD_SEC && !farewellRef.current) {
        farewellRef.current = true;
        try {
          convRef.current?.sendContextualUpdate(`TIME IS UP: the student's call minutes for this month end in a few seconds. Right now, in your normal voice, say a warm, short goodbye (one or two short sentences) and tell them you'll talk again soon. Do not ask any question.`);
        } catch { /* sem aviso, cai no limite */ }
      }
      if (limitRef.current && left <= 0 && (modeRef.current !== 'speaking' || left <= -12)) { setPoolOut(true); finish('limit'); return; }
      // Inatividade: só a fala do aluno (transcrita) conta, como na Charlotte; ruído do ambiente e a
      // fala do personagem não seguram a ligação aberta. Enquanto ele fala, não avisa nem pausa.
      if (modeRef.current === 'speaking') { setWarning(null); return; }
      const idle = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      if (idle >= INACTIVITY_PAUSE_SEC) { pause(); return; }
      setWarning(idle >= INACTIVITY_WARN_SEC ? INACTIVITY_PAUSE_SEC - idle : null);
    }, 1000);
    return () => clearInterval(iv);
  }, [status, finish, pause]); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    resumeRef.current = true;
    setAttempt(a => a + 1);
  };

  // Tocar na fala do personagem: tradução para o português (some em 6 s ou na próxima fala).
  const translateCaption = async () => {
    if (!caption || caption.who !== 'ai' || translating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTranslating(true);
    try {
      const r = await translationService.translateToPortuguese(caption.text, 'live_voice', level);
      if (r.success) {
        setTranslation(r.translatedText);
        if (translationTimerRef.current) clearTimeout(translationTimerRef.current);
        translationTimerRef.current = setTimeout(() => setTranslation(null), 6000);
      }
    } catch { /* silencioso */ } finally { setTranslating(false); }
  };

  if (!character) return null;
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const live = status === 'connected' || status === 'reconnecting';
  const paused = status === 'paused';
  const yourTurn = status === 'connected' && mode === 'listening' && !firstTurnRef.current;
  const chip = status === 'calling' ? (isPt ? `Chamando ${info.name}…` : `Calling ${info.name}…`)
    : status === 'reconnecting' ? (isPt ? 'Conexão instável, reconectando…' : 'Unstable connection, reconnecting…')
    : mode === 'speaking' || firstTurnRef.current ? (isPt ? `${info.name} está falando` : `${info.name} is talking`)
    : muted ? (isPt ? 'Microfone desligado' : 'Mic off') : (isPt ? 'Pode falar' : 'Your turn');
  const segNow = segStartRef.current ? Math.round((Date.now() - segStartRef.current) / 1000) : 0;
  const leftSecs = Math.max(0, limitRef.current - segNow);
  const leftMins = Math.ceil(leftSecs / 60);
  const minutesLeftEnd = Math.floor(poolLeftRef.current / 60);
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });

  // Dentro do Modal o Android às vezes devolve 0 de margem do topo: garante a altura da barra de status.
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);

  const roundBtn = (on: boolean) => ({
    width: 62, height: 62, borderRadius: 31, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: on ? th.ink : th.chip,
  });

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => { finish('back'); onClose(); }}>
      <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: topInset, paddingBottom: insets.bottom }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: compact ? 14 : 24 }}>

          {/* Legenda liga/desliga (canto de cima, à direita) */}
          {(live || paused) && (
            <TouchableOpacity onPress={toggleCaptions} accessibilityRole="button"
              accessibilityLabel={captions ? (isPt ? 'Desligar legendas' : 'Hide captions') : (isPt ? 'Ligar legendas' : 'Show captions')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ position: 'absolute', top: 16, right: 20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 10,
                backgroundColor: captions ? th.ink : th.chip }}>
              <ClosedCaptioning size={20} color={captions ? th.bg : th.ink} weight={captions ? 'fill' : 'regular'} />
            </TouchableOpacity>
          )}

          {/* ── TOPO: tempo, nome, estado, minutos ── */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            {live && (
              <View style={{ backgroundColor: th.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8 }}>
                <AppText style={{ color: th.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1, ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : {}) }}>
                  {fmt(secs)}
                </AppText>
              </View>
            )}
            <AppText display style={{ color: th.ink, fontSize: 30, fontWeight: '800' }}>{info.name}</AppText>
            {(status === 'calling' || live) && (
              <View style={{ marginTop: 8, backgroundColor: yourTurn && !muted ? th.you : th.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                <AppText style={{ fontSize: 14, fontWeight: '700', color: yourTurn && !muted ? INK : th.ink }}>{chip}</AppText>
              </View>
            )}
            {paused && (
              <AppText style={{ color: th.ink, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginTop: 8 }}>
                {isPt ? 'Pausado por inatividade' : 'Paused — inactive'}
              </AppText>
            )}
            {live && badge && (
              <View style={{ marginTop: 8, backgroundColor: th.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                <AppText style={{ fontSize: 11, fontWeight: '800', color: th.bg, letterSpacing: 1, textTransform: 'uppercase' }}>{badge}</AppText>
              </View>
            )}
            {live && limitRef.current > 0 && leftSecs < 120 && (
              <AppText style={{ marginTop: 5, fontSize: 12, fontWeight: '700', color: th.ink }}>
                {isPt ? `${leftMins} min restante${leftMins !== 1 ? 's' : ''}` : `${leftMins} min left`}
              </AppText>
            )}
          </View>

          {/* ── CENTRO: avatar fixo + linha da voz do aluno + legenda ── */}
          <View style={{ alignItems: 'center', justifyContent: compact ? 'flex-start' : 'center', paddingTop: compact ? 6 : 0, width: '100%', height: CENTER_H }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {/* Anel: voz do personagem (volume real). A vez do aluno é a linha abaixo. */}
              <Animated.View pointerEvents="none" style={{ position: 'absolute', width: AV + 12, height: AV + 12, borderRadius: (AV + 12) / 2, backgroundColor: th.ring,
                opacity: live && mode === 'speaking' ? ringOpacity : 0, transform: [{ scale: ringScale }] }} />
              <View style={{ width: AV, height: AV, borderRadius: AV / 2, overflow: 'hidden', backgroundColor: INK, opacity: paused ? 0.6 : 1 }}>
                <Image source={info.avatar} style={{ width: '100%', height: '100%' }} />
              </View>
              {paused && (
                <View style={{ position: 'absolute', width: AV, height: AV, borderRadius: AV / 2, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' }}>
                  <Pause size={36} color={INK} weight="fill" />
                </View>
              )}
              {status === 'calling' && (
                <View style={{ position: 'absolute', bottom: -34 }}><ActivityIndicator color={th.ink} /></View>
              )}
            </View>

            {/* Linha: só a voz do aluno, na vez dele (retorno de que o microfone está ouvindo). */}
            {yourTurn && !muted && (
              <View pointerEvents="none" style={{ position: 'absolute', top: AV_Y + AV / 2 + 14, left: 0, right: 0, alignItems: 'center' }}>
                <LiveVoiceWave mode="user" userLevelRef={levels.local} color={th.you} width={240} height={36} />
              </View>
            )}

            {/* Legenda da última fala; tocar na do personagem traduz */}
            {live && captions && caption && (
              <TouchableOpacity onPress={translateCaption} activeOpacity={0.7} disabled={translating || caption.who === 'user'}
                style={{ position: 'absolute', top: AV_Y + AV / 2 + 58, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 4 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: th.chip, marginBottom: 6 }}>
                  <AppText style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1, color: th.ink }}>
                    {caption.who === 'user' ? (isPt ? 'VOCÊ' : 'YOU') : info.name.toUpperCase()}
                  </AppText>
                </View>
                <View style={{ backgroundColor: caption.who === 'user' ? INK : th.bubble, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%',
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
                  <AppText style={{ color: caption.who === 'user' ? '#FFFFFF' : INK, fontSize: 16, lineHeight: 22, fontWeight: '500', textAlign: 'center' }}
                    numberOfLines={3} ellipsizeMode="head">
                    {caption.text}
                  </AppText>
                </View>
                {translation && (
                  <AppText style={{ color: th.sub, fontSize: 14, lineHeight: 19, fontStyle: 'italic', textAlign: 'center', marginTop: 6, paddingHorizontal: 8 }} numberOfLines={2}>
                    {translation}
                  </AppText>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── BAIXO: pausa, fim ou controles ── */}
          {paused ? (
            <View style={{ alignItems: 'center', gap: 16, width: '100%' }}>
              <AppText style={{ color: th.sub, fontSize: 13, textAlign: 'center' }}>
                {isPt ? 'Chamada pausada. O tempo não correu enquanto esteve ausente.' : 'Call paused. Time stopped while you were away.'}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={resume}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: th.ink, borderRadius: 28, paddingHorizontal: 28, paddingVertical: 14 }}>
                  <ArrowCounterClockwise size={20} color={th.bg} weight="bold" />
                  <AppText style={{ color: th.bg, fontSize: 15, fontWeight: '800' }}>{isPt ? 'Retomar' : 'Resume'}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { closingRef.current = false; finish('paused_end'); }}
                  accessibilityLabel={isPt ? 'Encerrar chamada' : 'End call'}
                  style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,72,77,0.15)', borderWidth: 1, borderColor: 'rgba(229,72,77,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                  <PhoneSlash size={22} color="#E5484D" weight="regular" />
                </TouchableOpacity>
              </View>
            </View>
          ) : status === 'ended' || status === 'error' ? (
            <View style={{ gap: 10, width: '100%' }}>
              <View style={{ backgroundColor: th.chip, borderRadius: 20, padding: 16, marginBottom: 6, alignItems: 'center' }}>
                {status === 'ended' ? (
                  <>
                    <AppText style={{ fontSize: 15, fontWeight: '800', color: th.ink }}>{isPt ? `Vocês conversaram ${fmt(secs)}` : `You talked for ${fmt(secs)}`}</AppText>
                    <AppText style={{ fontSize: 13, color: th.sub, marginTop: 4, textAlign: 'center' }}>
                      {poolOut
                        ? (isPt ? 'Seus minutos de ligação deste mês acabaram.' : "You're out of call minutes this month.")
                        : (isPt ? `Restam ${minutesLeftEnd} min de ligação neste mês` : `${minutesLeftEnd} call minutes left this month`)}
                    </AppText>
                  </>
                ) : <AppText style={{ fontSize: 15, fontWeight: '700', color: th.ink, textAlign: 'center' }}>{error}</AppText>}
              </View>
              {!poolOut && (
                <TouchableOpacity onPress={() => setAttempt(a => a + 1)} activeOpacity={0.85}
                  style={{ backgroundColor: th.ink, borderRadius: 999, paddingVertical: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={18} color={th.bg} weight="fill" />
                  <AppText style={{ fontSize: 16, fontWeight: '800', color: th.bg }}>{status === 'error' ? (isPt ? 'Tentar novamente' : 'Try again') : (isPt ? 'Ligar de novo' : 'Call again')}</AppText>
                </TouchableOpacity>
              )}
              {status === 'ended' && transcriptRef.current.length > 0 && (
                <TouchableOpacity onPress={() => { onClose(); router.push({ pathname: '/(app)/(tabs)/livevoice', params: { history: '1' } } as any); }}
                  activeOpacity={0.85} style={{ borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: th.ink }}>
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: th.ink }}>{isPt ? 'Ver conversa e resumo' : 'See conversation and summary'}</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <AppText style={{ fontSize: 15, fontWeight: '700', color: th.ink }}>{isPt ? 'Fechar' : 'Close'}</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
              {/* Aviso de inatividade */}
              {warning != null && (
                <View style={{ backgroundColor: th.chip, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' }}>
                  <AppText style={{ color: th.ink, fontSize: 13, fontWeight: '700' }}>
                    {isPt ? `Ainda está aí? Pausando em ${warning}s` : `Still there? Pausing in ${warning}s`}
                  </AppText>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 26, alignItems: 'center' }}>
                <TouchableOpacity accessibilityRole="button"
                  accessibilityLabel={muted ? (isPt ? 'Ativar microfone' : 'Unmute microphone') : (isPt ? 'Silenciar microfone' : 'Mute microphone')}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); const n = !muted; setMuted(n); mutedRef.current = n; if (!firstTurnRef.current) setMic(n); lastActivityRef.current = Date.now(); }}
                  style={roundBtn(muted)}>
                  {muted ? <MicrophoneSlash size={26} color={th.bg} weight="fill" /> : <Microphone size={26} color={th.ink} weight="fill" />}
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={isPt ? 'Encerrar chamada' : 'End call'} onPress={() => finish('hangup')}
                  style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center' }}>
                  <PhoneSlash size={32} color="#FFFFFF" weight="fill" />
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  accessibilityLabel={onHeadphones
                    ? (isPt ? 'Áudio nos fones — tocar para alto-falante' : 'Audio on headphones — tap for speaker')
                    : speaker ? (isPt ? 'Usar fone de ouvido' : 'Switch to earpiece') : (isPt ? 'Usar alto-falante' : 'Switch to speaker')}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    const n = onHeadphones ? true : !speaker;
                    setSpeaker(n); CharlotteAudioSession.setSpeakerOn(n).catch(() => {});
                  }}
                  style={roundBtn(speaker && !onHeadphones)}>
                  {onHeadphones ? <Headphones size={26} color={th.ink} weight="fill" />
                    : speaker ? <SpeakerHigh size={26} color={th.bg} weight="fill" /> : <Ear size={26} color={th.ink} weight="fill" />}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
