// Pure Ramadan helpers: where today sits relative to the Ramadan the Hijri calendar returned.
// No React or network imports, so these run under node --test.

export type RamadanPhase =
  | { kind: 'before'; daysLeft: number }
  | { kind: 'during'; day: number; total: number }
  | { kind: 'after' };

/** Parses the API's "DD-MM-YYYY" into a local midnight Date. Returns null for anything else. */
export const parseDdMmYyyy = (value: string | undefined | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(date.getTime()) ? null : date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Whole calendar days from `from` to `to` (both local midnight). Negative when `to` is earlier. */
export const calendarDaysBetween = (from: Date, to: Date): number =>
  Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS);

/**
 * `start` is the first fasting day. `total` is the number of days in the month (29 or 30). Days before
 * `start` count down; the month itself counts up as "day N of total".
 */
export const ramadanPhase = (today: Date, start: Date, total: number): RamadanPhase => {
  const offset = calendarDaysBetween(start, today);
  if (offset < 0) return { kind: 'before', daysLeft: -offset };
  if (offset < total) return { kind: 'during', day: offset + 1, total };
  return { kind: 'after' };
};

/** Stable index for "today's" item, so a rotating tip changes once per local day. */
export const pickDailyIndex = (today: Date, count: number): number => {
  if (count <= 0) return 0;
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = calendarDaysBetween(startOfYear, today);
  return ((dayOfYear % count) + count) % count;
};
