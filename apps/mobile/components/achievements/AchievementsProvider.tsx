/**
 * AchievementsProvider
 *
 * Sits above all app screens (inside AppLayout) and renders the
 * AchievementNotification overlay whenever a new achievement is earned.
 *
 * Exposes checkForNewAchievements() via AchievementsContext so any hook
 * (e.g. useChat, useLearnProgress) can trigger a poll after saving XP.
 * No Realtime dependency — polls charlotte.user_achievements on demand.
 */
import { systemIsPt } from '@/lib/systemLang';
import React, { createContext, useContext, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAchievements } from '@/hooks/useAchievements';
import AchievementNotification from './AchievementNotification';

interface AchievementsContextValue {
  checkForNewAchievements: () => Promise<void>;
  pauseNotifications: (paused: boolean) => void;
}

const AchievementsContext = createContext<AchievementsContextValue>({
  checkForNewAchievements: async () => {},
  pauseNotifications: () => {},
});

export function useAchievementsContext() {
  return useContext(AchievementsContext);
}

interface AchievementsProviderProps {
  children: React.ReactNode;
}

export function AchievementsProvider({ children }: AchievementsProviderProps) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const isPt = systemIsPt; // aviso de conquista = interface: idioma do device
  const { pendingAchievements, dismissAchievement, checkForNewAchievements } = useAchievements(userId);
  const [paused, setPaused] = useState(false);

  const pauseNotifications = useCallback((value: boolean) => {
    setPaused(value);
  }, []);

  return (
    <AchievementsContext.Provider value={{ checkForNewAchievements, pauseNotifications }}>
      {children}
      {!paused && (
        <AchievementNotification
          achievements={pendingAchievements}
          onDismiss={dismissAchievement}
          isPt={isPt}
        />
      )}
    </AchievementsContext.Provider>
  );
}
