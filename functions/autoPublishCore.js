// Pure rules for the community auto-publisher. No Firebase imports, so these run under `node --test`
// and the scheduled function (index.js) only adds the I/O around them.
//
// Rules:
// - Every day gets at least MIN_DAILY_POSTS automatic posts, spread across the day at random times.
// - For every REAL_POSTS_PER_EXTRA real posts made that day, one more automatic post is due
//   EXTRA_DELAY_MS after the post that completed that group of three.
// - Template choice is weighted: the full-day prayer post (5/5) is the most likely one.
// - Posts are written with the same shape as client posts (see src/services/communityService.ts).

export const AUTO_AUTHOR_UID = 'community-auto';
export const MIN_DAILY_POSTS = 2;
export const REAL_POSTS_PER_EXTRA = 3;
export const EXTRA_DELAY_MS = 60 * 60 * 1000;
// Turkey has no DST since 2016, so a fixed +03:00 offset keeps the day boundary stable.
const DAY_OFFSET_HOURS = 3;
const BASE_WINDOW_START_HOUR = 8;
const BASE_WINDOW_END_HOUR = 22;

export const TEMPLATE_WEIGHTS = {
  'prayer.fullday': 50,
  'dhikr.milestone': 20,
  'hatim.completed': 15,
  'achievement': 15,
};

const DHIKR_MILESTONES = [100, 500, 1000, 2000, 5000, 10000];

// Achievement titles in the two languages the app already ships them in (achievementService.ts).
const ACHIEVEMENT_TITLES = [
  { tr: '7 Günlük İstikrar', en: '7-Day Consistency' },
  { tr: '30 Günlük İstikrar', en: '30-Day Consistency' },
  { tr: '100 Vakit', en: '100 Prayers' },
  { tr: '500 Vakit', en: '500 Prayers' },
  { tr: '7 Günlük Zikir', en: '7-Day Dhikr Streak' },
  { tr: '1.000 Zikir', en: '1,000 Dhikr' },
  { tr: 'İlk Hatim', en: 'First Khatm' },
  { tr: '3 Hatim', en: '3 Khatms' },
];

// Every app language (src/localization/*.json) with regions where that language is commonly spoken.
export const LANGUAGE_COUNTRIES = {
  ar: ['SA', 'EG', 'AE', 'MA', 'DZ', 'IQ', 'JO'],
  bn: ['BD', 'IN'],
  cs: ['CZ'],
  da: ['DK'],
  de: ['DE', 'AT', 'CH'],
  en: ['US', 'GB', 'CA', 'AU', 'IN', 'PK'],
  es: ['ES', 'MX', 'AR', 'CO', 'CL'],
  fa: ['IR', 'AF'],
  fi: ['FI'],
  fr: ['FR', 'BE', 'CA', 'SN'],
  ha: ['NG', 'NE'],
  hi: ['IN'],
  hu: ['HU'],
  id: ['ID'],
  it: ['IT'],
  ja: ['JP'],
  ko: ['KR'],
  ms: ['MY', 'SG', 'BN'],
  nl: ['NL', 'BE'],
  no: ['NO'],
  pl: ['PL'],
  pt: ['BR', 'PT'],
  ro: ['RO'],
  ru: ['RU', 'KZ', 'UA'],
  sk: ['SK'],
  sq: ['AL', 'XK'],
  sv: ['SE'],
  sw: ['KE', 'TZ'],
  th: ['TH'],
  tr: ['TR', 'DE', 'NL'],
  uk: ['UA'],
  ur: ['PK', 'IN'],
  uz: ['UZ'],
  vi: ['VN'],
  zh: ['CN', 'TW', 'SG'],
};

const APP_LANGUAGES = Object.keys(LANGUAGE_COUNTRIES);

/** Picks an item by weight. `rnd` returns a number in [0, 1). */
export function pickWeighted(weights, rnd) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rnd() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pickFrom(items, rnd) {
  return items[Math.floor(rnd() * items.length)];
}

/** A random app language and one of its countries, e.g. { lang: 'ar', country: 'EG' }. */
export function pickLanguageAndCountry(rnd) {
  const lang = pickFrom(APP_LANGUAGES, rnd);
  return { lang, country: pickFrom(LANGUAGE_COUNTRIES[lang], rnd) };
}

/** `YYYY-MM-DD` for an instant, in the publisher's day (UTC+3). Matches the client's dayKey format. */
export function publisherDayKey(ms) {
  const shifted = new Date(ms + DAY_OFFSET_HOURS * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Epoch ms of a local wall-clock time on the given `YYYY-MM-DD` day in the publisher's zone. */
export function publisherTimeMs(dayKey, hour, minute) {
  const [y, mo, d] = dayKey.split('-').map(Number);
  return Date.UTC(y, mo - 1, d, hour - DAY_OFFSET_HOURS, minute);
}

/**
 * The day's plan: the base post times, chosen once and stored so retries never move them.
 * `publishedSlots` records which slot ids are already written.
 */
export function buildDayPlan(dayKey, rnd) {
  const slots = [];
  for (let i = 0; i < MIN_DAILY_POSTS; i += 1) {
    const span = (BASE_WINDOW_END_HOUR - BASE_WINDOW_START_HOUR) * 60;
    const minuteOfDay = Math.floor(rnd() * span);
    const at = publisherTimeMs(
      dayKey,
      BASE_WINDOW_START_HOUR + Math.floor(minuteOfDay / 60),
      minuteOfDay % 60
    );
    slots.push({ id: `base-${i}`, at });
  }
  return { dayKey, baseSlots: slots, publishedSlots: [] };
}

/**
 * Every automatic slot that is due now and not published yet.
 * `realPostTimes` are the createdAt epoch ms of today's real (non-automatic) visible posts.
 */
export function dueSlots({ plan, realPostTimes, now }) {
  const published = new Set(plan.publishedSlots ?? []);
  const sorted = [...realPostTimes].sort((a, b) => a - b);
  const all = [...plan.baseSlots];
  const groups = Math.floor(sorted.length / REAL_POSTS_PER_EXTRA);
  for (let k = 1; k <= groups; k += 1) {
    all.push({ id: `extra-${k}`, at: sorted[k * REAL_POSTS_PER_EXTRA - 1] + EXTRA_DELAY_MS });
  }
  return all.filter((slot) => slot.at <= now && !published.has(slot.id));
}

/** The Firestore document for one automatic post, same shape as a client-written post. */
export function buildAutoPost(slot, dayKey, rnd) {
  const templateKey = pickWeighted(TEMPLATE_WEIGHTS, rnd);
  const { lang, country } = pickLanguageAndCountry(rnd);
  const params = { country };

  if (templateKey === 'dhikr.milestone') {
    params.count = pickFrom(DHIKR_MILESTONES, rnd);
  } else if (templateKey === 'achievement') {
    const title = pickFrom(ACHIEVEMENT_TITLES, rnd);
    params.title = lang === 'tr' ? title.tr : title.en;
  }

  return {
    templateKey,
    params,
    lang,
    authorUid: AUTO_AUTHOR_UID,
    dayKey,
    createdAtMs: slot.at,
    status: 'visible',
    reactionCounts: {},
    reportCount: 0,
    source: 'auto',
    slotId: slot.id,
  };
}
