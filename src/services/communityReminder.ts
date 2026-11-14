import notifee, { AndroidImportance } from '@notifee/react-native';
import i18n from '../localization/i18n';
import { parseClock, toLocalIsoDay } from '../utils/zonedTime';
import { getWarningChannelId } from './notificationService';
import { AppStorage } from './storageService';
import { DAY_MS, markTourShown, shouldShowTour } from './tourService';

// Invites a user who prayed today to share with the community. It only ever reflects the user's own
// logged prayers: no other person is mentioned, and nothing is sent to anyone else.
const PRAYER_LOGS_KEY = 'USER_PRAYER_LOGS_V1';
const REMINDER_TOUR_KEY = 'COMMUNITY_REMINDER_TOUR_V1';
const REMINDER_EVERY_MS = 2.5 * DAY_MS; // every two to three days
const REMINDER_MAX = 10; // about twenty days in total, then it stops
const AFTER_ISHA_MINUTES = 30;
const PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/**
 * Shows the share reminder once the user has logged at least one prayer today and Isha plus half an hour has passed.
 * Called each time the home screen has prayer times; the cadence keeps it from repeating.
 */
export async function maybeSendCommunityReminder(ishaTime: string | undefined, now: Date = new Date()): Promise<void> {
  const clock = parseClock(ishaTime);
  if (!clock) return;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < clock[0] * 60 + clock[1] + AFTER_ISHA_MINUTES) return;

  const raw = await AppStorage.getItem(PRAYER_LOGS_KEY);
  const logs: Record<string, Partial<Record<(typeof PRAYER_IDS)[number], boolean>>> = raw ? JSON.parse(raw) : {};
  const log = logs[toLocalIsoDay(now)];
  if (!log) return;
  const done = PRAYER_IDS.filter((id) => log[id]).length;
  if (done === 0) return;

  const due = await shouldShowTour(REMINDER_TOUR_KEY, now.getTime(), { every: REMINDER_EVERY_MS, max: REMINDER_MAX });
  if (!due) return;
  await markTourShown(REMINDER_TOUR_KEY, now.getTime());

  const allFive = done === PRAYER_IDS.length;
  const title = i18n.t('community.reminder.title', { defaultValue: 'Share today’s worship' });
  const body = allFive
    ? i18n.t('community.reminder.bodyAll', { defaultValue: 'You completed all five prayers today. Want to share with the community?' })
    : i18n.t('community.reminder.body', { defaultValue: 'Want to share today’s worship with the community?' });

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: getWarningChannelId(),
      smallIcon: 'notification_icon',
      color: '#D4AF37',
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default' },
    },
    // The app opens the Ummah tab for this type (see _layout.tsx).
    data: { type: 'community_reminder' },
  });
}
