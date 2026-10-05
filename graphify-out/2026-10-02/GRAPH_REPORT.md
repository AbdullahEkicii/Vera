# Graph Report - ezan-app  (2026-10-02)

## Corpus Check
- 187 files · ~575,111 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .ttf 4, (none) 2, .graphify-bak 1)

## Summary
- 1122 nodes · 2603 edges · 87 communities (75 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28f1573b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- settings.tsx
- dependencies
- NamesAndDuasScreen.tsx
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
- logScreenView
- TasbihScreen.tsx
- quranRepository.ts
- QuranScreen.tsx
- ThemeContext.tsx
- QuranStyleSelector.tsx
- (tabs)/index.tsx
- storageService.ts
- KazaTrackerModal.tsx
- QiblaCompass.tsx
- adsConsentService.ts
- expo
- typography
- full_sync_translations.py
- i18n.ts
- infoPlist
- scripts
- useTheme
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
- react
- Design System: Vera
- androidStatusBar
- experiments
- react-native-google-mobile-ads
- HatimTrackerCard.tsx
- achievementService.ts
- Product
- weather.tsx
- graphify reference: extra exports and benchmark
- Issue tracker: GitHub
- backgroundTaskService.ts
- @react-native-async-storage/async-storage
- graphify reference: query, path, explain
- Domain Docs
- Welcome to your Expo app 👋
- audioManager
- Agent skills
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- index.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- .claude/CLAUDE.md
- extraction-spec.md
- 2026-09-21T18-36-53Z__src-app-achievements-tsx.md
- 2026-09-21T18-36-53Z__src-components-welcomeonboardingmodal-tsx.md
- app/_layout.tsx
- qibla.tsx
- FeedbackModal.tsx
- expo-linear-gradient
- hajj-umrah.tsx
- react-native-reanimated
- BatteryOptimizationCard.tsx
- PrayerOffsetSheet.tsx
- ProgressRing.tsx
- PrayerChecklistCard.tsx
- external-link.tsx
- withAndroidSigning.js
- content.ts
- GreetingCardModal.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 89 edges
2. `react-native` - 68 edges
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
- `Countdown()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/Countdown.tsx → src/context/ThemeContext.tsx
- `ProgressRing()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ProgressRing.tsx → src/context/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (87 total, 12 thin omitted)

### Community 0 - "settings.tsx"
Cohesion: 0.17
Nodes (27): @notifee/react-native, CALCULATION_METHODS, getPrayerIcon(), PRAYER_KEYS, SettingsScreen(), SOUND_OPTIONS, styles, religiousDayText() (+19 more)

### Community 1 - "dependencies"
Cohesion: 0.03
Nodes (64): dependencies, adhan, expo, expo-asset, expo-audio, expo-background-task, expo-blur, expo-build-properties (+56 more)

### Community 2 - "NamesAndDuasScreen.tsx"
Cohesion: 0.12
Nodes (20): HajjUmrahScreen(), AnimatedTabBar(), AnimatedTabBarProps, styles, TabBarTab, TabButton, TabButtonProps, TIMING_CONFIG (+12 more)

### Community 3 - "translate_all.js"
Cohesion: 0.05
Nodes (39): ref_fs, ref_https, ref_path, ref_readline, files, fs, localesDir, path (+31 more)

### Community 4 - "@expo/vector-icons"
Cohesion: 0.15
Nodes (15): expo-blur, @expo/vector-icons, react-i18next, PRAYERS_DATA, Props, QuranPrayersModal(), styles, ReligiousDaysModal() (+7 more)

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
Cohesion: 0.21
Nodes (15): @react-native-firebase/analytics, BannerAdSlot(), BannerAdSlotProps, RETRY_DELAYS_MS, styles, clip(), logAdFailed(), logAdLoaded() (+7 more)

### Community 9 - "react-native"
Cohesion: 0.08
Nodes (32): ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps (+24 more)

### Community 10 - "achievements.tsx"
Cohesion: 0.18
Nodes (12): AchievementsScreen(), CATEGORY_LABELS, styles, StoryCardShareModal(), AchievementCategory, AchievementResult, generateCode(), getOrCreateReferralCode() (+4 more)

### Community 11 - "DailyContentScreen.tsx"
Cohesion: 0.15
Nodes (19): @react-native-firebase/auth, CARD_GRADIENTS, CARD_ICONS, ContentCardProps, DailyContentScreen(), styles, src_data_dailycontent_en, src_data_dailycontent_tr (+11 more)

### Community 12 - "quran-reading.tsx"
Cohesion: 0.13
Nodes (18): react-native-gesture-handler, PageContent, QURAN_THEMES, QuranReadingScreen(), QuranTheme, QuranThemeKey, styles, surahEndStyles (+10 more)

### Community 13 - "logScreenView"
Cohesion: 0.17
Nodes (13): expo-router, @react-navigation/native, PrayerHistoryScreen(), PrayerLog, PRAYERS, styles, parseAmount(), styles (+5 more)

### Community 14 - "TasbihScreen.tsx"
Cohesion: 0.14
Nodes (15): DhikrHistory, DhikrMonthData, DhikrProgressModal(), Props, styles, AnimatedCircle, DailyDhikrEntry, dayKeyOf() (+7 more)

### Community 15 - "quranRepository.ts"
Cohesion: 0.15
Nodes (22): expo-sqlite, PageMealModal(), Props, styles, useQuranDownloader(), logPageMealViewed(), DownloadStatus, getDb() (+14 more)

### Community 16 - "QuranScreen.tsx"
Cohesion: 0.22
Nodes (17): DeepLinkHandler(), styles, FeaturedSurahCard, JUZ_LIST, JuzListItem, styles, SurahSearchModal(), FEATURED_SURAHS (+9 more)

### Community 17 - "ThemeContext.tsx"
Cohesion: 0.14
Nodes (19): AnimatedCircle, formatCountdown(), getIcon(), PrayerTimeCard, PrayerTimeCardProps, styles, applySystemUI(), ColorPalette (+11 more)

### Community 18 - "QuranStyleSelector.tsx"
Cohesion: 0.18
Nodes (14): expo-font, getScriptOptions(), Props, QuranStyleSelector(), styles, defaultState, QuranSettingsContext, QuranSettingsProvider() (+6 more)

### Community 19 - "(tabs)/index.tsx"
Cohesion: 0.12
Nodes (23): _cache, HomeScreen(), LazyScreen, MemoDailyContentScreen, MemoNamesAndDuasScreen, MemoQiblaScreen, MemoQuranScreen, MemoTasbihScreen (+15 more)

### Community 20 - "storageService.ts"
Cohesion: 0.19
Nodes (11): expo-location, expo-secure-store, expo-store-review, react-native-mmkv, getSystemFallbackLocation(), LocationData, reverseGeocodeWithRetry(), useLocation() (+3 more)

### Community 21 - "KazaTrackerModal.tsx"
Cohesion: 0.25
Nodes (12): KazaTrackerModal(), PRAYER_CONFIG, Props, styles, logKazaUpdated(), calculateKazaDebtByTime(), DEFAULT_KAZA_STATE, KazaItem (+4 more)

### Community 22 - "QiblaCompass.tsx"
Cohesion: 0.25
Nodes (8): react-native-svg, COMPASS_SIZE, DIRECTIONS, getShortestAngle(), QiblaCompass(), QiblaCompassProps, styles, { width: SCREEN_WIDTH }

### Community 23 - "adsConsentService.ts"
Cohesion: 0.24
Nodes (9): withGoogleMobileAds, react-native-google-mobile-ads, devError(), devLog(), devWarn(), initializeAdsWithConsent(), onboardingGate, openAdsPrivacyOptionsForm() (+1 more)

### Community 24 - "expo"
Cohesion: 0.17
Nodes (11): expo, icon, name, orientation, plugins, scheme, slug, userInterfaceStyle (+3 more)

### Community 25 - "typography"
Cohesion: 0.18
Nodes (9): Countdown(), CountdownProps, styles, DayPrayerLog, PRAYER_KEYS, PrayerTreeVisual(), Props, styles (+1 more)

### Community 26 - "full_sync_translations.py"
Cohesion: 0.20
Nodes (4): json, os, get_leaves(), sys

### Community 27 - "i18n.ts"
Cohesion: 0.17
Nodes (11): i18next, src_localization_en, changeAppLanguage(), defaultLanguage, ensureLanguageLoaded(), initialResources, LANGUAGE_LOADERS, loadedLanguages (+3 more)

### Community 28 - "infoPlist"
Cohesion: 0.20
Nodes (10): ITSAppUsesNonExemptEncryption, NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationWhenInUseUsageDescription, NSPhotoLibraryAddUsageDescription, NSPhotoLibraryUsageDescription, NSUserTrackingUsageDescription, UIBackgroundModes, UIStatusBarHidden (+2 more)

### Community 29 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, android, i18n:check, i18n:content, i18n:merge, i18n:todo, ios, lint (+6 more)

### Community 30 - "useTheme"
Cohesion: 0.16
Nodes (15): Layout(), cleanTime(), RamadanCalendarModal(), RamadanCalendarModalProps, RamadanDayRow, styles, styles, ThemeSelectionModal() (+7 more)

### Community 31 - "android"
Cohesion: 0.22
Nodes (9): backgroundColor, foregroundImage, adaptiveIcon, googleServicesFile, package, permissions, predictiveBackGestureEnabled, versionCode (+1 more)

### Community 32 - "WelcomeOnboardingModal.tsx"
Cohesion: 0.16
Nodes (14): expo-localization, @react-native-firebase/crashlytics, Props, styles, WelcomeOnboardingModal(), allowAdsConsentFlow(), releaseOnboardingGate(), logOnboardingCompleted() (+6 more)

### Community 33 - "api.ts"
Cohesion: 0.14
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

### Community 44 - "react"
Cohesion: 0.11
Nodes (19): react, GreetingCardModal(), AnimatedPressable, ScalePressable(), ScalePressableProps, PRAYER_ICON, PRAYER_KEYS, PrayerKey (+11 more)

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

### Community 49 - "HatimTrackerCard.tsx"
Cohesion: 0.33
Nodes (11): HatimTrackerCard(), Props, styles, logHatimProgress(), DEFAULT_HATIM_STATE, getJuzFromPage(), HatimState, loadHatimState() (+3 more)

### Community 50 - "achievementService.ts"
Cohesion: 0.24
Nodes (8): AchievementDef, ACHIEVEMENTS, AggregatedStats, computeConsecutiveDayStreak(), getAchievementsWithStatus(), getAggregatedStats(), PROGRESS_UNIT_TR, ProgressUnit

### Community 51 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 52 - "weather.tsx"
Cohesion: 0.31
Nodes (8): react-native-safe-area-context, styles, WeatherScreen(), { width: SCREEN_W }, DetailedWeatherData, fetchDetailedWeather(), getWeatherDescription(), getWeatherEmoji()

### Community 53 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 54 - "Issue tracker: GitHub"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 55 - "backgroundTaskService.ts"
Cohesion: 0.32
Nodes (7): expo-background-task, expo-task-manager, devError(), devLog(), PRAYER_REFRESH_TASK, registerBackgroundPrayerRefreshTask(), SecureLocationStorage

### Community 56 - "@react-native-async-storage/async-storage"
Cohesion: 0.18
Nodes (12): @react-native-async-storage/async-storage, CitySearchModal(), CitySearchModalProps, extractCityName(), NominatimResult, RecentCity, styles, cleanVersion() (+4 more)

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
Cohesion: 0.35
Nodes (3): assets_sounds_azizallah, assets_sounds_victory, audioManager

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

### Community 73 - "app/_layout.tsx"
Cohesion: 0.27
Nodes (9): @expo-google-fonts/outfit, expo-navigation-bar, isNotificationFresh(), RootLayout(), styles, AnimatedSplashScreen(), devError(), devLog() (+1 more)

### Community 74 - "qibla.tsx"
Cohesion: 0.39
Nodes (6): DEFAULT_COORDS, QiblaScreen(), QiblaScreenProps, styles, getDistanceToKaaba(), getQiblaAngle()

### Community 75 - "FeedbackModal.tsx"
Cohesion: 0.29
Nodes (6): expo-constants, @react-native-firebase/firestore, FeedbackModal(), Props, Step, styles

### Community 76 - "expo-linear-gradient"
Cohesion: 0.29
Nodes (6): expo-image, expo-linear-gradient, Props, SPLASH_SUBTITLES, styles, { width, height }

### Community 77 - "hajj-umrah.tsx"
Cohesion: 0.38
Nodes (5): styles, HAJJ_UMRAH_CHECKLIST, HAJJ_UMRAH_STEPS, HajjUmrahChecklistItem, HajjUmrahStep

### Community 79 - "BatteryOptimizationCard.tsx"
Cohesion: 0.47
Nodes (5): BatteryOptimizationCard(), detectMaker(), Maker, styles, logBatterySettingOpened()

### Community 80 - "PrayerOffsetSheet.tsx"
Cohesion: 0.31
Nodes (9): formatOffset(), PrayerOffsetSheet(), Props, shiftTime(), styles, logOffsetChanged(), PrayerOffsets, savePrayerOffsets() (+1 more)

### Community 81 - "ProgressRing.tsx"
Cohesion: 0.20
Nodes (9): assets_images_bg_dark, assets_images_bg_light, AnimatedCircle, BG_DARK, BG_LIGHT, NIGHT_PRAYERS, ProgressRing(), ProgressRingProps (+1 more)

### Community 82 - "PrayerChecklistCard.tsx"
Cohesion: 0.38
Nodes (6): PRAYER_ITEMS, PrayerChecklistCard(), PrayerLog, styles, logPrayerLogged(), maybeRequestReview()

### Community 84 - "withAndroidSigning.js"
Cohesion: 0.50
Nodes (3): REQUIRED_ENV_VARS, { withAppBuildGradle }, expo

### Community 85 - "content.ts"
Cohesion: 0.33
Nodes (7): HIJRI_MONTHS_EN, HIJRI_MONTHS_TR, RELIGIOUS_DAY_DEFS, ReligiousDay, ReligiousDayDef, ReligiousDayKind, hijriMonthName()

### Community 88 - "GreetingCardModal.tsx"
Cohesion: 0.12
Nodes (15): expo-haptics, expo-sharing, react-native-qrcode-svg, react-native-view-shot, @react-navigation/bottom-tabs, @react-navigation/elements, CARD_THEMES, Props (+7 more)

## Knowledge Gaps
- **502 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+497 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 576 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `react-native` to `settings.tsx`, `NamesAndDuasScreen.tsx`, `@expo/vector-icons`, `ErrorBoundary.tsx`, `package.json`, `analyticsService.ts`, `achievements.tsx`, `DailyContentScreen.tsx`, `quran-reading.tsx`, `logScreenView`, `TasbihScreen.tsx`, `quranRepository.ts`, `QuranScreen.tsx`, `ThemeContext.tsx`, `QuranStyleSelector.tsx`, `(tabs)/index.tsx`, `storageService.ts`, `KazaTrackerModal.tsx`, `QiblaCompass.tsx`, `adsConsentService.ts`, `typography`, `useTheme`, `WelcomeOnboardingModal.tsx`, `react`, `HatimTrackerCard.tsx`, `weather.tsx`, `@react-native-async-storage/async-storage`, `app/_layout.tsx`, `qibla.tsx`, `FeedbackModal.tsx`, `expo-linear-gradient`, `hajj-umrah.tsx`, `BatteryOptimizationCard.tsx`, `PrayerOffsetSheet.tsx`, `ProgressRing.tsx`, `PrayerChecklistCard.tsx`, `GreetingCardModal.tsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `settings.tsx`, `NamesAndDuasScreen.tsx`, `@expo/vector-icons`, `ErrorBoundary.tsx`, `package.json`, `analyticsService.ts`, `react-native`, `achievements.tsx`, `DailyContentScreen.tsx`, `quran-reading.tsx`, `logScreenView`, `TasbihScreen.tsx`, `quranRepository.ts`, `QuranScreen.tsx`, `ThemeContext.tsx`, `QuranStyleSelector.tsx`, `(tabs)/index.tsx`, `storageService.ts`, `KazaTrackerModal.tsx`, `QiblaCompass.tsx`, `typography`, `useTheme`, `WelcomeOnboardingModal.tsx`, `quranStorage.ts`, `HatimTrackerCard.tsx`, `weather.tsx`, `@react-native-async-storage/async-storage`, `app/_layout.tsx`, `qibla.tsx`, `FeedbackModal.tsx`, `expo-linear-gradient`, `hajj-umrah.tsx`, `react-native-reanimated`, `BatteryOptimizationCard.tsx`, `PrayerOffsetSheet.tsx`, `ProgressRing.tsx`, `PrayerChecklistCard.tsx`, `external-link.tsx`, `GreetingCardModal.tsx`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _502 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `NamesAndDuasScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Should `translate_all.js` be split into smaller, more focused modules?**
  _Cohesion score 0.051207729468599035 - nodes in this community are weakly interconnected._