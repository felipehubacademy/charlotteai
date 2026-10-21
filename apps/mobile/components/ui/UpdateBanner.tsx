// components/ui/UpdateBanner.tsx — card "Tem versão nova do Queizy" na tela Início.
//
// A versão mais recente de cada loja fica no banco (public.app_release): ao liberar versão nova, troca-se o
// número lá e o card aparece sozinho para quem está abaixo dela, sem build.
//   - Quem fecha (X) volta a ver em 3 dias; quem atualiza não vê mais (a versão instalada alcança a da loja).
//   - Abaixo de min_version (só em caso grave) o card não tem X.
// "Atualizar" abre a loja do aparelho. Textos no idioma do aparelho.
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ArrowCircleUp, X } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';
import { Application } from '@/lib/nativeOptional';

const SNOOZE_MS = 3 * 24 * 3600_000;
const SNOOZE_KEY = 'update_banner_closed_at';
const STORE_URL = Platform.select({
  ios: 'itms-apps://apps.apple.com/app/id6760943273',
  default: 'market://details?id=com.hubacademy.charlotte',
});
const STORE_WEB = Platform.select({
  ios: 'https://apps.apple.com/app/id6760943273',
  default: 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte',
});

/** -1 se a < b, 0 se igual, 1 se a > b ("2.0.10" > "2.0.9"). */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function UpdateBanner() {
  const [mode, setMode] = useState<'hidden' | 'optional' | 'required'>('hidden');

  useEffect(() => {
    if (__DEV__ || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
    const installed = Application?.nativeApplicationVersion;
    if (!installed) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.from('app_release').select('latest_version, min_version').eq('platform', Platform.OS).maybeSingle();
        const rel = data as { latest_version: string; min_version: string | null } | null;
        if (!alive || !rel || compareVersions(installed, rel.latest_version) >= 0) return;
        if (rel.min_version && compareVersions(installed, rel.min_version) < 0) { setMode('required'); return; }
        const closedAt = Number(await SecureStore.getItemAsync(SNOOZE_KEY).catch(() => null)) || 0;
        if (alive && Date.now() - closedAt >= SNOOZE_MS) setMode('optional');
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  if (mode === 'hidden') return null;

  const store = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  const title = systemIsPt ? 'Tem versão nova do Queizy' : 'A new version of Queizy is out';
  const body = mode === 'required'
    ? (systemIsPt ? `Esta versão do app precisa ser atualizada. Atualize pela ${store} para continuar.` : `This version of the app needs an update. Update on ${store} to continue.`)
    : (systemIsPt ? `Atualize pela ${store} para ter as últimas melhorias.` : `Update on ${store} to get the latest improvements.`);

  const openStore = () => { Linking.openURL(STORE_URL!).catch(() => Linking.openURL(STORE_WEB!).catch(() => {})); };
  const close = () => {
    setMode('hidden');
    SecureStore.setItemAsync(SNOOZE_KEY, String(Date.now())).catch(() => {});
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: '#16131F', borderRadius: 18, paddingVertical: 12, paddingLeft: 14, paddingRight: mode === 'optional' ? 6 : 14,
    }}>
      <ArrowCircleUp size={28} color="#DCFF4A" weight="fill" />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{title}</AppText>
        <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 16 }}>{body}</AppText>
      </View>
      <TouchableOpacity onPress={openStore} activeOpacity={0.8}
        style={{ backgroundColor: '#DCFF4A', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
        <AppText style={{ fontSize: 13, fontWeight: '700', color: '#16131F' }}>{systemIsPt ? 'Atualizar' : 'Update'}</AppText>
      </TouchableOpacity>
      {mode === 'optional' && (
        <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel={systemIsPt ? 'Fechar' : 'Close'} style={{ padding: 6 }}>
          <X size={16} color="rgba(255,255,255,0.6)" weight="bold" />
        </TouchableOpacity>
      )}
    </View>
  );
}
