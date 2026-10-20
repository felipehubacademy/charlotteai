// FamilyCallModal — ligação ao vivo com um membro da Família Queizy (ElevenLabs Agents, lib/familyCall).
// Áudio: mesmo roteiro da ligação da Charlotte (LiveVoiceModal) — expo-audio em modo de gravação +
// CharlotteAudioSession (sessão calibrada e alto-falante) ANTES de conectar, toque de chamada até o
// personagem atender e tudo desligado no fim. Os minutos saem da mesma cota do Live Voice.
// Microfone fechado durante a primeira fala do personagem: o eco dela no alto-falante virava uma
// "resposta" falsa do aluno no começo da ligação.
// Visual: cores do personagem, anel do avatar e onda seguindo o volume real das duas pontas
// (lib/callLevels), estados claros, legendas em balões, selo da imitação e resumo no fim.
// Aberta pela aba de ligação quando o membro escolhido na Família não é a Charlotte.
import React from 'react';
import { View, Modal, TouchableOpacity, Image, Animated, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import CharlotteAudioSession from 'charlotte-audio-session';
import { PhoneSlash, MicrophoneSlash, Microphone, SpeakerHigh, Ear, Phone, ClosedCaptioning } from 'phosphor-react-native';
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
import { useAuth } from '@/hooks/useAuth';
import { useCallLevels } from '@/lib/callLevels';
import { track } from '@/lib/analytics';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const PINK = '#FF4F8B';

// Cores da ligação por personagem.
const THEME: Record<string, { bg: string; ink: string; sub: string; you: string; chip: string; bubble: string }> = {
  igorfina: { bg: VOLT, ink: INK, sub: 'rgba(22,19,31,0.65)', you: PINK, chip: 'rgba(22,19,31,0.08)', bubble: '#FFFFFF' },
  default:  { bg: '#6B4BFF', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.75)', you: VOLT, chip: 'rgba(255,255,255,0.14)', bubble: 'rgba(255,255,255,0.14)' },
};
// Imitações: tag de voz do agente → selo na tela.
const IMPRESSION_BADGE: Record<string, { pt: string; en: string }> = {
  President: { pt: 'Presidente', en: 'President' },
  Hoops: { pt: 'Astro do basquete', en: 'Basketball star' },
};

type Status = 'calling' | 'connected' | 'reconnecting' | 'ended' | 'error';
type Line = { who: 'ai' | 'user'; text: string };

export function FamilyCallModal({ character, onClose }: { character: string | null; onClose: () => void }) {
  const isPt = systemIsPt;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  // Tela baixa (iPhone SE/8, Android pequeno): avatar e espaços menores para os botões caberem.
  const compact = useWindowDimensions().height < 760;
  const AV = compact ? 128 : 168;
  const info = characterInfo(character);
  const th = THEME[character ?? ''] ?? THEME.default;
  const [attempt, setAttempt] = React.useState(0);
  const [status, setStatus] = React.useState<Status>('calling');
  const [mode, setMode] = React.useState<'speaking' | 'listening'>('listening');
  const [lines, setLines] = React.useState<Line[]>([]);
  const [captions, setCaptions] = React.useState(true);
  const [badge, setBadge] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [speaker, setSpeaker] = React.useState(true);
  const [secs, setSecs] = React.useState(0);
  const [error, setError] = React.useState('');
  const convRef = React.useRef<any>(null);
  const startedAtRef = React.useRef<number | null>(null);
  const limitRef = React.useRef(0);
  const closingRef = React.useRef(false);
  const mutedRef = React.useRef(false);
  const firstTurnRef = React.useRef(true); // microfone fechado até o fim da 1ª fala do personagem
  const transcriptRef = React.useRef<Line[]>([]); // conversa inteira, para o histórico
  // Imitações no mesmo ritmo do Free Chat (lib/characters: isImpressionReply/pickImpression):
  // quando a próxima resposta é a vez de uma imitação, o app avisa o personagem antes dela.
  const lastUserTextRef = React.useRef('');
  const lastImpressionRef = React.useRef<ImpressionId | null>(null);
  const sessionKeyRef = React.useRef('');

  const levels = useCallLevels(status === 'connected', () => familyCallStats(convRef.current));
  const ring = React.useRef(new Animated.Value(0)).current;

  // Anel do avatar segue o volume de quem fala.
  React.useEffect(() => {
    if (status !== 'connected' || mode !== 'speaking') {
      Animated.timing(ring, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      return;
    }
    const iv = setInterval(() => {
      const v = levels.remote.current;
      Animated.timing(ring, { toValue: Math.min(1, v), duration: 80, useNativeDriver: true }).start();
    }, 90);
    return () => clearInterval(iv);
  }, [status, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = React.useCallback(async (reason: string) => {
    if (closingRef.current) return;
    closingRef.current = true;
    CharlotteAudioSession.stopRingback().catch(() => {});
    try { await convRef.current?.endSession(); } catch {}
    convRef.current = null;
    CharlotteAudioSession.stop().catch(() => {});
    const used = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
    if (used > 0) consumeLiveVoiceSeconds(used).catch(() => {});
    if (startedAtRef.current && transcriptRef.current.length) {
      saveFamilyCall({ character: character ?? '', startedAt: new Date(startedAtRef.current).toISOString(), durationSeconds: used, lines: transcriptRef.current });
    }
    track('family_call_end', { character: character ?? '', seconds: used, reason });
    setStatus(s => (s === 'error' ? s : 'ended'));
  }, [character]);

  const setMic = (off: boolean) => { try { convRef.current?.setMicMuted(off); } catch {} };

  // Abre a ligação (de novo a cada "Ligar de novo").
  React.useEffect(() => {
    if (!character) return;
    let alive = true;
    closingRef.current = false; firstTurnRef.current = true; startedAtRef.current = null; transcriptRef.current = [];
    lastUserTextRef.current = ''; lastImpressionRef.current = null; sessionKeyRef.current = `${character}-${Date.now()}`;
    setStatus('calling'); setLines([]); setBadge(null); setSecs(0); setError(''); setMode('listening');
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) throw new Error('mic');
        await Promise.all([
          setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: true }).catch(() => {}),
          CharlotteAudioSession.start(true).catch(() => {}),
        ]);
        await CharlotteAudioSession.setSpeakerOn(true).catch(() => {});
        CharlotteAudioSession.playRingback().catch(() => {});
        // Contexto opcional: tópico atual da trilha do nível e da trilha do personagem (se o aluno estiver nela).
        const uid = profile?.id ?? '';
        const lvl = (profile?.charlotte_level ?? 'Inter') as 'Novice' | 'Inter' | 'Advanced';
        const charTrack = visibleTracks(profile?.beta_features).find(t => t.character === character);
        const [topic, trackTopic] = await Promise.all([
          uid ? currentTopicTitle(uid, lvl) : Promise.resolve(null),
          uid && charTrack ? currentTopicTitle(uid, charTrack.id) : Promise.resolve(null),
        ]);
        const s = await requestFamilyCall(character, topic, trackTopic);
        if (!alive) return;
        limitRef.current = s.remainingSeconds;
        convRef.current = await startFamilyConversation(s, {
          onConnect: () => {
            setStatus('connected');
            startedAtRef.current = Date.now();
            setMic(true); // abre só depois da primeira fala do personagem
            setTimeout(() => { if (firstTurnRef.current) { firstTurnRef.current = false; setMic(mutedRef.current); } }, 9000);
            track('family_call_start', { character });
          },
          onDisconnect: () => { if (!closingRef.current) finish('remote'); },
          onStatusChange: st => {
            if (st === 'connecting' && startedAtRef.current) setStatus('reconnecting');
            if (st === 'connected' && startedAtRef.current) setStatus('connected');
          },
          onMessage: m => {
            if (!m.message) return;
            if (m.source === 'ai') {
              const tag = m.message.match(/<([A-Za-z]+)>/)?.[1];
              setBadge(tag && IMPRESSION_BADGE[tag] ? (isPt ? IMPRESSION_BADGE[tag].pt : IMPRESSION_BADGE[tag].en) : null);
            }
            const text = m.message.replace(/<\/?[A-Za-z]+>/g, '').trim();
            // "..." = transcrição provisória do aluno (ainda sem palavras): não vira balão.
            if (!text || /^[.\s…]+$/.test(text)) return;
            transcriptRef.current.push({ who: m.source, text });
            if (m.source === 'user') lastUserTextRef.current = text;
            if (m.source === 'ai') {
              // A abertura não conta como resposta: com N falas dele até aqui, a próxima é a resposta N.
              // Se ela é vez de imitação, avisa já (antes de o aluno terminar de falar).
              const upcoming = transcriptRef.current.filter(l => l.who === 'ai').length;
              if (isImpressionReply(upcoming, sessionKeyRef.current)) {
                const imp = pickImpression(info, lastUserTextRef.current, lastImpressionRef.current);
                const tag = imp === 'hoops' ? 'Hoops' : imp === 'president' ? 'President' : null;
                if (imp && tag) {
                  lastImpressionRef.current = imp;
                  try {
                    convRef.current?.sendContextualUpdate(`IMPRESSION TIME: make your next reply your ${imp === 'hoops' ? 'basketball superstar' : 'president'} impression, the whole reply wrapped in <${tag}>...</${tag}>, still answering what the student says. Right after it, go back to your normal voice.`);
                  } catch { /* sem aviso, segue normal */ }
                }
              }
            }
            setLines(prev => [...prev, { who: m.source, text }].slice(-2));
          },
          onModeChange: md => {
            // Sem vibração na troca de vez (atrapalha com o celular na mão/ouvido), como na ligação da Charlotte.
            if (md === 'speaking') CharlotteAudioSession.stopRingback().catch(() => {});
            if (md === 'listening' && firstTurnRef.current) { firstTurnRef.current = false; setMic(mutedRef.current); }
            setMode(md);
          },
          onError: msg => { console.warn('[family-call]', msg); },
        });
        if (!alive) { convRef.current?.endSession?.(); }
      } catch (e: any) {
        CharlotteAudioSession.stopRingback().catch(() => {});
        if (!alive) return;
        const code = String(e?.message ?? '');
        setError(code === 'mic'
          ? (isPt ? 'Permita o microfone para ligar.' : 'Allow the microphone to call.')
          : code === 'monthly_pool_exhausted'
            ? (isPt ? 'Seus minutos de ligação deste mês acabaram.' : "You're out of call minutes this month.")
            : (isPt ? 'Não foi possível ligar agora. Tente de novo.' : "Couldn't connect right now. Try again."));
        setStatus('error');
        CharlotteAudioSession.stop().catch(() => {});
      }
    })();
    return () => { alive = false; finish('unmount'); };
  }, [character, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cronômetro e limite de minutos.
  React.useEffect(() => {
    if (status !== 'connected' && status !== 'reconnecting') return;
    const iv = setInterval(() => {
      const t = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
      setSecs(t);
      if (limitRef.current && t >= limitRef.current) finish('limit');
    }, 1000);
    return () => clearInterval(iv);
  }, [status, finish]);

  if (!character) return null;
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const live = status === 'connected' || status === 'reconnecting';
  const yourTurn = status === 'connected' && mode === 'listening' && !firstTurnRef.current;
  const chip = status === 'calling' ? (isPt ? `Chamando ${info.name}…` : `Calling ${info.name}…`)
    : status === 'reconnecting' ? (isPt ? 'Conexão instável, reconectando…' : 'Unstable connection, reconnecting…')
    : status === 'ended' ? (isPt ? 'Ligação encerrada' : 'Call ended')
    : status === 'error' ? error
    : mode === 'speaking' || firstTurnRef.current ? (isPt ? `${info.name} está falando` : `${info.name} is talking`)
    : muted ? (isPt ? 'Microfone desligado' : 'Mic off') : (isPt ? 'Pode falar' : 'Your turn');
  const minutesLeft = Math.max(0, Math.floor((limitRef.current - secs) / 60));
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, compact ? 1.22 : 1.32] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });
  const ringColor = th.ink;

  const roundBtn = (on: boolean) => ({
    width: 62, height: 62, borderRadius: 31, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: on ? th.ink : th.chip,
  });

  return (
    <Modal visible animationType="slide" onRequestClose={() => { finish('back'); onClose(); }}>
      <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        {/* Topo: tempo e minutos */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: th.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: th.ink, letterSpacing: 0.5 }}>{live ? fmt(secs) : (isPt ? 'Ligação' : 'Call')}</AppText>
          </View>
          {live && (
            <TouchableOpacity onPress={() => setCaptions(c => !c)} accessibilityLabel={isPt ? 'Legendas' : 'Captions'}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: captions ? th.ink : th.chip }}>
              <ClosedCaptioning size={20} color={captions ? th.bg : th.ink} weight="fill" />
            </TouchableOpacity>
          )}
        </View>

        {/* Personagem */}
        <View style={{ alignItems: 'center', paddingTop: compact ? 8 : 28 }}>
          {badge && live ? (
            <View style={{ backgroundColor: th.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 }}>
              <AppText style={{ fontSize: 12, fontWeight: '800', color: th.bg, letterSpacing: 1, textTransform: 'uppercase' }}>{badge}</AppText>
            </View>
          ) : <View style={{ height: 38 }} />}
          <View style={{ width: AV + 32, height: AV + 32, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: AV + 8, height: AV + 8, borderRadius: (AV + 8) / 2, backgroundColor: ringColor, opacity: live && mode === 'speaking' ? ringOpacity : 0, transform: [{ scale: ringScale }] }} />
            <View style={{ width: AV, height: AV, borderRadius: AV / 2, overflow: 'hidden', backgroundColor: INK, borderWidth: 5, borderColor: th.ink }}>
              <Image source={info.avatar} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
          <AppText display style={{ fontSize: compact ? 26 : 32, fontWeight: '800', color: th.ink, marginTop: compact ? 10 : 18 }}>{info.name}</AppText>
          <View style={{ marginTop: 10, backgroundColor: yourTurn ? th.you : th.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: '700', color: yourTurn ? INK : th.ink }}>{chip}</AppText>
          </View>
          <View style={{ marginTop: compact ? 8 : 18, height: compact ? 32 : 44, justifyContent: 'center' }}>
            {/* Linha: só a voz do aluno, na vez dele (retorno de que o microfone está ouvindo).
                A voz do personagem aparece no anel do avatar. */}
            {status === 'calling' ? <ActivityIndicator color={th.ink} /> : yourTurn && !muted ? (
              <LiveVoiceWave mode="user" userLevelRef={levels.local} color={th.you} width={260} height={compact ? 32 : 44} />
            ) : null}
          </View>
        </View>

        {/* Legendas: as duas últimas falas */}
        {live && captions && lines.length > 0 && (
          <View style={{ gap: 8, marginTop: compact ? 8 : 14 }}>
            {lines.map((l, i) => (
              <View key={i} style={{ alignSelf: l.who === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '88%', backgroundColor: l.who === 'ai' ? th.bubble : th.ink, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, opacity: i === lines.length - 1 ? 1 : 0.6 }}>
                <AppText style={{ fontSize: 15, lineHeight: 20, color: l.who === 'ai' ? INK : th.bg }} numberOfLines={3}>{l.text}</AppText>
              </View>
            ))}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Fim: resumo */}
        {(status === 'ended' || status === 'error') && (
          <View style={{ backgroundColor: th.chip, borderRadius: 20, padding: 16, marginBottom: 16, alignItems: 'center' }}>
            {status === 'ended' ? (
              <>
                <AppText style={{ fontSize: 15, fontWeight: '800', color: th.ink }}>{isPt ? `Vocês conversaram ${fmt(secs)}` : `You talked for ${fmt(secs)}`}</AppText>
                <AppText style={{ fontSize: 13, color: th.sub, marginTop: 4 }}>{isPt ? `Restam ${minutesLeft} min de ligação neste mês` : `${minutesLeft} call minutes left this month`}</AppText>
              </>
            ) : <AppText style={{ fontSize: 15, fontWeight: '700', color: th.ink, textAlign: 'center' }}>{error}</AppText>}
          </View>
        )}

        {/* Controles */}
        {status === 'ended' || status === 'error' ? (
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={() => setAttempt(a => a + 1)} activeOpacity={0.85}
              style={{ backgroundColor: th.ink, borderRadius: 999, paddingVertical: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={18} color={th.bg} weight="fill" />
              <AppText style={{ fontSize: 16, fontWeight: '800', color: th.bg }}>{isPt ? 'Ligar de novo' : 'Call again'}</AppText>
            </TouchableOpacity>
            {status === 'ended' && transcriptRef.current.length > 0 && (
              <TouchableOpacity onPress={() => { onClose(); router.push({ pathname: '/(app)/(tabs)/livevoice', params: { history: '1' } } as any); }}
                activeOpacity={0.85}
                style={{ borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: th.ink }}>
                <AppText style={{ fontSize: 15, fontWeight: '800', color: th.ink }}>{isPt ? 'Ver conversa e resumo' : 'See conversation and summary'}</AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <AppText style={{ fontSize: 15, fontWeight: '700', color: th.ink }}>{isPt ? 'Fechar' : 'Close'}</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 26, alignItems: 'center' }}>
            <TouchableOpacity accessibilityLabel={muted ? (isPt ? 'Ligar microfone' : 'Unmute') : (isPt ? 'Silenciar microfone' : 'Mute')}
              onPress={() => { const n = !muted; setMuted(n); mutedRef.current = n; if (!firstTurnRef.current) setMic(n); }}
              style={roundBtn(muted)}>
              {muted ? <MicrophoneSlash size={26} color={th.bg} weight="fill" /> : <Microphone size={26} color={th.ink} weight="fill" />}
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={isPt ? 'Desligar' : 'Hang up'} onPress={() => finish('hangup')}
              style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneSlash size={32} color="#FFFFFF" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={speaker ? (isPt ? 'Usar o fone do celular' : 'Use earpiece') : (isPt ? 'Usar o alto-falante' : 'Use speaker')}
              onPress={() => { const n = !speaker; setSpeaker(n); CharlotteAudioSession.setSpeakerOn(n).catch(() => {}); }}
              style={roundBtn(speaker)}>
              {speaker ? <SpeakerHigh size={26} color={th.bg} weight="fill" /> : <Ear size={26} color={th.ink} weight="fill" />}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
