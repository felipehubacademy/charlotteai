// Perfil > Horário do lembrete: o aluno escolhe a hora do lembrete diário (9h a 20h, no fuso dele)
// ou deixa no automático (lembrete às 11h + "oi da Charlotte" perto do horário em que costuma estudar).
// Grava charlotte_users.reminder_hour (null = automático). Sem opção de desligar: o celular já permite.
import React, { useCallback, useRef, useState } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CheckCircle, Sparkle } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/stats/StatsUI';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { useAuth } from '@/hooks/useAuth';
import { appAlert } from '@/components/ui/AppAlert';
import { reminderHourLabel } from '@/lib/reminderTime';

const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  border:    'rgba(22,19,31,0.08)',
  accent:    '#6B4BFF',
  accentBg:  'rgba(107,75,255,0.08)',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
}) as object;

const MIN_H = 9, MAX_H = 20; // 9h a 20h
const DEFAULT_FIXED = 18;

export default function ReminderTimeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const isPt = systemIsPt; // tela de conta = idioma do aparelho

  const [hour, setHour] = useState<number | null>(null);      // null = automático
  const [fixed, setFixed] = useState<number>(DEFAULT_FIXED);  // hora mostrada no seletor
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<number | null>(null);

  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    let alive = true;
    supabase.from('charlotte_users').select('reminder_hour').eq('id', profile.id).maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const h = (data as { reminder_hour?: number | null } | null)?.reminder_hour ?? null;
        setHour(h); savedRef.current = h; if (h != null) setFixed(h); setLoading(false);
      });
    return () => { alive = false; };
  }, [profile?.id]));

  // Grava com um pequeno atraso: tocar várias vezes no + ou no − vira um salvamento só.
  const save = (h: number | null) => {
    if (!profile?.id) return;
    setHour(h);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (h === savedRef.current) return;
      setSaving(true);
      const { error } = await supabase.from('charlotte_users').update({ reminder_hour: h } as never).eq('id', profile.id);
      setSaving(false);
      if (error) {
        setHour(savedRef.current);
        appAlert(isPt ? 'Não foi possível salvar' : 'Could not save', isPt ? 'Confira sua conexão e tente de novo.' : 'Check your connection and try again.');
      } else {
        savedRef.current = h;
      }
    }, 600);
  };

  const step = (d: number) => {
    const next = Math.min(MAX_H, Math.max(MIN_H, fixed + d));
    setFixed(next); save(next);
  };

  const Radio = ({ selected }: { selected: boolean }) => selected
    ? <CheckCircle size={22} color={C.accent} weight="fill" />
    : <View style={{ width: 20, height: 20, margin: 1, borderRadius: 10, borderWidth: 1.5, borderColor: C.navyLight }} />;

  const StepBtn = ({ label, d, disabled }: { label: string; d: number; disabled: boolean }) => (
    <TouchableOpacity
      onPress={() => step(d)}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={d > 0 ? (isPt ? 'Mais tarde' : 'Later') : (isPt ? 'Mais cedo' : 'Earlier')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? C.bg : C.accentBg }}
    >
      <AppText style={{ fontSize: 26, fontWeight: '700', color: disabled ? C.navyLight : C.accent, lineHeight: 30 }}>{label}</AppText>
    </TouchableOpacity>
  );

  const isAuto = hour == null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Horário do lembrete' : 'Reminder time'} right={saving ? <ActivityIndicator size="small" color={C.accent} /> : undefined} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom, gap: 14 }}>
          <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 20 }}>
            {isPt
              ? 'Escolha quando você quer receber o lembrete para praticar. Os avisos só chegam entre 9h e 21h.'
              : 'Choose when you want your practice reminder. Notifications only arrive between 9 AM and 9 PM.'}
          </AppText>

          <View style={{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', ...cardShadow }}>
            <TouchableOpacity
              onPress={() => save(null)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected: isAuto }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: isAuto ? C.accentBg : 'transparent' }}
            >
              <Sparkle size={20} color={C.accent} weight="fill" />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 15.5, fontWeight: isAuto ? '800' : '600', color: C.navy }}>
                  {isPt ? 'No horário em que costumo estudar' : 'Around when I usually study'}
                </AppText>
                <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 2, lineHeight: 18 }}>
                  {isPt ? 'A Charlotte ajusta sozinha, pelo seu ritmo.' : 'Charlotte adjusts it to your rhythm.'}
                </AppText>
              </View>
              <Radio selected={isAuto} />
            </TouchableOpacity>

            <View style={{ borderTopWidth: 1, borderTopColor: C.border, backgroundColor: !isAuto ? C.accentBg : 'transparent' }}>
              <TouchableOpacity
                onPress={() => save(fixed)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected: !isAuto }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
              >
                <Bell size={20} color={C.accent} weight="fill" />
                <AppText style={{ flex: 1, fontSize: 15.5, fontWeight: !isAuto ? '800' : '600', color: C.navy }}>
                  {isPt ? 'Em um horário fixo' : 'At a fixed time'}
                </AppText>
                <Radio selected={!isAuto} />
              </TouchableOpacity>
              {!isAuto && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 18, paddingTop: 2 }}>
                  <StepBtn label="−" d={-1} disabled={fixed <= MIN_H} />
                  <AppText display style={{ minWidth: 96, textAlign: 'center', fontSize: 34, fontWeight: '800', color: C.navy }}>
                    {reminderHourLabel(fixed, isPt)}
                  </AppText>
                  <StepBtn label="+" d={1} disabled={fixed >= MAX_H} />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
