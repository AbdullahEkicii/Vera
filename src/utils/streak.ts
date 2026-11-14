// Same key format as `toLocalIsoDay` in zonedTime.ts, kept local so this module loads under node --test.
const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * How many of the last `windowDays` days (today included) had at least one prayer logged.
 * Unlike a streak, a missed day does not reset this count, so it can show progress after a break.
 */
export function countActiveDaysInWindow(
  allLogs: Record<string, object>,
  windowDays: number,
  today: Date = new Date()
): number {
  let active = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayLog = allLogs[localDayKey(d)];
    if (dayLog && Object.entries(dayLog).some(([key, done]) => key !== 'date' && done === true)) {
      active++;
    }
  }
  return active;
}
