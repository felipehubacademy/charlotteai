require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'CharlotteAudioSession'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'Charlotte AI'
  s.homepage       = 'https://charlotte.hubacademybr.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Precisamos acessar RTCAudioSession (do react-native-webrtc) pra setar
  # useManualAudio = YES e impedir WebRTC de tomar "primary session" do
  # AVAudioSession — que causa "Operation Denied / !pri" nos nossos
  # setCategory/setActive no iOS.
  s.dependency 'react-native-webrtc'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
