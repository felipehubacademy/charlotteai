// app/(app)/support.tsx
// Ajuda e suporte — canais diretos (email/WhatsApp) + FAQ inline.
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, EnvelopeSimple, WhatsappLogo, CaretDown, CaretRight, Question,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';

const SUPPORT_EMAIL = 'suporte@hubacademybr.com';
// Número do WhatsApp de suporte (formato internacional, só dígitos). Preencher
// quando o WhatsApp Business estiver no ar; enquanto vazio, a opção fica oculta.
const SUPPORT_WHATSAPP = '';

const C = {
  bg: '#F4F3FA', card: '#FFFFFF', navy: '#16153A', navyMid: '#4B4A72',
  navyLight: '#9896B8', border: 'rgba(22,21,58,0.08)', green: '#A3FF3C', greenDark: '#3D8800',
};
const cardShadow = Platform.select({
  ios: { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
}) as object;

interface Faq { q: string; a: string; }

const FAQ_PT: Faq[] = [
  { q: 'Como cancelo minha assinatura?', a: 'O cancelamento é feito na loja.\n\niPhone: Ajustes > seu nome > Assinaturas > Charlotte > Cancelar.\n\nAndroid: Google Play > perfil > Pagamentos e assinaturas > Assinaturas > Charlotte > Cancelar.\n\nVocê mantém o acesso até o fim do período já pago.' },
  { q: 'Cancelei — perco o acesso na hora?', a: 'Não. Ao cancelar, você continua com acesso até o fim do período que já pagou. O acesso só encerra quando a assinatura expira.' },
  { q: 'Como redefino minha senha?', a: 'Na tela de login, toque em "Esqueci minha senha", informe seu email e siga o link enviado.' },
  { q: 'Quais são os planos e preços?', a: 'Teste grátis de 7 dias. Plano Mensal R$ 29,90/mês e Plano Anual R$ 199,90/ano (~R$ 16,66/mês). Os valores exatos aparecem na tela de assinatura do app.' },
  { q: 'Como restauro minha compra?', a: 'Em Perfil > Restaurar compra. Você precisa estar logado na mesma conta da App Store ou Google Play usada na compra.' },
  { q: 'Como pedir reembolso?', a: 'Os reembolsos são feitos pela loja.\n\niPhone: acesse reportaproblem.apple.com.\n\nAndroid: pela ajuda do Google Play.\n\nSe precisar, fale com a gente pelos canais acima.' },
];

const FAQ_EN: Faq[] = [
  { q: 'How do I cancel my subscription?', a: 'Cancellation is done in the store.\n\niPhone: Settings > your name > Subscriptions > Charlotte > Cancel.\n\nAndroid: Google Play > profile > Payments & subscriptions > Subscriptions > Charlotte > Cancel.\n\nYou keep access until the end of the period you already paid for.' },
  { q: 'If I cancel, do I lose access right away?', a: 'No. When you cancel you keep access until the end of the period you already paid for. Access only ends when the subscription expires.' },
  { q: 'How do I reset my password?', a: 'On the login screen, tap "Forgot my password", enter your email and follow the link.' },
  { q: 'What are the plans and prices?', a: '7-day free trial. Monthly R$ 29.90/month and Yearly R$ 199.90/year (~R$ 16.66/month). Exact prices show on the subscription screen in the app.' },
  { q: 'How do I restore my purchase?', a: 'Profile > Restore purchase. You must be signed in to the same App Store or Google Play account used for the purchase.' },
  { q: 'How do I request a refund?', a: 'Refunds are handled by the store.\n\niPhone: go to reportaproblem.apple.com.\n\nAndroid: via Google Play help.\n\nIf you need help, contact us using the channels above.' },
];

function Row({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, gap: 12 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF7E4', alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 15, fontWeight: '600', color: C.navy }}>{label}</AppText>
        {!!sub && <AppText style={{ fontSize: 12.5, color: C.navyLight, marginTop: 2 }}>{sub}</AppText>}
      </View>
      <CaretRight size={16} color={C.navyLight} weight="bold" />
    </TouchableOpacity>
  );
}

function FaqRow({ item, open, onToggle }: { item: Faq; open: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: C.navy }}>{item.q}</AppText>
        {open ? <CaretDown size={16} color={C.navyLight} weight="bold" /> : <CaretRight size={16} color={C.navyLight} weight="bold" />}
      </View>
      {open && <AppText style={{ fontSize: 13.5, color: C.navyMid, marginTop: 8, lineHeight: 20 }}>{item.a}</AppText>}
    </TouchableOpacity>
  );
}

export default function SupportScreen() {
  const { profile } = useAuth();
  const isPt = profile?.charlotte_level === 'Novice';
  const [open, setOpen] = useState<number | null>(null);
  const faqs = isPt ? FAQ_PT : FAQ_EN;

  const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(isPt ? 'Suporte Charlotte' : 'Charlotte Support')}`;
  const waUrl = SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}` : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <AppText style={{ fontSize: 18, fontWeight: '700', color: C.navy }}>{isPt ? 'Ajuda e suporte' : 'Help & support'}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyLight, letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 }}>
          {isPt ? 'FALE COM A GENTE' : 'CONTACT US'}
        </AppText>
        <View style={[{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' }, cardShadow]}>
          <Row
            icon={<EnvelopeSimple size={19} color={C.greenDark} weight="regular" />}
            label={isPt ? 'Enviar email' : 'Send email'}
            sub={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(emailUrl).catch(() => {})}
          />
          {!!waUrl && (
            <>
              <View style={{ height: 1, backgroundColor: C.border, marginLeft: 62 }} />
              <Row
                icon={<WhatsappLogo size={19} color={C.greenDark} weight="regular" />}
                label={isPt ? 'Falar no WhatsApp' : 'Chat on WhatsApp'}
                sub={isPt ? 'Resposta rápida' : 'Quick reply'}
                onPress={() => Linking.openURL(waUrl).catch(() => {})}
              />
            </>
          )}
        </View>

        <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyLight, letterSpacing: 0.5, marginTop: 24, marginBottom: 8, marginLeft: 4 }}>
          {isPt ? 'PERGUNTAS FREQUENTES' : 'FREQUENTLY ASKED'}
        </AppText>
        <View style={[{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' }, cardShadow]}>
          {faqs.map((f, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 16 }} />}
              <FaqRow item={f} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            </React.Fragment>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 }}>
          <Question size={15} color={C.navyLight} weight="regular" />
          <AppText style={{ fontSize: 12.5, color: C.navyLight, textAlign: 'center' }}>
            {isPt ? 'Não achou o que procurava? Fale com a gente acima.' : "Didn't find what you need? Contact us above."}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
