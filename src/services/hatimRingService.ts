import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { ensureSignedIn } from './communityService';
import {
  HATIM_RING_ID,
  RING_PART_COUNT,
  RingPart,
  isValidJuz,
  ringPartDocId,
} from '../utils/hatimRing';

// Shared hatim ring: hatimRings/{ringId}/parts/{01..30}. Each part is open, claimed by one anonymous
// user, or done. Progress is counted from these documents only; nothing is invented or estimated.

export type RingFailure = 'taken' | 'not_yours' | 'offline' | 'unknown';

export class RingError extends Error {
  readonly reason: RingFailure;
  constructor(reason: RingFailure) {
    super(`hatim ring failed: ${reason}`);
    this.name = 'RingError';
    this.reason = reason;
  }
}

const partRef = (juz: number) =>
  doc(getFirestore(), 'hatimRings', HATIM_RING_ID, 'parts', ringPartDocId(juz));

const classify = (error: unknown): RingFailure => {
  if (error instanceof RingError) return error.reason;
  const code = String((error as { code?: unknown })?.code ?? '');
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'offline';
  return 'unknown';
};

// Every snapshot can ask for the missing parts again, including the one caused by our own first write.
// Two loops at once would send a second set of a part that was just created; the rules treat that as an
// update and refuse it. One loop at a time avoids those refused writes.
let ensuring: Promise<void> | null = null;

/** Creates the parts that do not exist yet. Racing clients may collide; a refused create is harmless. */
const ensureMissingParts = (existing: Set<number>): Promise<void> => {
  if (ensuring) return ensuring;
  ensuring = (async () => {
    for (let juz = 1; juz <= RING_PART_COUNT; juz += 1) {
      if (existing.has(juz)) continue;
      try {
        await setDoc(partRef(juz), { juz, status: 'open', claimedBy: null, claimedAt: null, doneAt: null });
      } catch {
        // Another client created it first, or the network is down. The next snapshot shows the truth.
      }
    }
  })().finally(() => {
    ensuring = null;
  });
  return ensuring;
};

/** Live view of all 30 parts. Returns the unsubscribe function. */
export function subscribeRing(
  onParts: (parts: RingPart[]) => void,
  onError: (reason: RingFailure) => void,
): () => void {
  return onSnapshot(
    collection(getFirestore(), 'hatimRings', HATIM_RING_ID, 'parts'),
    (snapshot) => {
      const parts: RingPart[] = [];
      const existing = new Set<number>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as { juz?: unknown; status?: unknown; claimedBy?: unknown };
        const juz = Number(data.juz);
        if (!isValidJuz(juz)) continue;
        existing.add(juz);
        parts.push({
          juz,
          status: data.status === 'done' || data.status === 'claimed' ? data.status : 'open',
          claimedBy: typeof data.claimedBy === 'string' ? data.claimedBy : null,
        });
      }
      onParts(parts);
      if (existing.size < RING_PART_COUNT) void ensureMissingParts(existing);
    },
    (error) => onError(classify(error)),
  );
}

export async function claimPart(juz: number): Promise<void> {
  const uid = await ensureSignedIn();
  const ref = partRef(juz);
  try {
    await runTransaction(getFirestore(), async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.get('status') !== 'open') throw new RingError('taken');
      tx.update(ref, { status: 'claimed', claimedBy: uid, claimedAt: serverTimestamp() });
    });
  } catch (error) {
    throw error instanceof RingError ? error : new RingError(classify(error));
  }
}

export async function finishPart(juz: number): Promise<void> {
  const uid = await ensureSignedIn();
  const ref = partRef(juz);
  try {
    await runTransaction(getFirestore(), async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.get('status') !== 'claimed' || snap.get('claimedBy') !== uid) {
        throw new RingError('not_yours');
      }
      tx.update(ref, { status: 'done', doneAt: serverTimestamp() });
    });
  } catch (error) {
    throw error instanceof RingError ? error : new RingError(classify(error));
  }
}

export async function releasePart(juz: number): Promise<void> {
  const uid = await ensureSignedIn();
  const ref = partRef(juz);
  try {
    await runTransaction(getFirestore(), async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.get('status') !== 'claimed' || snap.get('claimedBy') !== uid) {
        throw new RingError('not_yours');
      }
      tx.update(ref, { status: 'open', claimedBy: null, claimedAt: null });
    });
  } catch (error) {
    throw error instanceof RingError ? error : new RingError(classify(error));
  }
}
