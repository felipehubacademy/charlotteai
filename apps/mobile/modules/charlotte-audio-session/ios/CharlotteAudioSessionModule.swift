import ExpoModulesCore
import AVFoundation
import WebRTC

/**
 * CharlotteAudioSession — controla AVAudioSession pra Live Voice.
 *
 * ESTRATEGIA (definitiva — research-driven, ver memory/livevoice_research):
 *
 * 1. Pre-seed RTCAudioSessionConfiguration.webRTC() (singleton) UMA vez no
 *    OnCreate do modulo, com mode .videoChat + DefaultToSpeaker. Esse
 *    singleton eh o que o react-native-webrtc le TODA VEZ que ele aplica
 *    configuracao (em peer connection setup, route change, etc). Resultado:
 *    WebRTC aplica nossa config a cada reaplicacao, sem briga.
 *
 * 2. Nao chamamos setCategory / setActive / setMode no AVAudioSession.
 *    Quem ativa eh o WebRTC, com nossa config pre-seedeada.
 *
 * 3. So fazemos overrideOutputAudioPort(.speaker) quando preferSpeaker=true,
 *    pra forcar speaker se rota foi pra algo nao-headphone (USB cable etc).
 *    Reaplicamos via routeChange listener.
 *
 * 4. Nao usamos useManualAudio. Esse pattern eh especifico de CallKit (que
 *    nao usamos) e gera "Operation Denied / !pri" loop sem CallKit.
 *
 * Mode .videoChat (em vez de .voiceChat): apesar do nome, .videoChat eh o
 * mode "voz em volume normal, NAO orelha". Tem AEC + DefaultToSpeaker
 * embutido. .voiceChat = "telefone na orelha" (default earpiece, errado
 * pra nos). .default = sem otimizacao, pode desabilitar AEC.
 */
public class CharlotteAudioSessionModule: Module {
  private var routeChangeObserver: NSObjectProtocol?
  private var interruptionObserver: NSObjectProtocol?
  private var preferSpeaker: Bool = true
  private var isActive: Bool = false
  private var ringbackPlayer: AVAudioPlayer?

  public func definition() -> ModuleDefinition {
    Name("CharlotteAudioSession")

    Events("onRouteChange", "onInterruption")

    // Pre-seed singleton que WebRTC vai LER toda vez que aplicar config.
    // Critico: precisa rodar antes do WebRTC iniciar peer connection.
    // OnCreate fica antes do JS chamar mediaDevices.getUserMedia.
    OnCreate {
      let cfg = RTCAudioSessionConfiguration.webRTC()
      cfg.category = AVAudioSession.Category.playAndRecord.rawValue
      cfg.mode = AVAudioSession.Mode.videoChat.rawValue
      cfg.categoryOptions = [.allowBluetooth, .defaultToSpeaker]
      RTCAudioSessionConfiguration.setWebRTC(cfg)
      NSLog("[CharlotteAudioSession] webRTC config pre-seeded (playAndRecord + videoChat + defaultToSpeaker + allowBluetooth)")
    }

    /**
     * Toca o ringback (incallmanager_ringback.mp3) em loop.
     * Roda dentro da session que WebRTC vai usar — mesmo dono, zero conflito.
     */
    AsyncFunction("playRingback") { () -> Bool in
      guard let url = Bundle.main.url(forResource: "incallmanager_ringback", withExtension: "mp3") else {
        NSLog("[CharlotteAudioSession] ringback mp3 not found in bundle")
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
    }

    /**
     * Inicia a sessao pra Live Voice.
     * Instala observers e forca speaker (se preferSpeaker=true).
     * WebRTC cuida do setCategory/setActive via singleton pre-seedeado.
     */
    AsyncFunction("start") { (preferSpeakerInput: Bool) -> Bool in
      self.preferSpeaker = preferSpeakerInput
      self.installObservers()
      self.isActive = true
      self.applySpeakerOverride()
      NSLog("[CharlotteAudioSession] start preferSpeaker=\(preferSpeakerInput)")
      return true
    }

    /**
     * Desativa Live Voice. WebRTC cuida do setActive(false) quando peer fecha.
     * So limpamos observers e ringback.
     */
    AsyncFunction("stop") { () -> Void in
      self.ringbackPlayer?.stop()
      self.ringbackPlayer = nil
      self.removeObservers()
      self.isActive = false
      NSLog("[CharlotteAudioSession] stop")
    }

    /**
     * Troca speaker ↔ earpiece em tempo real.
     */
    AsyncFunction("setSpeakerOn") { (on: Bool) -> Bool in
      self.preferSpeaker = on
      do {
        try AVAudioSession.sharedInstance().overrideOutputAudioPort(on ? .speaker : .none)
        return true
      } catch {
        NSLog("[CharlotteAudioSession] setSpeakerOn error: \(error.localizedDescription)")
        return false
      }
    }

    /**
     * Snapshot da rota (debug).
     */
    Function("getCurrentRoute") { () -> String in
      let route = AVAudioSession.sharedInstance().currentRoute
      let outputs = route.outputs.map { "\($0.portType.rawValue):\($0.portName)" }
      return outputs.joined(separator: ",")
    }
  }

  // MARK: - Internal

  /// Forca speaker se preferSpeaker=true. Idempotente — pode chamar varias vezes.
  /// Override e barato e nao requer lock.
  private func applySpeakerOverride() {
    guard preferSpeaker else { return }
    do {
      try AVAudioSession.sharedInstance().overrideOutputAudioPort(.speaker)
    } catch {
      NSLog("[CharlotteAudioSession] applySpeakerOverride error: \(error.localizedDescription)")
    }
  }

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
      let outputs = currentRoute.outputs.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")

      NSLog("[CharlotteAudioSession] route change reason=\(reasonRaw) outputs=\(outputs)")

      self.sendEvent("onRouteChange", [
        "reason": reasonRaw,
        "outputs": outputs,
      ])

      // So reaplica speaker em mudancas EXTERNAS reais. .categoryChange e
      // .override sao causadas por nos/WebRTC — ignora.
      let externalChange: Bool
      switch reason {
      case .newDeviceAvailable, .oldDeviceUnavailable, .noSuitableRouteForCategory:
        externalChange = true
      default:
        externalChange = false
      }
      guard externalChange, self.preferSpeaker else { return }

      // Se tem headphones reais (wired/Bluetooth), respeita.
      let hasHeadphones = currentRoute.outputs.contains {
        $0.portType == .headphones || $0.portType == .bluetoothA2DP || $0.portType == .bluetoothHFP
      }
      let isOnSpeaker = currentRoute.outputs.contains { $0.portType == .builtInSpeaker }

      if !isOnSpeaker && !hasHeadphones {
        // Cabo USB / Lightning DAC apareceu como output — forca speaker.
        self.applySpeakerOverride()
        NSLog("[CharlotteAudioSession] route forced back to speaker")
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

      // WebRTC re-ativa session em .ended. So reforcamos speaker se preferimos.
      if type == .ended {
        self.applySpeakerOverride()
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
