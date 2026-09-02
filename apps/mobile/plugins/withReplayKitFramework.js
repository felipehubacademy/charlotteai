/**
 * Config plugin: link ReplayKit explicitamente no app target.
 *
 * Root cause: react-native-webrtc (ScreenCapturePickerViewManager.m /
 * ScreenCapturer.m) usa `#import <ReplayKit/ReplayKit.h>` e a classe
 * RPSystemBroadcastPickerView. Normalmente a ReplayKit eh auto-linkada pelo
 * sistema de modulos do Clang (autolink). Como o withWebRTCXcode16Fix seta
 * CLANG_ENABLE_MODULES=NO no target react-native-webrtc pra resolver o erro
 * '<memory> file not found' do Xcode novo, o autolink da ReplayKit some e o
 * link do app falha com:
 *   Undefined symbols: _OBJC_CLASS_$_RPSystemBroadcastPickerView
 *
 * Fix: adicionar `-framework ReplayKit` ao OTHER_LDFLAGS do app target. O
 * Podfile post_install so alcança os Pods (static libs, cujos LDFLAGS nao
 * propagam pro link final), por isso a correcao vive aqui via withXcodeProject,
 * que opera no .xcodeproj principal (onde esta o app target CharlotteAI).
 *
 * ReplayKit existe em todo iOS >= 9; min target eh 15.1, entao link forte
 * (nao weak) eh seguro. Screen-broadcast nem eh usado pela Charlotte (Live
 * Voice eh audio puro), mas o simbolo precisa resolver no link.
 */

const { withXcodeProject } = require('expo/config-plugins');

const withReplayKitFramework = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const bundleId = cfg.ios && cfg.ios.bundleIdentifier;
    const configs = project.pbxXCBuildConfigurationSection();

    Object.keys(configs).forEach((key) => {
      const entry = configs[key];
      const bs = entry && entry.buildSettings;
      if (!bs) return;
      // Só o app target (não os Pods) carrega o bundle id do app.
      // node-xcode devolve o valor COM aspas ("com.hubacademy.charlotte"),
      // entao normaliza antes de comparar.
      const targetBundleId = String(bs.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/^"|"$/g, '');
      if (targetBundleId !== bundleId) return;

      let flags = bs.OTHER_LDFLAGS;
      if (flags == null) flags = ['"$(inherited)"'];
      else if (!Array.isArray(flags)) flags = [flags];

      const already = flags.some((f) => String(f).includes('ReplayKit'));
      if (!already) {
        flags.push('"-framework"');
        flags.push('"ReplayKit"');
      }
      bs.OTHER_LDFLAGS = flags;
    });

    return cfg;
  });
};

module.exports = withReplayKitFramework;
