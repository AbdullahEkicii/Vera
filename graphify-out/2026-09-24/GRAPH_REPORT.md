# Graph Report - ezan-app  (2026-09-24)

## Corpus Check
- 181 files · ~476,313 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .ttf 4, (none) 2, .graphify-bak 1)

## Summary
- 1041 nodes · 2357 edges · 82 communities (69 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28f1573b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notificationService.ts
- dependencies
- ReligiousDaysModal.tsx
- translate_all.js
- index.js
- NamesAndDuasScreen.tsx
- haptic-tab.tsx
- package.json
- react-native-reanimated
- collapsible.tsx
- KazaTrackerModal.tsx
- DailyContentScreen.tsx
- quran-reading.tsx
- react-i18next
- HatimTrackerCard.tsx
- quranRepository.ts
- QuranScreen.tsx
- ThemeContext.tsx
- QuranStyleSelector.tsx
- SimpleHomeScreen.tsx
- (tabs)/index.tsx
- TasbihScreen.tsx
- qibla.tsx
- adsConsentService.ts
- expo
- @expo/vector-icons
- full_sync_translations.py
- i18n.ts
- infoPlist
- scripts
- settings.tsx
- android
- analyticsService.ts
- api.ts
- quranStorage.ts
- devDependencies
- quranBookmarks.ts
- QuranAudioPlayer
- extra
- tsconfig.json
- What You Must Do When Invoked
- ios
- eslint.config.js
- withRemoveExpoAudioServices.js
- BannerAdSlot.tsx
- Design System: Vera
- androidStatusBar
- experiments
- react-native-google-mobile-ads
- storageService.ts
- ErrorBoundary.tsx
- Product
- PrayerTimeCard.tsx
- graphify reference: extra exports and benchmark
- Issue tracker: GitHub
- VersionChecker.tsx
- CitySearchModal.tsx
- graphify reference: query, path, explain
- Domain Docs
- Welcome to your Expo app 👋
- audioManager
- Agent skills
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- withAndroidSigning.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- .claude/CLAUDE.md
- extraction-spec.md
- 2026-09-21T18-36-53Z__src-app-achievements-tsx.md
- 2026-09-21T18-36-53Z__src-components-welcomeonboardingmodal-tsx.md
- app/_layout.tsx
- NearbyMosquesModal.tsx
- react-native
- external-link.tsx
- hajj-umrah.tsx
- AnimatedSplashScreen.tsx
- react
- calcMethod.ts
- react-native-google-mobile-ads

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 85 edges
2. `react-native` - 65 edges
3. `react` - 61 edges
4. `@expo/vector-icons` - 42 edges
5. `react-i18next` - 42 edges
6. `react-native-reanimated` - 30 edges
7. `logScreenView()` - 28 edges
8. `typography` - 27 edges
9. `expo-linear-gradient` - 24 edges
10. `@react-native-async-storage/async-storage` - 23 edges

## Surprising Connections (you probably didn't know these)
- `ParallaxScrollView()` --calls--> `useThemeColor()`  [EXTRACTED]
  components/parallax-scroll-view.tsx → hooks/use-theme-color.ts
- `ThemedText()` --calls--> `useThemeColor()`  [EXTRACTED]
  components/themed-text.tsx → hooks/use-theme-color.ts
- `ThemedView()` --calls--> `useThemeColor()`  [EXTRACTED]
  components/themed-view.tsx → hooks/use-theme-color.ts
- `Layout()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(tabs)/_layout.tsx → src/context/ThemeContext.tsx
- `Countdown()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/Countdown.tsx → src/context/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (82 total, 13 thin omitted)

### Community 0 - "notificationService.ts"
Cohesion: 0.29
Nodes (17): SettingsScreen(), checkNotificationPermissions(), defaultPrefs, devError(), devLog(), getExactChannelId(), getNotificationPrefs(), getWarningChannelId() (+9 more)

### Community 1 - "dependencies"
Cohesion: 0.03
Nodes (64): dependencies, adhan, expo, expo-asset, expo-audio, expo-background-task, expo-blur, expo-build-properties (+56 more)

### Community 2 - "ReligiousDaysModal.tsx"
Cohesion: 0.36
Nodes (6): ReligiousDaysModal(), ReligiousDaysModalProps, styles, getDaysRemaining(), RELIGIOUS_DAYS, ReligiousDay

### Community 3 - "translate_all.js"
Cohesion: 0.05
Nodes (39): ref_fs, ref_https, ref_path, ref_readline, files, fs, localesDir, path (+31 more)

### Community 5 - "NamesAndDuasScreen.tsx"
Cohesion: 0.23
Nodes (10): DuaItemCard, DuaItemCardProps, EsmaItemCard, EsmaItemCardProps, styles, TabType, DuaItem, DUAS (+2 more)

### Community 7 - "package.json"
Cohesion: 0.07
Nodes (29): main, name, private, version, babel-preset-expo, expo-asset, expo-build-properties, expo-file-system (+21 more)

### Community 8 - "react-native-reanimated"
Cohesion: 0.10
Nodes (20): assets_images_bg_dark, assets_images_bg_light, expo-router, react-native-reanimated, @react-navigation/native, CATEGORY_LABELS, styles, styles (+12 more)

### Community 9 - "collapsible.tsx"
Cohesion: 0.12
Nodes (18): ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps (+10 more)

### Community 10 - "KazaTrackerModal.tsx"
Cohesion: 0.11
Nodes (28): HatimTrackerCard(), KazaTrackerModal(), PRAYER_CONFIG, Props, styles, AchievementCategory, AchievementDef, AchievementResult (+20 more)

### Community 11 - "DailyContentScreen.tsx"
Cohesion: 0.14
Nodes (18): @react-native-firebase/auth, @react-native-firebase/firestore, CARD_GRADIENTS, CARD_ICONS, ContentCardProps, styles, src_data_dailycontent_en, src_data_dailycontent_tr (+10 more)

### Community 12 - "quran-reading.tsx"
Cohesion: 0.12
Nodes (19): PageContent, QURAN_THEMES, QuranReadingScreen(), QuranTheme, QuranThemeKey, styles, surahEndStyles, surahHeaderStyles (+11 more)

### Community 13 - "react-i18next"
Cohesion: 0.13
Nodes (15): expo-haptics, react-i18next, @react-native-async-storage/async-storage, Props, Step, styles, PRAYER_ITEMS, PrayerLog (+7 more)

### Community 14 - "HatimTrackerCard.tsx"
Cohesion: 0.13
Nodes (15): expo-sharing, react-native-qrcode-svg, react-native-view-shot, CARD_THEMES, Props, styles, TEMPLATES, { width: SCREEN_WIDTH } (+7 more)

### Community 15 - "quranRepository.ts"
Cohesion: 0.16
Nodes (18): expo-sqlite, PageMealModal(), Props, styles, DownloadStatus, getDb(), initDb(), JuzDownloadState (+10 more)

### Community 16 - "QuranScreen.tsx"
Cohesion: 0.22
Nodes (21): DeepLinkHandler(), styles, FeaturedSurahCard, JUZ_LIST, JuzListItem, styles, SurahSearchModal(), useQuranSettings() (+13 more)

### Community 17 - "ThemeContext.tsx"
Cohesion: 0.14
Nodes (17): expo-navigation-bar, Countdown(), CountdownProps, styles, applySystemUI(), ColorPalette, ThemeContext, ThemeContextData (+9 more)

### Community 18 - "QuranStyleSelector.tsx"
Cohesion: 0.17
Nodes (13): expo-font, getScriptOptions(), Props, QuranStyleSelector(), styles, defaultState, QuranSettingsContext, QuranSettingsProvider() (+5 more)

### Community 19 - "SimpleHomeScreen.tsx"
Cohesion: 0.19
Nodes (12): GreetingCardModal(), PRAYER_ICON, PRAYER_KEYS, PrayerKey, SimpleHomeScreen(), SimpleHomeScreenProps, styles, { width: SCREEN_WIDTH } (+4 more)

### Community 20 - "(tabs)/index.tsx"
Cohesion: 0.17
Nodes (18): _cache, HIJRI_MONTHS_TR, LazyScreen, METHOD_LABEL_KEYS, PRAYER_KEYS, styles, TABS, DailyContentScreen() (+10 more)

### Community 21 - "TasbihScreen.tsx"
Cohesion: 0.13
Nodes (16): react-native-safe-area-context, DhikrHistory, DhikrMonthData, DhikrProgressModal(), Props, styles, AnimatedCircle, DailyDhikrEntry (+8 more)

### Community 22 - "qibla.tsx"
Cohesion: 0.16
Nodes (14): react-native-svg, DEFAULT_COORDS, QiblaScreen(), QiblaScreenProps, styles, COMPASS_SIZE, DIRECTIONS, getShortestAngle() (+6 more)

### Community 23 - "adsConsentService.ts"
Cohesion: 0.26
Nodes (10): expo-tracking-transparency, allowAdsConsentFlow(), devError(), devLog(), devWarn(), initializeAdsWithConsent(), onboardingGate, openAdsPrivacyOptionsForm() (+2 more)

### Community 24 - "expo"
Cohesion: 0.17
Nodes (11): expo, icon, name, orientation, plugins, scheme, slug, userInterfaceStyle (+3 more)

### Community 25 - "@expo/vector-icons"
Cohesion: 0.12
Nodes (16): expo-linear-gradient, @expo/vector-icons, PrayerLog, PRAYERS, styles, AnimatedTabBar(), AnimatedTabBarProps, styles (+8 more)

### Community 26 - "full_sync_translations.py"
Cohesion: 0.20
Nodes (4): json, os, get_leaves(), sys

### Community 27 - "i18n.ts"
Cohesion: 0.18
Nodes (10): i18next, src_localization_en, changeAppLanguage(), defaultLanguage, ensureLanguageLoaded(), LANGUAGE_LOADERS, loadedLanguages, resources (+2 more)

### Community 28 - "infoPlist"
Cohesion: 0.20
Nodes (10): ITSAppUsesNonExemptEncryption, NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationWhenInUseUsageDescription, NSPhotoLibraryAddUsageDescription, NSPhotoLibraryUsageDescription, NSUserTrackingUsageDescription, UIBackgroundModes, UIStatusBarHidden (+2 more)

### Community 29 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, android, ios, lint, postinstall, reset-project, start, sync-i18n (+2 more)

### Community 30 - "settings.tsx"
Cohesion: 0.14
Nodes (15): AchievementsScreen(), CALCULATION_METHODS, getPrayerIcon(), PRAYER_KEYS, SOUND_OPTIONS, styles, WidgetPromptModal(), DEFAULT_OFFSETS (+7 more)

### Community 31 - "android"
Cohesion: 0.22
Nodes (9): backgroundColor, foregroundImage, adaptiveIcon, googleServicesFile, package, permissions, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 32 - "analyticsService.ts"
Cohesion: 0.14
Nodes (25): PrayerHistoryScreen(), Props, styles, WelcomeOnboardingModal(), logBatterySettingOpened(), logCitySelected(), logDhikrCompleted(), logHatimProgress() (+17 more)

### Community 33 - "api.ts"
Cohesion: 0.11
Nodes (29): adhan, HomeScreen(), WeatherScreen(), activePrayerRequests, applyOffsetsToData(), applyOffsetsToTimings(), autoDetectCalculationMethod(), CachedData (+21 more)

### Community 34 - "quranStorage.ts"
Cohesion: 0.50
Nodes (7): useQuranData(), getFavoriteSurahs(), getLastRead(), getReadingHistory(), ReadingHistoryItem, STORAGE_KEYS, toggleFavoriteSurah()

### Community 35 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, babel-preset-expo, eslint, eslint-config-expo, patch-package, postinstall-postinstall, @types/react, typescript

### Community 36 - "quranBookmarks.ts"
Cohesion: 0.50
Nodes (7): QuranScreen(), getVerseBookmarks(), isVerseBookmarked(), makeId(), removeVerseBookmark(), toggleVerseBookmark(), VerseBookmark

### Community 38 - "extra"
Cohesion: 0.29
Nodes (7): projectId, extra, eas, react-native-google-mobile-ads, router, android_app_id, ios_app_id

### Community 39 - "tsconfig.json"
Cohesion: 0.29
Nodes (6): expo/tsconfig.base, compilerOptions, paths, strict, extends, include

### Community 40 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 41 - "ios"
Cohesion: 0.33
Nodes (6): aps-environment, ios, bundleIdentifier, entitlements, googleServicesFile, supportsTablet

### Community 42 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, eslint, eslint-config-expo

### Community 44 - "BannerAdSlot.tsx"
Cohesion: 0.16
Nodes (16): expo-blur, BannerAdSlot(), BannerAdSlotProps, styles, cleanTime(), findRamadanRange(), RamadanCalendarModal(), RamadanCalendarModalProps (+8 more)

### Community 45 - "Design System: Vera"
Cohesion: 0.08
Nodes (24): Badges / Pills, Buttons, Cards / Containers, Colors, Components, Design System: Vera, Do:, Do's and Don'ts (+16 more)

### Community 46 - "androidStatusBar"
Cohesion: 0.67
Nodes (3): hidden, translucent, androidStatusBar

### Community 47 - "experiments"
Cohesion: 0.67
Nodes (3): reactCompiler, typedRoutes, experiments

### Community 48 - "react-native-google-mobile-ads"
Cohesion: 0.67
Nodes (3): react-native-google-mobile-ads, android_app_id, ios_app_id

### Community 49 - "storageService.ts"
Cohesion: 0.15
Nodes (15): expo-background-task, expo-location, expo-secure-store, expo-task-manager, react-native-mmkv, getSystemFallbackLocation(), LocationData, reverseGeocodeWithRetry() (+7 more)

### Community 50 - "ErrorBoundary.tsx"
Cohesion: 0.17
Nodes (6): @react-native-firebase/crashlytics, devError(), ErrorBoundary, Props, State, styles

### Community 51 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 52 - "PrayerTimeCard.tsx"
Cohesion: 0.22
Nodes (10): AnimatedCircle, formatCountdown(), getIcon(), PrayerTimeCard, PrayerTimeCardProps, styles, AnimatedPressable, ScalePressable() (+2 more)

### Community 53 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 54 - "Issue tracker: GitHub"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 55 - "VersionChecker.tsx"
Cohesion: 0.38
Nodes (6): expo-constants, cleanVersion(), compareVersions(), styles, VersionChecker(), VersionData

### Community 56 - "CitySearchModal.tsx"
Cohesion: 0.33
Nodes (6): CitySearchModal(), CitySearchModalProps, extractCityName(), NominatimResult, RecentCity, styles

### Community 57 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 58 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 59 - "Welcome to your Expo app 👋"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

### Community 60 - "audioManager"
Cohesion: 0.25
Nodes (4): assets_sounds_azizallah, assets_sounds_victory, expo-audio, audioManager

### Community 61 - "Agent skills"
Cohesion: 0.40
Nodes (4): Agent skills, Domain docs, graphify, Issue tracker

### Community 62 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 63 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 64 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 65 - "withAndroidSigning.js"
Cohesion: 0.50
Nodes (3): REQUIRED_ENV_VARS, { withAppBuildGradle }, expo

### Community 73 - "app/_layout.tsx"
Cohesion: 0.31
Nodes (8): @expo-google-fonts/outfit, isNotificationFresh(), RootLayout(), styles, AppReviewModal(), devError(), devLog(), initializePushNotifications()

### Community 74 - "NearbyMosquesModal.tsx"
Cohesion: 0.33
Nodes (8): Props, styles, calculateDistanceMeters(), fetchNearbyMosques(), formatDistance(), minimizePrecision(), MosqueItem, openMapDirections()

### Community 75 - "react-native"
Cohesion: 0.25
Nodes (5): react-native, react-native-view-shot, ViewShot, ViewShotOptions, ViewShotProps

### Community 77 - "hajj-umrah.tsx"
Cohesion: 0.32
Nodes (6): HajjUmrahScreen(), styles, HAJJ_UMRAH_CHECKLIST, HAJJ_UMRAH_STEPS, HajjUmrahChecklistItem, HajjUmrahStep

### Community 78 - "AnimatedSplashScreen.tsx"
Cohesion: 0.29
Nodes (6): expo-image, AnimatedSplashScreen(), Props, SPLASH_SUBTITLES, styles, { width, height }

### Community 79 - "react"
Cohesion: 0.33
Nodes (3): react, Layout(), FadeInViewProps

### Community 80 - "calcMethod.ts"
Cohesion: 0.50
Nodes (3): expo-localization, CALCULATION_METHODS, MethodInfo

## Knowledge Gaps
- **471 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+466 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 539 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `react-native` to `notificationService.ts`, `ReligiousDaysModal.tsx`, `NamesAndDuasScreen.tsx`, `package.json`, `react-native-reanimated`, `collapsible.tsx`, `KazaTrackerModal.tsx`, `DailyContentScreen.tsx`, `quran-reading.tsx`, `react-i18next`, `HatimTrackerCard.tsx`, `quranRepository.ts`, `QuranScreen.tsx`, `ThemeContext.tsx`, `QuranStyleSelector.tsx`, `SimpleHomeScreen.tsx`, `(tabs)/index.tsx`, `TasbihScreen.tsx`, `qibla.tsx`, `adsConsentService.ts`, `@expo/vector-icons`, `settings.tsx`, `analyticsService.ts`, `BannerAdSlot.tsx`, `storageService.ts`, `ErrorBoundary.tsx`, `PrayerTimeCard.tsx`, `VersionChecker.tsx`, `CitySearchModal.tsx`, `app/_layout.tsx`, `NearbyMosquesModal.tsx`, `hajj-umrah.tsx`, `AnimatedSplashScreen.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ReligiousDaysModal.tsx`, `NamesAndDuasScreen.tsx`, `package.json`, `react-native-reanimated`, `collapsible.tsx`, `KazaTrackerModal.tsx`, `DailyContentScreen.tsx`, `quran-reading.tsx`, `react-i18next`, `HatimTrackerCard.tsx`, `quranRepository.ts`, `QuranScreen.tsx`, `ThemeContext.tsx`, `QuranStyleSelector.tsx`, `SimpleHomeScreen.tsx`, `(tabs)/index.tsx`, `TasbihScreen.tsx`, `qibla.tsx`, `@expo/vector-icons`, `settings.tsx`, `analyticsService.ts`, `quranStorage.ts`, `BannerAdSlot.tsx`, `storageService.ts`, `ErrorBoundary.tsx`, `PrayerTimeCard.tsx`, `VersionChecker.tsx`, `CitySearchModal.tsx`, `app/_layout.tsx`, `NearbyMosquesModal.tsx`, `react-native`, `external-link.tsx`, `hajj-umrah.tsx`, `AnimatedSplashScreen.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _471 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `translate_all.js` be split into smaller, more focused modules?**
  _Cohesion score 0.051207729468599035 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._