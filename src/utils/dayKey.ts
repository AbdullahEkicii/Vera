/**
 * `YYYY-MM-DD` for a date in the device's local zone. Community posts store this as `dayKey`,
 * so "today" and "last 7 days" are equality checks on a string instead of timestamp ranges.
 */
export const localDayKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Day keys for the last `days` local days, today first. */
export const recentDayKeys = (days: number, now: Date = new Date()): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(localDayKey(d));
  }
  return keys;
};
