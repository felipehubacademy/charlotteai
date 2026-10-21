// components/ui/ReportIssue.tsx — "Reportar problema" (bandeira no topo de toda tela de exercício).
//
// O aluno escolhe o motivo (e escreve, se quiser); o reporte vai para public.exercise_reports com o que
// estava na tela no momento do toque (getContext): exercício, resposta do aluno, o que o app entendeu da
// fala. Aparece no /admin (Pedagógico > Reportados pelos alunos) e no alerta diário "Onde os alunos travaram".
// Textos no idioma do aparelho.

import React, { useState } from 'react';
import { Modal, Pressable, View, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, CheckCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';
import { Application } from '@/lib/nativeOptional';

export type ReportKind = 'grammar' | 'speech' | 'chat';

export interface ReportContext {
  screen: string;
  level?: string | null;
  moduleId?: string | null;
  unitId?: string | null;
  activity?: string | null;
  stepIdx?: number | null;
  exercise?: Record<string, unknown> | null;
  userAnswer?: string | null;
  transcript?: string | null;
}

type ReasonId = 'answer_right' | 'speech' | 'audio' | 'confusing' | 'other';
const REASONS: Record<ReasonId, { pt: string; en: string }> = {
  answer_right: { pt: 'Minha resposta estava certa',        en: 'My answer was right' },
  speech:       { pt: 'O app não entendeu minha fala',      en: "The app didn't understand my speech" },
  audio:        { pt: 'O áudio não toca ou está errado',     en: "The audio doesn't play or is wrong" },
  confusing:    { pt: 'O exercício está confuso ou com erro', en: 'The exercise is confusing or has a mistake' },
  other:        { pt: 'Outro problema',                       en: 'Something else' },
};
const BY_KIND: Record<ReportKind, ReasonId[]> = {
  grammar: ['answer_right', 'confusing', 'audio', 'other'],
  speech:  ['speech', 'audio', 'confusing', 'other'],
  chat:    ['speech', 'confusing', 'audio', 'other'],
};

const C = { navy: '#16131F', mid: '#3A3546', light: '#8A8494', green: '#DCFF4A', border: 'rgba(22,19,31,0.12)' };

interface Props {
  kind: ReportKind;
  getContext: () => ReportContext;
  color?: string;
  size?: number;
}

export function ReportIssueButton({ kind, getContext, color = C.light, size = 20 }: Props) {
  const isPt = systemIsPt;
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<ReportContext | null>(null);
  const [reason, setReason] = useState<ReasonId | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const openSheet = () => {
    let c: ReportContext | null = null;
    try { c = getContext(); } catch { c = null; }
    setCtx(c); setReason(null); setComment(''); setState('idle'); setOpen(true);
  };
  const close = () => setOpen(false);

  const send = async () => {
    if (!reason || state === 'sending') return;
    setState('sending');
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) { setState('error'); return; }
      const c = ctx ?? { screen: 'unknown' };
      const { error } = await supabase.from('exercise_reports').insert({
        user_id: uid, screen: c.screen, reason, comment: comment.trim() || null,
        level: c.level ?? null, module_id: c.moduleId ?? null, unit_id: c.unitId ?? null, activity: c.activity ?? null,
        step_idx: c.stepIdx ?? null, exercise: c.exercise ?? null, user_answer: c.userAnswer ?? null, transcript: c.transcript ?? null,
        app_version: Application?.nativeApplicationVersion ?? null, platform: Platform.OS,
      });
      if (error) { setState('error'); return; }
      setState('sent');
      setTimeout(() => setOpen(false), 1600);
    } catch { setState('error'); }
  };

  return (
    <>
      <TouchableOpacity onPress={openSheet} hitSlop={10} activeOpacity={0.7}
        accessibilityLabel={isPt ? 'Reportar problema neste exercício' : 'Report a problem with this exercise'}>
        <Flag size={size} color={color} weight="bold" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        {/* Dentro do Modal o ajuste de teclado do keyboard-controller não alcança; o do React Native com
            'padding' sobe a folha nos dois sistemas (no Android o Modal translúcido não redimensiona sozinho). */}
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 + insets.bottom }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,19,31,0.15)', alignSelf: 'center', marginBottom: 14 }} />
            {state === 'sent' ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
                <CheckCircle size={44} color="#08804A" weight="fill" />
                <AppText display style={{ fontSize: 19, fontWeight: '800', color: C.navy }}>{isPt ? 'Obrigado!' : 'Thank you!'}</AppText>
                <AppText style={{ fontSize: 14, color: C.mid, textAlign: 'center' }}>{isPt ? 'Recebemos o seu reporte e vamos olhar.' : "We got your report and we'll take a look."}</AppText>
              </View>
            ) : (
              <>
                <AppText display style={{ fontSize: 19, fontWeight: '800', color: C.navy, marginBottom: 4 }}>{isPt ? 'Reportar problema' : 'Report a problem'}</AppText>
                <AppText style={{ fontSize: 13, color: C.mid, marginBottom: 14 }}>{isPt ? 'O que aconteceu neste exercício?' : 'What happened in this exercise?'}</AppText>
                {BY_KIND[kind].map(id => {
                  const on = reason === id;
                  return (
                    <TouchableOpacity key={id} onPress={() => setReason(id)} activeOpacity={0.85}
                      accessibilityRole="radio" accessibilityState={{ selected: on }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? C.navy : C.border }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.navy : 'rgba(22,19,31,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.navy }} />}
                      </View>
                      <AppText style={{ flex: 1, fontSize: 14.5, color: C.navy, fontWeight: on ? '700' : '500' }}>{isPt ? REASONS[id].pt : REASONS[id].en}</AppText>
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  value={comment} onChangeText={setComment} maxLength={500} multiline
                  placeholder={isPt ? 'Quer contar mais? (opcional)' : 'Want to tell us more? (optional)'}
                  placeholderTextColor={C.light}
                  style={{ minHeight: 64, maxHeight: 120, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.navy, marginTop: 4, textAlignVertical: 'top' }}
                />
                {state === 'error' && (
                  <AppText style={{ fontSize: 13, color: '#D12A64', marginTop: 8 }}>{isPt ? 'Não foi possível enviar. Confira a internet e tente de novo.' : "Couldn't send. Check your connection and try again."}</AppText>
                )}
                <TouchableOpacity onPress={send} disabled={!reason || state === 'sending'} activeOpacity={0.85}
                  style={{ backgroundColor: C.green, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 12, opacity: !reason ? 0.5 : 1 }}>
                  {state === 'sending'
                    ? <ActivityIndicator color={C.navy} />
                    : <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>{isPt ? 'Enviar' : 'Send'}</AppText>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
