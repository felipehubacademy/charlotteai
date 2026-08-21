/**
 * components/vocabulary/AddWordModal.tsx
 * Modal para adicionar/editar palavras no vocabulário do usuário.
 * Charlotte gera definition + example + phonetic automaticamente via API.
 *
 * Novice:   definição PT-BR, exemplo EN simples + tradução PT-BR
 * Inter/Adv: definição EN monolíngue, exemplo EN rico, fonética IPA clicável (TTS)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal, View, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Alert, 
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MagicWand, BookOpen, SpeakerHigh, Check, Plus } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';
import { scheduleVocabReviews } from '@/lib/spacedRepetition';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export type VocabCategory = 'word' | 'idiom' | 'phrasal_verb' | 'grammar';

export interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
  initialTerm?: string;
  initialDefinition?: string;
  initialExample?: string;
  initialCategory?: VocabCategory;
  source?: 'manual' | 'charlotte' | 'learn_trail' | 'tip_of_day';
}

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  muted:     '#9896B8',
  border:    'rgba(22,21,58,0.12)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  greenBg:   'rgba(163,255,60,0.10)',
  inputBg:   '#F0EFF8',
};

const CATEGORIES: { key: VocabCategory; labelPt: string; labelEn: string }[] = [
  { key: 'word',         labelPt: 'Palavra',     labelEn: 'Word' },
  { key: 'idiom',        labelPt: 'Expressão',   labelEn: 'Idiom' },
  { key: 'phrasal_verb', labelPt: 'Phrasal',     labelEn: 'Phrasal' },
  { key: 'grammar',      labelPt: 'Gramática',   labelEn: 'Grammar' },
];

export function AddWordModal({
  visible, onClose,
  initialTerm = '', initialDefinition = '', initialExample = '',
  initialCategory = 'word', source = 'manual',
}: AddWordModalProps) {
  const { profile, session } = useAuth();
  const insets = useSafeAreaInsets();
  const level  = profile?.charlotte_level ?? 'Inter';
  const isPt   = level === 'Novice';

  const [term,        setTerm]       = useState(initialTerm);
  const [definition,  setDefinition] = useState(initialDefinition);
  const [example,     setExample]    = useState(initialExample);
  const [exampleTr,   setExampleTr]  = useState('');
  const [phonetic,    setPhonetic]   = useState('');
  const [category,    setCategory]   = useState<VocabCategory>(initialCategory);
  const [generating,  setGenerating] = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [alreadyAdded, setAlreadyAdded] = useState(false);
  const [ttsLoading,  setTtsLoading] = useState(false);

  // Reset when modal opens with new term
  useEffect(() => {
    if (visible) {
      setTerm(initialTerm);
      setDefinition(initialDefinition);
      setExample(initialExample);
      setExampleTr('');
      setPhonetic('');
      setCategory(initialCategory);
      setAlreadyAdded(false);
      if (initialTerm && !initialDefinition) {
        // Auto-generate if term provided but no definition
        handleGenerate(initialTerm);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTerm]);

  const handleGenerate = useCallback(async (termOverride?: string) => {
    const t = (termOverride ?? term).trim();
    if (!t) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/vocabulary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: t, level }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.definition)         setDefinition(d.definition);
        if (d.example)            setExample(d.example);
        if (d.example_translation) setExampleTr(d.example_translation);
        if (d.phonetic)           setPhonetic(d.phonetic);
        if (d.category)           setCategory(d.category as VocabCategory);
      }
    } catch {
      // silencioso — user can type manually
    } finally {
      setGenerating(false);
    }
  }, [term, level]);

  const handleTts = useCallback(async () => {
    if (!term.trim() || ttsLoading) return;
    setTtsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: term.trim(), ...(session?.user?.id ? { userId: session.user.id } : {}) }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const FileSystem = await import('expo-file-system/legacy');
        const uri = FileSystem.cacheDirectory + 'vocab_tts.mp3';
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        const player = createAudioPlayer({ uri });
        player.play();
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      };
      reader.readAsDataURL(blob);
    } catch { /* silencioso */ } finally {
      setTtsLoading(false);
    }
  }, [term, ttsLoading]);

  const handleSave = useCallback(async () => {
    if (!session?.user?.id || !term.trim()) return;
    if (!definition.trim()) {
      Alert.alert(
        isPt ? 'Definição necessária' : 'Definition required',
        isPt ? 'Por favor, adicione uma definição para o termo.' : 'Please add a definition for the term.',
      );
      return;
    }

    setSaving(true);
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('user_vocabulary')
        .select('id')
        .eq('user_id', session!.user!.id)
        .ilike('term', term.trim())
        .maybeSingle();

      if (existing) {
        setAlreadyAdded(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setSaving(false);
        return;
      }

      // Gera UUID explícito — necessário pois o INSTEAD OF trigger não tem DEFAULT para id
      const newId = crypto.randomUUID();

      const { data: inserted, error } = await supabase
        .from('user_vocabulary')
        .insert({
          id:                  newId,
          user_id:             session!.user!.id,
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

      // Schedule SR review cards for this vocabulary item
      if (inserted?.id) {
        scheduleVocabReviews(session!.user!.id, inserted.id, category, term.trim(), level).catch(console.warn);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      console.warn('[AddWordModal] save error:', err);
      Alert.alert(
        isPt ? 'Erro ao salvar' : 'Save error',
        isPt ? 'Não foi possível salvar a palavra. Tente novamente.' : 'Could not save the word. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [session?.user?.id, term, definition, example, exampleTr, phonetic, category, source, isPt, onClose]);

  const canSave = !!term.trim() && !!definition.trim() && !saving && !alreadyAdded;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(22,21,58,0.55)' }}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sheet — estilo card do app */}
        <View style={{
          backgroundColor: C.card,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: insets.bottom + 16,
          maxHeight: '90%',
          ...Platform.select({
            ios:     { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: -4 } },
            android: { elevation: 12 },
          }),
        }}>
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.12)' }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
          }}>
            <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
              {isPt ? 'Adicionar palavra' : 'Add word'}
            </AppText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color={C.navyMid} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Term input */}
            <View>
              <AppText style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>
                {isPt ? 'TERMO' : 'TERM'}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={term}
                  onChangeText={setTerm}
                  placeholder={isPt ? 'ex: take it easy' : 'e.g. take it easy'}
                  placeholderTextColor={C.muted}
                  style={{
                    flex: 1, backgroundColor: C.inputBg, borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 16, color: C.navy, fontWeight: '500',
                  }}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => handleGenerate()}
                />
                {/* IPA pronounce button — Inter/Advanced only */}
                {!isPt && (
                  <TouchableOpacity
                    onPress={handleTts}
                    disabled={ttsLoading || !term.trim()}
                    style={{
                      width: 46, height: 46, borderRadius: 12,
                      backgroundColor: C.inputBg,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {ttsLoading
                      ? <ActivityIndicator size="small" color={C.greenDark} />
                      : <SpeakerHigh size={20} color={term.trim() ? C.greenDark : C.muted} weight="fill" />
                    }
                  </TouchableOpacity>
                )}
                {/* Generate button */}
                <TouchableOpacity
                  onPress={() => handleGenerate()}
                  disabled={generating || !term.trim()}
                  style={{
                    width: 46, height: 46, borderRadius: 12,
                    backgroundColor: term.trim() ? C.greenDark : C.inputBg,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {generating
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <MagicWand size={20} color={term.trim() ? '#FFFFFF' : C.muted} weight="fill" />
                  }
                </TouchableOpacity>
              </View>
              {phonetic ? (
                <AppText style={{ fontSize: 13, color: C.muted, marginTop: 4, paddingHorizontal: 2 }}>
                  {phonetic}
                </AppText>
              ) : null}
            </View>

            {/* Category chips */}
            <View>
              <AppText style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>
                {isPt ? 'CATEGORIA' : 'CATEGORY'}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => {
                  const sel = category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setCategory(c.key)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: sel ? C.greenDark : C.card,
                        borderWidth: 1,
                        borderColor: sel ? C.greenDark : C.border,
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
              <AppText style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>
                {isPt ? 'DEFINIÇÃO (PT-BR)' : 'DEFINITION'}
              </AppText>
              <TextInput
                value={definition}
                onChangeText={setDefinition}
                placeholder={isPt ? 'O que significa este termo?' : 'What does this term mean?'}
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: C.inputBg, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 14, color: C.navy, lineHeight: 20,
                  minHeight: 72, textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Example */}
            <View>
              <AppText style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>
                {isPt ? 'EXEMPLO (EN)' : 'EXAMPLE'}
              </AppText>
              <TextInput
                value={example}
                onChangeText={setExample}
                placeholder="e.g. Just take it easy — there's no rush."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: C.inputBg, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 14, color: C.navy, lineHeight: 20,
                  minHeight: 56, textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Example translation — Novice only */}
            {isPt && (
              <View>
                <AppText style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>
                  TRADUÇÃO DO EXEMPLO
                </AppText>
                <TextInput
                  value={exampleTr}
                  onChangeText={setExampleTr}
                  placeholder="Tradução em português..."
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: C.inputBg, borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 14, color: C.navy, lineHeight: 20,
                    minHeight: 56, textAlignVertical: 'top',
                  }}
                />
              </View>
            )}

            {/* Already added message */}
            {alreadyAdded && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: C.greenBg, borderRadius: 10, padding: 12,
              }}>
                <Check size={16} color={C.greenDark} weight="bold" />
                <AppText style={{ fontSize: 13, color: C.greenDark, fontWeight: '600' }}>
                  {isPt ? 'Já está na sua lista!' : 'Already in your list!'}
                </AppText>
              </View>
            )}
          </ScrollView>

          {/* Save button */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.82}
              style={{
                backgroundColor: canSave ? C.greenDark : C.border,
                borderRadius: 14, paddingVertical: 15,
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 8,
              }}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : (
                  <>
                    <Plus size={18} color="#FFFFFF" weight="bold" />
                    <AppText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      {isPt ? 'Salvar palavra' : 'Save word'}
                    </AppText>
                  </>
                )
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
