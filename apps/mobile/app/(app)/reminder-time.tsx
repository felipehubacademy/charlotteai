// Perfil > Horário do lembrete: o aluno escolhe a hora do lembrete diário (9h a 20h, no fuso dele)
// ou deixa no automático (lembrete às 11h + "oi da Charlotte" perto do horário em que costuma estudar).
// Grava charlotte_users.reminder_hour (null = automático). Sem opção de desligar: o celular já permite.
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Sparkle } from 'phosphor-react-native';
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

const HOURS = Array.from({ length: 12 }, (_, i) => 9 + i); // 9h a 20h

export default function ReminderTimeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const isPt = systemIsPt; // tela de conta = idioma do aparelho

  const [hour, setHour] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | 'auto' | null>(null);

  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    let alive = true;
    supabase.from('charlotte_users').select('reminder_hour').eq('id', profile.id).maybeSingle()
      .then(({ data }) => { if (alive) { setHour((data as { reminder_hour?: number | null } | null)?.reminder_hour ?? null); setLoading(false); } });
    return () => { alive = false; };
  }, [profile?.id]));

  const choose = async (h: number | null) => {
    if (!profile?.id || saving != null || h === hour) return;
    const prev = hour;
    setHour(h); setSaving(h ?? 'auto');
    const { error } = await supabase.from('charlotte_users').update({ reminder_hour: h } as never).eq('id', profile.id);
    setSaving(null);
    if (error) {
      setHour(prev);
      appAlert(isPt ? 'Não foi possível salvar' : 'Could not save', isPt ? 'Confira sua conexão e tente de novo.' : 'Check your connection and try again.');
    }
  };

  const Option = ({ h, title, subtitle, icon }: { h: number | null; title: string; subtitle?: string; icon?: React.ReactNode }) => {
    const selected = hour === h;
    const busy = saving === (h ?? 'auto');
    return (
      <TouchableOpacity
        onPress={() => choose(h)}
        activeOpacity={0.75}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: selected ? C.accentBg : 'transparent',
        }}
      >
        {icon}
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 15.5, fontWeight: selected ? '800' : '600', color: C.navy }}>{title}</AppText>
          {!!subtitle && <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 2, lineHeight: 18 }}>{subtitle}</AppText>}
        </View>
        {busy
          ? <ActivityIndicator size="small" color={C.accent} />
          : selected
            ? <CheckCircle size={22} color={C.accent} weight="fill" />
            : <View style={{ width: 20, height: 20, margin: 1, borderRadius: 10, borderWidth: 1.5, borderColor: C.navyLight }} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Horário do lembrete' : 'Reminder time'} />
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
            <Option
              h={null}
              icon={<Sparkle size={20} color={C.accent} weight="fill" />}
              title={isPt ? 'Me lembrar no horário em que costumo estudar' : 'Remind me around when I usually study'}
              subtitle={isPt ? 'A Charlotte ajusta sozinha, pelo seu ritmo.' : 'Charlotte adjusts it to your rhythm.'}
            />
          </View>

          <AppText style={{ fontSize: 12, fontWeight: '800', color: C.navyLight, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>
            {isPt ? 'Ou escolha um horário fixo' : 'Or pick a fixed time'}
          </AppText>
          <View style={{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', ...cardShadow }}>
            {HOURS.map((h, i) => (
              <View key={h} style={i > 0 ? { borderTopWidth: 1, borderTopColor: C.border } : undefined}>
                <Option h={h} title={reminderHourLabel(h, isPt)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
