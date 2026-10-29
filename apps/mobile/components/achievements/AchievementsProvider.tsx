/**
 * AchievementsProvider
 *
 * Sits above all app screens (inside AppLayout) and renders the
 * AchievementNotification overlay whenever a new achievement is earned.
 *
 * Exposes checkForNewAchievements() via AchievementsContext so any hook
 * (e.g. useChat, useLearnProgress) can trigger a poll after saving XP.
 * No Realtime dependency — polls charlotte.user_achievements on demand.
 *
 * Sequência: waitForCelebration() segura o áudio que abre a próxima atividade (Role-play,
 * Speaking) enquanto a conferência de conquistas está em andamento ou o card está na tela.
 * pauseNotifications é contado (cada true tem o seu false), para a troca de tela por
 * replace não deixar o aviso pausado ou solto no lugar errado.
 */
import { systemIsPt } from '@/lib/systemLang';
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAchievements } from '@/hooks/useAchievements';
import AchievementNotification from './AchievementNotification';

interface AchievementsContextValue {
  checkForNewAchievements: (delayMs?: number) => Promise<void>;
  pauseNotifications: (paused: boolean) => void;
  waitForCelebration: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextValue>({
  checkForNewAchievements: async () => {},
  pauseNotifications: () => {},
  waitForCelebration: async () => {},
});

// Teto para a espera da conferência (rede lenta não pode travar o áudio da atividade).
const CHECK_WAIT_MAX_MS = 6000;

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
  const { pendingAchievements, dismissAchievement, checkForNewAchievements: runCheck } = useAchievements(userId);
  const [pauseCount, setPauseCount] = useState(0);
  const paused = pauseCount > 0;
  const [checking, setChecking] = useState(0);

  const pauseNotifications = useCallback((value: boolean) => {
    setPauseCount(c => Math.max(0, c + (value ? 1 : -1)));
  }, []);

  // A espera antes de conferir (o save acabou de acontecer) já conta como "conferindo".
  const checkForNewAchievements = useCallback(async (delayMs = 0) => {
    setChecking(c => c + 1);
    try {
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      await runCheck();
    } catch {} finally {
      setChecking(c => c - 1);
    }
  }, [runCheck]);

  const showing = !paused && pendingAchievements.length > 0;
  const stateRef = useRef({ checking, showing });
  stateRef.current = { checking, showing };
  const waitersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (checking > 0 || showing) return;
    const ws = waitersRef.current; waitersRef.current = [];
    ws.forEach(w => w());
  }, [checking, showing]);

  const waitForCelebration = useCallback(() => new Promise<void>(resolve => {
    const { checking: c, showing: sh } = stateRef.current;
    if (c === 0 && !sh) { resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    waitersRef.current.push(finish);
    // Só a conferência tem teto; com o card na tela, espera o aluno fechar.
    if (!sh) setTimeout(() => { if (!stateRef.current.showing) finish(); }, CHECK_WAIT_MAX_MS);
  }), []);

  return (
    <AchievementsContext.Provider value={{ checkForNewAchievements, pauseNotifications, waitForCelebration }}>
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
