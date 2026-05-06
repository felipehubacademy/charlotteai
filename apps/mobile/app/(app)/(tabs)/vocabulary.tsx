// app/(app)/(tabs)/vocabulary.tsx
// Vocabulary tab — Tip of the Day + review prompt modal + searchable word list.
// On focus: if words are due → modal "X words to review. Review now?"
//   "Revisar" → /(app)/vocab-review  |  "Ver lista" → dismiss modal, show list
// Word card: collapsed = term + /phonetic/ + speaker icon, tap → expand full details.

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  MagnifyingGlass, Trash, Plus, SpeakerHigh, SpeakerSlash,
  BookOpen, ClockCountdown, CheckCircle, CaretDown,
} from 'phosphor-react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getTip, TIP_STYLE, Tip } from '@/lib/tips';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const C = {
  bg:       '#F4F3FA',
  card:     '#FFFFFF',
  navy:     '#16153A',
  navyMid:  '#4B4A72',
  muted:    '#9896B8',
  border:   'rgba(22,21,58,0.10)',
  ghost:    'rgba(22,21,58,0.06)',
  greenDark:'#3D8800',
  greenBg:  'rgba(61,136,0,0.08)',
  red:      '#DC2626',
  redBg:    'rgba(220,38,38,0.07)',
  gold:     '#D97706',
  goldBg:   '#FFFBEB',
  inputBg:  '#ECEAF5',
  shadow:   'rgba(22,21,58,0.08)',
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
  { key: 'grammar',      labelPt: 'Gramática',  labelEn: 'Grammar' },
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
  const isPt   = level === 'Novice';
  const userId = session?.user?.id;

  const levelAccent = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';

  const [items,        setItems]        = useState<VocabItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [dueCount,     setDueCount]     = useState(0);
  const [filter,       setFilter]       = useState<VocabCategory>('all');
  const [search,       setSearch]       = useState('');
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [ttsLoading,   setTtsLoading]   = useState<string | null>(null);
  const [tipAdded,     setTipAdded]     = useState(false);
  const [addingTip,    setAddingTip]    = useState(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // Today's tip, seeded by calendar day
  const dateSeed = useMemo(() => Math.floor(Date.now() / 86400000), []);
  const tip: Tip  = useMemo(() => getTip(level, dateSeed), [level, dateSeed]);
  const tipStyle  = TIP_STYLE[tip.type] ?? { bg: '#F4F3FA', color: '#16153A' };

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

      const { error } = await supabase.from('user_vocabulary').insert({
        user_id:   userId,
        term:      tip.term.trim(),
        definition: isPt && tip.meaningPt ? tip.meaningPt : tip.meaning,
        example:   tip.example,
        example_translation: isPt && tip.examplePt ? tip.examplePt : null,
        category:  TIP_CATEGORY_MAP[tip.type] ?? 'word',
        source:    'tip_of_day',
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
    if (due > 0) setShowModal(true);
    setLoading(false);
  }, [userId, tip]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleTts = useCallback(async (item: VocabItem) => {
    if (ttsLoading) return;
    setTtsLoading(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/tts-cached?term=${encodeURIComponent(item.term.trim())}`);
      if (!res.ok) throw new Error('TTS fetch failed');
      const { url } = await res.json();
      await setAudioModeAsync({ playsInSilentMode: true });
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      player.play();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* silencioso */
    } finally {
      setTtsLoading(null);
    }
  }, [ttsLoading]);

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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Review prompt modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(22,21,58,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 340 }}>
            <View style={{
              width: 52, height: 52, borderRadius: 14,
              backgroundColor: `${levelAccent}18`,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <ClockCountdown size={28} color={levelAccent} weight="fill" />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 8 }}>
              {isPt
                ? `${dueCount} ${dueCount === 1 ? 'palavra para' : 'palavras para'} revisar`
                : `${dueCount} ${dueCount === 1 ? 'word' : 'words'} to review`}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 20, marginBottom: 24 }}>
              {isPt
                ? 'Revisar agora mantém as palavras na sua memória por mais tempo.'
                : 'Reviewing now keeps the words fresh in your long-term memory.'}
            </AppText>
            <TouchableOpacity
              onPress={() => { setShowModal(false); router.push('/(app)/vocab-review'); }}
              style={{ backgroundColor: levelAccent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}
            >
              <AppText style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                {isPt ? 'Revisar agora' : 'Review now'}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <AppText style={{ color: C.navyMid, fontSize: 14, fontWeight: '600' }}>
                {isPt ? 'Ver lista' : 'See list'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 14, gap: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <AppText style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Vocabulário' : 'Vocabulary'}
          </AppText>
          {dueCount > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(app)/vocab-review')}
              style={{
                backgroundColor: `${levelAccent}15`,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
            >
              <ClockCountdown size={14} color={levelAccent} weight="fill" />
              <AppText style={{ fontSize: 12, fontWeight: '700', color: levelAccent }}>
                {dueCount} {isPt ? 'para revisar' : 'to review'}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Tip of the Day */}
      <View style={{
        marginHorizontal: 16, marginTop: 14, marginBottom: 2,
        backgroundColor: tipStyle.bg,
        borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: `${tipStyle.color}25`,
        ...cardShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              backgroundColor: `${tipStyle.color}18`, borderRadius: 8,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <AppText style={{ fontSize: 10, fontWeight: '800', color: tipStyle.color, textTransform: 'capitalize', letterSpacing: 0.5 }}>
                {tip.type}
              </AppText>
            </View>
            <AppText style={{ fontSize: 10, fontWeight: '700', color: tipStyle.color, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {isPt ? 'Dica do dia' : 'Tip of the day'}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={tipAdded ? undefined : handleAddTip}
            activeOpacity={tipAdded ? 1 : 0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: tipAdded ? `${tipStyle.color}15` : tipStyle.color,
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
            }}
          >
            {addingTip ? (
              <ActivityIndicator size={12} color={tipAdded ? tipStyle.color : '#FFF'} />
            ) : tipAdded ? (
              <CheckCircle size={13} color={tipStyle.color} weight="fill" />
            ) : (
              <Plus size={13} color="#FFF" weight="bold" />
            )}
            <AppText style={{
              fontSize: 12, fontWeight: '700',
              color: tipAdded ? tipStyle.color : '#FFF',
            }}>
              {tipAdded
                ? (isPt ? 'Adicionada' : 'Added')
                : (isPt ? 'Add vocab' : 'Add vocab')}
            </AppText>
          </TouchableOpacity>
        </View>

        <AppText style={{ fontSize: 20, fontWeight: '900', color: '#16153A', marginBottom: 2 }}>
          {tip.term}
        </AppText>
        <AppText style={{ fontSize: 13, color: '#4B4A72', lineHeight: 19, marginBottom: 6 }}>
          {isPt && tip.meaningPt ? tip.meaningPt : tip.meaning}
        </AppText>
        <AppText style={{ fontSize: 12, color: tipStyle.color, fontStyle: 'italic', lineHeight: 18 }}>
          "{tip.example}"
        </AppText>
        {isPt && tip.examplePt && (
          <AppText style={{ fontSize: 11, color: '#9896B8', marginTop: 2, lineHeight: 16 }}>
            {tip.examplePt}
          </AppText>
        )}
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}>
          <MagnifyingGlass size={16} color={C.muted} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder={isPt ? 'Buscar palavra...' : 'Search word...'}
            placeholderTextColor={C.muted}
            style={{ flex: 1, fontSize: 14, color: C.navy }}
            returnKeyType="search"
          />
        </View>
        {items.length > 0 && (
          <AppText style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>
            {items.length} {isPt ? (items.length === 1 ? 'palavra' : 'palavras') : (items.length === 1 ? 'word' : 'words')}
          </AppText>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 2, alignItems: 'center' }}
        style={{ height: 44, marginBottom: 12, flexGrow: 0, flexShrink: 0 }}
      >
        {FILTERS.map((f, idx) => {
          const sel = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
                backgroundColor: sel ? C.navy : C.card,
                borderWidth: 1, borderColor: sel ? C.navy : C.border,
                marginRight: idx < FILTERS.length - 1 ? 8 : 0,
              }}
            >
              <AppText style={{ fontSize: 13, fontWeight: '600', color: sel ? '#FFFFFF' : C.navyMid }}>
                {isPt ? f.labelPt : f.labelEn}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.navy} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <BookOpen size={48} color={C.muted} />
          <AppText style={{ fontSize: 16, fontWeight: '700', color: C.navyMid, marginTop: 16, textAlign: 'center' }}>
            {items.length === 0
              ? (isPt ? 'Nenhuma palavra ainda' : 'No words yet')
              : (isPt ? 'Nenhum resultado' : 'No results')}
          </AppText>
          {items.length === 0 && (
            <AppText style={{ fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
              {isPt
                ? 'Adicione palavras enquanto aprende para criar seu dicionário pessoal.'
                : 'Add words as you learn to build your personal dictionary.'}
            </AppText>
          )}
          {items.length === 0 && (
            <TouchableOpacity
              onPress={openAdd}
              style={{ marginTop: 20, backgroundColor: C.navy, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} color="#FFFFFF" weight="bold" />
              <AppText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                {isPt ? 'Adicionar palavra' : 'Add word'}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 112 : 92, gap: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item) => {
            const isOpen = expanded === item.id;
            const rev    = reviewLabel(item.next_review_at, isPt);
            const isTtsLoading = ttsLoading === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setExpanded(isOpen ? null : item.id)}
                activeOpacity={0.78}
                style={{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', ...cardShadow }}
              >
                {/* Collapsed row — always visible */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
                  {/* Term + phonetic */}
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 16, fontWeight: '700', color: C.navy }}>{item.term}</AppText>
                    {item.phonetic && (
                      <AppText style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{item.phonetic}</AppText>
                    )}
                  </View>

                  {/* Review badge */}
                  <View style={{ backgroundColor: rev.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <AppText style={{ fontSize: 10, fontWeight: '700', color: rev.color }}>{rev.label}</AppText>
                  </View>

                  {/* Speaker icon */}
                  <TouchableOpacity
                    onPress={() => handleTts(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ opacity: isTtsLoading ? 0.5 : 1 }}
                  >
                    {isTtsLoading
                      ? <SpeakerSlash size={18} color={C.muted} weight="fill" />
                      : <SpeakerHigh size={18} color={levelAccent} weight="fill" />
                    }
                  </TouchableOpacity>

                  {/* Expand chevron */}
                  <CaretDown
                    size={16} color={C.muted} weight="bold"
                    style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                  />
                </View>

                {/* Expanded content */}
                {isOpen && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                    <View style={{ height: 8 }} />
                    <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 20 }}>
                      {item.definition}
                    </AppText>
                    {item.example && (
                      <View style={{ backgroundColor: C.ghost, borderRadius: 10, padding: 12 }}>
                        <AppText style={{ fontSize: 13, color: C.navyMid, fontStyle: 'italic', lineHeight: 19 }}>
                          "{item.example}"
                        </AppText>
                        {item.example_translation && (
                          <AppText style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                            {item.example_translation}
                          </AppText>
                        )}
                      </View>
                    )}
                    {/* Delete */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Trash size={14} color={C.muted} />
                        <AppText style={{ fontSize: 12, color: C.muted }}>
                          {isPt ? 'Remover' : 'Remove'}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB — Add word */}
      <TouchableOpacity
        onPress={openAdd}
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 96 : 76,
          right: 20,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: levelAccent,
          alignItems: 'center', justifyContent: 'center',
          ...cardShadow,
        }}
      >
        <Plus size={24} color="#FFFFFF" weight="bold" />
      </TouchableOpacity>
    </View>
  );
}
