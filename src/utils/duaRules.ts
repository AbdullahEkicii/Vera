// Pure rules for dua requests. No Firebase imports here, so these run under node --test.

export const DUA_CATEGORIES = ['health', 'family', 'exam', 'provision', 'guidance', 'bereavement'] as const;
export type DuaCategory = (typeof DUA_CATEGORIES)[number];

export const DUA_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function isDuaCategory(value: unknown): value is DuaCategory {
  return typeof value === 'string' && (DUA_CATEGORIES as readonly string[]).includes(value);
}

/** A request stays visible for seven days from the moment it was created. */
export function computeDuaExpiresAtMs(createdAtMs: number): number {
  return createdAtMs + DUA_LIFETIME_MS;
}

export function isDuaActive(expiresAtMs: number, nowMs: number): boolean {
  return expiresAtMs > nowMs;
}

/** Nobody can amin their own request, and each user can amin a request at most once. */
export function canAmen(authorUid: string, viewerUid: string | null | undefined, alreadyAmened: boolean): boolean {
  if (!viewerUid) return false;
  if (alreadyAmened) return false;
  return authorUid !== viewerUid;
}

export type DuaAge =
  | { unit: 'now'; count: 0 }
  | { unit: 'minutes' | 'hours' | 'days'; count: number };

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Age of a request in the largest whole unit that fits, for the "2 saat önce" line. */
export function duaAge(createdAtMs: number, nowMs: number): DuaAge {
  const elapsed = Math.max(0, nowMs - createdAtMs);
  if (elapsed < MINUTE_MS) return { unit: 'now', count: 0 };
  if (elapsed < HOUR_MS) return { unit: 'minutes', count: Math.floor(elapsed / MINUTE_MS) };
  if (elapsed < DAY_MS) return { unit: 'hours', count: Math.floor(elapsed / HOUR_MS) };
  return { unit: 'days', count: Math.floor(elapsed / DAY_MS) };
}
