---
name: Vera
description: Prayer times, adhan, and daily Islamic practice in one warm, gold-and-dusk app.
colors:
  warm-gold: "#D4AF37"
  amber-primary: "#F59E0B"
  emerald-primary: "#059669"
  ember-black: "#1A1207"
  void-black: "#0D1117"
  surface-dark: "rgba(255, 255, 255, 0.13)"
  surface-light: "rgba(255, 255, 255, 0.85)"
  text-dark: "#F5EFE0"
  text-light: "#0F172A"
  text-secondary-dark: "#A89880"
  text-secondary-light: "#475569"
  danger: "#F87171"
  success: "#34D399"
typography:
  display:
    fontFamily: "Outfit_700Bold"
    fontSize: 30
    fontWeight: "800"
    lineHeight: 36
  headline:
    fontFamily: "Outfit_700Bold"
    fontSize: 22
    fontWeight: "700"
    lineHeight: 28
  title:
    fontFamily: "Outfit_600SemiBold"
    fontSize: 16
    fontWeight: "600"
    lineHeight: 22
  body:
    fontFamily: "Outfit_400Regular"
    fontSize: 13.5
    fontWeight: "400"
    lineHeight: 19
  label:
    fontFamily: "Outfit_600SemiBold"
    fontSize: 11
    fontWeight: "600"
    letterSpacing: "0.3px"
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.warm-gold}"
    textColor: "{colors.ember-black}"
    rounded: "{rounded.md}"
    padding: "13px 24px"
  card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-pill:
    backgroundColor: "{colors.warm-gold}"
    textColor: "{colors.ember-black}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
---

# Design System: Vera

## Overview

**Creative North Star: "The Golden Hour Sanctuary"**

Vera's visual world is a quiet, devotional dusk: deep ember-black and void-black backgrounds hold a single warm gold accent, used sparingly, the way a lantern holds light in a dark room rather than flooding it. The app is built for a user who opens it many times a day for a practical, load-bearing task (the next prayer time) and, in the same visit, may linger in something reflective (Quran reading, dhikr). The material language reflects both registers: functional screens (prayer grid, settings, lists, achievements) stay calm and legible in whichever theme/accent the user chose; devotional and celebratory *entry-point* moments (onboarding, milestone modals) get the full warm-gold-on-charcoal treatment with soft glass layering and a gentle glow.

The system is **dual-toned by design** — a dynamic, user-selectable theme (light: emerald `#059669` primary on a cool light background; dark: amber `#F59E0B` primary on `#0D1117`, with 11 selectable accent palettes) drives the main app chrome (tab screens, cards, the tab bar, **and single-purpose feature screens that live inside the themed app shell: Achievements, Zakat, Ramadan calendar, Hajj/Umrah guide**), while a **fixed** warm-gold-on-ember identity (`#D4AF37` on `#1A1207`) is used verbatim — regardless of the user's theme choice — for onboarding, celebration/milestone modals, and story-share cards, i.e. surfaces the user encounters before or outside their personalized theme choice. This is a deliberate split, confirmed 2026-09-21: feature screens reachable from within the themed app respect the user's chosen accent; only the entry-point/share surfaces carry the fixed brand identity. See the Named Rule under Colors.

**Key Characteristics:**
- Deep, warm darks as the resting state; gold is a rare, deliberate accent, never a fill color.
- Soft glass layering (BlurView + translucent surfaces + thin borders) over flat panels.
- Devotional content (Arabic text, verses, duas) is typographically quiet — no decoration competing with the text itself.
- Celebratory moments (streaks, milestones, hatim completion) earn a warmer, more saturated treatment than everyday UI.

## Colors

Warm and restrained: near-black grounds, one gold accent, and a light user-selectable palette layer for the parts of the app the user customizes.

### Primary
- **Warm Gold** (`#D4AF37`): The fixed brand accent. Used on primary buttons, active states, icons, and celebratory copy across onboarding, milestone/celebration modals, and share cards. Always paired with Ember Black, regardless of the user's selected in-app theme.
- **Amber Primary** (`#F59E0B`): The dynamic dark-theme primary (`ThemeContext` / `utils/theme.ts`), used in the main tab screens' chrome and in single-purpose feature screens reached from within the app (Achievements, Zakat, Ramadan calendar, Hajj/Umrah) when the user is in dark mode. Close to but distinct from Warm Gold — see the Named Rule below.
- **Emerald Primary** (`#059669`): The dynamic light-theme primary. The main app chrome's accent when the user is in light mode; also the "Mint" option in the 11-way user-selectable accent palette (`emerald`, `ocean`, `rose`, `gold`, `amethyst`, `crimson`, `indigo`, `teal`, `mint`, `slate` — see `src/utils/theme.ts`).

### Neutral
- **Ember Black** (`#1A1207`): Background for the fixed gold-brand onboarding and celebration modals. Also the app's splash-screen and root container background.
- **Void Black** (`#0D1117`): Background for the dynamic dark theme's main app chrome.
- **Surface Dark** (`rgba(255, 255, 255, 0.13)`): Card/panel fill in dark mode — a translucent lift off Void Black, not a flat opaque color.
- **Surface Light** (`rgba(255, 255, 255, 0.85)`): Card/panel fill in light mode.
- **Text Dark** (`#F5EFE0`) / **Text Light** (`#0F172A`): Primary text per theme.
- **Text Secondary Dark** (`#A89880`) / **Text Secondary Light** (`#475569`): Secondary/caption text per theme.

### Status
- **Danger** (`#F87171` dark / `#EF4444` light): Errors, destructive actions, validation messages.
- **Success** (`#34D399` dark / `#10B981` light): Confirmations, completed states.

### Named Rules
**The One Gold Rule.** Gold (whichever variant — `#D4AF37` or `#F59E0B`) covers a small minority of any given screen: an icon, a button fill, a badge, a thin accent line. It is never a large fill or a background. Its rarity is what makes it read as devotional rather than decorative.

**The Two-Golds Caution.** `#D4AF37` (fixed brand: onboarding, celebration modals, share cards) and `#F59E0B` (dynamic dark-theme primary: tab screens and feature screens reached from inside the app, e.g. Achievements/Zakat/Ramadan/Hajj-Umrah) are both live in the codebase and are close enough to almost — but not quite — match. Don't introduce a third gold value when adding a new screen; deliberately choose one of the two existing ones based on whether the surface is an entry-point/celebration moment (fixed) or a themed in-app feature screen (dynamic), rather than eyeballing a new hex.

## Typography

**Display/Body/Label Font:** Outfit (`Outfit_400Regular` through `Outfit_700Bold`) — the only typeface family in the app.

**Character:** A single warm geometric sans carries the entire hierarchy; weight, not typeface switching, does the work of distinguishing display moments from body text.

### Hierarchy
- **Display** (`Outfit_700Bold`, 30px, line-height 36): Big numeric/celebratory moments — points totals, streak counts, hero countdown numbers.
- **Headline** (`Outfit_700Bold`, 22px, line-height 28): Modal and screen titles (onboarding steps, celebration modals).
- **Title** (`Outfit_600SemiBold`, 16px, line-height 22): Card titles, section headers, list item primary text.
- **Body** (`Outfit_400Regular`, 13.5px, line-height 19): Descriptions, secondary copy, form labels.
- **Label** (`Outfit_600SemiBold`, 11px, letter-spacing 0.3px): Badges, pills, small uppercase-leaning tags (e.g. the streak badge, points badges).

### Named Rules
**The Arabic Text Exception.** Arabic script (Quran verses, duas, dhikr) is set in `serif` (system serif), never `Outfit` — the only place the type system departs from the single-family rule, because devotional Arabic text is content to be presented with care, not a UI label.

## Layout

Mobile-only, single-column, portrait-first (with landscape adaptations on the Quran reader). Content is padded generously (16–24px screen margins) with cards separated by 8–14px gaps. The floating tab bar sits 16–22px off the bottom safe-area inset, never flush with the screen edge. Modals are centered overlays on a dark scrim (`rgba(0,0,0,0.55–0.85)`), capped at `maxWidth: 380–420` regardless of device width, so they read as a focused dialog rather than a full-bleed sheet.

## Elevation & Depth

Soft layered glass, not flat. Cards and modals sit on translucent, blurred surfaces (`expo-blur` `BlurView`, intensity 25–90) over thin 1–1.5px borders rather than hard drop shadows alone. Primary gold buttons and the floating tab bar add a genuine warm glow shadow on top of that glass layer — depth here means proximity to light, not just stacking order.

### Shadow Vocabulary
- **Ambient card lift** (`shadowOpacity: 0.08–0.25, shadowRadius: 8–20, shadowOffset: {0, 2–4}`): Default resting elevation for cards and panels.
- **Gold glow** (`shadowColor: warm-gold or amber-primary, shadowOpacity: 0.3–0.4, shadowRadius: 8–12`): Primary buttons and active/celebratory elements — the accent casts its own light.
- **Floating bar shadow** (`shadowColor: #C8860A, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: {0, 8}`): Reserved for the tab bar, the one persistently-floating element.

### Named Rules
**The Glow-Is-Earned Rule.** Only gold/interactive elements get the warm glow shadow. Neutral cards get the plain ambient lift — mixing the two makes everything feel equally important, which defeats the One Gold Rule above.

## Shapes

Rounded throughout, radius scaling with the element's weight: small controls (icon buttons, chips) use 8–14px; cards and feature panels use 16–24px; modals and hero panels use 20–32px; pills/badges use full (`9999px`) radius. Borders are hairline-thin (1–1.5px) and low-opacity, functioning as a glass edge rather than a hard outline.

## Components

### Buttons
- **Primary:** Gold gradient fill (`heroGradient` or `['#D4AF37', '#B8860B']`), `rounded.md`–`rounded.lg`, dark (`#1A1207`) text, `Outfit_600SemiBold`. Carries the Gold Glow shadow.
- **Secondary/Ghost:** Low-opacity gold-tinted background (`rgba(212,175,55,0.1)`), gold border (`rgba(212,175,55,0.3–0.4)`), gold text — no fill, no glow shadow.
- **Icon buttons:** Circular, 36–44px, translucent surface background, no border in the active tab bar state (see Navigation).

### Cards / Containers
- **Corner Style:** `rounded.lg` (24px) is the default for feature cards; `rounded.md` (16px) for compact list items.
- **Background:** `surface-dark`/`surface-light` (translucent), never a flat opaque neutral.
- **Shadow Strategy:** Ambient card lift (see Elevation).
- **Border:** Always present, hairline, theme-border color.
- **Internal Padding:** 14–16px standard, 20–24px for hero/feature cards.

### Modals
- **Style:** Centered overlay, `BlurView` scrim, card `maxWidth: 380–420`, `rounded.lg`–`rounded.xl` (24–28px), 1.5px border in the brand gold at low opacity (`rgba(212,175,55,0.2–0.35)`).
- **Structure:** Icon badge (gold gradient circle) → headline → body copy → primary gold button → optional secondary/skip text link.

### Badges / Pills
- **Style:** Full pill radius, gold gradient or low-opacity gold fill, small icon + label pairing (e.g. the streak flame badge, achievement points badge).

### Navigation (Tab Bar)
- **Style:** Floating glass pill (`BlurView`, `rounded: 32px`, 1.2px border), anchored 16–22px above the bottom safe area, not edge-to-edge.
- **Active state:** A single continuously-sliding gradient pill tracks the active tab in real time (synced to swipe position, not just tap), with the active icon cross-fading to white and scaling up (~1.16×) as it becomes active. Inactive icons stay at the theme's secondary-text color.
- **Motion is structural here, not decorative** — the sliding indicator is the primary way the current section is communicated, more than icon color alone.

## Do's and Don'ts

### Do:
- **Do** keep gold to icons, buttons, badges, and accents — never a large background fill (The One Gold Rule).
- **Do** use `BlurView` + translucent surface + hairline border for any new card or modal, not a flat opaque panel.
- **Do** set Arabic/Quranic text in `serif`, and everything else in Outfit.
- **Do** reserve the Gold Glow shadow for interactive/celebratory elements; give ordinary cards the plain ambient lift.
- **Do** choose deliberately between the fixed brand identity (`#D4AF37` / `#1A1207`, for onboarding, celebration modals, and share cards) and the dynamic themed chrome (`ThemeContext`'s `theme.colors.*`, for main tab screens and in-app feature screens like Achievements/Zakat/Ramadan/Hajj-Umrah) based on where the new screen lives — don't mix the two within one surface.

### Don't:
- **Don't** introduce a third "gold" hex value — reconcile against `#D4AF37` or `#F59E0B` (see The Two-Golds Caution).
- **Don't** give devotional content (verses, duas, hadith) decorative treatment that competes with the text — quiet typography, generous line-height, no gimmicks.
- **Don't** make a new floating/persistent element without the tab bar's glass + glow treatment — it's the one visual vocabulary for "always present" UI in this app.
- **Don't** flood a screen with the accent color to signal importance; use rarity, not saturation, to draw the eye.
