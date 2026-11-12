import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import {
  getMessaging,
  registerDeviceForRemoteMessages,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
import { AppStorage as AsyncStorage } from './storageService';
import i18n from '../localization/i18n';

const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

const CAMPAIGN_CHANNEL_ID = 'ezan_campaign_notifications';

const ANNOUNCEMENTS_KEY = 'PUSH_ANNOUNCEMENTS_ENABLED';

let initialized = false;

const campaignTopics = () => {
  const baseLang = (i18n.language || 'en').split('-')[0].toLowerCase();
  return ['all_users', `lang_${baseLang}`];
};

export async function getAnnouncementsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ANNOUNCEMENTS_KEY)) !== 'false';
  } catch {
    return true;
  }
}

/** Opt in/out of campaign pushes (topic subscriptions); persisted so init respects it. */
export async function setAnnouncementsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ANNOUNCEMENTS_KEY, enabled ? 'true' : 'false');
    const messaging = getMessaging();
    for (const topic of campaignTopics()) {
      if (enabled) await subscribeToTopic(messaging, topic);
      else await unsubscribeFromTopic(messaging, topic);
    }
  } catch (e) {
    devError('[Push] Failed to update announcements preference:', e);
  }
}

/**
 * Registers this device for Firebase Cloud Messaging remote push (re-engagement
 * campaigns sent from the Firebase Console — "3 days since you last opened",
 * "Ramadan has started", etc.). This only wires up the client side: subscribing to
 * broad topics ('all_users' and a per-language topic) so campaigns can be sent by
 * topic without any backend/per-token targeting infrastructure.
 */
export async function initializePushNotifications(): Promise<void> {
  if (initialized) return;

  try {
    // Only checks — never prompts. The permission prompt belongs to the onboarding
    // step that explains why; prompting at cold start would pre-empt it. This is
    // re-invoked from requestNotificationPermissions() once the user grants.
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus < 1) {
      devLog('[Push] Notification permission not granted yet; skipping FCM registration');
      return;
    }
    initialized = true;

    const messaging = getMessaging();
    if (Platform.OS === 'ios') {
      await registerDeviceForRemoteMessages(messaging);
    }

    await notifee.createChannel({
      id: CAMPAIGN_CHANNEL_ID,
      name: i18n.t('notifications.channels.announcements', { defaultValue: 'Announcements' }),
      importance: AndroidImportance.DEFAULT,
    });

    const token = await getToken(messaging);
    devLog('[Push] FCM token:', token);

    if (await getAnnouncementsEnabled()) {
      for (const topic of campaignTopics()) {
        await subscribeToTopic(messaging, topic);
      }
    }

    // Foreground messages don't show a system notification automatically — display one.
    onMessage(messaging, async (remoteMessage) => {
      const title = remoteMessage.notification?.title || remoteMessage.data?.title;
      const body = remoteMessage.notification?.body || remoteMessage.data?.body;
      if (!title && !body) return;
      try {
        await notifee.displayNotification({
          title: title as string | undefined,
          body: body as string | undefined,
          // Keeps the data so tapping it routes the same way as a tray tap (see _layout.tsx).
          data: remoteMessage.data as Record<string, string> | undefined,
          android: { channelId: CAMPAIGN_CHANNEL_ID, importance: AndroidImportance.DEFAULT },
        });
      } catch (e) {
        devError('[Push] Failed to display foreground campaign notification:', e);
      }
    });

    onNotificationOpenedApp(messaging, (remoteMessage) => {
      devLog('[Push] Notification opened app:', remoteMessage.data);
    });

    onTokenRefresh(messaging, (newToken) => {
      devLog('[Push] FCM token refreshed:', newToken);
    });
  } catch (e) {
    devError('[Push] Failed to initialize push notifications:', e);
  }
}
