# Graph Report - ezan-app  (2026-09-27)

## Corpus Check
- 187 files · ~572,815 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .ttf 4, (none) 2, .graphify-bak 1)

## Summary
- 1112 nodes · 2578 edges · 90 communities (79 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28f1573b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notificationService.ts
- dependencies
- AnimatedTabBar.tsx
- translate_all.js
- @expo/vector-icons
- ErrorBoundary.tsx
- i18n-sync.mjs
- package.json
- analyticsService.ts
- react-native
- achievements.tsx
- DailyContentScreen.tsx
- quran-reading.tsx
- settings.tsx
- GreetingCardModal.tsx
- quranRepository.ts
- QuranScreen.tsx
- ThemeContext.tsx
- QuranSettingsContext.tsx
- (tabs)/index.tsx
- storageService.ts
- TasbihScreen.tsx
- QiblaCompass.tsx
- adsConsentService.ts
- expo
- useTheme
- full_sync_translations.py
- i18n.ts
- infoPlist
- scripts
- ReligiousDaysModal.tsx
- android
- WelcomeOnboardingModal.tsx
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
- SimpleHomeScreen.tsx
- Design System: Vera
- androidStatusBar
- experiments
- react-native-google-mobile-ads
- logScreenView
- NamesAndDuasScreen.tsx
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
- react-native-reanimated
- KazaTrackerModal.tsx
- external-link.tsx
- HatimTrackerCard.tsx
- expo-linear-gradient
- BatteryOptimizationCard.tsx
- PrayerOffsetSheet.tsx
- ProgressRing.tsx
- PrayerChecklistCard.tsx
- weather.tsx
- qibla.tsx
- content.ts
- hajj-umrah.tsx
- referralService.ts
- expo-haptics
- react-native-google-mobile-ads

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 89 edges
2. `react-native` - 67 edges
3. `react` - 63 edges
4. `@expo/vector-icons` - 44 edges
5. `react-i18next` - 43 edges
6. `react-native-reanimated` - 31 edges
7. `typography` - 28 edges
8. `logScreenView()` - 26 edges
9. `expo-linear-gradient` - 24 edges
10. `HomeScreen()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `ParallaxScrollView()` --calls--> `useThemeColor()`  [EXTRACTED]
  components/parallax-scroll-view.tsx → hooks/use-theme-color.ts
- `ThemedText()` --calls--> `useThemeColor()`  [EXTRACTED]
  components/themed-text.tsx → hooks/use-theme-color.ts
- `ThemedView()` --calls--> `useThemeColor()`  [EXTRACTED]
  components/themed-view.tsx → hooks/use-theme-color.ts
- `TabButton` --calls--> `ct()`  [EXTRACTED]
  src/components/AnimatedTabBar.tsx → src/localization/content.ts
- `ProgressRing()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ProgressRing.tsx → src/context/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (90 total, 11 thin omitted)

### Community 0 - "notificationService.ts"
Cohesion: 0.28
Nodes (18): SettingsScreen(), religiousDayText(), defaultPrefs, devError(), devLog(), getExactChannelId(), getNotificationPrefs(), getWarningChannelId() (+10 more)

### Community 1 - "dependencies"
Cohesion: 0.03
Nodes (64): dependencies, adhan, expo, expo-asset, expo-audio, expo-background-task, expo-blur, expo-build-properties (+56 more)

### Community 2 - "AnimatedTabBar.tsx"
Cohesion: 0.25
Nodes (7): AnimatedTabBar(), AnimatedTabBarProps, styles, TabBarTab, TabButton, TabButtonProps, TIMING_CONFIG

### Community 3 - "translate_all.js"
Cohesion: 0.05
Nodes (39): ref_fs, ref_https, ref_path, ref_readline, files, fs, localesDir, path (+31 more)

### Community 4 - "@expo/vector-icons"
Cohesion: 0.22
Nodes (9): @expo/vector-icons, react-i18next, PRAYERS_DATA, Props, QuranPrayersModal(), styles, Props, styles (+1 more)

### Community 5 - "ErrorBoundary.tsx"
Cohesion: 0.22
Nodes (5): devError(), ErrorBoundary, Props, State, styles

### Community 6 - "i18n-sync.mjs"
Cohesion: 0.09
Nodes (19): ref_node_fs, ref_node_path, ref_node_url, extract(), files, json, LOC, MANUAL (+11 more)

### Community 7 - "package.json"
Cohesion: 0.07
Nodes (27): main, name, private, version, babel-preset-expo, expo-asset, expo-build-properties, expo-file-system (+19 more)

### Community 8 - "analyticsService.ts"
Cohesion: 0.19
Nodes (17): BannerAdSlot(), BannerAdSlotProps, RETRY_DELAYS_MS, styles, clip(), logAdFailed(), logAdLoaded(), logAdRequest() (+9 more)

### Community 9 - "react-native"
Cohesion: 0.09
Nodes (23): ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps (+15 more)

### Community 10 - "achievements.tsx"
Cohesion: 0.17
Nodes (14): AchievementsScreen(), CATEGORY_LABELS, styles, AchievementCategory, AchievementDef, AchievementResult, ACHIEVEMENTS, AggregatedStats (+6 more)

### Community 11 - "DailyContentScreen.tsx"
Cohesion: 0.14
Nodes (20): @react-native-async-storage/async-storage, @react-native-firebase/auth, CARD_GRADIENTS, CARD_ICONS, ContentCardProps, DailyContentScreen(), styles, src_data_dailycontent_en (+12 more)

### Community 12 - "quran-reading.tsx"
Cohesion: 0.13
Nodes (18): react-native-gesture-handler, PageContent, QURAN_THEMES, QuranReadingScreen(), QuranTheme, QuranThemeKey, styles, surahEndStyles (+10 more)

### Community 13 - "settings.tsx"
Cohesion: 0.15
Nodes (13): expo-constants, @react-native-firebase/firestore, CALCULATION_METHODS, getPrayerIcon(), PRAYER_KEYS, SOUND_OPTIONS, styles, FeedbackModal() (+5 more)

### Community 14 - "GreetingCardModal.tsx"
Cohesion: 0.16
Nodes (14): expo-sharing, react-native-qrcode-svg, react-native-view-shot, CARD_THEMES, Props, styles, TEMPLATES, { width: SCREEN_WIDTH } (+6 more)

### Community 15 - "quranRepository.ts"
Cohesion: 0.16
Nodes (21): PageMealModal(), Props, styles, useQuranDownloader(), DownloadStatus, getDb(), initDb(), JuzDownloadState (+13 more)

### Community 16 - "QuranScreen.tsx"
Cohesion: 0.18
Nodes (21): @shopify/flash-list, DeepLinkHandler(), styles, FeaturedSurahCard, JUZ_LIST, JuzListItem, styles, SurahSearchModal() (+13 more)

### Community 17 - "ThemeContext.tsx"
Cohesion: 0.16
Nodes (15): styles, ThemeSelectionModal(), ThemeSelectionModalProps, { width: SCREEN_WIDTH }, applySystemUI(), ColorPalette, ThemeContext, ThemeContextData (+7 more)

### Community 18 - "QuranSettingsContext.tsx"
Cohesion: 0.27
Nodes (8): expo-font, defaultState, QuranSettingsContext, QuranSettingsProvider(), QuranSettingsState, ScriptType, FONT_ASSETS, loadQuranFont()

### Community 19 - "(tabs)/index.tsx"
Cohesion: 0.16
Nodes (18): _cache, HomeScreen(), LazyScreen, METHOD_LABEL_KEYS, PRAYER_KEYS, styles, TABS, SimpleHomeScreen() (+10 more)

### Community 20 - "storageService.ts"
Cohesion: 0.15
Nodes (16): expo-background-task, expo-location, expo-secure-store, expo-task-manager, react-native-mmkv, getSystemFallbackLocation(), LocationData, reverseGeocodeWithRetry() (+8 more)

### Community 21 - "TasbihScreen.tsx"
Cohesion: 0.14
Nodes (15): DhikrHistory, DhikrMonthData, DhikrProgressModal(), Props, styles, AnimatedCircle, DailyDhikrEntry, dayKeyOf() (+7 more)

### Community 22 - "QiblaCompass.tsx"
Cohesion: 0.25
Nodes (8): react-native-svg, COMPASS_SIZE, DIRECTIONS, getShortestAngle(), QiblaCompass(), QiblaCompassProps, styles, { width: SCREEN_WIDTH }

### Community 23 - "adsConsentService.ts"
Cohesion: 0.26
Nodes (10): expo-tracking-transparency, allowAdsConsentFlow(), devError(), devLog(), devWarn(), initializeAdsWithConsent(), onboardingGate, openAdsPrivacyOptionsForm() (+2 more)

### Community 24 - "expo"
Cohesion: 0.17
Nodes (11): expo, icon, name, orientation, plugins, scheme, slug, userInterfaceStyle (+3 more)

### Community 25 - "useTheme"
Cohesion: 0.16
Nodes (15): react, Layout(), Countdown(), CountdownProps, styles, DayPrayerLog, PRAYER_KEYS, PrayerTreeVisual() (+7 more)

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
Cohesion: 0.14
Nodes (14): scripts, android, i18n:check, i18n:content, i18n:merge, i18n:todo, ios, lint (+6 more)

### Community 30 - "ReligiousDaysModal.tsx"
Cohesion: 0.17
Nodes (13): cleanTime(), RamadanCalendarModal(), RamadanCalendarModalProps, RamadanDayRow, styles, ReligiousDaysModal(), ReligiousDaysModalProps, styles (+5 more)

### Community 31 - "android"
Cohesion: 0.22
Nodes (9): backgroundColor, foregroundImage, adaptiveIcon, googleServicesFile, package, permissions, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 32 - "WelcomeOnboardingModal.tsx"
Cohesion: 0.18
Nodes (13): expo-localization, @react-native-firebase/crashlytics, Props, styles, WelcomeOnboardingModal(), logOnboardingCompleted(), logOnboardingStep(), logSoundTested() (+5 more)

### Community 33 - "api.ts"
Cohesion: 0.13
Nodes (24): adhan, activePrayerRequests, addDays(), applyOffsetsToData(), applyOffsetsToTimings(), autoDetectCalculationMethod(), CachedData, computeReligiousDaysForYear() (+16 more)

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

### Community 44 - "SimpleHomeScreen.tsx"
Cohesion: 0.21
Nodes (11): GreetingCardModal(), PRAYER_ICON, PRAYER_KEYS, PrayerKey, SimpleHomeScreenProps, styles, { width: SCREEN_WIDTH }, styles (+3 more)

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

### Community 49 - "logScreenView"
Cohesion: 0.18
Nodes (11): expo-router, @react-navigation/native, HajjUmrahScreen(), PrayerHistoryScreen(), PrayerLog, PRAYERS, styles, parseAmount() (+3 more)

### Community 50 - "NamesAndDuasScreen.tsx"
Cohesion: 0.22
Nodes (12): DuaItemCard, DuaItemCardProps, EsmaItemCard, EsmaItemCardProps, NamesAndDuasScreen(), styles, TabType, DuaItem (+4 more)

### Community 51 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 52 - "PrayerTimeCard.tsx"
Cohesion: 0.21
Nodes (10): AnimatedCircle, formatCountdown(), getIcon(), PrayerTimeCard, PrayerTimeCardProps, styles, AnimatedPressable, ScalePressable() (+2 more)

### Community 53 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 54 - "Issue tracker: GitHub"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 55 - "VersionChecker.tsx"
Cohesion: 0.47
Nodes (5): cleanVersion(), compareVersions(), styles, VersionChecker(), VersionData

### Community 56 - "CitySearchModal.tsx"
Cohesion: 0.18
Nodes (11): expo-blur, CitySearchModal(), CitySearchModalProps, extractCityName(), NominatimResult, RecentCity, styles, styles (+3 more)

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
Nodes (8): @expo-google-fonts/outfit, expo-navigation-bar, isNotificationFresh(), RootLayout(), styles, devError(), devLog(), initializePushNotifications()

### Community 74 - "react-native-reanimated"
Cohesion: 0.18
Nodes (11): react-native-reanimated, FadeInViewProps, NearbyMosquesModal(), Props, styles, calculateDistanceMeters(), fetchNearbyMosques(), formatDistance() (+3 more)

### Community 75 - "KazaTrackerModal.tsx"
Cohesion: 0.25
Nodes (12): KazaTrackerModal(), PRAYER_CONFIG, Props, styles, logKazaUpdated(), calculateKazaDebtByTime(), DEFAULT_KAZA_STATE, KazaItem (+4 more)

### Community 77 - "HatimTrackerCard.tsx"
Cohesion: 0.33
Nodes (11): HatimTrackerCard(), Props, styles, logHatimProgress(), DEFAULT_HATIM_STATE, getJuzFromPage(), HatimState, loadHatimState() (+3 more)

### Community 78 - "expo-linear-gradient"
Cohesion: 0.25
Nodes (7): expo-image, expo-linear-gradient, AnimatedSplashScreen(), Props, SPLASH_SUBTITLES, styles, { width, height }

### Community 79 - "BatteryOptimizationCard.tsx"
Cohesion: 0.22
Nodes (7): @notifee/react-native, @react-native-firebase/messaging, BatteryOptimizationCard(), detectMaker(), Maker, styles, logBatterySettingOpened()

### Community 80 - "PrayerOffsetSheet.tsx"
Cohesion: 0.31
Nodes (9): formatOffset(), PrayerOffsetSheet(), Props, shiftTime(), styles, logOffsetChanged(), PrayerOffsets, savePrayerOffsets() (+1 more)

### Community 81 - "ProgressRing.tsx"
Cohesion: 0.20
Nodes (9): assets_images_bg_dark, assets_images_bg_light, AnimatedCircle, BG_DARK, BG_LIGHT, NIGHT_PRAYERS, ProgressRing(), ProgressRingProps (+1 more)

### Community 82 - "PrayerChecklistCard.tsx"
Cohesion: 0.27
Nodes (8): expo-store-review, PRAYER_ITEMS, PrayerChecklistCard(), PrayerLog, styles, logPrayerLogged(), maybeRequestReview(), ReviewTrigger

### Community 83 - "weather.tsx"
Cohesion: 0.31
Nodes (8): react-native-safe-area-context, styles, WeatherScreen(), { width: SCREEN_W }, DetailedWeatherData, fetchDetailedWeather(), getWeatherDescription(), getWeatherEmoji()

### Community 84 - "qibla.tsx"
Cohesion: 0.33
Nodes (7): DEFAULT_COORDS, QiblaScreen(), QiblaScreenProps, styles, AppBackground(), getDistanceToKaaba(), getQiblaAngle()

### Community 85 - "content.ts"
Cohesion: 0.39
Nodes (6): HIJRI_MONTHS_EN, HIJRI_MONTHS_TR, RELIGIOUS_DAY_DEFS, ReligiousDay, ReligiousDayDef, ReligiousDayKind

### Community 86 - "hajj-umrah.tsx"
Cohesion: 0.38
Nodes (5): styles, HAJJ_UMRAH_CHECKLIST, HAJJ_UMRAH_STEPS, HajjUmrahChecklistItem, HajjUmrahStep

### Community 87 - "referralService.ts"
Cohesion: 0.33
Nodes (4): generateCode(), getOrCreateReferralCode(), ShareSource, Translate

### Community 88 - "expo-haptics"
Cohesion: 0.40
Nodes (3): expo-haptics, @react-navigation/bottom-tabs, @react-navigation/elements

## Knowledge Gaps
- **495 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+490 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 569 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `react-native` to `notificationService.ts`, `AnimatedTabBar.tsx`, `@expo/vector-icons`, `ErrorBoundary.tsx`, `package.json`, `analyticsService.ts`, `achievements.tsx`, `DailyContentScreen.tsx`, `quran-reading.tsx`, `settings.tsx`, `GreetingCardModal.tsx`, `quranRepository.ts`, `QuranScreen.tsx`, `ThemeContext.tsx`, `(tabs)/index.tsx`, `storageService.ts`, `TasbihScreen.tsx`, `QiblaCompass.tsx`, `adsConsentService.ts`, `useTheme`, `ReligiousDaysModal.tsx`, `WelcomeOnboardingModal.tsx`, `SimpleHomeScreen.tsx`, `logScreenView`, `NamesAndDuasScreen.tsx`, `PrayerTimeCard.tsx`, `VersionChecker.tsx`, `CitySearchModal.tsx`, `app/_layout.tsx`, `react-native-reanimated`, `KazaTrackerModal.tsx`, `HatimTrackerCard.tsx`, `expo-linear-gradient`, `BatteryOptimizationCard.tsx`, `PrayerOffsetSheet.tsx`, `ProgressRing.tsx`, `PrayerChecklistCard.tsx`, `weather.tsx`, `qibla.tsx`, `hajj-umrah.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `react` connect `useTheme` to `AnimatedTabBar.tsx`, `@expo/vector-icons`, `ErrorBoundary.tsx`, `package.json`, `analyticsService.ts`, `react-native`, `achievements.tsx`, `DailyContentScreen.tsx`, `quran-reading.tsx`, `settings.tsx`, `GreetingCardModal.tsx`, `quranRepository.ts`, `QuranScreen.tsx`, `ThemeContext.tsx`, `QuranSettingsContext.tsx`, `(tabs)/index.tsx`, `storageService.ts`, `TasbihScreen.tsx`, `QiblaCompass.tsx`, `ReligiousDaysModal.tsx`, `WelcomeOnboardingModal.tsx`, `quranStorage.ts`, `SimpleHomeScreen.tsx`, `logScreenView`, `NamesAndDuasScreen.tsx`, `PrayerTimeCard.tsx`, `VersionChecker.tsx`, `CitySearchModal.tsx`, `app/_layout.tsx`, `react-native-reanimated`, `KazaTrackerModal.tsx`, `external-link.tsx`, `HatimTrackerCard.tsx`, `expo-linear-gradient`, `BatteryOptimizationCard.tsx`, `PrayerOffsetSheet.tsx`, `ProgressRing.tsx`, `PrayerChecklistCard.tsx`, `weather.tsx`, `qibla.tsx`, `hajj-umrah.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _495 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `translate_all.js` be split into smaller, more focused modules?**
  _Cohesion score 0.051207729468599035 - nodes in this community are weakly interconnected._
- **Should `i18n-sync.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08923076923076922 - nodes in this community are weakly interconnected._