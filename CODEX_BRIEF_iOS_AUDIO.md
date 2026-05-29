# Charlotte AI — iOS Live Voice audio session bug

**Repo:** `charlotteai` (monorepo)

## ⚠️ IMPORTANTE — branch certa

Olhar **`livevoice-reset-2026-05`** (NÃO `main`).

- `main` ainda tem a versão antiga com `react-native-incall-manager` (que está BANIDO, ver §9). Não serve de referência.
- Toda a frente do iOS audio session atual está em **`livevoice-reset-2026-05`** — last commit relevante: `8934c96` (`fix ios: Jitsi-style audio session pattern`).

```bash
git fetch origin livevoice-reset-2026-05
git checkout livevoice-reset-2026-05
```

Commits chave nessa branch pra entender a evolução:
- `933618e` — reset cirúrgico inicial (criação do CharlotteAudioSession nativo)
- `a5b1436` — primeira tentativa useManualAudio (falhou)
- `68c0057` — remove `.allowBluetoothA2DP`
- `828c153` — `audioSessionDidActivate` handshake (CallKit-only, removido)
- `d961aff` — race condition fix
- `14226fc` — pre-seed singleton RTCAudioSessionConfiguration
- `d66b2a2` — `setWebRTC` rename
- **`8934c96`** — pattern Jitsi-style (estado atual em TestFlight build 104)

---

**Build em TestFlight:** iOS 1.1.0 (104), commit `8934c96`  
**Plataforma com problema:** iOS apenas (testado em iPhone 17 Pro Max, iOS 26.4.2)  
**Android:** funciona perfeito com o mesmo módulo nativo (Kotlin equivalente)

Objetivo: ter uma segunda opinião sobre por que o iOS continua com **briga sutil de roteamento speaker/earpiece** + flood de erros `'!pri' / Operation Denied (-15685)` em loop no `audiomxd`, mesmo após aplicar o pattern Jitsi.

---

## 1. Stack relevante

- React Native 0.81.5 + Expo SDK 54
- `react-native-webrtc` 124.0.7 (que depende de `JitsiWebRTC` 124.0.0)
- Módulo nativo nosso: `apps/mobile/modules/charlotte-audio-session/`
  - iOS: Swift (`ios/CharlotteAudioSessionModule.swift`)
  - Android: Kotlin (equivalente, **funciona limpo**)
- Live Voice front-end: `apps/mobile/components/voice/LiveVoiceModal.tsx`
- Transport: WebRTC direto → OpenAI Realtime API (`gpt-realtime-2`)
- Ringback: MP3 bundlado via config plugin `apps/mobile/plugins/with-incallmanager-ringback.js` (nome legado — não usa mais InCallManager). Tocado via `AVAudioPlayer` dentro do native module.

**Constraint dura:** `react-native-incall-manager` está **PROIBIDO** no projeto (ver `feedback_no_incallmanager.md` em memory). Não sugerir.

---

## 2. Sintomas concretos

### O que funciona (parcialmente)
- Charlotte fala (audio output OK)
- Mic captura user (Charlotte ouve e responde corretamente, confirmado por transcript do DB)
- Conversa flui

### O que não funciona
- **Briga sutil speaker ↔ earpiece** — não é mais loop visível, mas oscilação residual
- **Flood de erros no log** (não-fatal, mas mostra que algo tá errado):
  ```
  audiomxd: { "action":"set_property", error_code: -15685, "Operation Denied" }
  CharlotteAI(AudioSession): SessionCore.mm:517 Failed to set properties, error: '!pri'
  ```
  Repete dezenas de vezes por segundo durante a chamada inteira.
- **Um único `-12981 Invalid parameter`** no início da chamada, sempre na mesma linha 511 do `AudioSessionServerImpCommon.mm`.
- **Qualidade de áudio "meio off"** — provável consequência do session estar em config errada/intermediária.

### O que NÃO acontece (já testado e descartado)
- AVAudioPlayer NÃO está roubando primary (movido pra depois do `start()`).
- WebRTC NÃO está em `useManualAudio` — `useManualAudio = YES` sem CallKit reproduz pior loop (testado).
- `setActive(true)` manual NÃO funciona — leva ao mesmo loop.
- Singleton `RTCAudioSessionConfiguration.webRTC()` ESTÁ sendo pre-seedado em `OnCreate`.

---

## 3. Arquivos pra olhar

Em ordem de prioridade:

1. **`apps/mobile/modules/charlotte-audio-session/ios/CharlotteAudioSessionModule.swift`** — código atual completo. Aproximadamente 230 linhas. Implementa pattern Jitsi (pre-seed singleton + `setConfiguration` 2-arg sob lock).
2. **`apps/mobile/components/voice/LiveVoiceModal.tsx`** — `connect()` function ~linha 858. Chama `CharlotteAudioSession.start()` antes de `getUserMedia`, depois `startCustomRingback()`.
3. **`apps/mobile/modules/charlotte-audio-session/ios/CharlotteAudioSession.podspec`** — depende de `react-native-webrtc` pra acessar `WebRTC.framework`.
4. **`apps/mobile/modules/charlotte-audio-session/src/index.ts`** — TS wrapper.
5. **`apps/mobile/app.config.ts`** — checar runtime version 2.0.0 + ausência de InCallManager + plugins.

---

## 4. Pattern atual (o que JÁ está no build 104)

```swift
import WebRTC

OnCreate {
  let cfg = RTCAudioSessionConfiguration.webRTC()
  cfg.category = AVAudioSession.Category.playAndRecord.rawValue
  cfg.mode = AVAudioSession.Mode.videoChat.rawValue
  cfg.categoryOptions = [.allowBluetooth, .defaultToSpeaker, .duckOthers]
  RTCAudioSessionConfiguration.setWebRTC(cfg)
}

AsyncFunction("start") { (preferSpeakerInput: Bool) in
  let session = RTCAudioSession.sharedInstance()
  let cfg = RTCAudioSessionConfiguration.webRTC()

  session.lockForConfiguration()
  defer { session.unlockForConfiguration() }

  try session.setConfiguration(cfg)  // 2-arg, sem active:YES
  
  if preferSpeaker {
    try session.overrideOutputAudioPort(.speaker)
  }
  
  // observers de routeChangeNotification + interruptionNotification
}

// stop() faz setConfiguration(.ambient) sob lock pra liberar primary
```

JS no LiveVoiceModal:
```ts
await CharlotteAudioSession.start(isSpeakerRef.current);  // pre-seed + override
// ...
const stream = await mediaDevices.getUserMedia({ audio: { ... } });  // WebRTC ADM ativa
// ...
startCustomRingback();  // AVAudioPlayer depois de session estar em playAndRecord
```

---

## 5. Histórico de tentativas (5 builds iOS, todas falharam parcial ou totalmente)

| Build | Mudança | Resultado |
|--|--|--|
| 97 | `useManualAudio = true` + lock | `!pri` loop, audio dead |
| 98 | Remove `.allowBluetoothA2DP` (era incompatível com `.defaultToSpeaker`, dava -12981) | `!pri` loop ainda |
| 100 | Race fix em `isReapplyingRoute` via `asyncAfter` | `!pri` loop ainda, audio dead |
| 101 | (cancelado antes do build) — adicionado `audioSessionDidActivate` | n/a |
| 102 | `setWebRTC` rename fix | n/a |
| 103 | Compile fix | `!pri` loop, audio dead |
| **104 (atual)** | **Pattern Jitsi**: drop useManualAudio, pre-seed singleton, setConfiguration 2-arg | **audio funciona**, mas `!pri` loop residual, `-12981` único no início, briga sutil |

A diferença Android vs iOS é gritante: o mesmo design conceitual no Kotlin (`AudioManager.MODE_IN_COMMUNICATION` + `setSpeakerphoneOn`) **funciona limpo** sem nenhum dos problemas.

---

## 6. Hipóteses não confirmadas que merecem investigação

1. **`.duckOthers` em iOS 26 incompatível.** Categoryoptions tem documentação meio inconsistente; talvez `.duckOthers` cause o `-12981` único no início. Não testei sem.

2. **Algum ator do app (Sentry? expo-video?) toma "primary" da CoreSession privada do iOS** e mantém ela durante a chamada toda. Isso explicaria `'!pri'` (`Operation Denied = not primary`). Não consegui identificar quem.

3. **Voice Processing I/O unit** (necessário pra AEC) não estaria ativando porque o mode `.videoChat` desabilita ele em algumas builds iOS. Maybe `.voiceChat` mode era necessário, e a "briga" do speaker era o trade-off justo.

4. **`RTCAudioSession.delegate`** (callback-based) seria mais confiável que `NSNotificationCenter` pra route changes. Jitsi usa delegate.

5. **iOS 26.4.2 specifically** mudou algo no audiomxd que torna o pattern Jitsi quebrado, e a community ainda não atualizou. O dev-mode do iPhone também afeta logging behavior.

6. **A regra "Charlotte AI bundle ID = com.hubacademy.charlotte" sem grupo de capabilities** (audio background, voip) pode estar limitando o que conseguimos com session primary. Não temos `UIBackgroundModes: ["voip"]` ou `["audio"]` no `Info.plist` (verificado em `app.config.ts`).

---

## 7. Logs da última conversa (build 104)

User conseguiu conversa de 138s com Charlotte. Transcript no DB confirma que mic + speaker funcionam. Logs simultâneos do `idevicesyslog`:

```
23:22:33.685 audiomxd: { "set_property", "session":{"ID":"0x731b9","name":"CharlotteAI(1324)"},
                        "error_code":-12981, "error_string":"Invalid parameter" }  // único
23:22:37.774 audiomxd: { "set_property", ... "error_code":-15685, "Operation Denied" }
23:22:37.774 CharlotteAI(AudioSession): SessionCore.mm:517 Failed to set properties, error: '!pri'
... ('!pri' / -15685 loop continua até stop)
```

Inferência: nosso `setConfiguration` em `start()` deu **-12981 uma vez** (provavelmente `.duckOthers` rejeitado). Depois, WebRTC tenta setProperty interno e bate em `'!pri'` repetidamente. Audio funciona porque o ADM (audio device module) já está em playAndRecord básico, mesmo sem a config completa.

---

## 8. Pergunta concreta pro Codex

Existe alguma coisa estrutural neste código que está **gerando o '!pri' loop** que eu não percebi? Especialmente:

- O `setConfiguration` 2-arg está correto pro pattern Jitsi sem CallKit?
- O `lockForConfiguration / unlockForConfiguration` está sendo usado nos lugares certos?
- Existe algum lifecycle (`OnDestroy`, etc.) que deveria existir e não tem?
- A ordem `lock → setConfiguration → override → unlock` é a canônica?
- `.duckOthers` é seguro com `.playAndRecord + .videoChat + .allowBluetooth + .defaultToSpeaker` em iOS 26?
- Falta declarar `UIBackgroundModes: ["voip"]` no `Info.plist` pra ser legitimamente "primary"?

Se você confirmar uma dessas, vou direto pro fix. Se descobrir outra causa raiz que não tô vendo, melhor ainda.

---

## 9. Constraints / regras

- **InCallManager JAMAIS** (veto absoluto do produto)
- Code precisa compilar com Swift 5.4 / iOS 15.1+ target
- Build via EAS (cloud), não Xcode local
- Cada iteração custa ~25min de build + 5-15min submission TestFlight, então fix com confiança importa
