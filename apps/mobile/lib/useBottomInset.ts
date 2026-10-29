// lib/useBottomInset.ts — espaço de baixo real para botões fixos no rodapé.
//
// O KeyboardProvider (react-native-keyboard-controller) envolve o app e consome a medida da barra de
// navegação do Android: com os três botões ele mesmo reserva o espaço (a tela termina acima da barra),
// mas na navegação por gestos não reserva e o useSafeAreaInsets devolve 0. Resultado: no modo de
// gestos o botão "Verificar" ficava embaixo da barrinha (caso real: Galaxy S25 Ultra, 2026-10-21).
// Aqui: se a tela vai até o fim do aparelho, usa a altura real da barra (initialWindowMetrics).
import { Dimensions, Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  if (Platform.OS !== 'android' || insets.bottom > 0) return insets.bottom;
  const screenH = Dimensions.get('screen').height;
  const reachesBottom = frame.y + frame.height >= screenH - 2;
  return reachesBottom ? Math.max(initialWindowMetrics?.insets.bottom ?? 0, 16) : 0;
}
