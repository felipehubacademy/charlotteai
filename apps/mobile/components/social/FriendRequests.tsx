// FriendRequests — pedidos de amizade recebidos (Estudar junto): Aceitar / Recusar.
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppText } from '@/components/ui/Text';
import { C, Card, SectionTitle } from '@/components/stats/StatsUI';
import { systemIsPt } from '@/lib/systemLang';
import { fetchIncomingRequests, acceptFriend, declineFriend, Person } from '@/lib/friends';

export function FriendRequests({ onChange }: { onChange?: () => void }) {
  const isPt = systemIsPt;
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const [list, setList] = useState<Person[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchIncomingRequests().then(r => { if (alive) setList(r); });
    return () => { alive = false; };
  }, []));

  if (!list.length) return null;
  const answer = async (p: Person, ok: boolean) => {
    setBusy(p.id);
    await (ok ? acceptFriend(p.id) : declineFriend(p.id));
    setBusy(null);
    setList(v => v.filter(x => x.id !== p.id));
    if (ok) onChange?.();
  };

  return (
    <>
      <SectionTitle title={t('Pedidos de amizade', 'Friend requests')} meta={String(list.length)} />
      <Card style={{ paddingVertical: 4 }}>
        {list.map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
            {p.avatarUrl
              ? <Image source={{ uri: p.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{(p.name || '?').charAt(0).toUpperCase()}</AppText>
                </View>}
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink }} numberOfLines={1}>{p.name}</AppText>
              <AppText style={{ fontSize: 12.5, color: C.light }} numberOfLines={1}>{p.username ? `@${p.username}` : ''}{p.level ? ` · ${p.level}` : ''}</AppText>
            </View>
            {busy === p.id ? <ActivityIndicator color={C.ink} /> : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity onPress={() => answer(p, false)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.ghost }}>
                  <AppText style={{ fontSize: 13, fontWeight: '700', color: C.mid }}>{t('Recusar', 'Decline')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => answer(p, true)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.ink }}>
                  <AppText style={{ fontSize: 13, fontWeight: '800', color: C.volt }}>{t('Aceitar', 'Accept')}</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </Card>
    </>
  );
}
