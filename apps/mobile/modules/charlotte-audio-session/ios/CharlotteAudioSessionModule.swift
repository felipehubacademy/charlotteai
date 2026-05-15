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

  public func definition() -> ModuleDefinition {
    Name("CharlotteAudioSession")
    Events("onRouteChange", "onInterruption")

    OnCreate {
      // Pre-seed antes do react-native-webrtc instanciar o peer connection.
      // O WebRTC ADM le este singleton quando o primeiro track ativa e chama
      // setConfiguration:active:YES sozinho. Nao tocamos setConfiguration em
      // start() pra evitar race condition que causava -12981 + !pri loop.
      // .allowBluetoothA2DP RESTAURADO: com UIBackgroundModes=[audio,voip] no
      // Info.plist a session ganha VoIP priority e o -12981 some (era priority
      // related, nao A2DP).
      let cfg = RTCAudioSessionConfiguration.webRTC()
      cfg.category = AVAudioSession.Category.playAndRecord.rawValue
      cfg.mode = AVAudioSession.Mode.videoChat.rawValue
      cfg.categoryOptions = [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
      RTCAudioSessionConfiguration.setWebRTC(cfg)
      NSLog("[CharlotteAudioSession] webRTC singleton seeded (playAndRecord+videoChat+spk+bt+a2dp)")
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
      if self.preferSpeaker {
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

      // Replica Jitsi audioSessionDidChangeRoute: so reage a essas razoes.
      let external: Bool
      switch reason {
      case .newDeviceAvailable, .oldDeviceUnavailable, .noSuitableRouteForCategory:
        external = true
      default:
        external = false
      }
      guard external, self.preferSpeaker else { return }

      let hasHeadphones = currentRoute.outputs.contains {
        $0.portType == .headphones || $0.portType == .bluetoothA2DP || $0.portType == .bluetoothHFP
      }
      let isOnSpeaker = currentRoute.outputs.contains { $0.portType == .builtInSpeaker }

      // Cabo USB / Lightning DAC: portType == .usbAudio (não eh headphone real).
      if !isOnSpeaker && !hasHeadphones {
        let rtc = RTCAudioSession.sharedInstance()
        rtc.lockForConfiguration()
        try? rtc.overrideOutputAudioPort(.speaker)
        rtc.unlockForConfiguration()
        NSLog("[CharlotteAudioSession] route forced→speaker")
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
        let rtc = RTCAudioSession.sharedInstance()
        rtc.lockForConfiguration()
        try? rtc.overrideOutputAudioPort(.speaker)
        rtc.unlockForConfiguration()
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
