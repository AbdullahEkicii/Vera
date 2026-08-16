const { withAndroidManifest, withProjectBuildGradle } = require('@expo/config-plugins');

function withRemoveExpoAudioServices(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    const app = androidManifest.application[0];

    if (!app.service) {
      app.service = [];
    }

    // Add tools:node="remove" for the specific expo-audio services
    const servicesToRemove = [
      'expo.modules.audio.service.AudioControlsService',
      'expo.modules.audio.service.AudioRecordingService',
    ];

    servicesToRemove.forEach((serviceName) => {
      // Check if it already exists to avoid duplicates
      const exists = app.service.find((s) => s.$['android:name'] === serviceName);
      if (!exists) {
        app.service.push({
          $: {
            'android:name': serviceName,
            'tools:node': 'remove',
          },
        });
      } else {
        exists.$['tools:node'] = 'remove';
      }
    });



    // Make sure xmlns:tools is in the manifest tag
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
}

function withNotifeeRepository(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    const targetString = "maven { url 'https://www.jitpack.io' }";
    const replacement = `${targetString}\n    maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`;
    if (!buildGradle.includes('@notifee/react-native/android/libs')) {
      config.modResults.contents = buildGradle.replace(targetString, replacement);
    }
    return config;
  });
}

module.exports = function withCustomConfig(config) {
  config = withRemoveExpoAudioServices(config);
  config = withNotifeeRepository(config);
  return config;
};
