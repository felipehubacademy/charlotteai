// app/(app)/(tabs)/vocabulary.tsx
// Vocabulary tab — coleção do aluno (total + onda de domínio queizy → crazy +
// revisão do dia), palavra do dia, busca/filtros e lista. Ouvir a palavra:
// botão em cada linha, na palavra do dia e no detalhe (que também toca a frase
// de exemplo e tem "ouvir devagar"). Tocar numa linha abre o detalhe.

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, Modal, Pressable, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  MagnifyingGlass, Trash, Plus, SpeakerHigh,
  BookOpen, CheckCircle,
} from 'phosphor-react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { AppText } from '@/components/ui/Text';
import { HeaderLogo } from '@/components/ui/HeaderLogo';
import { MarkerText } from '@/components/ui/MarkerText';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { systemIsPt } from '@/lib/systemLang';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getTip, Tip } from '@/lib/tips';
import { localTodayStr } from '@/lib/dateUtils';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const C = {
  bg:       '#FAF7F0',
  card:     '#FFFFFF',
  navy:     '#16131F',
  navyMid:  '#4D4858',
  muted:    '#8A8494',
  border:   'rgba(22,19,31,0.10)',
  ghost:    'rgba(22,19,31,0.06)',
  greenDark:'#08804A',
  greenBg:  'rgba(8,128,74,0.08)',
  red:      '#D12A64',
  redBg:    'rgba(255,79,139,0.07)',
  gold:     '#D12A64',
  goldBg:   '#FFEEF4',
  inputBg:  '#EDE9E1',
  shadow:   'rgba(22,19,31,0.08)',
  hairline: 'rgba(22,19,31,0.06)',
  volt:     '#DCFF4A',
  pink:     '#D12A64',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: C.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 2 },
}) as object;

type VocabCategory = 'all' | 'word' | 'idiom' | 'phrasal_verb' | 'grammar';

interface VocabItem {
  id:                  string;
  term:                string;
  definition:          string;
  example:             string | null;
  example_translation: string | null;
  phonetic:            string | null;
  category:            string;
  source:              string;
  next_review_at:      string | null;
  repetitions:         number;
  created_at:          string;
}

const FILTERS: { key: VocabCategory; labelPt: string; labelEn: string }[] = [
  { key: 'all',          labelPt: 'Todas',      labelEn: 'All' },
  { key: 'word',         labelPt: 'Palavras',   labelEn: 'Words' },
  { key: 'idiom',        labelPt: 'Expressões', labelEn: 'Idioms' },
  { key: 'phrasal_verb', labelPt: 'Phrasals',   labelEn: 'Phrasals' },
];

function reviewLabel(nextReview: string | null, isPt: boolean): { label: string; color: string; bg: string } {
  if (!nextReview) return { label: isPt ? 'Nova' : 'New', color: C.greenDark, bg: C.greenBg };
  const diff = Math.ceil((new Date(nextReview).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return { label: isPt ? 'Revisar hoje' : 'Review today', color: C.red, bg: C.redBg };
  if (diff === 1) return { label: isPt ? 'Amanhã' : 'Tomorrow', color: C.gold, bg: C.goldBg };
  return { label: isPt ? `Em ${diff} dias` : `In ${diff} days`, color: C.muted, bg: C.inputBg };
}

export default function VocabularyTab() {
  const { profile, session } = useAuth();
  const level  = profile?.charlotte_level ?? 'Inter';
  const isPt   = systemIsPt; // chrome do vocabulário: idioma do device
  const userId = session?.user?.id;


  const [items,        setItems]        = useState<VocabItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [dueCount,     setDueCount]     = useState(0);
  const [filter,       setFilter]       = useState<VocabCategory>('all');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState<VocabItem | null>(null);
  const [playingKey,   setPlayingKey]   = useState<string | null>(null);
  const [ttsLoading,   setTtsLoading]   = useState<string | null>(null);
  const [tipAdded,     setTipAdded]     = useState(false);
  const [addingTip,    setAddingTip]    = useState(false);
  const [tipTtsLoading, setTipTtsLoading] = useState(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // Today's tip, seeded by local calendar day (not UTC — avoids day flip at 21h BRT)
  const dateSeed = useMemo(() => {
    const s = localTodayStr(); // YYYY-MM-DD in device timezone
    return s.split('-').reduce((acc, p) => acc * 100 + parseInt(p, 10), 0);
  }, []);
  const tip: Tip  = useMemo(() => getTip(level, dateSeed), [level, dateSeed]);

  const TIP_CATEGORY_MAP: Record<string, string> = {
    'word':         'word',
    'expression':   'idiom',
    'phrasal verb': 'phrasal_verb',
    'grammar':      'grammar',
    'idiom':        'idiom',
  };

  const openAdd = () => router.push({ pathname: '/(app)/add-word', params: { source: 'manual' } });

  const handleAddTip = useCallback(async () => {
    if (!userId || addingTip) return;
    setAddingTip(true);
    try {
      // Check if term already exists
      const { data: existing } = await supabase
        .from('user_vocabulary')
        .select('id')
        .eq('user_id', userId)
        .ilike('term', tip.term.trim())
        .maybeSingle();

      if (existing) {
        setTipAdded(true);
        Alert.alert(
          isPt ? 'Já no vocabulário' : 'Already in vocabulary',
          isPt ? `"${tip.term}" já está na sua lista.` : `"${tip.term}" is already in your list.`,
        );
        return;
      }

      // Busca fonética via enrich-term (best-effort — não bloqueia se falhar)
      let phonetic: string | null = null;
      try {
        const enrichRes = await fetch(`${API_BASE}/api/enrich-term?term=${encodeURIComponent(tip.term.trim())}`);
        if (enrichRes.ok) {
          const enrichData = await enrichRes.json();
          phonetic = enrichData?.data?.phonetic ?? null;
        }
      } catch { /* silencioso */ }

      const { error } = await supabase.from('user_vocabulary').insert({
        user_id:   userId,
        term:      tip.term.trim(),
        definition: isPt && tip.meaningPt ? tip.meaningPt : tip.meaning,
        example:   tip.example,
        example_translation: isPt && tip.examplePt ? tip.examplePt : null,
        phonetic,
        category:  TIP_CATEGORY_MAP[tip.type] ?? 'word',
        source:    'vocab_of_day',
      });

      if (error) throw error;
      setTipAdded(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh list
      const { data } = await supabase
        .from('user_vocabulary')
        .select('id, term, definition, example, example_translation, phonetic, category, source, next_review_at, repetitions, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setItems(data);
    } catch {
      Alert.alert(isPt ? 'Erro' : 'Error', isPt ? 'Não foi possível adicionar.' : 'Could not add word.');
    } finally {
      setAddingTip(false);
    }
  }, [userId, tip, addingTip, isPt]);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setTipAdded(false); // reset tip state on each focus
    setLoading(true);
    const [vocabRes, srRes] = await Promise.all([
      supabase
        .from('user_vocabulary')
        .select('id, term, definition, example, example_translation, phonetic, category, source, next_review_at, repetitions, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('next_review_at', new Date().toISOString()),
    ]);
    const loadedItems = vocabRes.data ?? [];
    if (!vocabRes.error) setItems(loadedItems);
    // Check if today's tip term already exists in vocab
    const alreadyAdded = loadedItems.some(
      i => i.term.toLowerCase() === tip.term.toLowerCase(),
    );
    setTipAdded(alreadyAdded);
    const due = srRes.count ?? 0;
    setDueCount(due);
    setLoading(false);
  }, [userId, tip]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Áudio único da tela: lista, palavra do dia e detalhe. `key` identifica o
  // que está tocando (para o botão ficar Volt enquanto toca).
  const playAudio = useCallback(async (key: string, text: string, slow = false) => {
    if (ttsLoading) return;
    setTtsLoading(key);
    try {
      const res = await fetch(`${API_BASE}/api/tts-cached?term=${encodeURIComponent(text.trim())}`);
      if (!res.ok) throw new Error('TTS fetch failed');
      const { url } = await res.json();
      await setAudioModeAsync({ playsInSilentMode: true });
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      if (slow) { try { player.playbackRate = 0.7; } catch { /* ignore */ } }
      setPlayingKey(key);
      player.addListener('playbackStatusUpdate', (st: any) => {
        if (st?.didJustFinish) setPlayingKey(k => (k === key ? null : k));
      });
      player.play();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setPlayingKey(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setTtsLoading(null);
    }
  }, [ttsLoading]);

  const handleTipTts = useCallback(() => playAudio('tip', tip.term), [playAudio, tip.term]);

  const handleDelete = useCallback((item: VocabItem) => {
    Alert.alert(
      isPt ? 'Remover palavra?' : 'Remove word?',
      isPt ? `"${item.term}" será removida da sua lista.` : `"${item.term}" will be removed from your list.`,
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Remover' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await supabase.from('user_vocabulary').delete().eq('id', item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
          },
        },
      ],
    );
  }, [isPt]);

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.category !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return i.term.toLowerCase().includes(q) || i.definition.toLowerCase().includes(q);
    }
    return true;
  });

  // Detalhe: o fundo escuro aparece em fade (Modal) e só o painel sobe.
  const sheetY = useRef(new Animated.Value(600)).current;
  React.useEffect(() => {
    if (selected) {
      sheetY.setValue(600);
      Animated.timing(sheetY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [selected, sheetY]);

  // Domínio: 5+ acertos seguidos na revisão espaçada = dominada.
  const MASTERED_AT = 5;
  const masteredCount = items.filter(i => (i.repetitions ?? 0) >= MASTERED_AT).length;
  const reviewMinutes = Math.max(1, Math.ceil((dueCount * 20) / 60));

  const SpeakerButton = ({ k, text, size = 34, slow = false }: { k: string; text: string; size?: number; slow?: boolean }) => {
    const active = playingKey === k || ttsLoading === k;
    return (
      <TouchableOpacity
        onPress={() => playAudio(k, text, slow)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={isPt ? 'Ouvir' : 'Listen'}
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: active ? C.volt : C.ghost,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {ttsLoading === k
          ? <ActivityIndicator size="small" color={C.navy} />
          : <SpeakerHigh size={Math.round(size * 0.5)} color={C.navy} weight="fill" />}
      </TouchableOpacity>
    );
  };

  const StrengthDots = ({ reps }: { reps: number }) => (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: MASTERED_AT }).map((_, i) => (
        <View key={i} style={{
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: i < Math.min(reps, MASTERED_AT) ? C.greenDark : 'rgba(22,19,31,0.12)',
        }} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, height: 52, gap: 12, // mesma altura do HeaderPills
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <AppText display style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Vocabulário' : 'Vocabulary'}
          </AppText>
          <HeaderLogo />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'ios' ? 112 : 92 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Sua coleção + revisão do dia ── */}
        <View style={{ backgroundColor: C.navy, borderRadius: 22, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: C.volt }}>
              {isPt ? 'SUA COLEÇÃO' : 'YOUR COLLECTION'}
            </AppText>
            <TouchableOpacity
              onPress={openAdd}
              accessibilityLabel={isPt ? 'Adicionar palavra' : 'Add word'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16,
                paddingHorizontal: 10, paddingVertical: 6,
              }}
            >
              <Plus size={14} color={C.volt} weight="bold" />
              <AppText style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                {isPt ? 'Adicionar' : 'Add'}
              </AppText>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 6 }}>
            <AppText display style={{ fontSize: 44, fontWeight: '800', color: '#FFFFFF', lineHeight: 46 }}>
              {items.length}
            </AppText>
            <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
              {isPt
                ? `${items.length === 1 ? 'palavra' : 'palavras'} · ${masteredCount} ${masteredCount === 1 ? 'dominada' : 'dominadas'}`
                : `${items.length === 1 ? 'word' : 'words'} · ${masteredCount} mastered`}
            </AppText>
          </View>
          <View style={{ marginTop: 12 }}>
            <QueizyWave
              progress={items.length > 0 ? masteredCount / items.length : 0}
              height={14} strokeWidth={4}
              doneColor="#2BD97C"
            />
          </View>

          <TouchableOpacity
            onPress={() => dueCount > 0 && router.push('/(app)/vocab-review')}
            activeOpacity={dueCount > 0 ? 0.85 : 1}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16,
              backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
              paddingVertical: 10, paddingHorizontal: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {dueCount > 0
                  ? (isPt
                      ? `${dueCount} ${dueCount === 1 ? 'palavra para revisar' : 'palavras para revisar'} hoje`
                      : `${dueCount} ${dueCount === 1 ? 'word' : 'words'} to review today`)
                  : (isPt ? 'Tudo revisado por hoje' : 'All caught up for today')}
              </AppText>
              <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                {dueCount > 0
                  ? `~${reviewMinutes} min`
                  : (isPt ? 'Volte amanhã para a próxima revisão.' : 'Come back tomorrow for the next review.')}
              </AppText>
            </View>
            {dueCount > 0 && (
              <View style={{ backgroundColor: C.volt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }}>
                <AppText style={{ fontSize: 13, fontWeight: '800', color: C.navy }}>
                  {isPt ? 'Revisar' : 'Review'}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Palavra do dia ── */}
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginTop: 14, ...cardShadow }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: C.muted }}>
                {isPt ? 'PALAVRA DO DIA' : 'WORD OF THE DAY'}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <View style={{ flexShrink: 1 }}>
                  <MarkerText display style={{ fontSize: 26, fontWeight: '800', color: C.navy, lineHeight: 32 }}>
                    {tip.term}
                  </MarkerText>
                </View>
                <SpeakerButton k="tip" text={tip.term} size={32} />
              </View>
            </View>
            <TouchableOpacity
              onPress={tipAdded ? undefined : handleAddTip}
              activeOpacity={tipAdded ? 1 : 0.8}
              accessibilityLabel={tipAdded ? (isPt ? 'Já está na coleção' : 'Already in your collection') : (isPt ? 'Adicionar à coleção' : 'Add to collection')}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: tipAdded ? C.greenBg : C.navy,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {addingTip
                ? <ActivityIndicator size="small" color={C.volt} />
                : tipAdded
                  ? <CheckCircle size={20} color={C.greenDark} weight="fill" />
                  : <Plus size={18} color={C.volt} weight="bold" />}
            </TouchableOpacity>
          </View>
          <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 20, marginTop: 6 }}>
            {isPt && tip.meaningPt ? tip.meaningPt : tip.meaning}
          </AppText>
          <AppText style={{ fontSize: 13, color: C.navy, fontStyle: 'italic', lineHeight: 19, marginTop: 8 }}>
            "{tip.example}"
          </AppText>
          {isPt && tip.examplePt && (
            <AppText style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 }}>
              {tip.examplePt}
            </AppText>
          )}
        </View>

        {/* ── Busca + filtros ── */}
        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 9 }}>
          <MagnifyingGlass size={16} color={C.muted} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder={isPt ? 'Buscar na coleção' : 'Search your collection'}
            placeholderTextColor={C.muted}
            style={{ flex: 1, fontSize: 14, color: C.navy }}
            returnKeyType="search"
          />
        </View>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          style={{ flexGrow: 0 }}
        >
          {FILTERS.map(f => {
            const sel = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
                  backgroundColor: sel ? C.navy : C.card,
                  borderWidth: 1, borderColor: sel ? C.navy : C.border,
                }}
              >
                <AppText style={{ fontSize: 13, fontWeight: '700', color: sel ? '#FFFFFF' : C.navyMid }}>
                  {isPt ? f.labelPt : f.labelEn}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Lista ── */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.navy} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
            <BookOpen size={40} color={C.muted} />
            <AppText display style={{ fontSize: 17, fontWeight: '800', color: C.navy, marginTop: 12, textAlign: 'center' }}>
              {items.length === 0
                ? (isPt ? 'Sua coleção começa aqui' : 'Your collection starts here')
                : (isPt ? 'Nenhum resultado' : 'No results')}
            </AppText>
            {items.length === 0 && (
              <AppText style={{ fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                {isPt
                  ? 'Salve palavras enquanto pratica, ou toque no + para adicionar.'
                  : 'Save words while you practice, or tap + to add one.'}
              </AppText>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', ...cardShadow }}>
            {filtered.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelected(item)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 16, paddingVertical: 13,
                  borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.hairline,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>{item.term}</AppText>
                  <AppText numberOfLines={1} style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{item.definition}</AppText>
                </View>
                <StrengthDots reps={item.repetitions ?? 0} />
                <SpeakerButton k={item.id} text={item.term} size={32} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Detalhe da palavra ── */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.35)', justifyContent: 'flex-end' }} onPress={() => setSelected(null)}>
          {selected && (
            <Animated.View style={{ transform: [{ translateY: sheetY }] }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{
              backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26,
              paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34,
            }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,19,31,0.15)', alignSelf: 'center', marginBottom: 18 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <AppText display style={{ flex: 1, fontSize: 30, fontWeight: '800', color: C.navy, lineHeight: 34 }}>
                  {selected.term}
                </AppText>
                <SpeakerButton k={`d-${selected.id}`} text={selected.term} size={46} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                {selected.phonetic && (
                  <AppText style={{ fontSize: 14, color: C.muted }}>{selected.phonetic}</AppText>
                )}
                <TouchableOpacity
                  onPress={() => playAudio(`slow-${selected.id}`, selected.term, true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: playingKey === `slow-${selected.id}` ? C.volt : C.ghost }}
                >
                  <SpeakerHigh size={13} color={C.navy} weight="fill" />
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navy }}>
                    {isPt ? 'Ouvir devagar' : 'Listen slowly'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Domínio */}
              <View style={{ marginTop: 18 }}>
                <QueizyWave progress={Math.min(selected.repetitions ?? 0, MASTERED_AT) / MASTERED_AT} height={14} strokeWidth={4} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: (selected.repetitions ?? 0) >= MASTERED_AT ? C.greenDark : C.pink }}>
                    {(selected.repetitions ?? 0) >= MASTERED_AT
                      ? (isPt ? 'Dominada' : 'Mastered')
                      : (isPt ? 'Aprendendo' : 'Learning')}
                  </AppText>
                  <AppText style={{ fontSize: 12, color: C.muted }}>
                    {reviewLabel(selected.next_review_at, isPt).label}
                  </AppText>
                </View>
              </View>

              <AppText style={{ fontSize: 16, color: C.navy, lineHeight: 23, marginTop: 18 }}>
                {selected.definition}
              </AppText>

              {selected.example && (
                <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 14, marginTop: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 14, color: C.navy, fontStyle: 'italic', lineHeight: 20 }}>
                      "{selected.example}"
                    </AppText>
                    {selected.example_translation && (
                      <AppText style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 17 }}>
                        {selected.example_translation}
                      </AppText>
                    )}
                  </View>
                  <SpeakerButton k={`ex-${selected.id}`} text={selected.example} size={32} />
                </View>
              )}

              <TouchableOpacity
                onPress={() => { const it = selected; setSelected(null); setTimeout(() => handleDelete(it), 250); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 22, paddingVertical: 6 }}
              >
                <Trash size={15} color={C.muted} />
                <AppText style={{ fontSize: 13, color: C.muted, fontWeight: '600' }}>
                  {isPt ? 'Remover da coleção' : 'Remove from collection'}
                </AppText>
              </TouchableOpacity>
            </Pressable>
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
