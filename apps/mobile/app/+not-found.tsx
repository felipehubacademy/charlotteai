import { Stack } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Question } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';

const C = {
  bg:       '#F4F3FA',
  navy:     '#16153A',
  navyMid:  '#4B4A72',
  navyLight:'#9896B8',
  green:    '#A3FF3C',
};

export default function NotFoundScreen() {
  const { profile } = useAuth();
  const isPt = systemIsPt; // pagina de erro = sistema: idioma do device

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with back arrow */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(163,255,60,0.12)',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Question size={40} color={C.green} weight="fill" />
        </View>

        <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 10, textAlign: 'center' }}>
          {isPt ? 'Página não encontrada' : 'Page not found'}
        </AppText>
        <AppText style={{ fontSize: 14, color: C.navyMid, textAlign: 'center', lineHeight: 21, marginBottom: 32 }}>
          {isPt
            ? 'Esta página não existe ou foi removida.'
            : 'This page does not exist or has been removed.'}
        </AppText>

        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)')}
          style={{
            backgroundColor: C.navy, borderRadius: 14,
            paddingVertical: 14, paddingHorizontal: 32,
          }}
        >
          <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
            {isPt ? 'Voltar' : 'Go back'}
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
