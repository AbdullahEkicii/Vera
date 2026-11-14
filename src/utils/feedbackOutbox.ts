// Pure core of the feedback outbox (no React Native imports, so it runs under `node --test`).
//
// Why this exists: a Firestore write made while the connection is flaky does not settle, so the
// old modal sat on its spinner, the user closed it and typed the message again, and two copies of
// the same feedback arrived. Every submission now gets one stable id (the Firestore document id),
// is saved on the device first, and is re-sent until the server has it. Sending the same id twice
// can never create a second document.

export type DiagValue = string | number | boolean;

export interface FeedbackEntry {
  /** Stable id; also the Firestore document id, which is what makes retries idempotent. */
  id: string;
  message: string;
  language: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  diag: Record<string, DiagValue>;
  queuedAt: number;
  /** Send attempts so far. */
  attempts: number;
  /** An attempt ended without a verdict (timeout, offline): the write may already have landed. */
  maybeDelivered: boolean;
}

export const MAX_MESSAGE_LENGTH = 2000;
export const OUTBOX_MAX = 20;
/** Entries the server keeps refusing are dropped after this long. */
export const OUTBOX_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const DIAG_MAX_KEYS = 12;
const DIAG_MAX_STRING = 40;

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** `fb_<time base36>_<12 random chars>`; satisfies the rules' id pattern `[A-Za-z0-9_-]{8,64}`. */
export function newFeedbackId(now: number = Date.now(), random: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 12; i += 1) suffix += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
  return `fb_${now.toString(36)}_${suffix}`;
}

/** Keeps diagnostics small and primitive so they always pass the Firestore rules. */
export function sanitizeDiag(raw: Record<string, unknown> | undefined): Record<string, DiagValue> {
  const out: Record<string, DiagValue> = {};
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= DIAG_MAX_KEYS) break;
    if (!/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(key)) continue;
    if (typeof value === 'string') out[key] = value.slice(0, DIAG_MAX_STRING);
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'boolean') out[key] = value;
  }
  return out;
}

export function createEntry(
  input: {
    message: string;
    language: string;
    platform: string;
    osVersion: string;
    appVersion: string;
    diag?: Record<string, unknown>;
  },
  now: number = Date.now(),
  random: () => number = Math.random,
): FeedbackEntry {
  return {
    id: newFeedbackId(now, random),
    message: input.message.trim().slice(0, MAX_MESSAGE_LENGTH),
    language: input.language.slice(0, 20),
    platform: input.platform.slice(0, 20),
    osVersion: input.osVersion.slice(0, 40),
    appVersion: input.appVersion.slice(0, 40),
    diag: sanitizeDiag(input.diag),
    queuedAt: now,
    attempts: 0,
    maybeDelivered: false,
  };
}

/** Adds an entry; the same id is never stored twice, and the oldest entries make room. */
export function enqueue(list: FeedbackEntry[], entry: FeedbackEntry): FeedbackEntry[] {
  const next = list.filter((e) => e.id !== entry.id);
  next.push(entry);
  return next.slice(-OUTBOX_MAX);
}

/** Reads the stored outbox defensively: a corrupt value must never block new feedback. */
export function parseOutbox(raw: string | null | undefined): FeedbackEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is FeedbackEntry =>
        !!e && typeof e.id === 'string' && typeof e.message === 'string' && e.message.length > 0,
    );
  } catch {
    return [];
  }
}

export type SendOutcome =
  /** The server confirmed the write. */
  | 'sent'
  /** Rules rejected the document. Retrying only helps once the rules change. */
  | 'denied'
  /** No verdict (offline, timeout, server error): try again later. */
  | 'unknown';

export interface FlushResult {
  remaining: FeedbackEntry[];
  sent: string[];
}

/**
 * Sends every queued entry once. `send` must resolve to an outcome and never throw.
 *
 * A `denied` outcome on an entry whose earlier attempt had no verdict means the first write did
 * land (the same id now exists and the rules forbid overwriting it), so it counts as delivered.
 * A `denied` outcome on a never-before-attempted entry is a real rejection and is kept for a
 * later retry, so feedback is not thrown away because the rules were briefly out of date.
 */
export async function flushOutbox(
  list: FeedbackEntry[],
  send: (entry: FeedbackEntry) => Promise<SendOutcome>,
  now: number = Date.now(),
): Promise<FlushResult> {
  const remaining: FeedbackEntry[] = [];
  const sent: string[] = [];
  for (const entry of list) {
    if (now - entry.queuedAt > OUTBOX_MAX_AGE_MS) continue;
    const outcome = await send(entry);
    if (outcome === 'sent' || (outcome === 'denied' && entry.maybeDelivered)) {
      sent.push(entry.id);
      continue;
    }
    remaining.push({
      ...entry,
      attempts: entry.attempts + 1,
      maybeDelivered: entry.maybeDelivered || outcome === 'unknown',
    });
  }
  return { remaining, sent };
}
