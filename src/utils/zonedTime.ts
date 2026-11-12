// Wall-clock <-> absolute-time conversion for a given IANA time zone.
//
// Aladhan returns prayer times as "HH:mm" in the *city's* time zone (day.meta.timezone). Turning
// those into Dates with `setHours` interprets them in the *device* zone, which is wrong whenever
// the user follows a city in another zone or is travelling. Everything that needs an absolute
// moment (alarms, countdowns, widget) must go through these helpers.

export const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerOrderKey = typeof PRAYER_ORDER[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export const getDeviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export interface ZonedParts {
  y: number;
  mo: number; // 1-12
  d: number;
  h: number;
  mi: number;
  s: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
};

/** Wall-clock parts of an absolute instant in `timeZone`. Throws on an invalid zone id. */
export const getZonedParts = (epochMs: number, timeZone: string): ZonedParts => {
  const out: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(new Date(epochMs))) {
    if (part.type !== 'literal') out[part.type] = parseInt(part.value, 10);
  }
  return {
    y: out.year,
    mo: out.month,
    d: out.day,
    h: out.hour === 24 ? 0 : out.hour, // some engines print midnight as 24
    mi: out.minute,
    s: out.second,
  };
};

const zoneOffsetMs = (epochMs: number, timeZone: string): number => {
  const p = getZonedParts(epochMs, timeZone);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
};

/**
 * Absolute time of a wall-clock moment in `timeZone`. `mo` is 1-12. Falls back to the device
 * zone if the zone id is unknown to the runtime.
 */
export const zonedWallTimeToEpoch = (
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  timeZone: string
): number => {
  try {
    const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    // Two passes settle the offset across a DST change.
    const first = guess - zoneOffsetMs(guess, timeZone);
    return guess - zoneOffsetMs(first, timeZone);
  } catch {
    return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
  }
};

/** Calendar date (y, mo 1-12, d) of an instant in `timeZone`. */
export const getZonedDate = (epochMs: number, timeZone: string): { y: number; mo: number; d: number } => {
  try {
    const p = getZonedParts(epochMs, timeZone);
    return { y: p.y, mo: p.mo, d: p.d };
  } catch {
    const dt = new Date(epochMs);
    return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
  }
};

/** The calendar day after (y, mo, d). */
export const addCalendarDays = (
  date: { y: number; mo: number; d: number },
  days: number
): { y: number; mo: number; d: number } => {
  const t = new Date(Date.UTC(date.y, date.mo - 1, date.d + days));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
};

/** "HH:mm" or "HH:mm (EEST)" -> [h, m], or null when malformed. */
export const parseClock = (value?: string | null): [number, number] | null => {
  if (!value) return null;
  const [hs, ms] = value.split(' ')[0].split(':');
  const h = parseInt(hs, 10);
  const m = parseInt(ms, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return [h, m];
};

/** `YYYY-MM-DD` of an instant in the device's local zone (not UTC, which flips near midnight). */
export const toLocalIsoDay = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Absolute times of one day's prayers, in the order fajr..isha. A prayer that comes out earlier
 * than the previous one (Isha after midnight at high latitudes, or an offset that crosses
 * midnight) belongs to the next calendar day.
 */
export const computeDayEpochs = (
  times: Partial<Record<PrayerOrderKey, string>>,
  date: { y: number; mo: number; d: number },
  timeZone: string
): Record<PrayerOrderKey, number> => {
  const result = {} as Record<PrayerOrderKey, number>;
  let previous = -Infinity;
  for (const key of PRAYER_ORDER) {
    const clock = parseClock(times[key]);
    if (!clock) {
      result[key] = NaN;
      continue;
    }
    let ms = zonedWallTimeToEpoch(date.y, date.mo, date.d, clock[0], clock[1], timeZone);
    while (Number.isFinite(previous) && ms < previous) ms += DAY_MS;
    result[key] = ms;
    previous = ms;
  }
  return result;
};
