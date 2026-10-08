/**
 * app/(app)/add-word.tsx
 * Tela full-screen para adicionar palavra ao vocabulário.
 * Substituiu AddWordModal (bottom-sheet) por navegação normal.
 *
 * Params (query string via router.push):
 *   term?        – pré-preenche o campo de termo
 *   category?    – pré-seleciona a categoria
 *   source?      – origem: manual | charlotte | learn_trail | tip_of_day
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Alert, Keyboard,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, MagicWand, SpeakerHigh, Check, Plus,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';
import { scheduleVocabReviews } from '@/lib/spacedRepetition';
import * as Haptics from '@/lib/hapticsGated';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/** Simple UUID v4 — avoids crypto.randomUUID() que nao esta disponivel em todos os ambientes iOS */
function makeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export type VocabCategory = 'word' | 'idiom' | 'phrasal_verb' | 'grammar';

const C = {
  bg:       '#FAF7F0',
  card:     '#FFFFFF',
  navy:     '#16131F',
  navyMid:  '#4D4858',
  muted:    '#8A8494',
  border:   'rgba(22,19,31,0.10)',
  hairline: 'rgba(22,19,31,0.06)',
  ghost:    'rgba(22,19,31,0.06)',
  volt:     '#DCFF4A',
  pink:     '#D12A64',
  pinkBg:   'rgba(255,79,139,0.10)',
};

const CATEGORIES: { key: VocabCategory; labelPt: string; labelEn: string }[] = [
  { key: 'word',         labelPt: 'Palavra',     labelEn: 'Word' },
  { key: 'idiom',        labelPt: 'Expressão',   labelEn: 'Idiom' },
  { key: 'phrasal_verb', labelPt: 'Phrasal',     labelEn: 'Phrasal' },
];

export default function AddWordScreen() {
  const { profile, session } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ term?: string; category?: string; source?: string }>();

  const userId    = session?.user?.id;
  const level     = profile?.charlotte_level ?? 'Inter';
  const isPt      = systemIsPt; // suporte/chrome: idioma do device
  const playerRef = React.useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const [term,        setTerm]       = useState(params.term ?? '');
  const [definition,  setDefinition] = useState('');
  const [example,     setExample]    = useState('');
  const [exampleTr,   setExampleTr]  = useState('');
  const [phonetic,    setPhonetic]   = useState('');
  const [category,    setCategory]   = useState<VocabCategory>(
    (params.category as VocabCategory) ?? 'word',
  );
  const [generating,  setGenerating] = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [alreadyAdded, setAlreadyAdded] = useState(false);
  const [ttsLoading,  setTtsLoading] = useState(false);
  const [suggestion,  setSuggestion] = useState<string | null>(null);
  // Pro-active term validation
  type TermStatus = 'idle' | 'checking' | 'duplicate' | 'cached' | 'unknown';
  const [termStatus, setTermStatus] = useState<TermStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate if term was passed in and has no definition yet
  useEffect(() => {
    if (params.term && params.term.trim()) {
      handleGenerate(params.term.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pro-active validation: debounce 600ms → check duplicate + cache
  useEffect(() => {
    const t = term.trim();
    if (!t || !userId) { setTermStatus('idle'); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTermStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const [dupRes, cacheRes] = await Promise.all([
          supabase
            .from('user_vocabulary')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .ilike('term', t),
          supabase
            .from('vocabulary_master')
            .select('term', { count: 'exact', head: true })
            .ilike('term', t),
        ]);
        if ((dupRes.count ?? 0) > 0)        setTermStatus('duplicate');
        else if ((cacheRes.count ?? 0) > 0) setTermStatus('cached');
        else                                 setTermStatus('unknown');
      } catch { setTermStatus('idle'); }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [term, userId]);

  const handleGenerate = useCallback(async (termOverride?: string) => {
    const t = (termOverride ?? term).trim();
    if (!t) return;
    setGenerating(true);
    setSuggestion(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/enrich-term?term=${encodeURIComponent(t)}&level=${encodeURIComponent(level)}`,
      );
      const json = await res.json();
      if (json.error === 'invalid_term') {
        setSuggestion(json.suggestion ?? '');
        return;
      }
      if (json.success && json.data) {
        const d = json.data;
        if (d.definition)          setDefinition(d.definition);
        if (d.example)             setExample(d.example);
        if (d.example_translation) setExampleTr(d.example_translation);
        if (d.phonetic)            setPhonetic(d.phonetic);
        if (d.category)            setCategory(d.category as VocabCategory);
        // Termo validado pelo AI — libera o botão salvar
        setTermStatus('cached');
      }
    } catch {
      // silencioso — user can fill manually
    } finally {
      setGenerating(false);
    }
  }, [term, level]);

  const handleTts = useCallback(async () => {
    if (!term.trim() || ttsLoading) return;
    setTtsLoading(true);
    try {
      // Busca URL do CDN (cache global) — gera via ElevenLabs so se nao existir
      const res = await fetch(
        `${API_BASE}/api/tts-cached?term=${encodeURIComponent(term.trim())}`,
      );
      if (!res.ok) throw new Error('TTS fetch failed');
      const { url } = await res.json();
      await setAudioModeAsync({ playsInSilentMode: true });
      // Libera player anterior antes de criar novo
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      player.play();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('[TTS] error:', e);
    } finally {
      setTtsLoading(false);
    }
  }, [term, ttsLoading]);

  const handleSave = useCallback(async () => {
    if (!userId || !term.trim()) return;
    if (!definition.trim()) {
      Alert.alert(
        isPt ? 'Definição necessária' : 'Definition required',
        isPt ? 'Adicione uma definição antes de salvar.' : 'Please add a definition before saving.',
      );
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('user_vocabulary')
        .select('id')
        .eq('user_id', userId)
        .ilike('term', term.trim())
        .maybeSingle();

      if (existing) {
        setAlreadyAdded(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setSaving(false);
        return;
      }

      const newId = makeUUID();
      const source = (params.source ?? 'manual') as string;

      const { data: inserted, error } = await supabase
        .from('user_vocabulary')
        .insert({
          id:                  newId,
          user_id:             userId,
          term:                term.trim(),
          definition:          definition.trim(),
          example:             example.trim() || null,
          example_translation: exampleTr.trim() || null,
          phonetic:            phonetic.trim() || null,
          category,
          source,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (inserted?.id && userId) {
        scheduleVocabReviews(userId, inserted.id, category, term.trim(), level).catch(console.warn);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.warn('[AddWord] save error:', msg);
      Alert.alert(
        isPt ? 'Erro ao salvar' : 'Save error',
        isPt ? 'Não foi possível salvar. Tente novamente.' : 'Could not save. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [userId, term, definition, example, exampleTr, phonetic, category, params.source, isPt, level]);

  const canSave = !!term.trim() && !!definition.trim() && !saving && !alreadyAdded && termStatus !== 'duplicate' && termStatus !== 'unknown' && suggestion === null;

  const Label = ({ children }: { children: React.ReactNode }) => (
    <AppText style={{ fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1.1, marginBottom: 8 }}>
      {children}
    </AppText>
  );
  const fieldStyle = {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.navy, lineHeight: 22, textAlignVertical: 'top' as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14, gap: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={22} color={C.navy} weight="bold" />
          </TouchableOpacity>
          <AppText display style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Nova palavra' : 'New word'}
          </AppText>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 150 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Termo: card principal ── */}
          <View style={{ backgroundColor: C.navy, borderRadius: 22, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: C.volt }}>
                {isPt ? 'O QUE VOCÊ QUER APRENDER?' : 'WHAT DO YOU WANT TO LEARN?'}
              </AppText>
              {termStatus === 'checking' && <ActivityIndicator size="small" color={C.volt} />}
            </View>
            <TextInput
              value={term}
              onChangeText={t => { setTerm(t); setAlreadyAdded(false); setTermStatus('idle'); setSuggestion(null); }}
              placeholder={isPt ? 'ex: take it easy' : 'e.g. take it easy'}
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 30, color: '#FFFFFF', paddingVertical: 4 }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => { Keyboard.dismiss(); handleGenerate(); }}
            />
            <View style={{ height: 20, justifyContent: 'center' }}>
              {phonetic ? <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{phonetic}</AppText> : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); handleGenerate(); }}
                disabled={generating || !term.trim()}
                activeOpacity={0.85}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: term.trim() ? C.volt : 'rgba(255,255,255,0.10)',
                  borderRadius: 14, paddingVertical: 12,
                }}
              >
                {generating
                  ? <ActivityIndicator size="small" color={C.navy} />
                  : <MagicWand size={18} color={term.trim() ? C.navy : 'rgba(255,255,255,0.4)'} weight="fill" />}
                <AppText style={{ fontSize: 14, fontWeight: '800', color: term.trim() ? C.navy : 'rgba(255,255,255,0.4)' }}>
                  {isPt ? 'Preencher com IA' : 'Fill in with AI'}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTts}
                disabled={ttsLoading || !term.trim()}
                accessibilityLabel={isPt ? 'Ouvir' : 'Listen'}
                style={{
                  width: 48, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {ttsLoading
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <SpeakerHigh size={20} color={term.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} weight="fill" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Categoria ── */}
          <View>
            <Label>{isPt ? 'CATEGORIA' : 'CATEGORY'}</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => {
                const sel = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
                      backgroundColor: sel ? C.navy : C.card,
                      borderWidth: 1, borderColor: sel ? C.navy : C.border,
                    }}
                  >
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: sel ? '#FFFFFF' : C.navyMid }}>
                      {isPt ? c.labelPt : c.labelEn}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Significado ── */}
          <View>
            <Label>{isPt ? 'SIGNIFICADO' : 'MEANING'}</Label>
            <TextInput
              value={definition}
              onChangeText={setDefinition}
              placeholder={isPt ? 'O que significa?' : 'What does it mean?'}
              placeholderTextColor={C.muted}
              multiline
              style={[fieldStyle, { minHeight: 80 }]}
            />
          </View>

          {/* ── Exemplo (+ tradução em PT) ── */}
          <View>
            <Label>{isPt ? 'EXEMPLO EM INGLÊS' : 'EXAMPLE'}</Label>
            <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
              <TextInput
                value={example}
                onChangeText={setExample}
                placeholder="e.g. Just take it easy — there's no rush."
                placeholderTextColor={C.muted}
                multiline
                style={[fieldStyle, { borderWidth: 0, borderRadius: 0, fontStyle: example ? 'italic' : 'normal', minHeight: 64 }]}
              />
              {isPt && (
                <TextInput
                  value={exampleTr}
                  onChangeText={setExampleTr}
                  placeholder="Tradução do exemplo"
                  placeholderTextColor={C.muted}
                  multiline
                  style={[fieldStyle, { borderWidth: 0, borderRadius: 0, borderTopWidth: 1, borderTopColor: C.hairline, fontSize: 13, color: C.navyMid, minHeight: 52 }]}
                />
              )}
            </View>
          </View>
        </ScrollView>

        {/* ── Status + salvar (fixo embaixo) ── */}
        <View style={{ position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16 }}>
          <View style={{ minHeight: 40, justifyContent: 'center', marginBottom: 8 }}>
            {(termStatus === 'duplicate' || alreadyAdded) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.pinkBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}>
                <Check size={14} color={C.pink} weight="bold" />
                <AppText style={{ fontSize: 13, color: C.pink, fontWeight: '700', flex: 1 }}>
                  {isPt ? 'Essa já está na sua coleção.' : 'This one is already in your collection.'}
                </AppText>
              </View>
            )}
            {termStatus === 'cached' && !definition && !alreadyAdded && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ghost, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}>
                <MagicWand size={14} color={C.navy} weight="fill" />
                <AppText style={{ fontSize: 13, color: C.navy, fontWeight: '600', flex: 1 }}>
                  {isPt ? 'Tudo pronto: toque em "Preencher com IA".' : 'Ready: tap "Fill in with AI".'}
                </AppText>
              </View>
            )}
            {termStatus === 'unknown' && suggestion === null && (
              <AppText style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
                {isPt ? 'Toque em "Preencher com IA" para validar a palavra.' : 'Tap "Fill in with AI" to check the word.'}
              </AppText>
            )}
            {suggestion !== null && (
              <View style={{ backgroundColor: C.pinkBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <AppText style={{ fontSize: 13, color: C.pink, fontWeight: '700' }}>
                  {isPt ? 'Não encontramos essa palavra.' : "We couldn't find that word."}
                </AppText>
                {suggestion ? (
                  <TouchableOpacity onPress={() => { setTerm(suggestion); setSuggestion(null); setTermStatus('idle'); handleGenerate(suggestion); }}>
                    <AppText style={{ fontSize: 13, color: C.pink }}>
                      {isPt ? 'Quis dizer ' : 'Did you mean '}
                      <AppText style={{ fontWeight: '800', textDecorationLine: 'underline', color: C.pink }}>{suggestion}</AppText>?
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <AppText style={{ fontSize: 13, color: C.pink }}>
                    {isPt ? 'Confira a grafia.' : 'Check the spelling.'}
                  </AppText>
                )}
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
            style={{
              backgroundColor: canSave ? C.volt : '#EDE9E1',
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}
          >
            {saving
              ? <ActivityIndicator color={C.navy} />
              : (
                <>
                  <Plus size={20} color={canSave ? C.navy : C.muted} weight="bold" />
                  <AppText style={{ color: canSave ? C.navy : C.muted, fontSize: 16, fontWeight: '800' }}>
                    {isPt ? 'Adicionar à coleção' : 'Add to collection'}
                  </AppText>
                </>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
