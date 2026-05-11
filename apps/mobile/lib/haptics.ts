// lib/haptics.ts
// Wrapper para expo-haptics que respeita a preferencia do usuario.
// Novo codigo deve usar este modulo. Codigo legado que chama Haptics.* direto
// continuara funcionando — migrar incrementalmente para gating consistente.

import * as Haptics from 'expo-haptics';
import { getAudioPreferences } from './audioPreferences';

function enabled(): boolean { return getAudioPreferences().haptic; }

export const haptics = {
  light:     () => { if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  medium:    () => { if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  heavy:     () => { if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); },
  selection: () => { if (enabled()) Haptics.selectionAsync().catch(() => {}); },
  success:   () => { if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warning:   () => { if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
  error:     () => { if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};
