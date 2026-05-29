// splashGate — Promise unica que resolve quando o SplashOverlay termina o
// fade out. Permite outros modulos (ex: intro_app sound) esperarem nela
// antes de disparar coisas que so devem rodar apos a UI estar visivel.

let resolveSplashGate: (() => void) | null = null;
export const splashGate: Promise<void> = new Promise(resolve => {
  resolveSplashGate = resolve;
});

export function markSplashDone() {
  if (resolveSplashGate) {
    resolveSplashGate();
    resolveSplashGate = null;
  }
}
