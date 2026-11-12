import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { audioManager } from './src/services/audioManager';
import { syncNextPrayerFromCache } from './src/services/notificationService';
import { reportError } from './src/services/crashReportingService';
import { recordDeliveredAlert } from './src/services/deliveryLog';

// Handles FCM remote push messages received while the app is backgrounded/killed.
// Must be registered here, at module scope, before the React tree renders.
// Guarded: this runs while the bundle is evaluated (also in headless starts), where a native
// error is fatal before the runtime is ready.
try {
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    console.log('[Push] Background message received:', remoteMessage.data);
  });
} catch (e) {
  console.warn('Could not register the FCM background handler:', e);
}

function isNotificationFresh(detail) {
  let notifTime = detail?.notification?.data?.timestamp
    ? Number(detail.notification.data.timestamp)
    : null;
  if (!notifTime && detail?.notification?.id) {
    const parts = detail.notification.id.split('-');
    const lastPart = Number(parts[parts.length - 1]);
    if (!isNaN(lastPart) && lastPart > 1000000000000) {
      notifTime = lastPart;
    }
  }
  if (!notifTime) return true;
  const now = Date.now();
  return Math.abs(now - notifTime) <= 10 * 60 * 1000;
}

try {
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED || type === EventType.PRESS) {
    const data = detail.notification?.data;
    if (data?.type === 'exact') recordDeliveredAlert(Number(data.timestamp)).catch(() => {});
  }
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_sound') {
    console.log('Stop sound action pressed in background');
    audioManager.stopAdhan();
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }

  // Refresh persistent notification and widget when background notification fires
  try {
    await syncNextPrayerFromCache();
  } catch (e) {
    // Do not swallow silently: a broken background refresh is invisible to the user and
    // would otherwise never be noticed.
    reportError(e instanceof Error ? e : new Error(String(e)), 'background notification refresh');
  }
});
} catch (e) {
  console.warn('Could not register the notifee background handler:', e);
}

export function App() {
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
