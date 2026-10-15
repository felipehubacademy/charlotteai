// AppAlert — aviso/confirmação com a cara do Queizy, igual no iOS e no Android
// (substitui o Alert.alert nativo). Mesma assinatura do Alert.alert:
//   appAlert(title, message?, buttons?, { cancelable? })
// O <AppAlertHost /> fica montado uma vez no layout do app. Dentro de um <Modal> aberto
// (paywall, recorte de foto...), monte também um <AppAlertHost inline /> no conteúdo dele:
// no iOS um Modal não abre por cima de outro, então o aviso aparece no host inline mais recente.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';

export interface AppAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}
interface AlertSpec { title: string; message?: string; buttons: AppAlertButton[]; cancelable: boolean }

type HostFn = (s: AlertSpec | null) => void;
// Hosts dentro de Modal ("inline") têm prioridade sobre o global, independente da ordem de
// montagem (o paywall pode já estar aberto quando o layout monta o host global).
const inlineHosts: HostFn[] = [];
const globalHosts: HostFn[] = [];

export function appAlert(title: string, message?: string, buttons?: AppAlertButton[], options?: { cancelable?: boolean }) {
  const host = inlineHosts[inlineHosts.length - 1] ?? globalHosts[globalHosts.length - 1];
  if (!host) return;
  host({
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    cancelable: options?.cancelable ?? false,
  });
}

const INK = '#16131F';
const MUTED = '#4D4858';
const VOLT = '#DCFF4A';
const PINK = '#D12A64';

function AlertCard({ spec, onPick }: { spec: AlertSpec; onPick: (b: AppAlertButton) => void }) {
  const cancel = spec.buttons.find(b => b.style === 'cancel');
  const others = spec.buttons.filter(b => b !== cancel);
  const hasDestructive = others.some(b => b.style === 'destructive');

  // Com ação destrutiva, o caminho seguro (cancelar) é o botão de destaque e a ação
  // destrutiva vem embaixo, em rosa. Sem ela, a 1ª ação é o destaque.
  const rows: Array<{ b: AppAlertButton; kind: 'primary' | 'secondary' | 'text' | 'danger' }> = hasDestructive
    ? [
        ...(cancel ? [{ b: cancel, kind: 'primary' as const }] : []),
        ...others.map(b => ({ b, kind: b.style === 'destructive' ? 'danger' as const : 'secondary' as const })),
      ]
    : [
        ...others.map((b, i) => ({ b, kind: i === 0 ? 'primary' as const : 'secondary' as const })),
        ...(cancel ? [{ b: cancel, kind: 'text' as const }] : []),
      ];

  return (
    <Pressable onPress={() => {}} style={{
      backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14,
      width: '100%', maxWidth: 380, gap: 8,
      shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    }}>
      <AppText display style={{ fontSize: 19, fontWeight: '800', color: INK }}>{spec.title}</AppText>
      {!!spec.message && (
        <AppText style={{ fontSize: 15, color: MUTED, lineHeight: 21 }}>{spec.message}</AppText>
      )}
      <View style={{ marginTop: 10, gap: 8 }}>
        {rows.map(({ b, kind }, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onPick(b)}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={{
              borderRadius: 14, paddingVertical: kind === 'text' || kind === 'danger' ? 12 : 15, alignItems: 'center',
              backgroundColor: kind === 'primary' ? VOLT : kind === 'secondary' ? '#FAF7F0' : 'transparent',
            }}
          >
            <AppText style={{
              fontSize: 15.5, fontWeight: '700',
              color: kind === 'danger' ? PINK : kind === 'text' ? '#8A8494' : INK,
            }}>
              {b.text ?? (b.style === 'cancel' ? (systemIsPt ? 'Cancelar' : 'Cancel') : 'OK')}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </Pressable>
  );
}

export function AppAlertHost({ inline = false }: { inline?: boolean }) {
  const [spec, setSpec] = useState<AlertSpec | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const list = inline ? inlineHosts : globalHosts;
    list.push(setSpec);
    return () => { const i = list.lastIndexOf(setSpec); if (i >= 0) list.splice(i, 1); };
  }, [inline]);

  useEffect(() => {
    if (inline && spec) { fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start(); }
  }, [inline, spec, fade]);

  const pick = (b: AppAlertButton) => { setSpec(null); if (b.onPress) setTimeout(() => b.onPress?.(), inline ? 0 : 220); };

  // Toque fora / voltar do Android: equivale ao "cancelar" (se houver) ou fecha o aviso simples.
  const dismiss = () => {
    if (!spec) return;
    const cancel = spec.buttons.find(b => b.style === 'cancel');
    if (cancel) return pick(cancel);
    if (spec.cancelable || (spec.buttons.length === 1 && !spec.buttons[0].onPress)) setSpec(null);
  };

  const body = spec ? (
    <Pressable onPress={dismiss} style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <AlertCard spec={spec} onPick={pick} />
    </Pressable>
  ) : null;

  if (inline) {
    if (!spec) return null;
    return (
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999, opacity: fade }}>
        {body}
      </Animated.View>
    );
  }
  return (
    <Modal visible={!!spec} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      {body}
    </Modal>
  );
}
