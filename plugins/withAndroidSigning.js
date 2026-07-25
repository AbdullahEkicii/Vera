const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      const releaseConfig = `
        release {
            storeFile file("../../@abdllhekc__ezan-app.jks")
            storePassword "45d4495248792df1045cf48216ebb249"
            keyAlias "d4f278a39932d4281f240d4a67d0672e"
            keyPassword "81ca68bf75c6475429a8374f46417d0a"
        }`;

      // Insert release config into existing signingConfigs block
      if (buildGradle.includes('signingConfigs {') && !buildGradle.includes('keyAlias "d4f278a39932d4281f240d4a67d0672e"')) {
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
