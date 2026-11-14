import notifee, { AndroidImportance, RepeatFrequency, TimestampTrigger, TriggerType, AuthorizationStatus } from '@notifee/react-native';
import i18n from '../localization/i18n';
import { AppStorage } from './storageService';
import { INTENTION_REMINDER_ID, SavedIntention, nextMondayAt, sanitizeIntention, weekKey } from '../utils/intention';

// The weekly intention lives only on this device. The optional reminder is a repeating local
// notification every Monday morning; it never carries anything that was sent to a server.

const INTENTION_KEY = 'WEEKLY_INTENTION_V1';
const REMINDER_KEY = 'WEEKLY_INTENTION_REMINDER_V1';
const REMINDER_ID = INTENTION_REMINDER_ID;
const REMINDER_CHANNEL = 'ezan_daily_content';
const REMINDER_HOUR = 9;

export async function loadIntention(): Promise<SavedIntention | null> {
  try {
    const raw = await AppStorage.getItem(INTENTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedIntention>;
    if (typeof parsed.week !== 'string' || typeof parsed.text !== 'string') return null;
    return { week: parsed.week, text: parsed.text };
  } catch {
    return null;
  }
}

export async function saveIntention(text: string, now: Date = new Date()): Promise<SavedIntention> {
  const saved: SavedIntention = { week: weekKey(now), text: sanitizeIntention(text) };
  await AppStorage.setItem(INTENTION_KEY, JSON.stringify(saved));
  return saved;
}

export async function clearIntention(): Promise<void> {
  await AppStorage.removeItem(INTENTION_KEY);
}

export async function isReminderOn(): Promise<boolean> {
  try {
    return (await AppStorage.getItem(REMINDER_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Turns the Monday reminder on or off. Returns false when notifications are not allowed, so the
 * caller can say so instead of showing a switch that does nothing.
 */
export async function setWeeklyReminder(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    await notifee.cancelTriggerNotification(REMINDER_ID).catch(() => {});
    await AppStorage.setItem(REMINDER_KEY, '0');
    return true;
  }

  const settings = await notifee.requestPermission().catch(() => null);
  if (!settings || settings.authorizationStatus === AuthorizationStatus.DENIED) return false;

  const isTr = i18n.language.startsWith('tr');
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextMondayAt(new Date(), REMINDER_HOUR, 0).getTime(),
    repeatFrequency: RepeatFrequency.WEEKLY,
  };

  await notifee.cancelTriggerNotification(REMINDER_ID).catch(() => {});
  await notifee.createTriggerNotification(
    {
      id: REMINDER_ID,
      title: isTr ? 'Bu haftaki niyetin' : 'Your intention for this week',
      body: isTr ? 'Yeni haftaya bir niyetle başla. Uygulamada yazabilirsin.' : 'Start the week with an intention. You can write it in the app.',
      android: {
        smallIcon: 'notification_icon',
        color: '#D4AF37',
        channelId: REMINDER_CHANNEL,
        importance: AndroidImportance.DEFAULT,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
  await AppStorage.setItem(REMINDER_KEY, '1');
  return true;
}
