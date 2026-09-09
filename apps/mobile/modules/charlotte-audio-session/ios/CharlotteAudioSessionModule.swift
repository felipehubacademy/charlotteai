import ExpoModulesCore
import AVFoundation
import WebRTC

/**
 * CharlotteAudioSession — controla AVAudioSession pra Live Voice via WebRTC.
 *
 * Filosofia (Jitsi-style, sem CallKit):
 *  - Singleton RTCAudioSessionConfiguration.webRTC() pre-seedado em OnCreate.
 *  - start() locka, aplica setConfiguration (sem `active:`), unlocka, força speaker.
 *  - O ADM do WebRTC ativa a session quando o primeiro track começa.
 *  - Ringback via AVAudioPlayer SO DEPOIS da config aplicada (herda primary).
 *  - useManualAudio JAMAIS (sem CallKit gera '!pri' loop infinito).
 *  - InCallManager JAMAIS.
 *
 * Refs:
 *  - jitsi-meet/ios/sdk/src/AudioMode.m (setConfig:, audioSessionDidChangeRoute:)
 *  - webrtc M124 RTCAudioSession.mm (configureWebRTCSession: → setConfiguration:active:YES)
 *  - RTCAudioSessionConfiguration.m (gWebRTCConfiguration process-wide singleton)
 */
public class CharlotteAudioSessionModule: Module {
  private var routeChangeObserver: NSObjectProtocol?
  private var interruptionObserver: NSObjectProtocol?
  private var preferSpeaker: Bool = true
  private var isActive: Bool = false
  private var ringbackPlayer: AVAudioPlayer?
  // Fila serial p/ as chamadas de overrideOutputAudioPort dos observers. Elas
  // fazem IPC com o servidor de audio e podem BLOQUEAR; rodando na main thread
  // (queue: .main dos observers) sob enxurrada de route changes isso trava a UI
  // (Sentry "App Hanging 2000ms" em RTCAudioSession.overrideOutputAudioPort ->
  // installObservers). Serial garante ordem + zero contencao concorrente.
  private let routeQueue = DispatchQueue(label: "com.charlotte.audiosession.route")

  public func definition() -> ModuleDefinition {
    Name("CharlotteAudioSession")
    Events("onRouteChange", "onInterruption")

    OnCreate {
      // Pre-seed antes do react-native-webrtc instanciar o peer connection.
      // O WebRTC ADM le este singleton quando o primeiro track ativa e chama
      // setConfiguration:active:YES sozinho. Nao tocamos setConfiguration em
      // start() pra evitar race condition que causava -12981 + !pri loop.
      // .defaultToSpeaker REMOVIDO: era ele que quebrava o toggle de earpiece.
      // Comprovado no device (idevicesyslog): ao tocar earpiece a rota chegava
      // no "Built-In Receiver" mas o DefaultBuiltInRoute:Speaker (=.defaultToSpeaker)
      // puxava de volta pro "Speaker" de baixo (audio alto). Sem ele, o
      // override(.none) do setSpeakerOn(false) fixa no receiver. O speaker
      // padrao continua garantido pelo override(.speaker) explicito no start()
      // + no route observer (mesma logica que mantem o fix do cabo USB).
      // mode = .voiceChat (prioridade de mic p/ evitar -12981/!pri vem do
      // .playAndRecord + modo de chamada, nao da chave voip removida por 2.5.4).
      let cfg = RTCAudioSessionConfiguration.webRTC()
      cfg.category = AVAudioSession.Category.playAndRecord.rawValue
      cfg.mode = AVAudioSession.Mode.voiceChat.rawValue
      cfg.categoryOptions = [.allowBluetooth, .allowBluetoothA2DP]
      RTCAudioSessionConfiguration.setWebRTC(cfg)
      NSLog("[CharlotteAudioSession] webRTC singleton seeded (playAndRecord+voiceChat+spk+bt, no defaultToSpeaker)")
    }

    AsyncFunction("start") { (preferSpeakerInput: Bool) -> Bool in
      self.preferSpeaker = preferSpeakerInput
      let session = RTCAudioSession.sharedInstance()

      session.lockForConfiguration()
      defer { session.unlockForConfiguration() }

      // NAO chamamos setConfiguration aqui. O WebRTC ADM aplica o singleton
      // pre-seedado em OnCreate (com setConfiguration:active:YES) quando o
      // primeiro audio track binda — ref RTCAudioSession.mm configureWebRTCSession.
      // Chamar setConfiguration do nosso lado racea contra o ADM e causava
      // -12981 "Invalid parameter" + !pri loop subsequente.
      // So forcamos speaker se NAO houver fone (AirPods/BT/com fio) na rota.
      // Antes forcavamos incondicionalmente, o que jogava o audio pro speaker
      // mesmo com AirPods conectados (usuario tinha que tocar o botao pra ir
      // pros fones). O guard hasHeadphoneRoute() respeita os fones e mantem o
      // fix do cabo USB (cabo != fone → continua forcando speaker). O observer
      // de rota re-aplica a mesma logica em mudancas subsequentes.
      if self.preferSpeaker && !self.hasHeadphoneRoute() {
        do {
          try session.overrideOutputAudioPort(.speaker)
        } catch {
          NSLog("[CharlotteAudioSession] override speaker error: \(error.localizedDescription)")
        }
      }

      self.installObservers()
      self.isActive = true
      NSLog("[CharlotteAudioSession] start preferSpeaker=\(preferSpeakerInput) (ADM aplica config sozinho)")
      return true
    }

    AsyncFunction("stop") { () -> Void in
      self.ringbackPlayer?.stop()
      self.ringbackPlayer = nil
      self.removeObservers()
      self.isActive = false

      // Volta pra config benigna pra liberar primary pro resto do app
      // (sons curtos, video player, etc).
      let session = RTCAudioSession.sharedInstance()
      let benign = RTCAudioSessionConfiguration()
      benign.category = AVAudioSession.Category.ambient.rawValue
      benign.mode = AVAudioSession.Mode.default.rawValue
      benign.categoryOptions = []

      session.lockForConfiguration()
      defer { session.unlockForConfiguration() }
      try? session.setConfiguration(benign)
      NSLog("[CharlotteAudioSession] stop (session→ambient)")
    }

    AsyncFunction("playRingback") { () -> Bool in
      // Pre-condicao: start() ja rodou e setConfiguration(playAndRecord) aplicou.
      // AVAudioPlayer aqui herda a session ativa — NAO rouba primary porque
      // a session ja esta como playAndRecord (categoria input+output).
      guard let url = Bundle.main.url(forResource: "incallmanager_ringback", withExtension: "mp3") else {
        NSLog("[CharlotteAudioSession] ringback mp3 not found")
        return false
      }
      do {
        if self.ringbackPlayer == nil {
          let player = try AVAudioPlayer(contentsOf: url)
          player.numberOfLoops = -1
          player.prepareToPlay()
          self.ringbackPlayer = player
        }
        self.ringbackPlayer?.currentTime = 0
        let started = self.ringbackPlayer?.play() ?? false
        if !started { NSLog("[CharlotteAudioSession] ringback play() returned false") }
        return started
      } catch {
        NSLog("[CharlotteAudioSession] playRingback error: \(error.localizedDescription)")
        return false
      }
    }

    AsyncFunction("stopRingback") { () -> Void in
      self.ringbackPlayer?.stop()
      self.ringbackPlayer?.currentTime = 0
    }

    AsyncFunction("setSpeakerOn") { (on: Bool) -> Bool in
      self.preferSpeaker = on
      let session = RTCAudioSession.sharedInstance()
      session.lockForConfiguration()
      defer { session.unlockForConfiguration() }
      do {
        try session.overrideOutputAudioPort(on ? .speaker : .none)
        return true
      } catch {
        NSLog("[CharlotteAudioSession] setSpeakerOn error: \(error.localizedDescription)")
        return false
      }
    }

    Function("getCurrentRoute") { () -> String in
      let route = AVAudioSession.sharedInstance().currentRoute
      let outputs = route.outputs.map { "\($0.portType.rawValue):\($0.portName)" }
      return outputs.joined(separator: ",")
    }

    // true se ha um mic Bluetooth (AirPods/headset) disponivel OU ja em uso.
    // `availableInputs` reflete headsets HFP conectados independente da rota de
    // saida ativa e mesmo com a sessao idle — por isso funciona no hint da
    // Pronuncia (onde CharlotteAudioSession nao esta ativo). Fallback pra
    // currentRoute cobre quando o audio ja esta roteando pra BT. Usado pelo
    // BluetoothMicHint pra avisar que o mic HFP (~8kHz) degrada o ASR.
    Function("isBluetoothMicAvailable") { () -> Bool in
      let session = AVAudioSession.sharedInstance()
      if let inputs = session.availableInputs,
         inputs.contains(where: { $0.portType == .bluetoothHFP }) {
        return true
      }
      return session.currentRoute.outputs.contains {
        $0.portType == .bluetoothA2DP || $0.portType == .bluetoothHFP || $0.portType == .bluetoothLE
      }
    }
  }

  // Fones (AirPods/BT/com fio) presentes na rota de saida atual. Se sim, NAO
  // forcamos speaker no start() — o usuario quer ouvir pelos fones. Espelha a
  // checagem `hasHeadphones` do route observer pra manter consistencia.
  private func hasHeadphoneRoute() -> Bool {
    return AVAudioSession.sharedInstance().currentRoute.outputs.contains {
      $0.portType == .headphones || $0.portType == .bluetoothA2DP ||
      $0.portType == .bluetoothHFP || $0.portType == .bluetoothLE
    }
  }

  // MARK: - Observers

  private func installObservers() {
    let nc = NotificationCenter.default
    let session = AVAudioSession.sharedInstance()

    routeChangeObserver = nc.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: session,
      queue: .main
    ) { [weak self] notification in
      guard let self = self, self.isActive else { return }
      let reasonRaw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
      let reason = AVAudioSession.RouteChangeReason(rawValue: reasonRaw) ?? .unknown

      let currentRoute = session.currentRoute
      let outputs = currentRoute.outputs
        .map { "\($0.portType.rawValue):\($0.portName)" }
        .joined(separator: ",")

      NSLog("[CharlotteAudioSession] route change reason=\(reasonRaw) outputs=\(outputs)")
      self.sendEvent("onRouteChange", ["reason": reasonRaw, "outputs": outputs])

      // Razoes que exigem reafirmar o speaker. Alem das 3 do Jitsi
      // (device plug/unplug), incluimos categoryChange/override/
      // routeConfigurationChange: quando o WebRTC ADM ativa a sessao
      // (setConfiguration) com um cabo USB JA plugado no inicio da call,
      // a route change chega com reason=.categoryChange/.override — que
      // antes caia no default e o force-speaker NUNCA rodava (cabo no
      // inicio = falha; plugar durante = funcionava). Agora reafirmamos.
      let external: Bool
      switch reason {
      case .newDeviceAvailable, .oldDeviceUnavailable, .noSuitableRouteForCategory,
           .categoryChange, .override, .routeConfigurationChange:
        external = true
      default:
        external = false
      }
      guard external, self.preferSpeaker else { return }

      let hasHeadphones = currentRoute.outputs.contains {
        $0.portType == .headphones || $0.portType == .bluetoothA2DP ||
        $0.portType == .bluetoothHFP || $0.portType == .bluetoothLE
      }
      let isOnSpeaker = currentRoute.outputs.contains { $0.portType == .builtInSpeaker }

      // Cabo USB / Lightning DAC: portType == .usbAudio (não eh headphone real).
      if !isOnSpeaker && !hasHeadphones {
        // Off-main: overrideOutputAudioPort faz IPC e pode bloquear (ver routeQueue).
        self.routeQueue.async {
          let rtc = RTCAudioSession.sharedInstance()
          rtc.lockForConfiguration()
          try? rtc.overrideOutputAudioPort(.speaker)
          rtc.unlockForConfiguration()
          NSLog("[CharlotteAudioSession] route forced→speaker")
        }
      }
    }

    interruptionObserver = nc.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: session,
      queue: .main
    ) { [weak self] notification in
      guard let self = self, self.isActive else { return }
      let typeRaw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt ?? 0
      let type = AVAudioSession.InterruptionType(rawValue: typeRaw) ?? .began

      NSLog("[CharlotteAudioSession] interruption type=\(typeRaw)")

      if type == .ended, self.preferSpeaker {
        self.routeQueue.async {
          let rtc = RTCAudioSession.sharedInstance()
          rtc.lockForConfiguration()
          try? rtc.overrideOutputAudioPort(.speaker)
          rtc.unlockForConfiguration()
        }
      }
      self.sendEvent("onInterruption", ["type": typeRaw])
    }
  }

  private func removeObservers() {
    let nc = NotificationCenter.default
    if let obs = routeChangeObserver { nc.removeObserver(obs); routeChangeObserver = nil }
    if let obs = interruptionObserver { nc.removeObserver(obs); interruptionObserver = nil }
  }
}
