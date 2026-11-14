import { getAuth, signInAnonymously } from '@react-native-firebase/auth';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
} from '@react-native-firebase/firestore';
import i18n from '../localization/i18n';
import { localDayKey } from '../utils/dayKey';
import { AppStorage } from './storageService';
import {
  CommunityEmoji,
  CommunityPostParams,
  CommunityTemplateKey,
  isValidPostPayload,
  reactionDocId,
  regionFromLocale,
} from '../utils/community';

const SETTINGS_KEY = 'COMMUNITY_SETTINGS_V1';
const PAGE_SIZE = 20;

export interface CommunitySettings {
  participate: boolean;
  showCountry: boolean;
  // ISO 3166-1 alpha-2. Null means "use the device region".
  countryOverride: string | null;
  // Authors the user blocked; their posts are hidden on this device only.
  blockedUids: string[];
}

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  participate: true,
  showCountry: true,
  countryOverride: null,
  blockedUids: [],
};

export interface CommunityPost {
  id: string;
  templateKey: CommunityTemplateKey;
  params: CommunityPostParams;
  lang: string;
  authorUid: string;
  createdAt: Date;
  reactionCounts: Partial<Record<CommunityEmoji, number>>;
}

export async function loadCommunitySettings(): Promise<CommunitySettings> {
  try {
    const raw = await AppStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_COMMUNITY_SETTINGS, ...JSON.parse(raw) } : DEFAULT_COMMUNITY_SETTINGS;
  } catch {
    return DEFAULT_COMMUNITY_SETTINGS;
  }
}

export async function saveCommunitySettings(next: CommunitySettings): Promise<void> {
  await AppStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

/** Region the post is shown with: the user's override, else the device locale. */
export function resolveCountry(settings: CommunitySettings): string | null {
  if (!settings.showCountry) return null;
  if (settings.countryOverride) return settings.countryOverride;
  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  return regionFromLocale(deviceLocale);
}

export async function ensureSignedIn(): Promise<string> {
  const auth = getAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

// Feed screens subscribe here so a fresh post shows up at once, without waiting for the poll.
const postedListeners = new Set<() => void>();

export function onCommunityPosted(listener: () => void): () => void {
  postedListeners.add(listener);
  return () => {
    postedListeners.delete(listener);
  };
}

export type CommunityPostFailure = 'auth' | 'offline' | 'denied' | 'invalid' | 'unknown';

export class CommunityPostError extends Error {
  readonly reason: CommunityPostFailure;
  constructor(reason: CommunityPostFailure) {
    super(`community post failed: ${reason}`);
    this.name = 'CommunityPostError';
    this.reason = reason;
  }
}

// Sign-in is the only step that can hang with no feedback. A quick, explicit failure beats a spinner.
const AUTH_TIMEOUT_MS = 8000;

function classifyPostError(error: unknown): CommunityPostFailure {
  if (error instanceof CommunityPostError) return error.reason;
  const code = String((error as { code?: unknown })?.code ?? '');
  if (code.startsWith('auth/')) return 'auth';
  if (code.includes('permission-denied')) return 'denied';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'offline';
  return 'unknown';
}

function failAfter<T>(promise: Promise<T>, ms: number, reason: CommunityPostFailure): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new CommunityPostError(reason)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Writes one post. Throws CommunityPostError with a reason the sheet can show.
 * The write itself has no client timeout: Firestore keeps the write queued while offline and resolves once
 * the server has it, so the caller decides how long to wait and can retry against the same pending write.
 */
export async function createPost(templateKey: CommunityTemplateKey, params: CommunityPostParams): Promise<string> {
  if (!isValidPostPayload(templateKey, params)) {
    throw new CommunityPostError('invalid');
  }
  let uid: string;
  try {
    uid = await failAfter(ensureSignedIn(), AUTH_TIMEOUT_MS, 'auth');
  } catch (error) {
    throw new CommunityPostError(classifyPostError(error));
  }
  const db = getFirestore();
  const lang = (i18n.language || 'en').split('-')[0];
  try {
    const ref = await addDoc(collection(db, 'posts'), {
      templateKey,
      params,
      lang,
      authorUid: uid,
      dayKey: localDayKey(),
      createdAt: serverTimestamp(),
      status: 'visible',
      reactionCounts: {},
      reportCount: 0,
    });
    postedListeners.forEach((listener) => listener());
    return ref.id;
  } catch (error) {
    throw new CommunityPostError(classifyPostError(error));
  }
}

function toPost(id: string, data: Record<string, any>): CommunityPost {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0);
  return {
    id,
    templateKey: data.templateKey,
    params: data.params ?? {},
    lang: data.lang ?? 'en',
    authorUid: data.authorUid,
    createdAt,
    reactionCounts: data.reactionCounts ?? {},
  };
}

/**
 * Visible posts whose `dayKey` is one of `dayKeys`, newest first, one page at a time.
 * Pass the last post as `cursor` to load the next page.
 */
export async function listPosts(dayKeys: string[], cursor: CommunityPost | null = null): Promise<CommunityPost[]> {
  const db = getFirestore();
  const constraints = [
    where('status', '==', 'visible'),
    where('dayKey', 'in', dayKeys),
    orderBy('createdAt', 'desc'),
  ] as const;
  const q = cursor
    ? query(collection(db, 'posts'), ...constraints, startAfter(Timestamp.fromDate(cursor.createdAt)), limit(PAGE_SIZE))
    : query(collection(db, 'posts'), ...constraints, limit(PAGE_SIZE));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toPost(d.id, d.data()));
}

/** The signed-in user's own visible posts, newest first (for the "my posts" list in settings). */
export async function listMyPosts(uid: string): Promise<CommunityPost[]> {
  const db = getFirestore();
  const snapshot = await getDocs(
    query(
      collection(db, 'posts'),
      where('authorUid', '==', uid),
      where('status', '==', 'visible'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  );
  return snapshot.docs.map((d) => toPost(d.id, d.data()));
}

/** Emojis the signed-in user has already used on these posts, as "postId:emoji" keys. */
export async function loadMyReactions(uid: string): Promise<Set<string>> {
  const db = getFirestore();
  const snapshot = await getDocs(query(collectionGroup(db, 'reactions'), where('uid', '==', uid), limit(500)));
  return new Set(snapshot.docs.map((d) => `${d.get('postId')}:${d.get('emoji')}`));
}

/**
 * Adds the user's reaction, or removes it if it is already there.
 * The reaction doc and the post's counter change in one transaction, so the count stays in step.
 */
export async function toggleReaction(postId: string, emoji: CommunityEmoji): Promise<boolean> {
  const uid = await ensureSignedIn();
  const db = getFirestore();
  const postRef = doc(db, 'posts', postId);
  const reactionRef = doc(db, 'posts', postId, 'reactions', reactionDocId(uid, emoji));

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(reactionRef);
    const postSnap = await tx.get(postRef);
    const counts = { ...(postSnap.get('reactionCounts') ?? {}) };
    const current = counts[emoji] ?? 0;

    if (existing.exists()) {
      tx.delete(reactionRef);
      counts[emoji] = Math.max(0, current - 1);
      tx.update(postRef, { reactionCounts: counts });
      return false;
    }

    tx.set(reactionRef, { uid, postId, emoji, createdAt: serverTimestamp() });
    counts[emoji] = current + 1;
    tx.update(postRef, { reactionCounts: counts });
    return true;
  });
}

export async function reportPost(postId: string, reason: string): Promise<void> {
  const uid = await ensureSignedIn();
  await addDoc(collection(getFirestore(), 'reports'), {
    postId,
    reason,
    reporterUid: uid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteOwnPost(postId: string): Promise<void> {
  await deleteDoc(doc(getFirestore(), 'posts', postId));
}
