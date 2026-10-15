/**
 * components/auth/PaywallModal.tsx
 * Full-screen paywall shown when the user has no active subscription.
 *
 * Conta nova (modelo de 2026-10-14): o teste grátis é o da loja (7 dias com o cartão da Apple/Google),
 * então o paywall abre logo depois das boas-vindas com "Comece seus 7 dias grátis".
 * Quem já usou o teste do app: loss aversion — o que vai perder, com nome + streak (ou XP).
 * O botão fica fixo no rodapé (sempre visível, acima da barra do Android).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, MicrophoneStage, ChatCircleText, SignOut, ArrowsClockwise, X, Target } from 'phosphor-react-native';
import { usePaywallContext } from '@/lib/paywallContext';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { HeaderLogo } from '@/components/ui/HeaderLogo';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';
import {
  getOffering,
  getOfferingDetailed,
  purchasePackage,
  restorePurchases,
  syncSubscriptionToSupabase,
  PRODUCT_YEARLY,
  ENTITLEMENT_ID,
  identifyUser,
  getTrialDays,
} from '@/lib/purchases';
import { appAlert, AppAlertHost } from '@/components/ui/AppAlert';

const C = {
  bg:         '#FAF7F0',
  card:       '#FFFFFF',
  cardBorder: 'rgba(22,19,31,0.10)',
  green:      '#DCFF4A',
  greenDark:  '#08804A',
  navy:       '#16131F',
  navyMid:    '#4D4858',
  white:      '#FFFFFF',
  muted:      '#8A8494',
  highlight:  '#F1FFB8',
};

const LOSE_ITEMS = [
  { icon: <ChatCircleText size={18} color={C.greenDark} weight="fill" />, pt: 'Conversas em tempo real com a Charlotte', en: 'Real-time conversations with Charlotte' },
  { icon: <MicrophoneStage size={18} color={C.greenDark} weight="fill" />, pt: 'Chamadas em voz e feedback de pronúncia', en: 'Voice calls and pronunciation feedback' },
  { icon: <Trophy size={18} color={C.greenDark} weight="fill" />, pt: 'Lições, exercícios e progresso na trilha', en: 'Lessons, exercises and progress on the track' },
];
// Conta nova também ganha o teste de nível (fica no teste de 7 dias).
const GAIN_ITEMS = [
  ...LOSE_ITEMS,
  { icon: <Target size={18} color={C.greenDark} weight="fill" />, pt: 'Teste de nível: comece no ponto certo da trilha', en: 'Level test: start at the right point of the track' },
];


/** Preço no formato da moeda da loja (R$ 16,66 · $16.66). */
function formatMoney(value: number, currency: string, isPt: boolean): string {
  try {
    return new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function PaywallModal() {
  const { profile, hasAccess, isTaster, signOut, refreshProfile } = useAuth();
  const { paywallOpen, closePaywall } = usePaywallContext();
  const insets = useSafeAreaInsets();

  // Paywall = tela de SISTEMA/transacional: idioma segue o device.
  const isPt = systemIsPt;

  const forcedOpen = paywallOpen && !!profile && hasAccess;
  const visible    = (!!profile && !hasAccess) || forcedOpen;

  const [offering, setOffering]         = useState<PurchasesOffering | null>(null);
  const [selected, setSelected]         = useState<string>(PRODUCT_YEARLY);
  const [loading, setLoading]           = useState(false);
  const [loadingOffer, setLoadingOffer] = useState(true);
  // Dias de teste grátis da loja por produto (só para quem tem direito).
  const [trialDays, setTrialDays]       = useState<Record<string, number>>({});
  useEffect(() => {
    if (!offering) return;
    let alive = true;
    getTrialDays(offering.availablePackages).then(t => { if (alive) setTrialDays(t); });
    return () => { alive = false; };
  }, [offering]);

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

  // No Android o id vem com o plano básico ("...yearly:annual-plan"); compara também pelo prefixo.
  // Sem isso, o anual pré-selecionado não casava e a compra caía no primeiro pacote (o mensal).
  const matches = (id: string, sel: string) => id === sel || id.startsWith(`${sel}:`) || sel.startsWith(`${id}:`);
  const findPkg = (pkgs: PurchasesPackage[], sel: string): PurchasesPackage | null =>
    pkgs.find(p => matches(p.product.identifier, sel))
    ?? (sel.includes('yearly') ? pkgs.find(p => p.packageType === 'ANNUAL') : pkgs.find(p => p.packageType === 'MONTHLY'))
    ?? null;

  const selectedPkg = useCallback((): PurchasesPackage | null => {
    if (!offering) return null;
    return findPkg(offering.availablePackages, selected);
  }, [offering, selected]); // eslint-disable-line react-hooks/exhaustive-deps

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
        pkg = findPkg(r.offering.availablePackages, selected);
      } else {
        errorMsg = r.errorMessage;
        diagnostics = r.diagnostics;
      }
    }
    if (!pkg) {
      appAlert(
        isPt ? 'Planos indisponíveis' : 'Plans unavailable',
        errorMsg ?? (isPt
          ? 'Os planos ainda não estão disponíveis. Tente novamente em alguns instantes.'
          : 'Plans are not available yet. Please try again in a moment.'),
        diagnostics ? [
          { text: 'OK' },
          { text: isPt ? 'Ver detalhes' : 'View details', onPress: () => appAlert(isPt ? 'Detalhes técnicos' : 'Technical details', diagnostics!) },
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
        appAlert(
          isPt ? 'Assinatura vinculada a outra conta' : 'Subscription linked to another account',
          isPt
            ? 'Esta conta da loja já tem uma assinatura Queizy ativa em outro usuário do app.\n\nEntre com a conta Queizy que fez a compra original, ou fale com o suporte.'
            : 'This store account already has an active Queizy subscription on another user.\n\nSign in with the Queizy account that made the original purchase, or contact support.',
          [
            { text: 'OK' },
            {
              text: isPt ? 'Falar com suporte' : 'Contact support',
              onPress: () => {
                const subject = encodeURIComponent('Assinatura vinculada a outra conta');
                const body = encodeURIComponent(
                  `Olá! Tentei assinar no app mas apareceu mensagem de que minha conta da loja já tem assinatura em outro usuário.\n\nMeu e-mail no Queizy: ${profile?.email ?? ''}\n\nPode me ajudar?`,
                );
                Linking.openURL(`mailto:suporte@queizy.com?subject=${subject}&body=${body}`);
              },
            },
          ],
        );
      } else {
        appAlert(
          isPt ? 'Erro na compra' : 'Purchase failed',
          isPt
            ? 'Não foi possível processar o pagamento. Tente novamente em alguns instantes.'
            : 'We couldn\'t process the payment. Please try again in a moment.',
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
      await syncSubscriptionToSupabase(profile.id, r.customerInfo).catch(() => {});
      await refreshProfile();
    }

    if (!r.hasPremium) {
      const isReceiptInUse = r.errorCode === 7;
      appAlert(
        isReceiptInUse
          ? (isPt ? 'Assinatura vinculada a outra conta' : 'Subscription linked to another account')
          : (isPt ? 'Nenhuma assinatura encontrada nesta conta' : 'No subscription found on this account'),
        isReceiptInUse
          ? (isPt
              ? 'Esta conta da loja já tem uma assinatura Queizy ativa em outro usuário. Entre com a conta Queizy original ou fale com o suporte.'
              : 'This store account already has an active Queizy subscription on another user. Sign in with the original Queizy account or contact support.')
          : (isPt
              ? 'Não encontramos assinatura Queizy vinculada a este usuário.\n\nSe você já comprou antes, pode ser que a assinatura esteja em outra conta Queizy. Entre com a conta original ou fale com o suporte.'
              : 'We couldn’t find a Queizy subscription linked to this user.\n\nIf you’ve purchased before, it may be on another Queizy account. Sign in with the original account or contact support.'),
        [
          { text: 'OK' },
          {
            text: isPt ? 'Falar com suporte' : 'Contact support',
            onPress: () => {
              const subject = encodeURIComponent(
                isReceiptInUse
                  ? (isPt ? 'Assinatura vinculada a outra conta' : 'Subscription linked to another account')
                  : (isPt ? 'Restaurar compra' : 'Restore purchase'),
              );
              const body = encodeURIComponent(
                isPt
                  ? `Olá! Tentei restaurar minha assinatura no app.\n\nMeu e-mail no Queizy: ${profile?.email ?? ''}\n\nPode me ajudar?`
                  : `Hi! I tried to restore my subscription in the app.\n\nMy Queizy email: ${profile?.email ?? ''}\n\nCan you help?`,
              );
              Linking.openURL(`mailto:suporte@queizy.com?subject=${subject}&body=${body}`);
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

  const monthlyPrice = monthlyPkg?.product.priceString ?? 'R$ 29,99';
  const yearlyPrice  = yearlyPkg?.product.priceString  ?? 'R$ 199,99';

  const yearlyMonthly = yearlyPkg
    ? formatMoney(yearlyPkg.product.price / 12, yearlyPkg.product.currencyCode, isPt)
    : 'R$ 16,67';

  const yearlyTrial  = yearlyPkg ? trialDays[yearlyPkg.product.identifier] ?? 0 : 0;
  const monthlyTrial = monthlyPkg ? trialDays[monthlyPkg.product.identifier] ?? 0 : 0;
  const isYearlySel  = selected.includes('yearly');
  const selTrial     = isYearlySel ? yearlyTrial : monthlyTrial;
  const anyTrial     = Math.max(yearlyTrial, monthlyTrial);
  const selPriceLabel = isYearlySel ? `${yearlyPrice}${isPt ? '/ano' : '/yr'}` : `${monthlyPrice}${isPt ? '/mês' : '/mo'}`;

  // Conta nova: nunca teve o teste do app nem assinatura. Começa pelo teste da loja.
  // Também usa o tom de "ganho" quem ainda está no teste antigo do app (abriu pela pílula):
  // nada foi perdido ainda. O tom de perda fica para quem perdeu o acesso.
  const inAppTrial = profile?.subscription_status === 'trial'
    && !!profile.trial_ends_at && new Date(profile.trial_ends_at).getTime() > Date.now();
  const isNewUser = !!profile && (inAppTrial || (!profile.trial_ends_at
    && !['active', 'cancelled', 'expired'].includes(profile.subscription_status ?? '')));

  // Headline personalizada. O gancho de streak só faz sentido quando a
  // sequência já é relevante (>= 3 dias) — "sua sequência de 1 dia está em
  // risco" não convence ninguém. Abaixo disso, usa o XP acumulado (que sobe
  // rápido); e se nem XP houver, um apelo neutro de continuidade.
  const firstName = profile?.name?.split(' ')[0] ?? '';
  const useStreak = streakDays >= 3;
  const useXp     = !useStreak && totalXP >= 50;

  const streakLine = isPt
    ? (firstName ? `${firstName}, sua sequência de ${streakDays} dias está em risco.` : `Sua sequência de ${streakDays} dias está em risco.`)
    : (firstName ? `${firstName}, your ${streakDays}-day streak is at risk.` : `Your ${streakDays}-day streak is at risk.`);
  const xpLine = isPt
    ? (firstName ? `${firstName}, você acumulou ${totalXP} XP praticando no Queizy.` : `Você acumulou ${totalXP} XP praticando no Queizy.`)
    : (firstName ? `${firstName}, you’ve earned ${totalXP} XP practicing on Queizy.` : `You’ve earned ${totalXP} XP practicing on Queizy.`);
  const neutralLine = isPt
    ? (firstName ? `${firstName}, continue evoluindo seu inglês no Queizy.` : 'Continue evoluindo seu inglês no Queizy.')
    : (firstName ? `${firstName}, keep improving your English on Queizy.` : 'Keep improving your English on Queizy.');

  const newLine = anyTrial
    ? (isPt
        ? (firstName ? `${firstName}, comece seus ${anyTrial} dias grátis` : `Comece seus ${anyTrial} dias grátis`)
        : (firstName ? `${firstName}, start your ${anyTrial}-day free trial` : `Start your ${anyTrial}-day free trial`))
    : (isPt
        ? (firstName ? `${firstName}, escolha seu plano para começar` : 'Escolha seu plano para começar')
        : (firstName ? `${firstName}, choose your plan to start` : 'Choose your plan to start'));

  const headline = isNewUser ? newLine : useStreak ? streakLine : useXp ? xpLine : neutralLine;

  const subheadline = isTaster
    ? (isPt
        ? 'Descubra seu nível e libere a trilha inteira, a conversa livre e as chamadas de voz com a Charlotte.'
        : 'Find your level and unlock the whole learning path, free chat and voice calls with Charlotte.')
    : isNewUser
    ? (isPt
        ? 'Acesso completo ao Queizy: conversa por voz, correção na hora e a trilha inteira.'
        : 'Full access to Queizy: voice chat, instant corrections and the whole learning path.')
    : (isPt
        ? 'Não deixe tudo isso ir embora. Continue de onde parou.'
        : 'Don’t let all of this go. Pick up where you left off.');

  // Texto curto sob o botão: com teste, deixa claro quando cobra e como não pagar.
  const ctaNote = selTrial
    ? (isPt
        ? `Grátis por ${selTrial} dias, depois ${selPriceLabel}. Cancele antes do fim do teste e não paga nada.`
        : `Free for ${selTrial} days, then ${selPriceLabel}. Cancel before the trial ends and you pay nothing.`)
    : (isPt
        ? 'Cobrança ao assinar. Renovação automática. Cancele quando quiser.'
        : 'Charged on subscribing. Auto-renews. Cancel anytime.');

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

        {/* Faixa da barra de status: o conteúdo rola por baixo dela, não por cima do relógio */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: C.bg, zIndex: 5 }} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            paddingTop: insets.top + 32,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
        >

          {/* Container com largura maxima para iPad */}
          <View style={{ width: '100%', maxWidth: 480, paddingHorizontal: 24, alignItems: 'center' }}>

          <View style={{ marginBottom: 28 }}>
            <HeaderLogo height={30} />
          </View>

          {/* Headline personalizada */}
          <AppText display style={{
            fontSize: 26, fontWeight: '800', color: C.navy,
            textAlign: 'center', marginBottom: 10, lineHeight: 32,
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
            borderRadius: 20,
            padding: 16,
            marginBottom: 28,
            gap: 12,
            borderWidth: 1, borderColor: C.cardBorder,
          }}>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
              {isNewUser ? (isPt ? 'O que você ganha' : 'What you get') : (isPt ? 'Você vai perder acesso a' : 'You’ll lose access to')}
            </AppText>
            {(isNewUser ? GAIN_ITEMS : LOSE_ITEMS).map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E3F6EC', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </View>
                <AppText style={{ color: C.navyMid, fontSize: 14, flex: 1 }}>
                  {isPt ? item.pt : item.en}
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
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: selected.includes('yearly') ? C.navy : C.cardBorder,
                  padding: 18,
                  ...Platform.select({
                    ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
                    android: { elevation: selected.includes('yearly') ? 0 : 2 },
                  }),
                }}
              >
                <View style={{
                  position: 'absolute', top: -10, right: 16,
                  backgroundColor: C.navy, borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <AppText style={{ color: C.green, fontSize: 11, fontWeight: '800' }}>
                    {isPt ? 'MELHOR VALOR' : 'BEST VALUE'}
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '700' }}>{isPt ? 'Anual' : 'Yearly'}</AppText>
                    <AppText style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {yearlyMonthly}{isPt ? '/mês' : '/mo'}
                    </AppText>
                    {!!yearlyTrial && (
                      <AppText style={{ color: C.greenDark, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                        {isPt ? `${yearlyTrial} dias grátis` : `${yearlyTrial}-day free trial`}
                      </AppText>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText display style={{ color: C.navy, fontSize: 22, fontWeight: '800' }}>
                      {yearlyPrice}
                    </AppText>
                    <AppText style={{ color: C.muted, fontSize: 11 }}>{isPt ? '/ano' : '/yr'}</AppText>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                onPress={() => setSelected(monthlyPkg?.product.identifier ?? 'com.hubacademy.charlotte.monthly')}
                activeOpacity={0.85}
                style={{
                  backgroundColor: selected.includes('monthly') ? C.highlight : C.card,
                  borderRadius: 20,
                  borderWidth: selected.includes('monthly') ? 2 : 1,
                  borderColor: selected.includes('monthly') ? C.navy : C.cardBorder,
                  padding: 18,
                  ...Platform.select({
                    ios:     { shadowColor: 'rgba(22,19,31,0.06)', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
                    android: { elevation: selected.includes('monthly') ? 0 : 1 },
                  }),
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '700' }}>{isPt ? 'Mensal' : 'Monthly'}</AppText>
                    {!!monthlyTrial && (
                      <AppText style={{ color: C.greenDark, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                        {isPt ? `${monthlyTrial} dias grátis` : `${monthlyTrial}-day free trial`}
                      </AppText>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText display style={{ color: C.navy, fontSize: 22, fontWeight: '800' }}>
                      {monthlyPrice}
                    </AppText>
                    <AppText style={{ color: C.muted, fontSize: 11 }}>{isPt ? '/mês' : '/mo'}</AppText>
                  </View>
                </View>
              </TouchableOpacity>

            </View>
          )}

          {/* Restore */}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={loading}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 }}
          >
            <ArrowsClockwise size={14} color={C.muted} />
            <AppText style={{ color: C.muted, fontSize: 13 }}>{isPt ? 'Restaurar compras' : 'Restore purchases'}</AppText>
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            onPress={signOut}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
          >
            <SignOut size={14} color={C.muted} />
            <AppText style={{ color: C.muted, fontSize: 13 }}>{isPt ? 'Sair da conta' : 'Sign out'}</AppText>
          </TouchableOpacity>

          </View>{/* fim container iPad */}

        </ScrollView>

        {/* Rodapé fixo: botão sempre visível, acima da barra de navegação */}
        <View style={{
          borderTopWidth: 1, borderTopColor: C.cardBorder, backgroundColor: C.bg,
          paddingTop: 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 24, alignItems: 'center',
        }}>
          <View style={{ width: '100%', maxWidth: 480 }}>
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading || loadingOffer}
              activeOpacity={0.85}
              style={{
                alignSelf: 'stretch', backgroundColor: C.green, borderRadius: 16,
                paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
                opacity: loading || loadingOffer ? 0.6 : 1,
              }}
            >
              {(loading || loadingOffer)
                ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color={C.navy} />
                    {loading && (
                      <AppText style={{ color: C.navy, fontSize: 14, fontWeight: '700' }}>
                        {isPt ? 'Confirmando…' : 'Confirming…'}
                      </AppText>
                    )}
                  </View>
                )
                : (
                  <AppText style={{ color: C.navy, fontSize: 16, fontWeight: '800' }}>
                    {selTrial
                      ? (isPt ? `Começar ${selTrial} dias grátis` : `Start ${selTrial}-day free trial`)
                      : `${isPt ? 'Assinar' : 'Subscribe'} — ${selPriceLabel}`}
                  </AppText>
                )}
            </TouchableOpacity>
            <AppText style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 }}>
              {ctaNote}
            </AppText>
            {/* Termos e privacidade (exigidos pelas lojas para assinatura) */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 }}>
              <TouchableOpacity onPress={() => Linking.openURL('https://queizy.com/termos')} hitSlop={8}>
                <AppText style={{ color: C.muted, fontSize: 12, textDecorationLine: 'underline' }}>{isPt ? 'Termos de Uso' : 'Terms of Use'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('https://queizy.com/privacidade')} hitSlop={8}>
                <AppText style={{ color: C.muted, fontSize: 12, textDecorationLine: 'underline' }}>{isPt ? 'Política de Privacidade' : 'Privacy Policy'}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      {/* Avisos abertos com o modal na tela aparecem aqui dentro (iOS não empilha Modals). */}
      <AppAlertHost inline />
    </Modal>
  );
}
