const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Release bundles: drop console.log/info/debug calls (console.warn/error stay for
// Crashlytics breadcrumbs). Dev builds are not minified, so this only affects release.
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    compress: {
      ...(config.transformer.minifierConfig && config.transformer.minifierConfig.compress),
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
  },
};

module.exports = config;
