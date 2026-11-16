// lib/tasteExtra.ts — degustação: "Fazer mais uma agora".
// Quem termina o tópico do dia ganha, 1x por dia, a Gramática do próximo tópico na hora (é quando a vontade
// de seguir está maior: quem fecha a oferta do fim do tópico quase não volta). Ao terminar essa atividade,
// a oferta abre de novo ('taste_extra'). No dia seguinte o tópico libera normalmente e a Gramática já conta.
import * as SecureStore from 'expo-secure-store';

const key = (userId: string, day: number) => `taste_extra_${userId.replace(/[^A-Za-z0-9]/g, '')}_${day}`;

export async function tasteExtraUsed(userId: string | undefined | null, day: number): Promise<boolean> {
  if (!userId) return true;
  return !!(await SecureStore.getItemAsync(key(userId, day)).catch(() => '1'));
}

export async function markTasteExtraUsed(userId: string, day: number): Promise<void> {
  await SecureStore.setItemAsync(key(userId, day), '1').catch(() => {});
}
