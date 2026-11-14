// Pure rules for the shared hatim ring (30 cüz that the community takes on together).
// No Firebase imports here, so these run under node --test.

export const HATIM_RING_ID = 'ramazan-1448';
export const RING_PART_COUNT = 30;

export type RingPartStatus = 'open' | 'claimed' | 'done';

export interface RingPart {
  juz: number; // 1 - 30
  status: RingPartStatus;
  claimedBy: string | null;
}

export interface RingSummary {
  doneCount: number;
  claimedCount: number;
  openCount: number;
  /** The cüz this user has claimed and not finished, if any. */
  mine: number | null;
  /** The cüz this user has finished, counted in the total, not as an active claim. */
  mineDone: number[];
  complete: boolean;
}

export const isValidJuz = (juz: number): boolean => Number.isInteger(juz) && juz >= 1 && juz <= RING_PART_COUNT;

/** Document id for a cüz: zero-padded so the parts sort in reading order. */
export const ringPartDocId = (juz: number): string => {
  if (!isValidJuz(juz)) throw new Error(`invalid juz: ${juz}`);
  return String(juz).padStart(2, '0');
};

/** Counts the ring from the parts that were read, for one viewer. Missing parts count as open. */
export const summarizeRing = (parts: RingPart[], uid: string | null): RingSummary => {
  let doneCount = 0;
  let claimedCount = 0;
  let mine: number | null = null;
  const mineDone: number[] = [];
  const seen = new Set<number>();

  for (const part of parts) {
    if (!isValidJuz(part.juz) || seen.has(part.juz)) continue;
    seen.add(part.juz);
    if (part.status === 'done') {
      doneCount += 1;
      if (uid && part.claimedBy === uid) mineDone.push(part.juz);
    } else if (part.status === 'claimed') {
      claimedCount += 1;
      if (uid && part.claimedBy === uid) mine = part.juz;
    }
  }

  return {
    doneCount,
    claimedCount,
    openCount: RING_PART_COUNT - doneCount - claimedCount,
    mine,
    mineDone: mineDone.sort((a, b) => a - b),
    complete: doneCount === RING_PART_COUNT,
  };
};

export type RingAction = 'claim' | 'finish' | 'release';

/**
 * What the viewer may do with a cüz. One active claim per viewer: a second claim is refused until the
 * first is finished or released. Only the claimant can finish or release.
 */
export const allowedRingActions = (part: RingPart | undefined, uid: string | null, mine: number | null): RingAction[] => {
  if (!uid) return [];
  const status = part?.status ?? 'open';
  if (status === 'open') return mine === null ? ['claim'] : [];
  if (status === 'claimed' && part?.claimedBy === uid) return ['finish', 'release'];
  return [];
};
