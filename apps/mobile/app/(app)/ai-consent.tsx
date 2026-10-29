/**
 * app/(app)/ai-consent.tsx
 *
 * Tela de consentimento de IA — exigida pela Apple (Guideline 5.1.1(i) / 5.1.2(i)).
 * Exibida uma única vez, antes do primeiro uso, após o onboarding.
 * Sempre em PT-BR — consentimento deve ser claro para todos os usuários.
 *
 * Armazena o consentimento em expo-secure-store (chave: ai_consent_v1).
 * Após aceitar, retorna à raiz do app via router.replace('/(app)'); conta nova saindo da abertura
 * (app/(app)/charlotte-intro.tsx) vai direto para a 1ª lição.
 */

import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from '@/lib/hapticsGated';
import { ChatCircle, SpeakerHigh, Microphone } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { saveAiConsent } from '@/lib/aiConsent';
import { useAuth } from '@/hooks/useAuth';
import { Image } from 'react-native';
import { systemIsPt } from '@/lib/systemLang';
import { isFirstLessonPending, firstLessonRoute } from '@/lib/welcome';
import { track } from '@/lib/analytics';

// Aviso legal/sistema: segue o idioma do aparelho.
const isPt = systemIsPt;

const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  muted:     '#8A8494',
  border:    'rgba(22,19,31,0.08)',
  green:     '#DCFF4A',
  greenDark: '#08804A',
  greenBg:   'rgba(220,255,74,0.10)',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 2 },
}) as object;

interface ServiceRowProps {
  icon: React.ReactNode;
  name: string;
  data: string;
  last?: boolean;
}

function ServiceRow({ icon, name, data, last }: ServiceRowProps) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 14,
      paddingVertical: 16,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: C.border,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#EEF9E4',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 16, fontWeight: '700', color: C.navy }}>{name}</AppText>
        <AppText style={{ fontSize: 14, color: C.navyMid, marginTop: 3, lineHeight: 20 }}>{data}</AppText>
      </View>
    </View>
  );
}

export default function AIConsentScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  // Conta nova saindo da abertura (lib/welcome): daqui vai direto para a 1ª lição.
  const [firstLesson, setFirstLesson] = useState(false);
  useEffect(() => {
    if (profile?.id) isFirstLessonPending(profile.id).then(setFirstLesson).catch(() => {});
  }, [profile?.id]);

  const handleAccept = async () => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (profile?.id) await saveAiConsent(profile.id);
    const lesson = firstLesson ? firstLessonRoute(profile?.charlotte_level) : null;
    if (lesson) { track('welcome_first_lesson_open', {}); router.replace(lesson as any); }
    else router.replace('/(app)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* A Charlotte explica, no mesmo balão da tela inicial */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 24, paddingTop: 28 }}>
          <Image source={require('@/assets/charlotte-avatar.png')} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.navy }} accessibilityLabel="Charlotte" />
          <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 18, paddingVertical: 16, ...cardShadow }}>
            <AppText display style={{ fontSize: 21, lineHeight: 26, fontWeight: '800', color: C.navy }}>
              {isPt ? 'Rapidinho, antes de começar: como eu funciono.' : 'Real quick before we start: how I work.'}
            </AppText>
          </View>
        </View>

        {/* Card de serviços */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <View style={{ backgroundColor: C.card, borderRadius: 22, paddingHorizontal: 18, ...cardShadow }}>
            <ServiceRow
              icon={<ChatCircle size={22} color={C.greenDark} weight="bold" />}
              name={isPt ? 'Converso com inteligência artificial' : 'I talk using artificial intelligence'}
              data={isPt
                ? 'Suas mensagens vão para um provedor de IA só para gerar a resposta. Nada fica guardado lá.'
                : 'Your messages go to an AI provider only to generate the reply. Nothing is kept there.'}
            />
            <ServiceRow
              icon={<SpeakerHigh size={22} color={C.greenDark} weight="bold" />}
              name={isPt ? 'Minha voz é gerada por IA' : 'My voice is AI-generated'}
              data={isPt ? 'Só o texto da fala é enviado, sem dados seus.' : 'Only the text of what I say is sent, none of your data.'}
            />
            <ServiceRow
              icon={<Microphone size={22} color={C.greenDark} weight="bold" />}
              name={isPt ? 'Escuto sua pronúncia' : 'I listen to your pronunciation'}
              data={isPt
                ? 'O áudio do microfone é analisado na hora e descartado em seguida.'
                : 'Microphone audio is analyzed on the spot and discarded right after.'}
              last
            />
          </View>

          {/* Nota legal */}
          <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', lineHeight: 19, marginTop: 18, paddingHorizontal: 4 }}>
            {isPt
              ? 'Nunca vendemos nem compartilhamos seus dados pessoais. Ao continuar, você concorda com isso e com a nossa '
              : 'We never sell or share your personal data. By continuing, you agree to this and to our '}
            <AppText
              style={{ color: C.greenDark, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://queizy.com/privacidade')}
            >
              {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
            </AppText>
            .
          </AppText>
        </View>
      </ScrollView>

      {/* Botão aceitar */}
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={handleAccept}
          disabled={loading}
          activeOpacity={0.85}
          style={{ backgroundColor: C.navy, borderRadius: 29, height: 58, alignItems: 'center', justifyContent: 'center' }}
        >
          {loading
            ? <ActivityIndicator color={C.green} size="small" />
            : <AppText display style={{ color: C.green, fontWeight: '800', fontSize: 17 }}>
                {firstLesson
                  ? (isPt ? 'Fechou, bora pra primeira lição!' : "Deal, let's do my first lesson!")
                  : (isPt ? 'Fechou, bora!' : "Deal, let's go!")}
              </AppText>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
