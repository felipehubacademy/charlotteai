// Encontrar amigos — busca por nome, sobrenome ou @ em tela própria, com o
// campo no topo (o teclado não cobre os resultados). Pedidos recebidos embaixo.
import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { C, ScreenHeader } from '@/components/stats/StatsUI';
import { FriendSearch } from '@/components/social/FriendSearch';
import { FriendRequests } from '@/components/social/FriendRequests';
import { BlockedList } from '@/components/social/BlockedList';
import { systemIsPt } from '@/lib/systemLang';

export default function FindFriendsScreen() {
  const insets = useSafeAreaInsets(); // barra de navegação do Android / home indicator
  const isPt = systemIsPt;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Encontrar amigos' : 'Find friends'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <FriendSearch autoFocus />
          <AppText style={{ fontSize: 12.5, color: C.light, marginHorizontal: 20, marginTop: -6, marginBottom: 12 }}>
            {isPt ? 'Busque pelo nome, sobrenome ou @. A pessoa recebe seu pedido e, ao aceitar, vocês viram amigos de estudo.'
                  : 'Search by name, last name or @. They get your request and, once accepted, you become study friends.'}
          </AppText>
          <FriendRequests />
          <BlockedList />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
