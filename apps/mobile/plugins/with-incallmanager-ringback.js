// apps/mobile/plugins/with-incallmanager-ringback.js
//
// Config plugin que bundla `incallmanager_ringback.mp3` nas pastas nativas.
// Nome do arquivo eh legado (veio do react-native-incall-manager) mas mantido
// pra nao quebrar paths no codigo nativo. Eh so um asset.
//
// Consumido pelo nosso modulo nativo `charlotte-audio-session`:
//   iOS:     Bundle.main.url(forResource: "incallmanager_ringback", ...)
//            Plugin copia pra ios/<Project>/ + adiciona em "Copy Bundle Resources".
//   Android: context.resources.getIdentifier("incallmanager_ringback", "raw", ...)
//            Plugin copia pra android/app/src/main/res/raw/.

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
