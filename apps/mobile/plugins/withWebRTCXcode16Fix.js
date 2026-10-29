/**
 * Config plugin: Fix 'memory' file not found for react-native-webrtc on Xcode 16.
 *
 * Root cause: Xcode 16 changed C++ stdlib header resolution when CLANG_ENABLE_MODULES=YES.
 * The module system can't locate <memory> in the new toolchain layout.
 *
 * Fix: disable Clang module system (CLANG_ENABLE_MODULES=NO) for react-native-webrtc
 * so it falls back to traditional header search paths, then explicitly add the C++ stdlib
 * path ($(TOOLCHAIN_DIR)/usr/include/c++/v1) so <memory> is found.
 *
 * Error resolved:
 *   'memory' file not found (in target 'react-native-webrtc' from project 'Pods')
 *   Could not build module 'ReactCodegen' (in target 'react-native-webrtc' from project 'Pods')
 */

const { withDangerousMod } = require('expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const withWebRTCXcode16Fix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = readFileSync(podfilePath, 'utf8');

      // Idempotency guard — don't double-inject
      const marker = '# webrtc-xcode16-fix-v2';
      if (contents.includes(marker)) return config;

      const fixBlock = `
    ${marker}: disable Clang modules + explicit C++ stdlib path for Xcode 16
    installer.pods_project.targets.each do |t|
      next unless t.name == 'react-native-webrtc'
      t.build_configurations.each do |cfg|
        # Disable module system so <memory> resolves via traditional header search
        cfg.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        cfg.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        cfg.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
        # Explicitly add C++ stdlib include path (changed in Xcode 16 toolchain)
        cfg.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "$(TOOLCHAIN_DIR)/usr/include/c++/v1" "$(SDKROOT)/usr/include/c++/v1"'
      end
    end`;

      // Insert inside post_install block, just before its closing end + top-level end
      contents = contents.replace(/(\n  end\nend\n?)$/, `${fixBlock}\n$1`);

      writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withWebRTCXcode16Fix;
