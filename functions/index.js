// Scheduled publisher for the community feed. Writes automatic posts into the same `posts`
// collection the app reads, so they appear in the same feed as user posts, then (on the notify
// cadence) sends one push per language topic announcing that a post was shared.
// Admin SDK writes bypass firestore.rules, which only constrain client writes.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import {
  AUTO_AUTHOR_UID,
  buildAutoPost,
  buildDayPlan,
  dueSlots,
  publisherDayKey,
} from './autoPublishCore.js';
import { buildArchiveDoc, formatFeedbackNotice } from './feedbackCore.js';
import {
  NOTIFY_LANGUAGES,
  buildNotifyMessage,
  nextNotifyDelayMs,
  pickNotifiedPost,
  shouldNotifyNow,
} from './notifyCore.js';

initializeApp();

const PLAN_COLLECTION = 'autoPublishPlans';
const NOTIFY_STATE_REF = ['autoPublishState', 'notifications'];
const MAX_PENDING_TEMPLATES = 20;

export const publishCommunityAutoPosts = onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'Europe/Istanbul', region: 'europe-west1' },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const dayKey = publisherDayKey(now);
    const planRef = db.collection(PLAN_COLLECTION).doc(dayKey);

    let planSnap = await planRef.get();
    if (!planSnap.exists) {
      // create() fails if another run created the plan first; then read theirs.
      try {
        await planRef.create(buildDayPlan(dayKey, Math.random));
      } catch {
        // Already created by a concurrent run.
      }
      planSnap = await planRef.get();
    }
    const plan = planSnap.data();

    const todays = await db
      .collection('posts')
      .where('dayKey', '==', dayKey)
      .where('status', '==', 'visible')
      .get();
    const realPostTimes = todays.docs
      .filter((doc) => doc.get('authorUid') !== AUTO_AUTHOR_UID)
      .map((doc) => doc.get('createdAt'))
      .filter((ts) => ts instanceof Timestamp)
      .map((ts) => ts.toMillis());

    const slots = dueSlots({ plan, realPostTimes, now });
    const published = slots.map((slot) => buildAutoPost(slot, dayKey, Math.random));

    if (published.length > 0) {
      const batch = db.batch();
      for (const post of published) {
        const { createdAtMs, ...fields } = post;
        batch.set(db.collection('posts').doc(), {
          ...fields,
          createdAt: Timestamp.fromMillis(createdAtMs),
        });
      }
      batch.update(planRef, {
        publishedSlots: FieldValue.arrayUnion(...slots.map((slot) => slot.id)),
      });
      await batch.commit();
    }

    await claimAndSendNotification(db, published.map((post) => post.templateKey), now);
  }
);

/**
 * Remembers new posts as pending, then, if the cadence allows, claims one notification and sends it.
 * The claim is a transaction, so two runs cannot both send the same notification.
 */
async function claimAndSendNotification(db, newTemplates, now) {
  const stateRef = db.collection(NOTIFY_STATE_REF[0]).doc(NOTIFY_STATE_REF[1]);

  const templateKey = await db.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef);
    const state = snap.exists
      ? snap.data()
      : { sentCount: 0, nextAllowedMs: 0, pendingTemplates: [] };
    const pending = [...(state.pendingTemplates ?? []), ...newTemplates].slice(-MAX_PENDING_TEMPLATES);

    if (pending.length === 0 || !shouldNotifyNow({ state, now })) {
      if (newTemplates.length > 0) tx.set(stateRef, { ...state, pendingTemplates: pending }, { merge: true });
      return null;
    }

    const chosen = pickNotifiedPost(pending, Math.random);
    const sentCount = state.sentCount ?? 0;
    tx.set(
      stateRef,
      {
        sentCount: sentCount + 1,
        nextAllowedMs: now + nextNotifyDelayMs(sentCount, Math.random),
        lastSentMs: now,
        pendingTemplates: [],
      },
      { merge: true }
    );
    return chosen;
  });

  if (!templateKey) return;

  const messaging = getMessaging();
  const response = await messaging.sendEach(
    NOTIFY_LANGUAGES.map((lang) => buildNotifyMessage(lang, templateKey))
  );
  if (response.failureCount > 0) {
    console.warn('[auto-publish] notification failures:', response.failureCount);
  }
}

/**
 * Every new `app_feedback` document is (1) copied to `app_feedback_archive` so a stray console
 * delete cannot lose it, (2) written to Cloud Logging, and (3) pushed to the developer's Telegram
 * chat when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set (functions/.env, never committed).
 * Firestore is in eur3, so the trigger runs in europe-west1.
 */
export const relayAppFeedback = onDocumentCreated(
  { document: 'app_feedback/{feedbackId}', region: 'europe-west1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.feedbackId;

    try {
      // create() fails on a re-delivered event, so the archive copy keeps its first archivedAt.
      await getFirestore().collection('app_feedback_archive').doc(id).create(buildArchiveDoc(id, data));
    } catch (error) {
      if (error?.code !== 6) logger.error('feedback archive failed', { id, error: String(error) });
    }

    logger.info('app feedback', {
      id,
      platform: data.platform,
      appVersion: data.appVersion,
      language: data.language,
      message: data.message,
      diag: data.diag,
    });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: formatFeedbackNotice(id, data) }),
      });
      if (!res.ok) logger.warn('feedback telegram notice failed', { id, status: res.status });
    } catch (error) {
      logger.warn('feedback telegram notice failed', { id, error: String(error) });
    }
  }
);
