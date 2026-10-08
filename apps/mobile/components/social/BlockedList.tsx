// BlockedList — quem eu bloqueei, com "Desbloquear" (tela Encontrar amigos).
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppText } from '@/components/ui/Text';
import { C, Card, SectionTitle } from '@/components/stats/StatsUI';
import { systemIsPt } from '@/lib/systemLang';
import { fetchBlocked, unblockUser } from '@/lib/moderation';

export function BlockedList() {
  const isPt = systemIsPt;
  const [list, setList] = useState<{ id: string; name: string; username: string | null }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchBlocked().then(r => { if (alive) setList(r); });
    return () => { alive = false; };
  }, []));

  if (!list.length) return null;
  const unblock = async (id: string) => {
    setBusy(id);
    await unblockUser(id);
    setBusy(null);
    setList(v => v.filter(x => x.id !== id));
  };

  return (
    <>
      <SectionTitle title={isPt ? 'Bloqueados' : 'Blocked'} meta={String(list.length)} />
      <Card style={{ paddingVertical: 4 }}>
        {list.map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink }} numberOfLines={1}>{p.name}</AppText>
              {!!p.username && <AppText style={{ fontSize: 12.5, color: C.light }}>@{p.username}</AppText>}
            </View>
            {busy === p.id ? <ActivityIndicator color={C.ink} /> : (
              <TouchableOpacity onPress={() => unblock(p.id)} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.ghost }}>
                <AppText style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{isPt ? 'Desbloquear' : 'Unblock'}</AppText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Card>
    </>
  );
}
