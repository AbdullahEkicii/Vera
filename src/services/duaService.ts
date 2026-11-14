import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from '@react-native-firebase/firestore';
import {
  canAmen,
  computeDuaExpiresAtMs,
  DuaCategory,
  isDuaActive,
  isDuaCategory,
} from '../utils/duaRules';
import { AppStorage } from './storageService';
import { ensureSignedIn } from './communityService';

export { DUA_CATEGORIES } from '../utils/duaRules';
export type { DuaCategory } from '../utils/duaRules';

const LIST_LIMIT = 30;
const HIDDEN_KEY = 'DUA_HIDDEN_V1';
const HIDDEN_MAX = 200;
const REPORT_REASON_MAX = 40;
// Sign-in can hang with no feedback when offline. Fail explicitly instead of spinning forever.
const AUTH_TIMEOUT_MS = 8000;

export type DuaFailure = 'auth' | 'offline' | 'denied' | 'invalid' | 'unknown';

export class DuaError extends Error {
  readonly reason: DuaFailure;
  constructor(reason: DuaFailure) {
    super(`dua request failed: ${reason}`);
    this.name = 'DuaError';
    this.reason = reason;
  }
}

export interface DuaRequest {
  id: string;
  category: DuaCategory;
  authorUid: string;
  createdAt: Date;
  amenCount: number;
  isMine: boolean;
  amened: boolean;
}

function classifyDuaError(error: unknown): DuaFailure {
  if (error instanceof DuaError) return error.reason;
  const code = String((error as { code?: unknown })?.code ?? '');
  if (code.startsWith('auth/')) return 'auth';
  if (code.includes('permission-denied')) return 'denied';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'offline';
  return 'unknown';
}

async function signedInUid(): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      ensureSignedIn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DuaError('auth')), AUTH_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    const reason = classifyDuaError(error);
    throw new DuaError(reason === 'unknown' ? 'auth' : reason);
  } finally {
    clearTimeout(timer);
  }
}

function toDuaRequest(id: string, data: Record<string, any>, uid: string, amenedIds: Set<string>): DuaRequest | null {
  if (!isDuaCategory(data.category)) return null;
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0);
  const authorUid = String(data.authorUid ?? '');
  return {
    id,
    category: data.category,
    authorUid,
    createdAt,
    amenCount: Number(data.amenCount) || 0,
    isMine: authorUid === uid,
    amened: amenedIds.has(id),
  };
}

/** Ids of the requests this user has already amined. A failed read only hides the amened state. */
async function loadMyAmenedIds(uid: string): Promise<Set<string>> {
  try {
    const snapshot = await getDocs(
      query(collectionGroup(getFirestore(), 'amens'), where('uid', '==', uid), limit(500))
    );
    const ids = snapshot.docs
      .map((d) => d.ref.parent.parent?.id)
      .filter((id): id is string => typeof id === 'string');
    return new Set(ids);
  } catch {
    return new Set();
  }
}

/** Writes one request. The category is the only input: there is no free text. */
export async function createDuaRequest(category: string): Promise<string> {
  if (!isDuaCategory(category)) throw new DuaError('invalid');
  const uid = await signedInUid();
  const expiresAt = Timestamp.fromMillis(computeDuaExpiresAtMs(Date.now()));
  try {
    const ref = await addDoc(collection(getFirestore(), 'duaRequests'), {
      category,
      authorUid: uid,
      createdAt: serverTimestamp(),
      expiresAt,
      amenCount: 0,
      status: 'visible',
    });
    return ref.id;
  } catch (error) {
    throw new DuaError(classifyDuaError(error));
  }
}

/** Visible requests that have not expired, newest first. */
export async function listActiveDuaRequests(): Promise<DuaRequest[]> {
  const uid = await signedInUid();
  const db = getFirestore();
  try {
    const [snapshot, amenedIds] = await Promise.all([
      getDocs(
        query(
          collection(db, 'duaRequests'),
          where('status', '==', 'visible'),
          where('expiresAt', '>', Timestamp.fromMillis(Date.now())),
          orderBy('expiresAt', 'desc'),
          limit(LIST_LIMIT)
        )
      ),
      loadMyAmenedIds(uid),
    ]);
    const requests: DuaRequest[] = [];
    for (const d of snapshot.docs) {
      const request = toDuaRequest(d.id, d.data(), uid, amenedIds);
      if (request) requests.push(request);
    }
    return requests;
  } catch (error) {
    throw new DuaError(classifyDuaError(error));
  }
}

/**
 * Adds the user's amin. Returns false when this user already amined the request.
 * The amen doc and the counter change in one transaction; the amen doc id is the uid, so a second amin cannot land.
 */
export async function addAmen(requestId: string): Promise<boolean> {
  const uid = await signedInUid();
  const db = getFirestore();
  const requestRef = doc(db, 'duaRequests', requestId);
  const amenRef = doc(db, 'duaRequests', requestId, 'amens', uid);

  try {
    return await runTransaction(db, async (tx) => {
      const amenSnap = await tx.get(amenRef);
      if (amenSnap.exists()) return false;

      const requestSnap = await tx.get(requestRef);
      const data = requestSnap.data();
      if (!requestSnap.exists() || !data) throw new DuaError('invalid');
      const expiresAtMs = data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
      if (!isDuaActive(expiresAtMs, Date.now())) throw new DuaError('invalid');
      if (!canAmen(String(data.authorUid ?? ''), uid, false)) throw new DuaError('invalid');

      tx.set(amenRef, { uid, createdAt: serverTimestamp() });
      tx.update(requestRef, { amenCount: (Number(data.amenCount) || 0) + 1 });
      return true;
    });
  } catch (error) {
    throw new DuaError(classifyDuaError(error));
  }
}

/** Reports a request through the shared reports collection, with postId `dua:<id>`. */
export async function reportDuaRequest(requestId: string, reason: string): Promise<void> {
  if (!reason || reason.length > REPORT_REASON_MAX) throw new DuaError('invalid');
  const uid = await signedInUid();
  try {
    await addDoc(collection(getFirestore(), 'reports'), {
      postId: `dua:${requestId}`,
      reason,
      reporterUid: uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw new DuaError(classifyDuaError(error));
  }
}

/** Ids reported on this device. Kept locally so a reported request stays hidden after a restart. */
export async function loadHiddenDuaIds(): Promise<string[]> {
  try {
    const raw = await AppStorage.getItem(HIDDEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function hideDuaRequest(requestId: string): Promise<string[]> {
  const current = await loadHiddenDuaIds();
  const next = [requestId, ...current.filter((id) => id !== requestId)].slice(0, HIDDEN_MAX);
  try {
    await AppStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  } catch {
    // The hide still applies for this session through the caller's state.
  }
  return next;
}
