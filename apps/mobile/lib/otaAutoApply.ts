// lib/otaAutoApply.ts — aplica a atualização OTA quando o app volta do segundo plano.
//
// O expo-updates (checkAutomatically: ON_LOAD) só procura atualização na abertura "do zero" e só a
// aplica na abertura seguinte. No Android o app fica vivo em segundo plano por dias, então o aluno
// seguia no pacote antigo (caso real: aluno ainda no pacote da loja uma semana depois das correções).
//
// Aqui, ao voltar para o app:
//   - procura e baixa atualização nova (no máximo a cada 30 min);
//   - se já há uma baixada e o app ficou fora 10 min ou mais, recarrega na hora,
//     menos no meio de exercício, ligação ou conversa (rotas em BUSY_ROUTES): aí espera a próxima volta.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

const RELOAD_AFTER_AWAY_MS = 10 * 60_000;
const CHECK_EVERY_MS = 30 * 60_000;
const BUSY_ROUTES = [
  'learn-session', 'learn-grammar', 'learn-pronunciation', 'guided-chat-exercise', 'roleplay-exercise',
  'vocab-review', 'placement-test', 'livevoice', 'support-chat', 'add-word',
  'change-password', 'first-access',
];

export function useOtaAutoApply(pathname: string | null) {
  const { isUpdatePending } = Updates.useUpdates();
  const pendingRef = useRef(isUpdatePending);
  const pathRef = useRef(pathname);
  const bgAt = useRef<number | null>(null);
  const lastCheck = useRef(Date.now()); // a abertura já procurou (ON_LOAD)
  pendingRef.current = isUpdatePending;
  pathRef.current = pathname;

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'background') { bgAt.current = Date.now(); return; }
      if (state !== 'active' || bgAt.current === null) return;
      const away = Date.now() - bgAt.current;
      bgAt.current = null;
      const canReload = () => away >= RELOAD_AFTER_AWAY_MS
        && !BUSY_ROUTES.some(r => (pathRef.current ?? '').includes(r));
      try {
        if (!pendingRef.current && Date.now() - lastCheck.current >= CHECK_EVERY_MS) {
          lastCheck.current = Date.now();
          const check = await Updates.checkForUpdateAsync();
          if (check.isAvailable) {
            const fetched = await Updates.fetchUpdateAsync();
            if (fetched.isNew) pendingRef.current = true;
          }
        }
        if (pendingRef.current && canReload()) await Updates.reloadAsync();
      } catch {}
    });
    return () => sub.remove();
  }, []);
}
