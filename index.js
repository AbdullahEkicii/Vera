import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { audioManager } from './src/services/audioManager';

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

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_sound') {
    console.log('Stop sound action pressed in background');
    audioManager.stopAdhan();
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }
});

export function App() {
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
