import ExpoModulesCore
import AVFoundation
import WebRTC

/**
 * CharlotteAudioSession — substitui InCallManager para Live Voice.
 *
 * Decisoes chave:
 *   - RTCAudioSession.useManualAudio = YES — desativa o gerenciamento
 *     automatico do react-native-webrtc sobre AVAudioSession. Sem isso,
 *     WebRTC toma a "primary session" e nossos setCategory/setActive sao
 *     rejeitados com -15685 "Operation Denied / !pri" (especialmente com
 *     USB Audio Device plugado). Nos controlamos a session manualmente.
 *   - mode: .default em vez de .voiceChat — VoiceChat prioriza rotas
 *     externas (USB DAC, cabo Lightning com audio) e ignora
 *     overrideOutputAudioPort. Modo .default respeita DefaultToSpeaker.
 *   - Listener de RouteChangeNotification re-aplica override em qualquer
 *     mudanca de rota.
 *   - Listener de InterruptionNotification re-ativa session apos chamada
 *     telefonica / Siri / outras interrupcoes.
 *
 * Eco / AEC: WebRTC habilita AEC software automaticamente quando o peer
 * connection ativa o audio track. Funciona com mode .default — nao
 * precisamos de .voiceChat pra ter AEC.
 */
public class CharlotteAudioSessionModule: Module {
  private var routeChangeObserver: NSObjectProtocol?
  private var interruptionObserver: NSObjectProtocol?
  private var preferSpeaker: Bool = true
  private var isActive: Bool = false
  private var ringbackPlayer: AVAudioPlayer?
  // Reentrancy guard: setCategory/overrideOutputAudioPort dentro do route
  // change handler geram NOVA route change notification, podendo loopar.
  // Quando estamos no meio de reaplicar config, ignoramos a proxima
  // notification gerada por nos mesmos.
  private var isReapplyingRoute: Bool = false

  public func definition() -> ModuleDefinition {
    Name("CharlotteAudioSession")

    Events("onRouteChange", "onInterruption")

    // Executa assim que o modulo eh registrado no runtime (antes do JS importar
    // react-native-webrtc). Critico: setar useManualAudio = true ANTES do
    // WebRTC instanciar o RTCAudioSession singleton em modo automatico.
    OnCreate {
      RTCAudioSession.sharedInstance().useManualAudio = true
      NSLog("[CharlotteAudioSession] RTCAudioSession.useManualAudio = true (bootstrap)")
    }

    /**
     * Toca o ringback (incallmanager_ringback.mp3) em loop.
     *
     * Critico: o player USA a session que JA configuramos (PlayAndRecord +
     * mode .default + DefaultToSpeaker). Sem mexer na categoria — nao briga
     * com a session da call. Output garantido pelo speaker.
     *
     * Se start() ainda nao foi chamado, configuramos a session com defaults
     * antes de tocar (caso JS chame playRingback antes de start).
     *
     * O MP3 e bundlado pelo config plugin `with-incallmanager-ringback.js`
     * em Bundle.main (PBXResourcesBuildPhase). Nome herdado mas e so um path.
     */
    AsyncFunction("playRingback") { () -> Bool in
      guard let url = Bundle.main.url(forResource: "incallmanager_ringback", withExtension: "mp3") else {
        NSLog("[CharlotteAudioSession] ringback mp3 not found in bundle")
        return false
      }
      do {
        if !self.isActive {
          self.preferSpeaker = true
          try self.configureSession()
          self.installObservers()
          self.isActive = true
        }
        if self.ringbackPlayer == nil {
          let player = try AVAudioPlayer(contentsOf: url)
          player.numberOfLoops = -1
          player.prepareToPlay()
          self.ringbackPlayer = player
        }
        self.ringbackPlayer?.currentTime = 0
        let started = self.ringbackPlayer?.play() ?? false
        if !started {
          NSLog("[CharlotteAudioSession] ringback play() returned false")
        }
        return started
      } catch {
        NSLog("[CharlotteAudioSession] playRingback error: \(error.localizedDescription)")
        return false
      }
    }

    AsyncFunction("stopRingback") { () -> Void in
      self.ringbackPlayer?.stop()
      self.ringbackPlayer?.currentTime = 0
      // Mantemos o player na memoria pra startar rapido — destruido em stop().
    }

    /**
     * Inicia a sessao de audio com config otimizada pra Live Voice.
     * Idempotente: chamar varias vezes nao causa side effects.
     */
    AsyncFunction("start") { (preferSpeakerInput: Bool) -> Bool in
      self.preferSpeaker = preferSpeakerInput
      do {
        try self.configureSession()
        self.installObservers()
        self.isActive = true
        return true
      } catch {
        NSLog("[CharlotteAudioSession] start error: \(error.localizedDescription)")
        return false
      }
    }

    /**
     * Desativa a sessao e devolve controle ao iOS. Chamado no fim da chamada.
     */
    AsyncFunction("stop") { () -> Void in
      self.ringbackPlayer?.stop()
      self.ringbackPlayer = nil
      self.removeObservers()

      let rtcSession = RTCAudioSession.sharedInstance()
      rtcSession.lockForConfiguration()
      rtcSession.isAudioEnabled = false  // WebRTC para de usar audio
      do {
        try rtcSession.setActive(false)
      } catch {
        NSLog("[CharlotteAudioSession] rtcSession setActive false error: \(error.localizedDescription)")
      }
      rtcSession.unlockForConfiguration()

      let session = AVAudioSession.sharedInstance()
      do {
        try session.setActive(false, options: [.notifyOthersOnDeactivation])
      } catch {
        NSLog("[CharlotteAudioSession] stop error: \(error.localizedDescription)")
      }
      self.isActive = false
    }

    /**
     * Troca speaker ↔ earpiece em tempo real.
     * Sob mode .default, overrideOutputAudioPort funciona corretamente:
     *   .speaker → built-in loud speaker
     *   .none    → segue route default (earpiece se nao houver Bluetooth/cabo)
     */
    AsyncFunction("setSpeakerOn") { (on: Bool) -> Bool in
      self.preferSpeaker = on
      let rtcSession = RTCAudioSession.sharedInstance()
      rtcSession.lockForConfiguration()
      defer { rtcSession.unlockForConfiguration() }
      do {
        let session = AVAudioSession.sharedInstance()
        try session.overrideOutputAudioPort(on ? .speaker : .none)
        return true
      } catch {
        NSLog("[CharlotteAudioSession] setSpeakerOn error: \(error.localizedDescription)")
        return false
      }
    }

    /**
     * Retorna a rota atual (debug).
     */
    Function("getCurrentRoute") { () -> String in
      let route = AVAudioSession.sharedInstance().currentRoute
      let outputs = route.outputs.map { "\($0.portType.rawValue):\($0.portName)" }
      return outputs.joined(separator: ",")
    }
  }

  // MARK: - Internal

  // Options da session — extraidas pra evitar duplicacao + tipagem implicita.
  // Importante: .defaultToSpeaker eh INCOMPATIVEL com .allowBluetoothA2DP
  // (Apple docs). Em call AirPods/headset Bluetooth usam HFP via .allowBluetooth.
  private static let sessionOptions: AVAudioSession.CategoryOptions = [
    .defaultToSpeaker, .allowBluetooth, .allowAirPlay
  ]

  private func configureSession() throws {
    NSLog("[CharlotteAudioSession] configureSession START preferSpeaker=\(preferSpeaker)")

    // Sob useManualAudio = true, toda mudanca de config tem que ser feita
    // dentro de lockForConfiguration() do RTCAudioSession pra ser respeitada.
    let rtcSession = RTCAudioSession.sharedInstance()
    rtcSession.lockForConfiguration()
    defer {
      rtcSession.unlockForConfiguration()
      NSLog("[CharlotteAudioSession] configureSession END")
    }

    // Reafirma useManualAudio dentro do lock (idempotente, seguro).
    rtcSession.useManualAudio = true

    let session = AVAudioSession.sharedInstance()

    // mode: .default — chave da nao-priorizacao de USB. NAO usar .voiceChat.
    // Set isReapplyingRoute pra absorver as route change notifications que
    // estes setCategory/setActive/override vao gerar.
    isReapplyingRoute = true
    defer { isReapplyingRoute = false }

    try session.setCategory(.playAndRecord, mode: .default, options: Self.sessionOptions)
    try session.setActive(true, options: [.notifyOthersOnDeactivation])
    if preferSpeaker {
      try session.overrideOutputAudioPort(.speaker)
    }

    // Agora que session esta configurada e ativa, libera o WebRTC pra usar
    // o audio (sem reconfigurar). isAudioEnabled = true diz: "pode usar a
    // session que ja preparei". Sem isso, WebRTC fica mudo sob manual mode.
    rtcSession.isAudioEnabled = true
    NSLog("[CharlotteAudioSession] configureSession OK category set, active, speaker=\(preferSpeaker), isAudioEnabled=true")
  }

  private func installObservers() {
    let nc = NotificationCenter.default
    let session = AVAudioSession.sharedInstance()

    // Route change — re-aplica override se rota mudou pra algo inesperado.
    // Acontece quando: cabo Lightning/USB plugado durante a call, Bluetooth
    // conectou/desconectou, AirPlay ativou, etc.
    routeChangeObserver = nc.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: session,
      queue: .main
    ) { [weak self] notification in
      guard let self = self else { return }
      let reasonRaw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
      let reason = AVAudioSession.RouteChangeReason(rawValue: reasonRaw) ?? .unknown

      let currentRoute = session.currentRoute
      let outputs = currentRoute.outputs.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")

      NSLog("[CharlotteAudioSession] route change reason=\(reasonRaw) outputs=\(outputs)")

      // Emite pra JS pra logging/analytics (sempre, independente de reapply).
      self.sendEvent("onRouteChange", [
        "reason": reasonRaw,
        "outputs": outputs,
      ])

      // Anti-loop: se estamos NO MEIO de uma reaplicacao nossa, ignora a
      // notification (ela foi causada pelo nosso setCategory/override).
      if self.isReapplyingRoute {
        NSLog("[CharlotteAudioSession] ignoring (we caused it)")
        return
      }

      // So reaplica em razoes que indicam mudanca EXTERNA real (acessorio
      // plugou/desplugou, sistema decidiu mudar rota). Razoes como
      // .categoryChange e .override sao causadas por NOS (ou WebRTC) — nao
      // queremos reaplicar pra elas, gera loop.
      let needsReapply: Bool
      switch reason {
      case .newDeviceAvailable, .oldDeviceUnavailable, .noSuitableRouteForCategory:
        needsReapply = true
      default:
        needsReapply = false
      }
      if !needsReapply { return }

      // Re-aplica override SO se preferimos speaker E rota foi pra algo nao-headphone.
      guard self.preferSpeaker && self.isActive else { return }
      let isOnSpeaker = currentRoute.outputs.contains { $0.portType == .builtInSpeaker }
      let hasHeadphones = currentRoute.outputs.contains {
        $0.portType == .headphones || $0.portType == .bluetoothA2DP || $0.portType == .bluetoothHFP
      }
      // Cabo USB/Lightning aparece como .usbAudio que NAO eh headphones
      // reais — devemos pisar nele.
      if !isOnSpeaker && !hasHeadphones {
        let rtcSession = RTCAudioSession.sharedInstance()
        rtcSession.lockForConfiguration()
        self.isReapplyingRoute = true
        do {
          try session.overrideOutputAudioPort(.speaker)
          NSLog("[CharlotteAudioSession] route forced back to speaker")
        } catch {
          NSLog("[CharlotteAudioSession] override after route change failed: \(error.localizedDescription)")
        }
        self.isReapplyingRoute = false
        rtcSession.unlockForConfiguration()
      }
    }

    // Interruption — chamada telefonica, Siri, alarm. Re-ativa session no .ended.
    interruptionObserver = nc.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: session,
      queue: .main
    ) { [weak self] notification in
      guard let self = self else { return }
      let typeRaw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt ?? 0
      let type = AVAudioSession.InterruptionType(rawValue: typeRaw) ?? .began

      NSLog("[CharlotteAudioSession] interruption type=\(typeRaw)")

      if type == .ended && self.isActive {
        // Re-ativa session apos a interrupcao terminar.
        let rtcSession = RTCAudioSession.sharedInstance()
        rtcSession.lockForConfiguration()
        self.isReapplyingRoute = true
        do {
          try session.setActive(true, options: [.notifyOthersOnDeactivation])
          if self.preferSpeaker {
            try session.overrideOutputAudioPort(.speaker)
          }
        } catch {
          NSLog("[CharlotteAudioSession] re-activate after interruption failed: \(error.localizedDescription)")
        }
        self.isReapplyingRoute = false
        rtcSession.unlockForConfiguration()
      }

      self.sendEvent("onInterruption", ["type": typeRaw])
    }
  }

  private func removeObservers() {
    let nc = NotificationCenter.default
    if let obs = routeChangeObserver {
      nc.removeObserver(obs)
      routeChangeObserver = nil
    }
    if let obs = interruptionObserver {
      nc.removeObserver(obs)
      interruptionObserver = nil
    }
  }
}
