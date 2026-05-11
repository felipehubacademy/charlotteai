/**
 * app/(app)/my-vocabulary.tsx
 * Lista de vocabulário salvo pelo usuário.
 * Header: back + título + botão review (quando há devidas)
 * Search + filter chips + lista
 * FAB: adicionar palavra
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft, MagnifyingGlass, Trash, Plus,
  BookOpen, ClockCountdown, CheckCircle,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/lib/tourContext';

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  muted:     '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  greenDark: '#3D8800',
  greenBg:   'rgba(61,136,0,0.08)',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.07)',
  gold:      '#D97706',
  goldBg:    '#FFFBEB',
  inputBg:   '#ECEAF5',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
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

export default function MyVocabularyScreen() {
  const { profile, session } = useAuth();
  const insets = useSafeAreaInsets();
  const level  = profile?.charlotte_level ?? 'Inter';
  const isPt   = level === 'Novice';
  const userId = session?.user?.id;

  // Level accent color — matches review-session and home screen
  const levelAccent = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';

  const { startTour } = useTour();
  const tourSearchRef  = useRef<any>(null);
  const tourFiltersRef = useRef<any>(null);
  const tourCardRef    = useRef<any>(null);
  const tourFABRef     = useRef<any>(null);

  const [items,     setItems]    = useState<VocabItem[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [dueCount,  setDueCount] = useState(0);
  const [filter,    setFilter]   = useState<VocabCategory>('all');
  const [search,    setSearch]   = useState('');
  const [expanded,  setExpanded] = useState<string | null>(null);

  const openAdd = () => router.push({ pathname: '/(app)/add-word', params: { source: 'manual' } });

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
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
    if (!vocabRes.error) setItems(vocabRes.data ?? []);
    setDueCount(srRes.count ?? 0);
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (loading || items.length === 0) return;
    const pt = isPt;
    startTour('my-vocabulary', [
      {
        ref: tourSearchRef,
        spotlightRadius: 12,
        title: pt ? 'Buscar' : 'Search',
        description: pt
          ? 'Busque qualquer palavra ou definição salva na sua lista.'
          : 'Search for any word or definition saved in your list.',
      },
      {
        ref: tourFiltersRef,
        spotlightRadius: 12,
        title: pt ? 'Filtros' : 'Filters',
        description: pt
          ? 'Filtre por categoria: Palavras, Expressões ou Phrasals.'
          : 'Filter by category: Words, Idioms, or Phrasals.',
      },
      {
        ref: tourCardRef,
        spotlightRadius: 14,
        title: pt ? 'Suas palavras' : 'Your words',
        description: pt
          ? 'Toque no card para expandir: veja a definição completa, exemplo e quando a palavra volta para revisão.'
          : 'Tap a card to expand: see the full definition, example, and when the word is due for review.',
      },
      {
        ref: tourFABRef,
        spotlightRadius: 30,
        title: pt ? 'Adicionar palavra' : 'Add word',
        description: pt
          ? 'Adicione palavras a qualquer momento. Elas entram automaticamente no ciclo de revisão espaçada.'
          : 'Add words at any time. They automatically enter the spaced repetition review cycle.',
      },
    ], pt ? 'pt' : 'en');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items.length]);

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.category !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return i.term.toLowerCase().includes(q) || i.definition.toLowerCase().includes(q);
    }
    return true;
  });

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


  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
          paddingVertical: 14, gap: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color={C.navy} weight="bold" />
          </TouchableOpacity>
          <AppText style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Meu Vocabulário' : 'My Vocabulary'}
          </AppText>

        </View>
      </SafeAreaView>

      {/* Search bar + word count */}
      <View style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View ref={tourSearchRef} collapsable={false} style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: C.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
        }}>
          <MagnifyingGlass size={16} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
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

      {/* Category filter chips */}
      <ScrollView
        ref={tourFiltersRef}
        horizontal
        showsHorizontalScrollIndicator={false}
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
              style={{
                marginTop: 20, backgroundColor: C.navy,
                borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item, index) => {
            const isOpen = expanded === item.id;
            const rev    = reviewLabel(item.next_review_at, isPt);
            return (
              <TouchableOpacity
                key={item.id}
                ref={index === 0 ? tourCardRef : null}
                onPress={() => setExpanded(isOpen ? null : item.id)}
                activeOpacity={0.78}
                style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, ...cardShadow }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <AppText style={{ fontSize: 16, fontWeight: '700', color: C.navy }}>{item.term}</AppText>
                    {item.phonetic && !isOpen && (
                      <AppText style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{item.phonetic}</AppText>
                    )}
                    {!isOpen && (
                      <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 4 }} numberOfLines={2}>
                        {item.definition}
                      </AppText>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ backgroundColor: rev.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <AppText style={{ fontSize: 10, fontWeight: '700', color: rev.color }}>
                        {rev.label}
                      </AppText>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Trash size={16} color={C.muted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isOpen && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {item.phonetic && (
                      <AppText style={{ fontSize: 13, color: C.muted }}>{item.phonetic}</AppText>
                    )}
                    <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 20 }}>
                      {item.definition}
                    </AppText>
                    {item.example && (
                      <View style={{
                        backgroundColor: C.bg, borderRadius: 10, padding: 10,
                        borderLeftWidth: 3, borderLeftColor: C.navy,
                      }}>
                        <AppText style={{ fontSize: 13, color: C.navy, fontStyle: 'italic', lineHeight: 18 }}>
                          {item.example}
                        </AppText>
                        {item.example_translation && (
                          <AppText style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                            {item.example_translation}
                          </AppText>
                        )}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {item.repetitions > 0
                        ? <CheckCircle size={14} color={C.greenDark} weight="fill" />
                        : <ClockCountdown size={14} color={C.gold} weight="fill" />
                      }
                      <AppText style={{ fontSize: 11, color: C.muted }}>
                        {item.repetitions > 0
                          ? (isPt ? `Revisado ${item.repetitions}x` : `Reviewed ${item.repetitions}x`)
                          : (isPt ? 'Ainda não revisado' : 'Not yet reviewed')
                        }
                      </AppText>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      {!loading && items.length > 0 && (
        <TouchableOpacity
          ref={tourFABRef}
          onPress={openAdd}
          style={{
            position: 'absolute', right: 20, bottom: insets.bottom + 20,
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: C.navy,
            alignItems: 'center', justifyContent: 'center',
            ...Platform.select({
              ios:     { shadowColor: C.navy, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
              android: { elevation: 6 },
            }),
          }}
        >
          <Plus size={24} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      )}
    </View>
  );
}
