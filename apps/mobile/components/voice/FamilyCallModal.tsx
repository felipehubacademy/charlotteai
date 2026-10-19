// FamilyCallModal — ligação ao vivo com um membro da Família Queizy (ElevenLabs Agents, lib/familyCall).
// Mesmo roteiro de áudio da ligação da Charlotte (LiveVoiceModal): expo-audio em modo de gravação +
// CharlotteAudioSession (sessão calibrada) antes do microfone, alto-falante reafirmado ao conectar e
// tudo desligado no fim. Os minutos saem da mesma cota do Live Voice.
// Protótipo: aparece só para contas com a liberação 'familia_call' (Família > Ligar).
import React from 'react';
import { View, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import CharlotteAudioSession from 'charlotte-audio-session';
import { PhoneSlash, MicrophoneSlash, Microphone, SpeakerHigh, Ear } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { LiveVoiceWave } from './LiveVoiceWave';
import { systemIsPt } from '@/lib/systemLang';
import { characterInfo } from '@/lib/characters';
import { consumeLiveVoiceSeconds } from '@/lib/liveVoiceUsage';
import { requestFamilyCall, startFamilyConversation } from '@/lib/familyCall';
import { track } from '@/lib/analytics';

const STAGE = '#16131F';
const VOLT = '#DCFF4A';

type Status = 'connecting' | 'connected' | 'ended' | 'error';

export function FamilyCallModal({ character, topic, onClose }: { character: string | null; topic?: string | null; onClose: () => void }) {
  const isPt = systemIsPt;
  const insets = useSafeAreaInsets();
  const info = characterInfo(character);
  const [status, setStatus] = React.useState<Status>('connecting');
  const [mode, setMode] = React.useState<'speaking' | 'listening'>('listening');
  const [caption, setCaption] = React.useState<{ who: 'ai' | 'user'; text: string } | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [speaker, setSpeaker] = React.useState(true);
  const [secs, setSecs] = React.useState(0);
  const [error, setError] = React.useState('');
  const convRef = React.useRef<any>(null);
  const startedAtRef = React.useRef<number | null>(null);
  const limitRef = React.useRef<number>(0);
  const closingRef = React.useRef(false);

  const finish = React.useCallback(async (reason: string) => {
    if (closingRef.current) return;
    closingRef.current = true;
    try { await convRef.current?.endSession(); } catch {}
    convRef.current = null;
    CharlotteAudioSession.stop().catch(() => {});
    const used = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
    if (used > 0) consumeLiveVoiceSeconds(used).catch(() => {});
    track('family_call_end', { character: character ?? '', seconds: used, reason });
    setStatus(s => (s === 'error' ? s : 'ended'));
  }, [character]);

  // Abre a ligação ao montar.
  React.useEffect(() => {
    if (!character) return;
    let alive = true;
    closingRef.current = false;
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) throw new Error('mic');
        await Promise.all([
          setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: true }).catch(() => {}),
          CharlotteAudioSession.start(true).catch(() => {}),
        ]);
        const s = await requestFamilyCall(character, topic);
        if (!alive) return;
        limitRef.current = s.remainingSeconds;
        convRef.current = await startFamilyConversation(s, {
          onConnect: () => {
            setStatus('connected');
            startedAtRef.current = Date.now();
            CharlotteAudioSession.setSpeakerOn(true).catch(() => {});
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            track('family_call_start', { character });
          },
          onDisconnect: () => { if (!closingRef.current) finish('remote'); },
          onMessage: m => { if (m.message) setCaption({ who: m.source, text: m.message.replace(/<\/?[A-Za-z]+>/g, '') }); },
          onModeChange: setMode,
          onError: msg => { console.warn('[family-call]', msg); },
        });
        if (!alive) { convRef.current?.endSession?.(); }
      } catch (e: any) {
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
  }, [character]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cronômetro e limite de minutos.
  React.useEffect(() => {
    if (status !== 'connected') return;
    const iv = setInterval(() => {
      const t = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
      setSecs(t);
      if (limitRef.current && t >= limitRef.current) finish('limit');
    }, 1000);
    return () => clearInterval(iv);
  }, [status, finish]);

  if (!character) return null;
  const mm = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const statusText = status === 'connecting' ? (isPt ? 'Chamando…' : 'Calling…')
    : status === 'ended' ? (isPt ? 'Ligação encerrada' : 'Call ended')
    : status === 'error' ? error
    : mode === 'speaking' ? (isPt ? `${info.name} está falando` : `${info.name} is talking`) : (isPt ? 'Sua vez' : 'Your turn');

  return (
    <Modal visible animationType="slide" onRequestClose={() => { finish('back'); onClose(); }}>
      <View style={{ flex: 1, backgroundColor: STAGE, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, alignItems: 'center' }}>
        <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {isPt ? 'Ligação' : 'Call'} · {status === 'connected' ? mm : 'Família Queizy'}
        </AppText>
        <AppText display style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 8 }}>{info.name}</AppText>
        <AppText style={{ color: status === 'error' ? '#FF8FB3' : 'rgba(255,255,255,0.75)', fontSize: 15, marginTop: 6, textAlign: 'center' }}>{statusText}</AppText>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
          <View style={{ width: 150, height: 150, borderRadius: 75, overflow: 'hidden', backgroundColor: '#000', borderWidth: 4, borderColor: mode === 'speaking' && status === 'connected' ? VOLT : 'transparent' }}>
            <Image source={info.avatar} style={{ width: '100%', height: '100%' }} />
          </View>
          <View style={{ marginTop: 26 }}>
            <LiveVoiceWave mode={status === 'connected' ? (mode === 'speaking' ? 'charlotte' : 'user') : 'connecting'} />
          </View>
          {status === 'connecting' && <ActivityIndicator color={VOLT} style={{ marginTop: 18 }} />}
          {!!caption && status === 'connected' && (
            <AppText style={{ color: caption.who === 'ai' ? '#FFFFFF' : 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 24 }} numberOfLines={4}>
              {caption.text}
            </AppText>
          )}
        </View>

        {status === 'connected' || status === 'connecting' ? (
          <View style={{ flexDirection: 'row', gap: 28, alignItems: 'center' }}>
            <TouchableOpacity accessibilityLabel={muted ? (isPt ? 'Ligar microfone' : 'Unmute') : (isPt ? 'Silenciar microfone' : 'Mute')}
              onPress={() => { const n = !muted; setMuted(n); try { convRef.current?.setMicMuted(n); } catch {} }}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: muted ? '#FFFFFF' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              {muted ? <MicrophoneSlash size={26} color={STAGE} weight="fill" /> : <Microphone size={26} color="#FFFFFF" weight="fill" />}
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={isPt ? 'Desligar' : 'Hang up'} onPress={() => { finish('hangup'); onClose(); }}
              style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneSlash size={32} color="#FFFFFF" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={speaker ? (isPt ? 'Usar o fone do celular' : 'Use earpiece') : (isPt ? 'Usar o alto-falante' : 'Use speaker')}
              onPress={() => { const n = !speaker; setSpeaker(n); CharlotteAudioSession.setSpeakerOn(n).catch(() => {}); }}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: speaker ? '#FFFFFF' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              {speaker ? <SpeakerHigh size={26} color={STAGE} weight="fill" /> : <Ear size={26} color="#FFFFFF" weight="fill" />}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'stretch', backgroundColor: VOLT, borderRadius: 999, paddingVertical: 16, alignItems: 'center' }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: STAGE }}>{isPt ? 'Fechar' : 'Close'}</AppText>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}
