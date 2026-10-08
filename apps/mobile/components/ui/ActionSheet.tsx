// ActionSheet — folha de opções que sobe de baixo, igual no iOS e no Android
// (o Alert do Android mostra no máximo 3 botões). Respeita a barra de navegação.
// Uso: showActionSheet({ title, message, options: [{ label, onPress, destructive }] }).
// O <ActionSheetHost /> fica montado uma vez no layout do app.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';

export interface SheetOption { label: string; onPress?: () => void; destructive?: boolean }
interface SheetSpec { title?: string; message?: string; options: SheetOption[] }

let listener: ((s: SheetSpec | null) => void) | null = null;
export function showActionSheet(spec: SheetSpec) { listener?.(spec); }

export function ActionSheetHost() {
  const insets = useSafeAreaInsets();
  const [spec, setSpec] = useState<SheetSpec | null>(null);
  useEffect(() => { listener = setSpec; return () => { listener = null; }; }, []);
  const close = () => setSpec(null);
  const pick = (o: SheetOption) => { setSpec(null); setTimeout(() => o.onPress?.(), 250); };

  return (
    <Modal visible={!!spec} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 + insets.bottom, gap: 8 }}>
          {!!spec?.title && <AppText display style={{ fontSize: 19, fontWeight: '800', color: '#16131F' }}>{spec.title}</AppText>}
          {!!spec?.message && <AppText style={{ fontSize: 14, color: '#4D4858', lineHeight: 20, marginBottom: 6 }}>{spec.message}</AppText>}
          {spec?.options.map((o, i) => (
            <TouchableOpacity key={i} onPress={() => pick(o)}
              style={{ backgroundColor: '#FAF7F0', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16 }}>
              <AppText style={{ fontSize: 15.5, fontWeight: '700', color: o.destructive ? '#D12A64' : '#16131F' }}>{o.label}</AppText>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={close} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <AppText style={{ fontSize: 15, fontWeight: '700', color: '#8A8494' }}>{systemIsPt ? 'Cancelar' : 'Cancel'}</AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
