// apps/mobile/plugins/with-incallmanager-ringback.js
//
// Config plugin que bundla o arquivo `incallmanager_ringback.mp3` nos dois
// platforms para que InCallManager.startRingback('_BUNDLE_') o encontre.
//
// iOS: hardcoded em RNInCallManager.m → procura `incallmanager_ringback.mp3`
//      em [NSBundle mainBundle]. Copiamos pra ios/<Project>/ e adicionamos
//      na build phase "Copy Bundle Resources".
//
// Android: hardcoded em InCallManagerModule.java → procura recurso pelo nome
//          `incallmanager_ringback` em res/raw via getIdentifier(). Copiamos
//          pra android/app/src/main/res/raw/incallmanager_ringback.mp3.
//
// Nome do arquivo é OBRIGATÓRIO — não dá pra renomear. É hardcoded no source
// do react-native-incall-manager.
//
// Sem isso, '_BUNDLE_' cai pro default: ringtone do sistema iOS (Marimba.m4r)
// ou DEFAULT_RINGTONE_URI no Android. Que é o estado atual da app no iOS.

const {
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ASSET_NAME = 'incallmanager_ringback.mp3';
const SOURCE_RELATIVE = `assets/audio/${ASSET_NAME}`;

function withIosRingback(config) {
  return withXcodeProject(config, (config) => {
    const projectName = config.modRequest.projectName;
    if (!projectName) {
      console.warn('[with-incallmanager-ringback] iOS: projectName ausente em modRequest');
      return config;
    }

    const sourcePath = path.join(config.modRequest.projectRoot, SOURCE_RELATIVE);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[with-incallmanager-ringback] iOS: source nao encontrado em ${sourcePath}`);
      return config;
    }

    const destDir = path.join(config.modRequest.platformProjectRoot, projectName);
    const destPath = path.join(destDir, ASSET_NAME);

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourcePath, destPath);

    // Adiciona o arquivo à PBXResourcesBuildPhase do target principal.
    // groupName é o nome do PBXGroup principal (mesmo nome do projeto).
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: destPath,
      groupName: projectName,
      isBuildFile: true,
      project: config.modResults,
    });

    console.log(`[with-incallmanager-ringback] iOS: ${ASSET_NAME} adicionado ao bundle`);
    return config;
  });
}

function withAndroidRingback(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const sourcePath = path.join(config.modRequest.projectRoot, SOURCE_RELATIVE);
      if (!fs.existsSync(sourcePath)) {
        console.warn(`[with-incallmanager-ringback] Android: source nao encontrado em ${sourcePath}`);
        return config;
      }

      const rawDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/raw'
      );
      const destPath = path.join(rawDir, ASSET_NAME);

      fs.mkdirSync(rawDir, { recursive: true });
      fs.copyFileSync(sourcePath, destPath);

      console.log(`[with-incallmanager-ringback] Android: ${ASSET_NAME} copiado para res/raw`);
      return config;
    },
  ]);
}

module.exports = function withIncallManagerRingback(config) {
  config = withIosRingback(config);
  config = withAndroidRingback(config);
  return config;
};
