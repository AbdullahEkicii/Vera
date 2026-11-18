const { withAndroidManifest } = require('@expo/config-plugins');

// Hardware features Play would otherwise treat as required (implied by screenOrientation=portrait and
// by ACCESS_WIFI_STATE from libraries). Marking them optional keeps the app installable on every device.
const OPTIONAL_FEATURES = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

module.exports = function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] || [];
    OPTIONAL_FEATURES.forEach((name) => {
      const existing = manifest['uses-feature'].find((f) => f.$['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    });
    return config;
  });
};
