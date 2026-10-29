module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    // Ícones do phosphor importados um a um (sem isso a biblioteca inteira entra no pacote).
    plugins: ['./babel-plugin-phosphor'],
    // NativeWind v4: no babel plugin needed (CSS processing runs in Metro)
    // Reanimated v4: no babel plugin needed (worklets handle it at runtime)
  };
};
