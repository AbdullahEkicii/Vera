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
} from '@react-native-firebase/messaging';
import i18n from '../localization/i18n';

const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

const CAMPAIGN_CHANNEL_ID = 'ezan_campaign_notifications';

let initialized = false;

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
      name: 'Duyurular',
      importance: AndroidImportance.DEFAULT,
    });

    const token = await getToken(messaging);
    devLog('[Push] FCM token:', token);

    await subscribeToTopic(messaging, 'all_users');
    const baseLang = (i18n.language || 'en').split('-')[0].toLowerCase();
    await subscribeToTopic(messaging, `lang_${baseLang}`);

    // Foreground messages don't show a system notification automatically — display one.
    onMessage(messaging, async (remoteMessage) => {
      const title = remoteMessage.notification?.title || remoteMessage.data?.title;
      const body = remoteMessage.notification?.body || remoteMessage.data?.body;
      if (!title && !body) return;
      try {
        await notifee.displayNotification({
          title: title as string | undefined,
          body: body as string | undefined,
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
