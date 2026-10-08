// FriendSearch — busca de alunos por nome, sobrenome ou @. Cada resultado mostra
// nome completo, @, foto e nível, com a ação do momento: Adicionar, Pedido
// enviado, Aceitar ou Amigo de estudo. Usado no ranking e em Estudar junto.
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { MagnifyingGlass, UserPlus, Check, Clock, X } from 'phosphor-react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/Text';
import { C, Card } from '@/components/stats/StatsUI';
import { systemIsPt } from '@/lib/systemLang';
import { searchPeople, requestFriend, acceptFriend, Person } from '@/lib/friends';

function Face({ p }: { p: Person }) {
  if (p.avatarUrl) return <Image source={{ uri: p.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />;
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{(p.name || '?').charAt(0).toUpperCase()}</AppText>
    </View>
  );
}

export function FriendSearch({ onChange, autoFocus }: { onChange?: () => void; autoFocus?: boolean }) {
  const isPt = systemIsPt;
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.replace('@', '').length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await searchPeople(term);
      setResults(r); setLoading(false);
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const act = async (p: Person) => {
    setBusy(p.id);
    const r = p.relation === 'pending_in' ? await acceptFriend(p.id) : await requestFriend(p.id);
    setBusy(null);
    if (r.ok) {
      const relation = p.relation === 'pending_in' ? 'friend' : (r.relation ?? 'pending_out');
      setResults(v => v?.map(x => (x.id === p.id ? { ...x, relation } : x)) ?? v);
      onChange?.();
    }
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 }}>
        <MagnifyingGlass size={18} color={C.light} weight="bold" />
        <TextInput
          value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} returnKeyType="search" autoFocus={autoFocus}
          placeholder={t('Buscar amigo por nome ou @', 'Find a friend by name or @')} placeholderTextColor={C.light}
          style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: C.ink }}
        />
        {loading ? <ActivityIndicator size="small" color={C.light} /> : !!q && (
          <TouchableOpacity onPress={() => setQ('')} hitSlop={8}><X size={16} color={C.light} weight="bold" /></TouchableOpacity>
        )}
      </View>

      {results && (
        <Card style={{ marginTop: 8, marginHorizontal: 0, paddingVertical: 4 }}>
          {results.length === 0 ? (
            <AppText style={{ fontSize: 13.5, color: C.mid, textAlign: 'center', padding: 16 }}>
              {t('Ninguém encontrado. Tente o sobrenome ou o @, ou mande seu convite.', 'No one found. Try the last name or @, or send your invite.')}
            </AppText>
          ) : results.map((p, i) => {
            const label = p.relation === 'friend' ? t('Amigo', 'Friend')
              : p.relation === 'pending_out' ? t('Enviado', 'Sent')
              : p.relation === 'pending_in' ? t('Aceitar', 'Accept')
              : t('Adicionar', 'Add');
            const done = p.relation === 'friend' || p.relation === 'pending_out';
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                <Face p={p} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink }} numberOfLines={1}>{p.name || t('Aluno', 'Student')}</AppText>
                  <AppText style={{ fontSize: 12.5, color: C.light }} numberOfLines={1}>
                    {p.username ? `@${p.username}` : ''}{p.level ? ` · ${p.level}` : ''}
                  </AppText>
                </View>
                <TouchableOpacity disabled={done || busy === p.id} onPress={() => act(p)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: done ? C.ghost : p.relation === 'pending_in' ? C.ink : C.voltBg }}>
                  {busy === p.id ? <ActivityIndicator size="small" color={C.ink} />
                    : p.relation === 'friend' ? <Check size={14} color={C.light} weight="bold" />
                    : p.relation === 'pending_out' ? <Clock size={14} color={C.light} weight="bold" />
                    : <UserPlus size={14} color={p.relation === 'pending_in' ? C.volt : C.ink} weight="bold" />}
                  <AppText style={{ fontSize: 13, fontWeight: '800', color: done ? C.light : p.relation === 'pending_in' ? C.volt : C.ink }}>{label}</AppText>
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

/** Campo de busca que abre a tela Encontrar amigos (lá o teclado não cobre os resultados). */
export function FriendSearchEntry() {
  const isPt = systemIsPt;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(app)/find-friends' as any)}
      style={{ marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 13 }}>
      <MagnifyingGlass size={18} color={C.light} weight="bold" />
      <AppText style={{ fontSize: 15, color: C.light }}>{isPt ? 'Buscar amigo por nome ou @' : 'Find a friend by name or @'}</AppText>
    </TouchableOpacity>
  );
}
