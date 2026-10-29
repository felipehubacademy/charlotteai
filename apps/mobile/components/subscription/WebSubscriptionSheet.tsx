// WebSubscriptionSheet — "Gerenciar assinatura" de quem assinou pelo site (Asaas).
// Mostra plano, forma de pagamento e até quando vai o acesso. No teste grátis não houve cobrança:
// mostra a data da 1ª cobrança e só oferece cancelar (sem reembolso). Depois de pago, o reembolso
// aparece só dentro dos 7 dias (o servidor informa o prazo e confere de novo no pedido).
// Confirmações acontecem dentro da própria tela, sem alerta do sistema.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Animated, TouchableOpacity, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { CreditCard, QrCode, CheckCircle, ArrowCounterClockwise } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const C = {
  card: '#FFFFFF', navy: '#16131F', navyMid: '#4D4858', navyLight: '#8A8494',
  green: '#DCFF4A', greenDark: '#08804A', greenBg: '#E3F6EC',
  border: 'rgba(22,19,31,0.10)', ghost: 'rgba(22,19,31,0.06)', red: '#D12A64', redBg: '#FFEEF4',
};

type Step = 'main' | 'refund' | 'cancel' | 'busy' | 'done';
type Info = { found: boolean; inTrial?: boolean; firstChargeAt?: string | null; value?: number; refundableUntil?: string | null; refundPending?: boolean };

interface Props {
  visible: boolean;
  isPt: boolean;
  product: string;            // web_monthly | web_annual | web_annual_pix
  status: string | null;      // active | cancelled ...
  expiresAt: string | null;
  onClose: () => void;
  onChanged: () => void;      // relê o perfil depois de reembolso/cancelamento
}

export function WebSubscriptionSheet({ visible, isPt, product, status, expiresAt, onClose, onChanged }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<Step>('main');
  const [done, setDone] = useState<{ title: string; text: string; ok: boolean } | null>(null);
  const [info, setInfo] = useState<Info | null>(null);

  // Situação da assinatura no servidor (teste grátis, 1ª cobrança, prazo do reembolso).
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setInfo(null);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No session');
        const res = await fetch(`${API_BASE_URL}/api/checkout/asaas?mine=1`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const j = await res.json();
        if (alive) setInfo(res.ok ? j : { found: false });
      } catch { if (alive) setInfo({ found: false }); }
    })();
    return () => { alive = false; };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setStep('main'); setDone(null);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(600); backdrop.setValue(0);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPix = product === 'web_annual_pix';
  const isAnnual = product.startsWith('web_annual');
  const cancelled = status === 'cancelled';
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isPt ? 'pt-BR' : 'en-US');
  const inTrial = !!info?.inTrial && !isPix;
  const firstCharge = info?.firstChargeAt ? fmt(info.firstChargeAt) : null;
  // No teste grátis o acesso vai até a véspera da 1ª cobrança (o prazo técnico tem 1 dia de folga).
  const trialEnd = info?.firstChargeAt ? fmt(new Date(new Date(info.firstChargeAt).getTime() - 86400000).toISOString()) : null;
  const until = inTrial && trialEnd ? trialEnd : expiresAt ? fmt(expiresAt) : null;
  const refundUntil = info?.refundableUntil ? fmt(info.refundableUntil) : null;
  const price = info?.value ? info.value.toLocaleString(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency: 'BRL' }) : null;

  const planName = isAnnual ? (isPt ? 'Plano Anual' : 'Annual Plan') : (isPt ? 'Plano Mensal' : 'Monthly Plan');
  const payName = isPix ? (isPt ? 'Pix à vista' : 'Pix, paid upfront') : isAnnual ? (isPt ? 'Cartão de crédito à vista' : 'Credit card, paid yearly') : (isPt ? 'Cartão de crédito, todo mês' : 'Credit card, monthly');
  const renewal = isPix
    ? (isPt ? 'Não renova sozinho' : 'Does not renew')
    : cancelled ? (isPt ? 'Renovação cancelada' : 'Renewal cancelled') : (isPt ? 'Renova sozinho' : 'Renews automatically');

  async function call(action: 'refund' | 'cancel') {
    setStep('busy');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');
      const res = await fetch(`${API_BASE_URL}/api/checkout/asaas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDone({ ok: false, title: action === 'refund' ? (isPt ? 'Reembolso' : 'Refund') : (isPt ? 'Cancelamento' : 'Cancellation'),
          text: j.message ?? j.error ?? (isPt ? 'Não foi possível agora. Escreva para suporte@queizy.com.' : 'Not possible right now. Email suporte@queizy.com.') });
      } else if (action === 'refund' && j.queued) {
        setDone({ ok: true, title: isPt ? 'Pedido registrado' : 'Request received',
          text: isPt ? 'Seu reembolso foi registrado. Devolvemos em até 2 dias úteis e avisamos por e-mail; até lá, seu acesso continua.' : 'Your refund request is registered. We will refund within 2 business days and email you; until then, your access continues.' });
        onChanged();
      } else if (action === 'refund') {
        setDone({ ok: true, title: isPt ? 'Reembolso pedido' : 'Refund requested',
          text: isPix
            ? (isPt ? 'O valor volta para a mesma conta do Pix em instantes. Seu acesso foi encerrado.' : 'The money goes back to the same Pix account in moments. Your access has ended.')
            : (isPt ? 'O estorno aparece na fatura do cartão (pode levar até duas faturas). Seu acesso foi encerrado.' : 'The refund shows on your card statement (may take up to two statements). Your access has ended.') });
        onChanged();
      } else {
        setDone(inTrial
          ? { ok: true, title: isPt ? 'Assinatura cancelada' : 'Subscription cancelled',
              text: (isPt ? 'Nada será cobrado.' : 'You will not be charged.') + (until ? (isPt ? ` Você continua usando o Queizy até o fim do teste grátis, em ${until}.` : ` You can keep using Queizy until your free trial ends on ${until}.`) : '') }
          : { ok: true, title: isPt ? 'Renovação cancelada' : 'Renewal cancelled',
              text: (isPt ? 'Não haverá novas cobranças.' : 'You will not be charged again.') + (until ? (isPt ? ` Seu acesso continua até ${until}.` : ` Access continues until ${until}.`) : '') });
        onChanged();
      }
    } catch {
      setDone({ ok: false, title: isPt ? 'Sem conexão' : 'No connection', text: isPt ? 'Confira a internet e tente de novo.' : 'Check your connection and try again.' });
    }
    setStep('done');
  }

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <AppText style={{ fontSize: 14, color: C.navyLight }}>{label}</AppText>
      <AppText style={{ fontSize: 14, color: C.navy, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{value}</AppText>
    </View>
  );
  const Btn = ({ label, onPress, kind = 'ghost' }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{
      borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 10,
      backgroundColor: kind === 'primary' ? C.green : kind === 'danger' ? C.redBg : C.ghost,
    }}>
      <AppText style={{ fontSize: 15, fontWeight: '800', color: kind === 'danger' ? C.red : C.navy }}>{label}</AppText>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdrop }}>
          <Pressable style={{ flex: 1 }} onPress={step === 'busy' ? undefined : onClose} />
        </Animated.View>
        <Animated.View style={{
          backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 20, transform: [{ translateY }],
        }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,19,31,0.12)', marginBottom: 20 }} />

          {step === 'main' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.greenBg, alignItems: 'center', justifyContent: 'center' }}>
                  {isPix ? <QrCode size={22} color={C.greenDark} weight="bold" /> : <CreditCard size={22} color={C.greenDark} weight="bold" />}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>{planName}</AppText>
                  <AppText style={{ fontSize: 13, color: C.navyMid }}>{isPt ? 'Assinado pelo site' : 'Subscribed on the website'}</AppText>
                </View>
              </View>
              <Row label={isPt ? 'Pagamento' : 'Payment'} value={payName} />
              {inTrial ? (
                <>
                  {trialEnd && <Row label={isPt ? 'Teste grátis' : 'Free trial'} value={isPt ? `até ${trialEnd}` : `until ${trialEnd}`} />}
                  <Row label={isPt ? 'Primeira cobrança' : 'First charge'}
                    value={cancelled ? (isPt ? 'Cancelada, nada será cobrado' : 'Cancelled, no charge')
                      : firstCharge ? `${firstCharge}${price ? ` · ${price}` : ''}` : '-'} />
                </>
              ) : (
                <>
                  {until && <Row label={isPt ? 'Acesso até' : 'Access until'} value={until} />}
                  <Row label={isPt ? 'Renovação' : 'Renewal'} value={renewal} />
                  {info?.refundPending && <Row label={isPt ? 'Reembolso' : 'Refund'} value={isPt ? 'Pedido registrado' : 'Request received'} />}
                  {refundUntil && <Row label={isPt ? 'Reembolso' : 'Refund'} value={isPt ? `pode pedir até ${refundUntil}` : `available until ${refundUntil}`} />}
                </>
              )}

              {!info ? (
                <View style={{ paddingVertical: 18, alignItems: 'center' }}><ActivityIndicator color={C.navy} /></View>
              ) : (
                <>
                  {!inTrial && refundUntil && <Btn label={isPt ? 'Pedir reembolso' : 'Request refund'} onPress={() => setStep('refund')} />}
                  {!isPix && !cancelled && (
                    <Btn label={inTrial ? (isPt ? 'Cancelar assinatura' : 'Cancel subscription') : (isPt ? 'Cancelar renovação' : 'Cancel renewal')}
                      kind="danger" onPress={() => setStep('cancel')} />
                  )}
                </>
              )}
              <Btn label={isPt ? 'Fechar' : 'Close'} kind="primary" onPress={onClose} />
            </>
          )}

          {step === 'refund' && (
            <>
              <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{isPt ? 'Pedir reembolso?' : 'Request a refund?'}</AppText>
              <AppText style={{ fontSize: 15, color: C.navyMid, lineHeight: 22 }}>
                {isPt
                  ? `Vale até ${refundUntil ?? '7 dias depois do pagamento'}. ${isPix ? 'O valor volta para a mesma conta do Pix em instantes' : 'O estorno aparece na fatura do cartão'} e o acesso termina na hora.`
                  : `Available until ${refundUntil ?? '7 days after payment'}. ${isPix ? 'The money goes back to your Pix account in moments' : 'The refund shows on your card statement'} and access ends right away.`}
              </AppText>
              <Btn label={isPt ? 'Sim, pedir reembolso' : 'Yes, request refund'} kind="danger" onPress={() => call('refund')} />
              <Btn label={isPt ? 'Voltar' : 'Back'} onPress={() => setStep('main')} />
            </>
          )}

          {step === 'cancel' && (
            <>
              <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 8 }}>
                {inTrial ? (isPt ? 'Cancelar a assinatura?' : 'Cancel your subscription?') : (isPt ? 'Cancelar a renovação?' : 'Cancel renewal?')}
              </AppText>
              <AppText style={{ fontSize: 15, color: C.navyMid, lineHeight: 22 }}>
                {inTrial
                  ? (isPt
                      ? `Você está no teste grátis e nada foi cobrado. Cancelando agora, a cobrança${firstCharge ? ` de ${firstCharge}` : ''} não acontece${until ? ` e você continua usando o Queizy até ${until}` : ''}.`
                      : `You're on the free trial and haven't been charged. If you cancel now, the charge${firstCharge ? ` on ${firstCharge}` : ''} won't happen${until ? ` and you can keep using Queizy until ${until}` : ''}.`)
                  : (isPt
                      ? `Não haverá novas cobranças.${until ? ` Você continua com acesso até ${until}.` : ''}`
                      : `You won't be charged again.${until ? ` You keep access until ${until}.` : ''}`)}
              </AppText>
              <Btn label={inTrial ? (isPt ? 'Sim, cancelar assinatura' : 'Yes, cancel subscription') : (isPt ? 'Sim, cancelar renovação' : 'Yes, cancel renewal')}
                kind="danger" onPress={() => call('cancel')} />
              <Btn label={isPt ? 'Voltar' : 'Back'} onPress={() => setStep('main')} />
            </>
          )}

          {step === 'busy' && (
            <View style={{ alignItems: 'center', paddingVertical: 36 }}>
              <ActivityIndicator color={C.navy} />
            </View>
          )}

          {step === 'done' && done && (
            <>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: done.ok ? C.greenBg : C.redBg, alignItems: 'center', justifyContent: 'center' }}>
                  {done.ok ? <CheckCircle size={28} color={C.greenDark} weight="fill" /> : <ArrowCounterClockwise size={26} color={C.red} weight="bold" />}
                </View>
              </View>
              <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 8 }}>{done.title}</AppText>
              <AppText style={{ fontSize: 15, color: C.navyMid, lineHeight: 22, textAlign: 'center' }}>{done.text}</AppText>
              <Btn label={isPt ? 'Fechar' : 'Close'} kind="primary" onPress={onClose} />
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
