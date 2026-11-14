const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('expo/config-plugins');

// Vera's native Android layer: the prayer alarm (AlarmChannelModule, PrayerAlarmReceiver) and the
// home-screen widgets. These sources used to live only in the gitignored android/ folder, so a clean
// checkout or a cloud build (EAS) silently lost the alarm channels and the widgets. The sources now
// live in native/android/ (tracked) and this plugin copies them into the generated project on every
// `expo prebuild`, and registers them in the manifest and MainApplication.

const NATIVE_ROOT = path.join(__dirname, '..', 'native', 'android');

const RECEIVERS = [
  {
    name: '.PrayerWidgetProvider',
    build: () => ({
      $: { 'android:name': '.PrayerWidgetProvider', 'android:exported': 'true', 'android:label': 'Vera Vakitler (Koyu)' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/prayer_widget_info' } }],
    }),
  },
  {
    name: '.PrayerWidgetLightProvider',
    build: () => ({
      $: { 'android:name': '.PrayerWidgetLightProvider', 'android:exported': 'true', 'android:label': 'Vera Vakitler (Açık)' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/prayer_widget_light_info' } }],
    }),
  },
  {
    name: '.PrayerAlarmReceiver',
    build: () => ({ $: { 'android:name': '.PrayerAlarmReceiver', 'android:exported': 'false' } }),
  },
];

const copyRecursive = (src, dest) => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

// 1. Kotlin sources and Android resources. Dangerous mods run before the template and base mods, and
// these are new files that the Expo template does not write, so nothing overwrites them.
const withNativeFiles = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const appMain = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main');
      copyRecursive(path.join(NATIVE_ROOT, 'java'), path.join(appMain, 'java'));
      copyRecursive(path.join(NATIVE_ROOT, 'res'), path.join(appMain, 'res'));
      return config;
    },
  ]);

// 2. Widget and alarm receivers in AndroidManifest.xml (skipped when already present).
const withReceivers = (config) =>
  withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.receiver = app.receiver || [];
    for (const receiver of RECEIVERS) {
      const exists = app.receiver.some((item) => item?.$?.['android:name'] === receiver.name);
      if (!exists) app.receiver.push(receiver.build());
    }
    return config;
  });

// 3. Register AlarmChannelPackage and WidgetPackage with React Native. Fails the build when the
// template changes shape, instead of shipping an app whose alarm module is missing.
const withPackages = (config) =>
  withMainApplication(config, (config) => {
    const src = config.modResults.contents;
    if (src.includes('AlarmChannelPackage()')) return config;
    // The template may split the call across lines (`PackageList(this)\n    .packages`), so match loosely.
    const pattern = /PackageList\(this\)\s*\.packages\b/;
    if (!pattern.test(src)) {
      throw new Error('withVeraNativeAndroid: MainApplication.kt has no PackageList(this).packages; register AlarmChannelPackage and WidgetPackage by hand.');
    }
    config.modResults.contents = src.replace(
      pattern,
      'PackageList(this).packages.toMutableList().apply { add(AlarmChannelPackage()); add(WidgetPackage()) }',
    );
    return config;
  });

module.exports = (config) => withPackages(withReceivers(withNativeFiles(config)));
