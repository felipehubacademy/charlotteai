// lib/shareUtils.ts
// Utilitários para compartilhar streak e conquistas via Share Sheet nativo.
// Gera texto + link (sem imagem por agora — simplificar para MVP).

import { Share, Platform } from 'react-native';
import { track } from './analytics';

const APP_URL = 'https://charlotte.hubacademybr.com';

/** Compartilha streak atual. */
export async function shareStreak(streakDays: number, _isPt?: boolean): Promise<void> {
  const message = `${streakDays} dias seguidos praticando inglês com o Queizy! Quanto tempo você consegue manter? ${APP_URL}`;

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message }
        : { message, title: 'Queizy' },
    );
    track('share_streak', { streakDays });
  } catch { /* cancelado */ }
}

/** Compartilha conquista desbloqueada. */
export async function shareAchievement(
  title: string,
  rarity: string,
  _isPt?: boolean,
): Promise<void> {
  const message = `Desbloqueei "${title}" no Queizy! Aprenda inglês com IA. ${APP_URL}`;

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message }
        : { message, title: 'Queizy' },
    );
    track('share_achievement', { title, rarity });
  } catch { /* cancelado */ }
}

/** Compartilha XP total. */
export async function shareXP(totalXP: number, _isPt?: boolean): Promise<void> {
  const message = `Já acumulei ${totalXP.toLocaleString()} XP aprendendo inglês com o Queizy! ${APP_URL}`;

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message }
        : { message, title: 'Queizy' },
    );
  } catch { /* cancelado */ }
}
