// lib/hapticsGated.ts
// Mesma API do expo-haptics, mas só vibra se a preferência "Vibração" estiver ligada.
// Use `import * as Haptics from '@/lib/hapticsGated'` no lugar de 'expo-haptics'.

import * as ExpoHaptics from 'expo-haptics';
import { getAudioPreferences } from './audioPreferences';

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

function enabled(): boolean { return getAudioPreferences().haptic; }

export function impactAsync(style?: ExpoHaptics.ImpactFeedbackStyle): Promise<void> {
  return enabled() ? ExpoHaptics.impactAsync(style) : Promise.resolve();
}

export function notificationAsync(type?: ExpoHaptics.NotificationFeedbackType): Promise<void> {
  return enabled() ? ExpoHaptics.notificationAsync(type) : Promise.resolve();
}

export function selectionAsync(): Promise<void> {
  return enabled() ? ExpoHaptics.selectionAsync() : Promise.resolve();
}
