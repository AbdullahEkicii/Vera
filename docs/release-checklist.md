# Release checklist (Vera, com.abdllhekc.vera)

## Every release
- Bump `version` in `app.json`, then update `Vera_version_control.json` (`latestVersion`, and `minVersion` only if old builds must be forced to update) and push it to `main`. The app reads it from raw.githubusercontent.com; if it lags behind, users are never prompted (or are nagged for a version that is already out).
- `iosUrl` in `Vera_version_control.json` is a placeholder (`id123456789`); no real App Store id exists in the repo. Replace it once the iOS app is published. Until then VersionChecker only accepts `https://apps.apple.com/` URLs and otherwise falls back to the store root.
- Run `npm install` after any `package.json` change (see below), then `npx tsc --noEmit`.

## Build path
- Local Gradle (uses the repo-root keystore): export `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (or a gitignored `.env`), run `npx expo prebuild --platform android --clean`, then `cd android && ./gradlew bundleRelease`. If the variables are missing, `plugins/withAndroidSigning.js` only warns and leaves debug signing, so check the output before uploading.
- EAS (`eas build -p android --profile production`): the plugin is skipped (`EAS_BUILD` is set); EAS uses the credentials stored on expo.dev. `appVersionSource: remote` + `autoIncrement` manage the versionCode.
- Never commit keystore passwords.
- **A fresh native build is required** for this round of changes (a JS-only reload is not enough): `app.json` (blocked permissions, `expo-audio` without recording, English iOS permission prompts + `locales`, portrait lock, visible status bar), `firebase.json` (analytics consent defaults start denied) and the removed manifest permissions only reach the app through `npx expo prebuild --clean` + a new build.
- Production size: the default build includes x86/x86_64 ABIs (needed for emulators). For the store AAB build only the phone ABIs: `cd android && ./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`.
- `USE_EXACT_ALARM` is still declared next to `SCHEDULE_EXACT_ALARM`. Adhan alerts use `AlarmType.SET_ALARM_CLOCK` and do not need either; the daily reminders use inexact-allowed alarms. Decide in the Play Console "Exact alarms" declaration whether the app qualifies as an alarm/clock app; if not, remove `USE_EXACT_ALARM` from `app.json` > `android.permissions`.

## Content you must provide
- `src/config/links.ts` > `PRIVACY_POLICY_URL` is empty: Settings shows the "Privacy Policy" row only when it holds a valid `https://` URL. Put the published policy URL there (the same URL goes in the Play Console).
- Translations I wrote for the 33 non-English/Turkish languages (especially Hausa, Uzbek, Swahili, Albanian) should be reviewed by a native speaker.
- Firebase user properties (`app_language`, `calc_method`, `notif_enabled`) and event params (`result`, `source`, `granted`, `type`) must be registered as custom definitions in GA4 before they can be used in reports.

## Dependencies (package.json changed, lockfile not refreshed)
- Run `npm install` to refresh `package-lock.json`. `react-native-google-mobile-ads` is pinned to `16.0.0` (what is installed and in the lockfile, so builds are reproducible; `patches/react-native-google-mobile-ads+16.4.0.patch` targets 16.4.0 and does not apply to 16.0.0: upgrade the package and the patch together, then test ads). `react-native-nitro-modules` is explicit at `0.37.1`; `@react-native-firebase/*` are all exact `25.1.0`.

## Firebase Console
- Firestore: `firebase deploy --only firestore:rules` (uses `firebase.json` / `firestore.rules`), or paste the rules in Console > Firestore > Rules and Publish.
- App Check: Console > App Check > register the Android app with Play Integrity; later enforce it for Firestore. (Needs `@react-native-firebase/app-check` in the app before enforcing, otherwise feedback writes will be rejected.)
- API key: Google Cloud Console > APIs & Services > Credentials > the Android key > Application restrictions: Android apps > add package `com.abdllhekc.vera` with the SHA-1 of the upload key and of the Play App Signing key (Play Console > App integrity).

## Play Console
- Store listing / App content: set the privacy policy URL.
- Data Safety: declare approximate/precise location, advertising ID, analytics (Firebase), crash logs (Crashlytics), device or other IDs (FCM token), and user-provided feedback text (collected, not shared except with processors as applicable).
- Target audience: not designed for children (13+ / adults).
- Ads: declare that the app contains ads.

## AdMob / UMP
- AdMob > Privacy & messaging: publish the GDPR message and the US states message, and enable "Privacy options" entry point; confirm `app-ads.txt` is reachable on the developer website.
- Consent also toggles Firebase Analytics and Crashlytics collection (`src/services/consentPropagation.ts`).

## Repository hygiene (user runs these; not run by the agent)
- `adblog.txt` is tracked; it is now in `.gitignore`. Untrack it and purge it from history:
  - `git rm --cached adblog.txt`
  - `git commit -m "chore: stop tracking adblog.txt"`
  - History purge (rewrites history, coordinate first): `pip install git-filter-repo` then `git filter-repo --invert-paths --path adblog.txt` and `git push --force-with-lease origin main`.
- Move `*.jks` (`@abdllhekc__ezan-app.jks`, `@abdllhekc__ezan-app_OLD_1.jks`) and `upload_certificate.pem` out of the repo root into a secure location outside the repository (they are gitignored, but keep backups in a password manager/secure vault). If the local Gradle build is used, `withAndroidSigning.js` expects `../../@abdllhekc__ezan-app.jks` relative to `android/app`, so update the path there when moving it. If any of them were ever committed, rotate the keys via Play Console.
