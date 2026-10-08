/**
 * app/(app)/ai-consent.tsx
 *
 * Tela de consentimento de IA — exigida pela Apple (Guideline 5.1.1(i) / 5.1.2(i)).
 * Exibida uma única vez, antes do primeiro uso, após o onboarding.
 * Sempre em PT-BR — consentimento deve ser claro para todos os usuários.
 *
 * Armazena o consentimento em expo-secure-store (chave: ai_consent_v1).
 * Após aceitar, retorna à raiz do app via router.replace('/(app)').
 */

import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from '@/lib/hapticsGated';
import { ArrowRight, ShieldCheck, MicrophoneStage, SpeakerHigh, Brain } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { AI_CONSENT_KEY } from '@/lib/aiConsent';
import { Image } from 'react-native';
import { systemIsPt } from '@/lib/systemLang';

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
  purpose: string;
  data: string;
  last?: boolean;
}

function ServiceRow({ icon, name, purpose, data, last }: ServiceRowProps) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingVertical: 14,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: C.border,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.greenBg,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>{name}</AppText>
        <AppText style={{ fontSize: 12, color: C.navyMid, marginTop: 2, lineHeight: 17 }}>{purpose}</AppText>
        <AppText style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 }}>{data}</AppText>
      </View>
    </View>
  );
}

export default function AIConsentScreen() {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await SecureStore.setItemAsync(AI_CONSENT_KEY, '1');
    router.replace('/(app)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — ícone do Queizy */}
        <View style={{ alignItems: 'center', paddingTop: 36, paddingBottom: 8 }}>
          <Image source={require('@/assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 22 }} accessibilityLabel="Queizy" />
        </View>

        {/* Título + subtítulo */}
        <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 8 }}>
          <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
            {isPt ? 'Tecnologias de IA' : 'AI technologies'}
          </AppText>
          <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
            {isPt
              ? 'O Queizy usa serviços de Inteligência Artificial para oferecer uma experiência de aprendizado personalizada, com a Charlotte como sua tutora.'
              : 'Queizy uses Artificial Intelligence services to offer a personalized learning experience, with Charlotte as your tutor.'}
          </AppText>
        </View>

        {/* Card de serviços */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, ...cardShadow }}>
            <ServiceRow
              icon={<Brain size={18} color={C.greenDark} weight="duotone" />}
              name={isPt ? 'Inteligência de linguagem' : 'Language intelligence'}
              purpose={isPt
                ? 'Gera explicações, exercícios e feedback personalizado nas conversas e na trilha de aprendizado.'
                : 'Generates explanations, exercises and personalized feedback in conversations and on the learning path.'}
              data={isPt
                ? 'Suas mensagens são enviadas a um provedor de IA para processamento. Nenhum dado é armazenado permanentemente após o processamento.'
                : 'Your messages are sent to an AI provider for processing. No data is stored permanently after processing.'}
            />
            <ServiceRow
              icon={<SpeakerHigh size={18} color={C.greenDark} weight="duotone" />}
              name={isPt ? 'Síntese de voz' : 'Voice synthesis'}
              purpose={isPt ? 'Converte texto em voz para as falas da Charlotte, sua tutora.' : 'Turns text into speech for Charlotte, your tutor.'}
              data={isPt ? 'Apenas texto é enviado. Nenhuma informação pessoal é transmitida.' : 'Only text is sent. No personal information is transmitted.'}
            />
            <ServiceRow
              icon={<MicrophoneStage size={18} color={C.greenDark} weight="duotone" />}
              name={isPt ? 'Análise de pronúncia' : 'Pronunciation analysis'}
              purpose={isPt ? 'Avalia sua pronúncia e reconhece sua voz nos exercícios.' : 'Scores your pronunciation and recognizes your voice in the exercises.'}
              data={isPt
                ? 'Áudio capturado pelo microfone é enviado a um serviço de análise de fala em tempo real e descartado logo em seguida.'
                : 'Audio captured by the microphone is sent to a real-time speech analysis service and discarded right after.'}
              last
            />
          </View>

          {/* Nota de proteção */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            backgroundColor: C.greenBg, borderRadius: 12, padding: 14, marginTop: 16,
          }}>
            <ShieldCheck size={18} color={C.greenDark} weight="duotone" style={{ marginTop: 1 }} />
            <AppText style={{ flex: 1, fontSize: 12, color: C.navyMid, lineHeight: 18 }}>
              {isPt
                ? 'Seus dados de aprendizado são armazenados com segurança em nossa infraestrutura. Nunca vendemos nem compartilhamos suas informações pessoais com terceiros.'
                : 'Your learning data is stored securely on our infrastructure. We never sell or share your personal information with third parties.'}
            </AppText>
          </View>

          {/* Nota legal */}
          <AppText style={{ fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, marginTop: 20, marginBottom: 24 }}>
            {isPt
              ? 'Ao continuar, você concorda com o uso dessas tecnologias conforme descrito acima e na nossa '
              : 'By continuing, you agree to the use of these technologies as described above and in our '}
            <AppText
              style={{ color: C.greenDark, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://queizy.com/privacidade')}
            >
              {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
            </AppText>
            .
          </AppText>

          {/* Botão aceitar */}
          <TouchableOpacity
            onPress={handleAccept}
            disabled={loading}
            style={{
              backgroundColor: loading ? `${C.green}80` : C.green,
              borderRadius: 16, paddingVertical: 17,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <ActivityIndicator color={C.navy} size="small" />
              : <>
                  <AppText style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>
                    {isPt ? 'Entendi e aceito' : 'I understand and accept'}
                  </AppText>
                  <ArrowRight size={16} color={C.navy} weight="bold" />
                </>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
