// Aula em vídeo de um tópico (fase de teste, chave beta `aula_motion`; ver lib/aulas.ts).
// O vídeo horizontal fica em cima. Nas pausas ele para, e a pergunta aparece logo abaixo: o aluno toca
// na resposta (ou fala, onde houver reconhecimento de voz), ouve a correção da Charlotte e a aula continua.
// Embaixo, a legenda da aula: tocar numa fala leva até ela. Não dá XP nem conta para o tópico.
//
// O conteúdo (perguntas, correções, falas) é pedagógico e fica como está; os textos da tela seguem o
// idioma do aparelho.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { ArrowLeft, Play, Pause, Microphone, CheckCircle, ArrowCounterClockwise } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { goBack } from '@/lib/goBack';
import { systemIsPt } from '@/lib/systemLang';
import { soundEngine } from '@/lib/soundEngine';
import { expandContractions } from '@/lib/grammarAnswer';
import { getAula, aulaUrl, type AulaCheckpoint } from '@/lib/aulas';

// Reconhecimento de voz no aparelho (mesmo módulo do Listening & Speaking). Sem ele, só toque.
const ASR_AVAILABLE = !!ExpoSpeechRecognitionModule?.start;

const K = {
  bg: '#16131F', card: '#221E2E', line: '#2E2940', text: '#FAF7F0', muted: '#A39EB3',
  volt: '#DCFF4A', pink: '#FF4F8B', green: '#2BD97C', greenText: '#8BF0B9', pinkText: '#FF9BBD',
};

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
const plain = (s: string) => s.replace(/[{}]/g, '');
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Texto com {inglês} destacado em Volt. */
function Marked({ text, size = 15, color = K.text, weight = '500' as const }: { text: string; size?: number; color?: string; weight?: '500' | '600' | '700' }) {
  const parts = text.split(/(\{[^}]*\})/g).filter(Boolean);
  return (
    <AppText style={{ fontSize: size, lineHeight: size * 1.35, color, fontWeight: weight }}>
      {parts.map((p, i) => p.startsWith('{')
        ? <AppText key={i} display style={{ fontSize: size, color: K.volt, fontWeight: '800' }}>{p.slice(1, -1)}</AppText>
        : p)}
    </AppText>
  );
}

type Result = { ok: boolean; heard?: string; chosen?: string };

export default function AulaScreen() {
  const insets = useSafeAreaInsets();
  const t = (pt: string, en: string) => (systemIsPt ? pt : en);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const aula = getAula(id ?? 'novice-01');

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [quiz, setQuiz] = useState<AulaCheckpoint | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [micMsg, setMicMsg] = useState('');
  const lastT = useRef(0);
  const quizRef = useRef<AulaCheckpoint | null>(null);
  quizRef.current = quiz;
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const fbPlayer = useRef<AudioPlayer | null>(null);
  const autoNext = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heardRef = useRef('');

  const player = useVideoPlayer(aula ? aulaUrl(aula, 'aula.mp4') : null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
  });

  // Para no ponto exato de cada pausa (uma vez por pergunta).
  useEffect(() => {
    if (!aula) return;
    const subs = [
      player.addListener('timeUpdate', ({ currentTime }) => {
        const tt = currentTime;
        if (!quizRef.current && player.playing) {
          const cp = aula.checkpoints.find(c => !resultsRef.current[c.id] && lastT.current < c.at && tt >= c.at - 0.12);
          if (cp) {
            player.pause();
            player.currentTime = cp.at;
            lastT.current = cp.at;
            setNow(cp.at);
            setQuiz(cp);
            setHeard(''); setMicMsg('');
            return;
          }
        }
        lastT.current = tt;
        setNow(tt);
      }),
      player.addListener('playingChange', ({ isPlaying }) => setPlaying(isPlaying)),
      player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay') setReady(true);
        if (status === 'error') setFailed(true);
      }),
      player.addListener('playToEnd', () => { setEnded(true); setPlaying(false); }),
    ];
    return () => subs.forEach(s => s.remove());
  }, [player, aula]);

  useEffect(() => () => {
    fbPlayer.current?.remove();
    if (autoNext.current) clearTimeout(autoNext.current);
    if (ASR_AVAILABLE) try { ExpoSpeechRecognitionModule.abort(); } catch { /* nada */ }
  }, []);

  const play = useCallback(() => {
    setStarted(true);
    if (ended) { setEnded(false); player.currentTime = 0; lastT.current = 0; setResults({}); }
    player.play();
  }, [player, ended]);

  const toggle = () => {
    if (quiz) return;
    if (!started || !playing) play(); else player.pause();
  };

  const seekTo = (s: number) => {
    if (quiz) return;
    player.currentTime = s;
    lastT.current = s;
    setNow(s);
    setEnded(false);
    setStarted(true);
    player.play();
  };

  // ---------- pergunta ----------
  const resume = useCallback(() => {
    if (autoNext.current) { clearTimeout(autoNext.current); autoNext.current = null; }
    fbPlayer.current?.pause();
    setQuiz(null);
    lastT.current = player.currentTime;
    player.play();
  }, [player]);

  const answer = useCallback(async (cp: AulaCheckpoint, ok: boolean, chosen?: string, said?: string) => {
    if (!aula || resultsRef.current[cp.id]) return;
    setResults(r => ({ ...r, [cp.id]: { ok, chosen, heard: said } }));
    soundEngine.play(ok ? 'answer_correct' : 'answer_wrong').catch(() => {});
    // Correção falada da Charlotte e, quando termina, a aula segue sozinha.
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
      fbPlayer.current?.remove();
      const p = createAudioPlayer(aulaUrl(aula, `audio/${(ok ? cp.feedback.ok : cp.feedback.no).id}.mp3`));
      fbPlayer.current = p;
      const sub = p.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) {
          sub.remove();
          autoNext.current = setTimeout(() => { if (quizRef.current?.id === cp.id) resume(); }, 900);
        }
      });
      setTimeout(() => p.play(), 350);
    } catch { /* sem áudio, o botão continua */ }
  }, [aula, resume]);

  // Fala: reconhecimento no aparelho, em inglês; para sozinho depois de uma pausa.
  useSpeechRecognitionEvent('result', (ev) => {
    const alts = (ev.results ?? []).map(r => r?.transcript).filter((s): s is string => !!s);
    if (alts.length) { heardRef.current = alts.join(' | '); setHeard(alts[0]); }
  });
  useSpeechRecognitionEvent('error', (ev) => {
    const code = (ev as { error?: string })?.error;
    if (code === 'not-allowed') setMicMsg(t('Sem permissão do microfone. Toque na resposta.', 'No microphone permission. Tap an answer.'));
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const cp = quizRef.current;
    if (!cp || resultsRef.current[cp.id]) return;
    const said = heardRef.current;
    if (!said) { setMicMsg(t('Não ouvi nada. Tente de novo ou toque na resposta.', "I didn't hear anything. Try again or tap an answer.")); return; }
    const forms = said.split(' | ').flatMap(s => [norm(s), norm(expandContractions(s))]);
    const ok = cp.speak.some(p => forms.some(f => f.includes(norm(p)) || f.includes(norm(expandContractions(p)))));
    answer(cp, ok, undefined, said.split(' | ')[0]);
  });

  const listen = async () => {
    if (!ASR_AVAILABLE || !quiz) return;
    if (listening) { try { ExpoSpeechRecognitionModule.stop(); } catch { /* nada */ } return; }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) { setMicMsg(t('Sem permissão do microfone. Toque na resposta.', 'No microphone permission. Tap an answer.')); return; }
    heardRef.current = ''; setHeard(''); setMicMsg('');
    try {
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, maxAlternatives: 3, continuous: false });
      setListening(true);
    } catch {
      setMicMsg(t('Não deu para ouvir. Toque na resposta.', "Couldn't listen. Tap an answer."));
    }
  };

  // ---------- legenda ----------
  const cueNow = useMemo(() => {
    if (!aula) return null;
    let cur: string | null = null;
    for (const c of aula.cues) if (now >= c.start - 0.05) cur = c.id;
    const c = aula.cues.find(x => x.id === cur);
    return c && now <= c.end + 0.6 ? c.id : null;
  }, [aula, now]);
  const scrollRef = useRef<ScrollView>(null);
  const cueY = useRef<Record<string, number>>({});
  const listTop = useRef(0);
  useEffect(() => {
    if (!cueNow || !playing) return;
    const y = cueY.current[cueNow];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, listTop.current + y - 260), animated: true });
  }, [cueNow, playing]);

  if (!aula) {
    return (
      <View style={{ flex: 1, backgroundColor: K.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AppText style={{ color: K.text, fontSize: 16 }}>{t('Aula não encontrada.', 'Lesson not found.')}</AppText>
      </View>
    );
  }

  const W = Dimensions.get('window').width;
  const videoH = Math.round((W * 9) / 16);
  const done = aula.checkpoints.filter(c => results[c.id]);
  const right = done.filter(c => results[c.id].ok).length;
  const res = quiz ? results[quiz.id] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: K.bg }}>
      {/* Cabeçalho */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Voltar', 'Back')}>
          <ArrowLeft size={22} color={K.text} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={{ fontSize: 11, fontWeight: '700', color: K.volt, letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('Aula em vídeo', 'Video lesson')} · {aula.level} {aula.unitId}
          </AppText>
          <AppText display numberOfLines={1} style={{ fontSize: 20, fontWeight: '800', color: K.text }}>{aula.title}</AppText>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: K.card }}>
          <AppText style={{ fontSize: 10.5, fontWeight: '800', color: K.muted, letterSpacing: 0.6 }}>BETA</AppText>
        </View>
      </View>

      {/* Vídeo */}
      <View style={{ width: W, height: videoH, backgroundColor: '#000' }}>
        <VideoView player={player} style={{ width: W, height: videoH }} contentFit="contain" nativeControls={false}
          allowsFullscreen={false} allowsPictureInPicture={false} />
        {!started && (
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
            <Image source={{ uri: aulaUrl(aula, 'poster.jpg') }} style={{ position: 'absolute', width: W, height: videoH }} contentFit="cover" />
            <View style={{ position: 'absolute', width: W, height: videoH, backgroundColor: 'rgba(22,19,31,0.35)' }} />
            {failed ? (
              <AppText style={{ color: K.text, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 }}>
                {t('Não deu para carregar a aula. Confira a internet e tente de novo.', "Couldn't load the lesson. Check your connection and try again.")}
              </AppText>
            ) : (
              <TouchableOpacity onPress={play} activeOpacity={0.85} accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999, backgroundColor: K.volt }}>
                {ready ? <Play size={18} color={K.bg} weight="fill" /> : <ActivityIndicator color={K.bg} />}
                <AppText display style={{ fontSize: 17, fontWeight: '800', color: K.bg }}>{t('Começar a aula', 'Start the lesson')}</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}
        {started && !quiz && (
          <TouchableOpacity onPress={toggle} activeOpacity={1} style={StyleSheet.absoluteFillObject}
            accessibilityRole="button" accessibilityLabel={playing ? t('Pausar', 'Pause') : t('Continuar', 'Play')}>
            {!playing && !ended && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,19,31,0.25)' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: K.volt, alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={26} color={K.bg} weight="fill" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Barra: tocar/pausar, progresso com as pausas marcadas, tempo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={toggle} disabled={!!quiz} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: K.card, alignItems: 'center', justifyContent: 'center', opacity: quiz ? 0.4 : 1 }}>
          {playing ? <Pause size={16} color={K.text} weight="fill" /> : <Play size={16} color={K.text} weight="fill" />}
        </TouchableOpacity>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: K.line, justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: K.volt, width: `${Math.min(100, (now / aula.duration) * 100)}%` }} />
          {aula.checkpoints.map(c => (
            <View key={c.id} style={{
              position: 'absolute', left: `${(c.at / aula.duration) * 100}%`, marginLeft: -7, width: 14, height: 14, borderRadius: 7,
              backgroundColor: results[c.id] ? K.green : K.bg, borderWidth: 3, borderColor: results[c.id] ? K.green : K.pink,
            }} />
          ))}
        </View>
        <AppText style={{ fontSize: 12.5, color: K.muted, fontVariant: ['tabular-nums'] }}>{fmt(now)}</AppText>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        {/* Pergunta da pausa */}
        {quiz && (
          <View style={{ padding: 16, borderRadius: 20, backgroundColor: K.card, borderWidth: 2, borderColor: K.line, gap: 12 }}>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: K.pink }}>
              <AppText style={{ fontSize: 11.5, fontWeight: '800', color: '#fff', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                {quiz.mode === 'speak' ? t('Sua vez · fale', 'Your turn · speak') : t('Sua vez', 'Your turn')}
              </AppText>
            </View>
            <AppText style={{ fontSize: 17, fontWeight: '700', color: K.text, lineHeight: 23 }}>{quiz.question}</AppText>

            {ASR_AVAILABLE && !res && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={listen} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('Falar a resposta', 'Speak your answer')}
                  style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: listening ? K.pink : K.volt }}>
                  <Microphone size={24} color={K.bg} weight="fill" />
                </TouchableOpacity>
                <AppText style={{ flex: 1, fontSize: 14, color: heard ? K.text : K.muted, fontStyle: heard ? 'italic' : 'normal' }}>
                  {heard || micMsg || (listening ? t('Ouvindo…', 'Listening…')
                    : quiz.mode === 'speak' ? t('Toque e fale em inglês. Ou toque numa resposta.', 'Tap and speak in English. Or tap an answer.')
                    : t('Toque numa resposta ou fale.', 'Tap an answer or speak.'))}
                </AppText>
              </View>
            )}

            <View style={{ gap: 8 }}>
              {quiz.options.map((o, i) => {
                const isRight = !!res && o === quiz.answer;
                const isWrong = !!res && o === res.chosen && !res.ok;
                return (
                  <TouchableOpacity key={o} disabled={!!res || listening} activeOpacity={0.8}
                    onPress={() => answer(quiz, o === quiz.answer, o)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
                      backgroundColor: isRight ? K.green : K.bg, borderWidth: 2, borderColor: isRight ? K.green : isWrong ? K.pink : K.line,
                    }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: isRight ? K.bg : K.line }}>
                      {isRight ? <CheckCircle size={18} color={K.green} weight="fill" />
                        : <AppText style={{ fontSize: 12, fontWeight: '800', color: K.text }}>{'ABC'[i]}</AppText>}
                    </View>
                    <AppText display style={{ fontSize: 17, fontWeight: '700', color: isRight ? K.bg : isWrong ? K.pink : K.text }}>{o}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {res && (
              <>
                <View style={{ padding: 12, borderRadius: 14, backgroundColor: res.ok ? 'rgba(43,217,124,0.16)' : 'rgba(255,79,139,0.16)' }}>
                  {res.heard ? (
                    <AppText style={{ fontSize: 13, color: K.muted, marginBottom: 4 }}>{t('Você disse', 'You said')}: “{res.heard}”</AppText>
                  ) : null}
                  <Marked text={(res.ok ? quiz.feedback.ok : quiz.feedback.no).text} size={15} weight="600"
                    color={res.ok ? K.greenText : K.pinkText} />
                </View>
                <TouchableOpacity onPress={resume} activeOpacity={0.85}
                  style={{ paddingVertical: 14, borderRadius: 14, backgroundColor: K.volt, alignItems: 'center' }}>
                  <AppText display style={{ fontSize: 16, fontWeight: '800', color: K.bg }}>{t('Continuar a aula', 'Continue the lesson')}</AppText>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Fim da aula */}
        {ended && (
          <View style={{ padding: 16, borderRadius: 20, backgroundColor: K.volt, gap: 10 }}>
            <AppText display style={{ fontSize: 20, fontWeight: '800', color: K.bg }}>{t('Aula concluída!', 'Lesson complete!')}</AppText>
            <AppText style={{ fontSize: 14, color: K.bg }}>
              {t(`Você acertou ${right} de ${aula.checkpoints.length} perguntas. Agora pratique o tópico na trilha.`,
                 `You got ${right} of ${aula.checkpoints.length} questions right. Now practice the topic on the trail.`)}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => goBack()} activeOpacity={0.85}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: K.bg, alignItems: 'center' }}>
                <AppText display style={{ fontSize: 15, fontWeight: '800', color: K.volt }}>{t('Praticar agora', 'Practice now')}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={play} activeOpacity={0.85} accessibilityLabel={t('Ver de novo', 'Watch again')}
                style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, borderWidth: 2, borderColor: K.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ArrowCounterClockwise size={18} color={K.bg} weight="bold" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Legenda da aula */}
        <View onLayout={e => { listTop.current = e.nativeEvent.layout.y; }}>
          <AppText style={{ fontSize: 12, fontWeight: '800', color: K.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 }}>
            {t('Legenda da aula', 'Lesson transcript')}
          </AppText>
          {aula.cues.map(c => {
            const on = c.id === cueNow;
            return (
              <TouchableOpacity key={c.id} onPress={() => seekTo(c.start + 0.01)} disabled={!!quiz} activeOpacity={0.7}
                onLayout={e => { cueY.current[c.id] = e.nativeEvent.layout.y; }}
                style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: on ? K.card : 'transparent' }}>
                <AppText style={{ width: 70, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', color: on ? K.volt : K.muted, paddingTop: 3 }}>
                  {aula.speakers[c.speaker] ?? c.speaker}
                </AppText>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {c.lang === 'en' ? (
                    <>
                      <AppText display style={{ fontSize: 16, fontWeight: '700', color: K.text }}>{plain(c.text)}</AppText>
                      {c.pt ? <AppText style={{ fontSize: 13, color: K.muted, marginTop: 2 }}>{c.pt}</AppText> : null}
                    </>
                  ) : (
                    <Marked text={c.text} size={15} color={on ? K.text : K.muted} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {done.length > 0 && !ended && (
          <AppText style={{ fontSize: 13, color: K.muted }}>
            {t(`Perguntas: ${right} de ${done.length} certas`, `Questions: ${right} of ${done.length} right`)}
          </AppText>
        )}
        {Platform.OS === 'android' ? <View style={{ height: 8 }} /> : null}
      </ScrollView>
    </View>
  );
}
