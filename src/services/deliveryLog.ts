import { AppStorage } from './storageService';

/**
 * Adhan delivery log: which adhan alerts were scheduled and which the OS reported as shown.
 * Used by the Notification Health card and as an analytics user property, so "the adhan did
 * not ring" is something we can see instead of only hearing about it in reviews.
 *
 * "Delivered" comes from notifee DELIVERED/PRESS events. Android does not always run the JS
 * handler for a delivered trigger, so a miss here means "no confirmation", not proof of failure:
 * callers treat low rates as a hint and need a minimum sample before saying anything.
 */

const SCHEDULED_KEY = 'ALERT_SCHEDULED_LOG_V1';
const DELIVERED_KEY = 'ALERT_DELIVERED_LOG_V1';
const KEEP_MS = 10 * 24 * 60 * 60 * 1000;
const MATCH_WINDOW_MS = 10 * 60 * 1000;

const readList = async (key: string): Promise<number[]> => {
  try {
    const raw = await AppStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
};

const writeList = async (key: string, list: number[]) => {
  try {
    await AppStorage.setItem(key, JSON.stringify(list));
  } catch {}
};

/** Remember the adhan alarm times just scheduled (past ones are kept for the stats window). */
export const recordScheduledAlerts = async (timestamps: number[]) => {
  const cutoff = Date.now() - KEEP_MS;
  // Alarms still in the future were just replaced by this schedule, so only past ones carry over.
  const existing = (await readList(SCHEDULED_KEY)).filter((t) => t >= cutoff && t <= Date.now());
  const merged = Array.from(new Set([...existing, ...timestamps])).sort((a, b) => a - b);
  await writeList(SCHEDULED_KEY, merged.slice(-400));
};

/** Called from the notifee foreground/background handlers when an adhan alert is shown or tapped. */
export const recordDeliveredAlert = async (scheduledTimestamp: number | undefined) => {
  const at = Number.isFinite(scheduledTimestamp as number) && scheduledTimestamp ? (scheduledTimestamp as number) : Date.now();
  const cutoff = Date.now() - KEEP_MS;
  const list = (await readList(DELIVERED_KEY)).filter((t) => t >= cutoff);
  list.push(at);
  await writeList(DELIVERED_KEY, Array.from(new Set(list)).sort((a, b) => a - b).slice(-400));
};

export interface DeliveryStats {
  /** Alerts that were due in the window (their time has passed). */
  due: number;
  /** Of those, how many were confirmed shown. */
  confirmed: number;
}

export const getDeliveryStats = async (windowDays = 7): Promise<DeliveryStats> => {
  const now = Date.now();
  const from = now - windowDays * 24 * 60 * 60 * 1000;
  const scheduled = (await readList(SCHEDULED_KEY)).filter((t) => t >= from && t <= now - MATCH_WINDOW_MS);
  const delivered = await readList(DELIVERED_KEY);
  const confirmed = scheduled.filter((t) => delivered.some((d) => Math.abs(d - t) <= MATCH_WINDOW_MS)).length;
  return { due: scheduled.length, confirmed };
};
