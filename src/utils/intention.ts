// Pure rules for the weekly intention (niyet). No React, storage or notification imports, so these run
// under node --test. The intention is a short line the user writes for the week. It stays on the device.

export const INTENTION_MAX_LENGTH = 140;

/**
 * Id of the weekly reminder notification. Kept here so screens that read scheduled notifications (the
 * notification health card) can tell it apart from prayer alerts and not report it as the next alarm.
 */
export const INTENTION_REMINDER_ID = 'weekly_intention';

/** Trims, collapses whitespace and caps the length. Empty input returns an empty string. */
export const sanitizeIntention = (text: string): string =>
  (text ?? '').replace(/\s+/g, ' ').trim().slice(0, INTENTION_MAX_LENGTH);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local date key (YYYY-MM-DD) of the Monday that starts the week containing `date`. */
export const weekKey = (date: Date): string => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (monday.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  monday.setDate(monday.getDate() - offset);
  return `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
};

/** The next Monday at hour:minute strictly after `now`. */
export const nextMondayAt = (now: Date, hour: number, minute: number): Date => {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  const daysUntilMonday = (1 - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + daysUntilMonday);
  if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 7);
  return candidate;
};

export interface SavedIntention {
  week: string; // weekKey of the week it was written for
  text: string;
}

/** True when the saved intention was written for the week containing `now`. */
export const isIntentionCurrent = (saved: SavedIntention | null | undefined, now: Date): boolean =>
  !!saved && saved.week === weekKey(now) && saved.text.length > 0;
