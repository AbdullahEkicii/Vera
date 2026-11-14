import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import { doc, getFirestore, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { AppStorage } from './storageService';
import { getCachedPrayerTimes, getPrayerOffsets, wasLastPrayerTimesFetchEstimated } from './api';
import {
  FeedbackEntry,
  SendOutcome,
  createEntry,
  enqueue,
  flushOutbox,
  parseOutbox,
} from '../utils/feedbackOutbox';

const OUTBOX_KEY = 'FEEDBACK_OUTBOX_V1';
const SEND_TIMEOUT_MS = 10000;

let flushing: Promise<string[]> | null = null;

const loadOutbox = async (): Promise<FeedbackEntry[]> => parseOutbox(await AppStorage.getItem(OUTBOX_KEY));
const saveOutbox = (list: FeedbackEntry[]) => AppStorage.setItem(OUTBOX_KEY, JSON.stringify(list));

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('feedback-timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });

/**
 * One write per entry, keyed by the entry id: sending it again can only be refused by the rules
 * (document exists), never create a duplicate.
 */
async function sendEntry(entry: FeedbackEntry): Promise<SendOutcome> {
  try {
    await withTimeout(
      setDoc(doc(getFirestore(), 'app_feedback', entry.id), {
        message: entry.message,
        language: entry.language,
        platform: entry.platform,
        osVersion: entry.osVersion,
        appVersion: entry.appVersion,
        submissionId: entry.id,
        diag: entry.diag,
        createdAt: serverTimestamp(),
      }),
      SEND_TIMEOUT_MS,
    );
    return 'sent';
  } catch (e: any) {
    if (__DEV__) console.warn('Feedback send failed:', e?.code ?? e?.message);
    return String(e?.code ?? '').includes('permission-denied') ? 'denied' : 'unknown';
  }
}

/** What the developer needs to reproduce "my prayer times are wrong" reports. Coarse on purpose. */
async function collectDiagnostics(): Promise<Record<string, string | number | boolean>> {
  const diag: Record<string, string | number | boolean> = {};
  try {
    const cached = await getCachedPrayerTimes();
    if (cached) {
      diag.method = cached.method;
      diag.school = cached.school ?? 0;
      // One decimal is about 11 km: enough to tell cities apart, not enough to find a person.
      diag.lat = Math.round(cached.latitude * 10) / 10;
      diag.lng = Math.round(cached.longitude * 10) / 10;
      diag.cacheMonth = `${cached.year}-${cached.month}`;
    }
    const offsets = await getPrayerOffsets();
    diag.methodUserSet = (await AppStorage.getItem('PRAYER_METHOD_USER_SET')) === 'true';
    diag.offsetsSet = Object.values(offsets).some((v) => !!v);
    diag.estimated = wasLastPrayerTimesFetchEstimated();
    diag.region = Localization.getLocales()[0]?.regionCode ?? '';
    diag.tz = Localization.getCalendars()[0]?.timeZone ?? '';
  } catch {
    // diagnostics are best effort and must never block the feedback itself
  }
  return diag;
}

export interface SubmitResult {
  id: string;
  /** True when the server confirmed it; false when it is saved on the device and will be re-sent. */
  delivered: boolean;
}

/**
 * Saves the feedback on the device first (so closing the modal or losing signal cannot lose it),
 * then tries to deliver it right away.
 */
export async function submitFeedback(message: string, language: string, source = 'settings'): Promise<SubmitResult> {
  const entry = createEntry({
    message,
    language,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    diag: { ...(await collectDiagnostics()), source },
  });
  await saveOutbox(enqueue(await loadOutbox(), entry));
  const delivered = (await flushFeedbackOutbox()).includes(entry.id);
  return { id: entry.id, delivered };
}

/** Re-sends anything still queued. Safe to call at any time; concurrent calls share one run. */
export function flushFeedbackOutbox(): Promise<string[]> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const queued = await loadOutbox();
      if (queued.length === 0) return [];
      const { remaining, sent } = await flushOutbox(queued, sendEntry);
      // Re-read: feedback queued while this flush was in flight must not be overwritten.
      const latest = await loadOutbox();
      const flushedIds = new Set(queued.map((e) => e.id));
      const merged = [...remaining, ...latest.filter((e) => !flushedIds.has(e.id))];
      await saveOutbox(merged);
      return sent;
    } catch {
      return [];
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}
