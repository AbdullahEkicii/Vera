const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      const releaseConfig = `
        release {
            storeFile file("../../@abdllhekc__ezan-app.jks")
            storePassword "REDACTED-ANDROID-STORE-PASSWORD"
            keyAlias "REDACTED-ANDROID-KEY-ALIAS"
            keyPassword "REDACTED-ANDROID-KEY-PASSWORD"
        }`;

      // Insert release config into existing signingConfigs block
      if (buildGradle.includes('signingConfigs {') && !buildGradle.includes('keyAlias "REDACTED-ANDROID-KEY-ALIAS"')) {
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
