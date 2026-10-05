# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Practicing Muslims worldwide who need accurate prayer times, adhan alerts, and a single place for daily Islamic practice (Quran reading, dhikr, duas, Ramadan/Hajj planning). Global-first audience: the app ships in 34 languages, with no single locale treated as the default design target — Turkish is one supported market among many, not the primary persona.

## Product Purpose

Vera (package: ezan-app) delivers accurate prayer times and adhan notifications that keep working without a network connection, and bundles the rest of daily Islamic practice — Quran reading with recitation audio and verse bookmarks, a dhikr counter with streaks, the 99 Names and a duas library, a Ramadan calendar, a Zakat calculator, and a Hajj/Umrah step-by-step guide — into one app. Success is a user who opens Vera daily, trusts its prayer times enough to rely on the adhan alert, and uses at least one of the secondary Islamic-practice features regularly (Quran, dhikr, or prayer tracking).

## Positioning

Offline reliability plus breadth in one app: prayer times are computed on-device (via the `adhan` calculation library) when the network or API is unavailable, so the adhan alert never silently fails — a guarantee general-purpose prayer apps and even some official/regional apps don't make explicit. On top of that reliability floor, Vera consolidates what users otherwise split across several apps (a prayer-times app, a Quran app, a dhikr counter, a Ramadan calendar, a Zakat calculator) into one coherent product, with a unified achievement system tying daily practice together.

## Operating Context

- Checked multiple times a day for the next prayer time and countdown; the home screen and its persistent notification/widget are the highest-frequency touchpoint.
- Left open for extended periods on specific screens — the home countdown, Quran reading, and the dhikr (tesbih) counter — which is why those screens carry banner ads (policy-compliant auto-refresh) while the rest of the app uses native ads.
- Ramadan is the highest-traffic season: the Ramadan calendar, fasting-aware notification scheduling, and related content matter disproportionately during that month.
- Runs fully offline-capable for its core function (prayer times); network is used for weather, nearby-mosque lookup, Quran audio streaming, and ad serving.
- Cross-platform native (iOS + Android via Expo/React Native), single shared design language — not a website, and not visually differentiated per OS.

## Capabilities and Constraints

- **Stack:** Expo SDK 54 / React Native, expo-router (file-based routing), react-native-reanimated 4, react-native-pager-view for the tab system.
- **Backend/services:** Firebase (Auth for a hidden editor/CMS role, Analytics, Crashlytics, Cloud Messaging for remote push), AdMob (native + banner ads) with UMP/GDPR consent and iOS ATT wired up.
- **Storage:** MMKV + AsyncStorage hybrid (`storageService.ts`) for general data; `expo-secure-store` for sensitive data (location).
- **Notifications:** `@notifee/react-native` for rich local notifications (exact adhan + 25-min warning + persistent countdown), plus a background task that refreshes the schedule roughly every 12h so alerts don't go stale if the app isn't opened.
- **Localization:** 34 languages, lazily loaded (only the active language's JSON is parsed at startup; others load on demand) — the localization *infrastructure* supports full parity, though a few content-heavy strings (e.g. daily dhikr recommendations) currently only have translations for a subset of languages and fall back to English.
- **Terminology:** Turkish Islamic-practice terms are used throughout the UI (e.g. "İmsak", "İftar", "Hatim", "Kaza") since they're the standard terms across languages/traditions for these concepts, not just Turkish-only labels.
- **Undecided:** no formal design system/token file exists yet (`utils/theme.ts` holds light/dark color objects but there's no documented type scale, spacing scale, or component library).

## Brand Commitments

- **Name:** Vera.
- **Visual identity in practice (not yet formalized in a DESIGN.md):** warm gold accent (`#D4AF37` / `#D4A574`) on a dark, deep-brown/near-black background (`#1A1207`, `#0D1117`) in dark mode; a lighter warm-cream/gold pairing in light mode. Crescent-moon and Islamic geometric motifs appear in modals and cards (e.g. onboarding, Ramadan calendar). `Outfit` is the primary typeface family (`Outfit_400Regular` through `Outfit_700Bold`).
- **Tone:** respectful/devotional for religious content (Arabic text, duas, hadith), warm and encouraging for gamification (achievement/streak copy uses "Maşallah", "Elhamdülillah" register rather than generic app-gamification language).

## Evidence on Hand

None. No committed testimonials, case studies, press mentions, or user research artifacts exist in the repo; do not fabricate any for future design or copy work.

## Product Principles

1. **The adhan alert must never silently fail.** Every feature decision that touches prayer-time computation or notification scheduling is evaluated against this guarantee first.
2. **One app, not a bundle of disconnected tools.** New Islamic-practice features (Zakat, Hajj/Umrah, achievements) should feel like they belong to the same product as prayer times, not like bolted-on utilities.
3. **Offline-first, network-enhanced.** Core function works with no connection; network calls (weather, audio streaming, ads) degrade gracefully rather than blocking the core experience.
4. **Global by default, no locale gets special-cased styling.** Design and copy work should hold up across 34 languages and both RTL (Arabic, Urdu, Farsi) and LTR scripts, not assume Turkish or English as the "real" version.
5. **Respectful of religious content.** Arabic text, Quranic verses, and devotional copy are treated as content to be presented with care, not decorated or treated as generic UI filler.

## Accessibility & Inclusion

RTL languages are supported (Arabic, Urdu, Farsi among the 34). A prior audit this project found concrete gaps — e.g. the Qibla compass screen has no accessibility labels for screen readers — that should be treated as real backlog items, not assumed already solved.
