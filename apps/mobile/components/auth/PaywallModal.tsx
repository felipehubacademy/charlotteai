/**
 * components/auth/PaywallModal.tsx
 * Full-screen paywall shown when the user has no active subscription.
 *
 * Copy strategy: loss aversion — mostra o que o usuário vai perder,
 * personalizado com nome + streak (fallback: XP) ja acumulado.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fire, Trophy, MicrophoneStage, ChatCircleText, SignOut, ArrowsClockwise, X } from 'phosphor-react-native';
import { usePaywallContext } from '@/lib/paywallContext';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  getOffering,
  getOfferingDetailed,
  purchasePackage,
  restorePurchases,
  syncSubscriptionToSupabase,
  PRODUCT_YEARLY,
  ENTITLEMENT_ID,
  identifyUser,
} from '@/lib/purchases';

const C = {
  bg:         '#F4F3FA',
  card:       '#FFFFFF',
  cardBorder: 'rgba(22,21,58,0.10)',
  green:      '#A3FF3C',
  greenDark:  '#3D8800',
  navy:       '#16153A',
  navyMid:    '#4B4A72',
  white:      '#FFFFFF',
  muted:      '#9896B8',
  highlight:  'rgba(163,255,60,0.12)',
  lossRed:    '#FF4444',
  lossRedBg:  'rgba(255,68,68,0.08)',
};

const LOSE_ITEMS = [
  { icon: <ChatCircleText size={18} color={C.greenDark} weight="fill" />, text: 'Conversas em tempo real com a Charlotte' },
  { icon: <MicrophoneStage size={18} color={C.greenDark} weight="fill" />, text: 'Chamadas em voz e feedback de pronúncia' },
  { icon: <Trophy size={18} color={C.greenDark} weight="fill" />, text: 'Lições, exercícios e progresso na trilha' },
];

export function PaywallModal() {
  const { profile, hasAccess, signOut, refreshProfile } = useAuth();
  const { paywallOpen, closePaywall } = usePaywallContext();
  const insets = useSafeAreaInsets();

  const forcedOpen = paywallOpen && !!profile && hasAccess;
  const visible    = (!!profile && !hasAccess) || forcedOpen;

  const [offering, setOffering]         = useState<PurchasesOffering | null>(null);
  const [selected, setSelected]         = useState<string>(PRODUCT_YEARLY);
  const [loading, setLoading]           = useState(false);
  const [loadingOffer, setLoadingOffer] = useState(true);

  // Dados de progresso do usuario
  const [streakDays, setStreakDays] = useState<number>(0);
  const [totalXP, setTotalXP]       = useState<number>(0);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    if (!visible || !profile?.id) return;
    setLoadingOffer(true);
    let cancelled = false;

    const tryFetch = () => {
      const timeout = setTimeout(() => { if (!cancelled) setLoadingOffer(false); }, 10000);
      getOffering().then(o => {
        if (cancelled) return;
        if (o) {
          setOffering(o);
          setLoadingOffer(false);
        } else {
          // Nao carregou — libera botao e agenda retry em 8s
          setLoadingOffer(false);
          setTimeout(() => { if (!cancelled) tryFetch(); }, 8000);
        }
      }).catch(() => {
        if (!cancelled) setLoadingOffer(false);
      }).finally(() => clearTimeout(timeout));
    };

    tryFetch();
    return () => { cancelled = true; };
  }, [visible]);

  useEffect(() => {
    if (!visible || !profile?.id || progressLoaded) return;
    supabase
      .from('charlotte_progress')
      .select('streak_days, total_xp')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        setStreakDays(data?.streak_days ?? 0);
        setTotalXP(data?.total_xp ?? 0);
        setProgressLoaded(true);
      });
  }, [visible, profile?.id]);

  const selectedPkg = useCallback((): PurchasesPackage | null => {
    if (!offering) return null;
    return offering.availablePackages.find(
      p => p.product.identifier === selected
    ) ?? offering.availablePackages[0] ?? null;
  }, [offering, selected]);

  const handlePurchase = async () => {
    let pkg = selectedPkg();
    let errorMsg: string | undefined;
    let diagnostics: string | undefined;
    // Se offering ainda nao carregou, tenta buscar de novo antes de desistir
    if (!pkg) {
      setLoadingOffer(true);
      const r = await getOfferingDetailed();
      setLoadingOffer(false);
      if (r.offering) {
        setOffering(r.offering);
        pkg = r.offering.availablePackages.find(p => p.product.identifier === selected)
          ?? r.offering.availablePackages[0]
          ?? null;
      } else {
        errorMsg = r.errorMessage;
        diagnostics = r.diagnostics;
      }
    }
    if (!pkg) {
      Alert.alert(
        'Planos indisponíveis',
        errorMsg ?? 'Os planos ainda não estão disponíveis. Tente novamente em alguns instantes.',
        diagnostics ? [
          { text: 'OK' },
          { text: 'Ver detalhes', onPress: () => Alert.alert('Detalhes técnicos', diagnostics!) },
        ] : undefined,
      );
      return;
    }
    setLoading(true);
    // Salvaguarda: garante que a compra seja vinculada ao UUID do Supabase
    // e não a um $RCAnonymousID. identifyUser é idempotente.
    if (profile?.id) await identifyUser(profile.id);
    const result = await purchasePackage(pkg);

    if (result.cancelled) {
      setLoading(false);
      return;
    }

    if (result.success && result.customerInfo && profile?.id) {
      // Mantém loading até o listener destravar hasAccess — evita usuário
      // achar que deu erro e clicar de novo entre purchase success e paywall fechar.
      await syncSubscriptionToSupabase(profile.id, result.customerInfo).catch(() => {});
      await refreshProfile();
      return;
    }

    setLoading(false);
    if (!result.success) {
      // Code 7 (RECEIPT_ALREADY_IN_USE_ERROR): essa Apple Account já tem
      // assinatura vinculada a outra conta Charlotte. Oferece restaurar
      // (que também vai falhar, mas é o fluxo que o user entende) ou explica.
      if (result.errorCode === 7) {
        Alert.alert(
          'Assinatura vinculada a outra conta',
          'Esta conta Apple já tem uma assinatura Charlotte ativa em outro usuário do app.\n\nEntre com a conta Charlotte que fez a compra original, ou fale com o suporte.',
          [
            { text: 'OK' },
            {
              text: 'Falar com suporte',
              onPress: () => {
                const subject = encodeURIComponent('Assinatura vinculada a outra conta');
                const body = encodeURIComponent(
                  `Olá! Tentei assinar no app mas apareceu mensagem de que minha conta Apple já tem assinatura em outro usuário.\n\nMeu email Charlotte: ${profile?.email ?? ''}\n\nPode me ajudar?`,
                );
                Linking.openURL(`mailto:suporte@hubacademybr.com?subject=${subject}&body=${body}`);
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Erro na compra',
          'Não foi possível processar o pagamento. Tente novamente em alguns instantes.',
        );
      }
    }
  };

  // Libera loading quando o paywall deixar de ser visível (compra efetivada).
  // Fallback de 8s caso o listener não dispare, pra não travar o botão.
  useEffect(() => {
    if (!loading) return;
    if (!visible) {
      setLoading(false);
      return;
    }
    const safety = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(safety);
  }, [visible, loading]);

  const handleRestore = async () => {
    setLoading(true);
    const r = await restorePurchases();
    setLoading(false);

    if (r.success && r.customerInfo && profile?.id) {
      await syncSubscriptionToSupabase(profile.id, r.customerInfo);
      await refreshProfile();
    }

    if (!r.hasPremium) {
      const isReceiptInUse = r.errorCode === 7;
      Alert.alert(
        isReceiptInUse
          ? 'Assinatura vinculada a outra conta'
          : 'Nenhuma assinatura encontrada nesta conta',
        isReceiptInUse
          ? 'Esta conta Apple já tem uma assinatura Charlotte ativa em outro usuário. Entre com a conta Charlotte original ou fale com o suporte.'
          : 'Não encontramos assinatura Charlotte vinculada a este usuário.\n\nSe você já comprou antes, pode ser que a assinatura esteja em outra conta Charlotte. Entre com a conta original ou fale com o suporte.',
        [
          { text: 'OK' },
          {
            text: 'Falar com suporte',
            onPress: () => {
              const subject = encodeURIComponent(
                isReceiptInUse ? 'Assinatura vinculada a outra conta' : 'Restaurar compra',
              );
              const body = encodeURIComponent(
                `Olá! Tentei restaurar minha assinatura no app.\n\nMeu email Charlotte: ${profile?.email ?? ''}\n\nPode me ajudar?`,
              );
              Linking.openURL(`mailto:suporte@hubacademybr.com?subject=${subject}&body=${body}`);
            },
          },
        ],
      );
    }
  };

  // Package display helpers
  const monthlyPkg = offering?.availablePackages.find(
    p => p.product.identifier.includes('monthly')
  );
  const yearlyPkg = offering?.availablePackages.find(
    p => p.product.identifier.includes('yearly')
  );

  const monthlyPrice = monthlyPkg?.product.priceString ?? 'R$ 29,90';
  const yearlyPrice  = yearlyPkg?.product.priceString  ?? 'R$ 199,90';

  const yearlyMonthly = yearlyPkg
    ? `${yearlyPkg.product.currencyCode} ${(yearlyPkg.product.price / 12).toFixed(2).replace('.', ',')}`
    : 'R$ 16,66';

  // Headline personalizada. O gancho de streak só faz sentido quando a
  // sequência já é relevante (>= 3 dias) — "sua sequência de 1 dia está em
  // risco" não convence ninguém. Abaixo disso, usa o XP acumulado (que sobe
  // rápido); e se nem XP houver, um apelo neutro de continuidade.
  const firstName = profile?.name?.split(' ')[0] ?? '';
  const useStreak = streakDays >= 3;
  const useXp     = !useStreak && totalXP >= 50;

  const streakLine = firstName
    ? `${firstName}, sua sequência de ${streakDays} dias está em risco.`
    : `Sua sequência de ${streakDays} dias está em risco.`;
  const xpLine = firstName
    ? `${firstName}, você acumulou ${totalXP} XP praticando com a Charlotte.`
    : `Você acumulou ${totalXP} XP praticando com a Charlotte.`;
  const neutralLine = firstName
    ? `${firstName}, continue evoluindo seu inglês com a Charlotte.`
    : 'Continue evoluindo seu inglês com a Charlotte.';

  const headline = useStreak ? streakLine : useXp ? xpLine : neutralLine;

  const subheadline = 'Não deixe tudo isso ir embora. Continue de onde parou.';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: C.bg }}>

        {/* Botao fechar — so quando aberto manualmente (trial ainda ativo) */}
        {forcedOpen && (
          <TouchableOpacity
            onPress={closePaywall}
            style={{
              position: 'absolute', top: insets.top + 12, right: 20,
              zIndex: 10, padding: 8,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={22} color={C.navyMid} weight="bold" />
          </TouchableOpacity>
        )}

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >

          {/* Container com largura maxima para iPad */}
          <View style={{ width: '100%', maxWidth: 480, paddingHorizontal: 24, alignItems: 'center' }}>

          {/* Icone de perda */}
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: C.lossRedBg,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            {useStreak
              ? <Fire size={32} color={C.lossRed} weight="fill" />
              : <Trophy size={32} color={C.lossRed} weight="fill" />
            }
          </View>

          {/* Headline personalizada */}
          <AppText style={{
            fontSize: 22, fontWeight: '800', color: C.navy,
            textAlign: 'center', marginBottom: 10, lineHeight: 30,
          }}>
            {headline}
          </AppText>
          <AppText style={{
            fontSize: 14, color: C.navyMid,
            textAlign: 'center', marginBottom: 28, lineHeight: 20,
          }}>
            {subheadline}
          </AppText>

          {/* O que vai perder */}
          <View style={{
            alignSelf: 'stretch',
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 28,
            gap: 14,
            ...Platform.select({
              ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
              android: { elevation: 2 },
            }),
          }}>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
              Você vai perder acesso a
            </AppText>
            {LOSE_ITEMS.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {item.icon}
                <AppText style={{ color: C.navyMid, fontSize: 14, flex: 1 }}>
                  {item.text}
                </AppText>
              </View>
            ))}
          </View>

          {/* Plan cards — sempre visíveis, spinner fica só no botão */}
          {(
            <View style={{ alignSelf: 'stretch', gap: 12, marginBottom: 28 }}>

              {/* Annual */}
              <TouchableOpacity
                onPress={() => setSelected(yearlyPkg?.product.identifier ?? PRODUCT_YEARLY)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: selected.includes('yearly') ? C.highlight : C.card,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: selected.includes('yearly') ? C.greenDark : C.cardBorder,
                  padding: 18,
                  ...Platform.select({
                    ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
                    android: { elevation: selected.includes('yearly') ? 0 : 2 },
                  }),
                }}
              >
                <View style={{
                  position: 'absolute', top: -10, right: 16,
                  backgroundColor: C.greenDark, borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <AppText style={{ color: C.white, fontSize: 11, fontWeight: '800' }}>
                    MELHOR VALOR
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '700' }}>Anual</AppText>
                    <AppText style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {yearlyMonthly}/mês
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText style={{ color: C.greenDark, fontSize: 20, fontWeight: '800' }}>
                      {yearlyPrice}
                    </AppText>
                    <AppText style={{ color: C.muted, fontSize: 11 }}>/ano</AppText>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                onPress={() => setSelected(monthlyPkg?.product.identifier ?? 'com.hubacademy.charlotte.monthly')}
                activeOpacity={0.85}
                style={{
                  backgroundColor: C.card,
                  borderRadius: 16,
                  borderWidth: selected.includes('monthly') ? 2 : 1,
                  borderColor: selected.includes('monthly') ? C.greenDark : C.cardBorder,
                  padding: 18,
                  ...Platform.select({
                    ios:     { shadowColor: 'rgba(22,21,58,0.06)', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
                    android: { elevation: selected.includes('monthly') ? 0 : 1 },
                  }),
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '700' }}>Mensal</AppText>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText style={{ color: C.navy, fontSize: 20, fontWeight: '800' }}>
                      {monthlyPrice}
                    </AppText>
                    <AppText style={{ color: C.muted, fontSize: 11 }}>/mês</AppText>
                  </View>
                </View>
              </TouchableOpacity>

            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={loading || loadingOffer}
            activeOpacity={0.85}
            style={{
              alignSelf: 'stretch',
              backgroundColor: C.green,
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              opacity: loading || loadingOffer ? 0.6 : 1,
            }}
          >
            {(loading || loadingOffer)
              ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color={C.navy} />
                  {loading && (
                    <AppText style={{ color: C.navy, fontSize: 14, fontWeight: '700' }}>
                      Confirmando compra…
                    </AppText>
                  )}
                </View>
              )
              : (() => {
                  const isYearly = selected.includes('yearly');
                  const priceLabel = isYearly
                    ? `${yearlyPrice}/ano`
                    : `${monthlyPrice}/mês`;
                  return (
                    <AppText style={{ color: C.navy, fontSize: 16, fontWeight: '800' }}>
                      Assinar — {priceLabel}
                    </AppText>
                  );
                })()
            }
          </TouchableOpacity>

          <AppText style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginBottom: 24, lineHeight: 16 }}>
            Cobrança imediata ao assinar. Renovação automática. Cancele quando quiser.
          </AppText>

          {/* Restore */}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={loading}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 }}
          >
            <ArrowsClockwise size={14} color={C.muted} />
            <AppText style={{ color: C.muted, fontSize: 13 }}>Restaurar compras</AppText>
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            onPress={signOut}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
          >
            <SignOut size={14} color={C.muted} />
            <AppText style={{ color: C.muted, fontSize: 13 }}>Sair da conta</AppText>
          </TouchableOpacity>

          </View>{/* fim container iPad */}

        </ScrollView>
      </View>
    </Modal>
  );
}
