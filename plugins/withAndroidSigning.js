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

      // EAS signs with its own managed credentials, so never inject the local keystore there.
      if (process.env.EAS_BUILD) {
        console.warn('withAndroidSigning: EAS_BUILD detected, skipping local release signing injection.');
        return config;
      }

      const [storePassword, keyAlias, keyPassword] = REQUIRED_ENV_VARS.map((name) => process.env[name]);
      if (!storePassword || !keyAlias || !keyPassword) {
        console.warn(
          `withAndroidSigning: missing env var(s) ${REQUIRED_ENV_VARS.filter((name) => !process.env[name]).join(', ')}; ` +
          'skipping release signing injection (debug signing stays). Set them before building a release locally.'
        );
        return config;
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
