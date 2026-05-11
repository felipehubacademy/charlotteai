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
  ScrollView, Platform, Alert, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, MagicWand, SpeakerHigh, Check, Plus,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';
import { scheduleVocabReviews } from '@/lib/spacedRepetition';
import * as Haptics from 'expo-haptics';
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
  bg:       '#F4F3FA',
  card:     '#FFFFFF',
  navy:     '#16153A',
  navyMid:  '#4B4A72',
  muted:    '#9896B8',
  border:   'rgba(22,21,58,0.10)',
  inputBg:  '#ECEAF5',   // mesmo que my-vocabulary
  greenBg:  'rgba(61,136,0,0.08)',
  green:    '#3D8800',
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
  const isPt      = level === 'Novice';
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

  return (
    <View style={{ flex: 1, backgroundColor: C.card }}>
      {/* Status bar area + header — tudo branco */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14, gap: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <AppText style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
          {isPt ? 'Adicionar palavra' : 'Add word'}
        </AppText>
        </View>
      </SafeAreaView>

      {/* Body — fundo lavanda */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Term */}
          <View>
            {/* Label com spinner inline quando checking */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
              <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.6 }}>
                {isPt ? 'TERMO' : 'TERM'}
              </AppText>
              {termStatus === 'checking' && (
                <ActivityIndicator size="small" color={C.muted} style={{ marginLeft: 2 }} />
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Term input — mesmo estilo da search bar do My Vocabulary */}
              <TextInput
                value={term}
                onChangeText={t => { setTerm(t); setAlreadyAdded(false); setTermStatus('idle'); setSuggestion(null); }}
                placeholder={isPt ? 'ex: take it easy' : 'e.g. take it easy'}
                placeholderTextColor={C.muted}
                style={{
                  flex: 1, backgroundColor: C.inputBg, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 14,
                  fontSize: 16, color: C.navy, fontWeight: '500',
                }}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => handleGenerate()}
              />
              {/* TTS */}
              <TouchableOpacity
                onPress={handleTts}
                disabled={ttsLoading || !term.trim()}
                style={{
                  width: 52, height: 52, borderRadius: 12,
                  backgroundColor: C.inputBg,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {ttsLoading
                  ? <ActivityIndicator size="small" color={C.navy} />
                  : <SpeakerHigh size={22} color={term.trim() ? C.navy : C.muted} weight="fill" />
                }
              </TouchableOpacity>
              {/* AI enrich */}
              <TouchableOpacity
                onPress={() => handleGenerate()}
                disabled={generating || !term.trim()}
                style={{
                  width: 52, height: 52, borderRadius: 12,
                  backgroundColor: term.trim() ? C.navy : C.inputBg,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {generating
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <MagicWand size={22} color={term.trim() ? '#FFFFFF' : C.muted} weight="fill" />
                }
              </TouchableOpacity>
            </View>
            {/* Fonética — altura fixa reservada para não movimentar o layout */}
            <View style={{ height: 22, justifyContent: 'center', marginTop: 4, paddingHorizontal: 4 }}>
              {phonetic ? (
                <AppText style={{ fontSize: 13, color: C.muted }}>{phonetic}</AppText>
              ) : null}
            </View>
          </View>

          {/* Category */}
          <View>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, letterSpacing: 0.6 }}>
              {isPt ? 'CATEGORIA' : 'CATEGORY'}
            </AppText>
            {/* Chips — mesmo padrão navy do My Vocabulary */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => {
                const sel = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={{
                      paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: sel ? C.navy : C.card,
                      borderWidth: 1, borderColor: sel ? C.navy : C.border,
                    }}
                  >
                    <AppText style={{ fontSize: 13, fontWeight: '600', color: sel ? '#FFFFFF' : C.navyMid }}>
                      {isPt ? c.labelPt : c.labelEn}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Definition */}
          <View>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, letterSpacing: 0.6 }}>
              {isPt ? 'DEFINIÇÃO (PT-BR)' : 'DEFINITION'}
            </AppText>
            <TextInput
              value={definition}
              onChangeText={setDefinition}
              placeholder={isPt ? 'O que significa este termo?' : 'What does this term mean?'}
              placeholderTextColor={C.muted}
              multiline
              style={{
                backgroundColor: C.inputBg, borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: C.navy, lineHeight: 22,
                minHeight: 88, textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Example */}
          <View>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, letterSpacing: 0.6 }}>
              {isPt ? 'EXEMPLO (EN)' : 'EXAMPLE'}
            </AppText>
            <TextInput
              value={example}
              onChangeText={setExample}
              placeholder="e.g. Just take it easy — there's no rush."
              placeholderTextColor={C.muted}
              multiline
              style={{
                backgroundColor: C.inputBg, borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: C.navy, lineHeight: 22,
                minHeight: 72, textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Example translation — Novice only */}
          {isPt && (
            <View>
              <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, letterSpacing: 0.6 }}>
                TRADUÇÃO DO EXEMPLO
              </AppText>
              <TextInput
                value={exampleTr}
                onChangeText={setExampleTr}
                placeholder="Tradução em português..."
                placeholderTextColor={C.muted}
                multiline
                style={{
                  backgroundColor: C.inputBg, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 14,
                  fontSize: 15, color: C.navy, lineHeight: 22,
                  minHeight: 72, textAlignVertical: 'top',
                }}
              />
            </View>
          )}

        </ScrollView>

        {/* Save button — fixed at bottom */}
        <View style={{
          position: 'absolute', bottom: insets.bottom + 16, left: 20, right: 20,
        }}>
          {/* Zona de status fixa — altura reservada, layout nunca se move */}
          <View style={{ height: 44, justifyContent: 'center', marginBottom: 8 }}>
            {termStatus === 'duplicate' && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: 'rgba(217,119,6,0.10)', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 8,
              }}>
                <AppText style={{ fontSize: 13, color: '#D97706', fontWeight: '700' }}>!</AppText>
                <AppText style={{ fontSize: 13, color: '#D97706', fontWeight: '600', flex: 1 }}>
                  {isPt ? 'Já está no seu vocabulário.' : 'Already in your vocabulary.'}
                </AppText>
              </View>
            )}
            {termStatus === 'cached' && !definition && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: 'rgba(22,21,58,0.06)', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 8,
              }}>
                <Check size={14} color={C.navy} weight="bold" />
                <AppText style={{ fontSize: 13, color: C.navy, fontWeight: '600', flex: 1 }}>
                  {isPt ? 'Definição disponível — toque no botão AI.' : 'Definition ready — tap the AI button.'}
                </AppText>
              </View>
            )}
            {termStatus === 'unknown' && suggestion === null && (
              <AppText style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
                {isPt
                  ? 'Toque no botão AI para validar o termo antes de salvar.'
                  : 'Tap the AI button to validate the term before saving.'}
              </AppText>
            )}
            {suggestion !== null && (
              <View style={{
                backgroundColor: 'rgba(220,38,38,0.07)', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
              }}>
                <AppText style={{ fontSize: 13, color: '#DC2626', fontWeight: '600' }}>
                  {isPt ? 'Não encontrado.' : 'Not found.'}
                </AppText>
                {suggestion ? (
                  <TouchableOpacity
                    onPress={() => { setTerm(suggestion); setSuggestion(null); setTermStatus('idle'); handleGenerate(suggestion); }}
                  >
                    <AppText style={{ fontSize: 13, color: '#DC2626' }}>
                      {isPt ? 'Quis dizer ' : 'Did you mean '}
                      <AppText style={{ fontWeight: '800', textDecorationLine: 'underline' }}>{suggestion}</AppText>
                      ?
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <AppText style={{ fontSize: 13, color: '#DC2626' }}>
                    {isPt ? 'Verifique a ortografia.' : 'Check the spelling.'}
                  </AppText>
                )}
              </View>
            )}
            {alreadyAdded && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: 'rgba(22,21,58,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
              }}>
                <Check size={14} color={C.navy} weight="bold" />
                <AppText style={{ fontSize: 13, color: C.navy, fontWeight: '600' }}>
                  {isPt ? 'Já está no seu vocabulário!' : 'Already in your vocabulary!'}
                </AppText>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.82}
            style={{
              backgroundColor: canSave ? C.navy : C.inputBg,
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              ...Platform.select({
                ios:     { shadowColor: C.navy, shadowOpacity: canSave ? 0.25 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
                android: { elevation: canSave ? 6 : 0 },
              }),
            }}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : (
                <>
                  <Plus size={20} color="#FFFFFF" weight="bold" />
                  <AppText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                    {isPt ? 'Salvar palavra' : 'Save word'}
                  </AppText>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </View>
    </View>
  );
}
