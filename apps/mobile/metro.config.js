const { withNativeWind } = require('nativewind/metro');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// getSentryExpoConfig retorna o config padrão do Expo + serializer/hook do
// Sentry que injeta o debug id no bundle e habilita upload de sourcemaps
// no EAS build. Sem isso, sourcemaps não sobem → stack traces ficam
// minificados no painel do Sentry.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
