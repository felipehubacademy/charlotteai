// StudyingNow — a linha social da Home, abaixo do balão da Charlotte. Mostra UMA
// mensagem por vez, por prioridade: pedido de amizade esperando você, convite de
// competição esperando você e, por último, quem está estudando agora. Sempre uma
// linha só (reticências se faltar espaço). Toque leva para Estudar junto.
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { fetchSocial, SocialInfo } from '@/lib/social';

function line(info: SocialInfo, isPt: boolean): { text: string; pink: boolean } | null {
  // Pedidos e convites ganham um "Ver" fixo ao lado (não entra nas reticências).
  const reqs = info.pendingRequests ?? [];
  if (reqs.length) {
    const more = reqs.length > 1;
    return {
      pink: true,
      text: isPt
        ? (more ? `${reqs.length} pedidos para estudar junto` : `${reqs[0]} quer estudar com você`)
        : (more ? `${reqs.length} study requests` : `${reqs[0]} wants to study with you`),
    };
  }
  const invs = info.rallyInvites ?? [];
  if (invs.length) {
    return {
      pink: true,
      text: isPt
        ? (invs.length > 1 ? `${invs.length} convites para competir` : `${invs[0]} te chamou para competir`)
        : (invs.length > 1 ? `${invs.length} competition invites` : `${invs[0]} challenged you`),
    };
  }
  if (info.studyingNow < 2 && !info.buddiesNow.length) return null;
  const buddy = info.buddiesNow[0];
  const base = buddy
    ? (isPt ? `${buddy} está estudando agora` : `${buddy} is studying now`)
    : (isPt ? `${info.studyingNow} pessoas estudando agora` : `${info.studyingNow} people studying now`);
  const extra = buddy && info.studyingNow > 1 ? (isPt ? ` · ${info.studyingNow} no total` : ` · ${info.studyingNow} in total`) : '';
  return { pink: false, text: base + extra };
}

export function StudyingNow() {
  const isPt = systemIsPt;
  const [info, setInfo] = useState<SocialInfo | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchSocial().then(s => { if (alive && s) setInfo(s); });
    return () => { alive = false; };
  }, []));

  const l = info ? line(info, isPt) : null;
  if (!l) return null;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => router.push('/(app)/study-together' as any)}
      style={{ alignSelf: 'center', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: l.pink ? 'rgba(255,79,139,0.10)' : 'rgba(8,128,74,0.08)' }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: l.pink ? '#FF4F8B' : '#2BD97C' }} />
      <AppText numberOfLines={1} style={{ flexShrink: 1, fontSize: 12.5, fontWeight: '700', color: l.pink ? '#D12A64' : '#08804A' }}>{l.text}</AppText>
      {l.pink && <AppText style={{ marginLeft: -3, fontSize: 12.5, fontWeight: '800', color: '#D12A64' }}>{isPt ? '· Ver' : '· See'}</AppText>}
    </TouchableOpacity>
  );
}
