const { withPodfile } = require('@expo/config-plugins');

// react-native-firebase pods must be built as static frameworks when the app uses
// `ios.useFrameworks: "static"` (set via expo-build-properties). Without this global,
// RNFBFirestore fails to compile with "declaration must be imported from module RNFBApp".
const MARKER = '$RNFirebaseAsStaticFramework = true';

function withRNFirebaseStaticFramework(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes(MARKER)) {
      config.modResults.contents = `${MARKER}\n${contents}`;
    }
    return config;
  });
}

module.exports = withRNFirebaseStaticFramework;
