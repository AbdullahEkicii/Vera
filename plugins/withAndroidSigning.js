const { withAppBuildGradle } = require('expo/config-plugins');

// Release signing credentials must never be hardcoded here (this file is version
// controlled). Set them as EAS secrets (`eas secret:create`) for cloud builds, or
// in a local, gitignored .env for on-machine builds — `expo prebuild` inlines
// them into the generated (also gitignored) android/app/build.gradle.
const REQUIRED_ENV_VARS = ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;

      const [storePassword, keyAlias, keyPassword] = REQUIRED_ENV_VARS.map((name) => process.env[name]);
      if (!storePassword || !keyAlias || !keyPassword) {
        throw new Error(
          `withAndroidSigning: missing required env var(s) ${REQUIRED_ENV_VARS.filter((name) => !process.env[name]).join(', ')}. ` +
          'Set these as EAS secrets or in a local .env before building a release.'
        );
      }

      const releaseConfig = `
        release {
            storeFile file("../../@abdllhekc__ezan-app.jks")
            storePassword "${storePassword}"
            keyAlias "${keyAlias}"
            keyPassword "${keyPassword}"
        }`;

      // Insert release config into existing signingConfigs block
      if (buildGradle.includes('signingConfigs {') && !buildGradle.includes('storeFile file("../../@abdllhekc__ezan-app.jks")')) {
        buildGradle = buildGradle.replace(
          'signingConfigs {',
          `signingConfigs {${releaseConfig}`
        );
      }
      
      // Inject signingConfig into release buildType safely
      if (buildGradle.includes('buildTypes {')) {
        // We find the release block specifically and replace its signingConfig
        buildGradle = buildGradle.replace(
          /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/g,
          '$1signingConfig signingConfigs.release'
        );
      }

      config.modResults.contents = buildGradle;
    }
    return config;
  });
};
