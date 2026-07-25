import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { audioManager } from './src/services/audioManager';

// 1. Register background event handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED) {
    if (detail.notification?.data?.prayerId) {
      const isExact = detail.notification.data.type === 'exact';
      console.log('Attempting to play adhan. Type:', isExact ? 'azizallah' : 'adhan');
      await audioManager.playAdhan(isExact ? 'azizallah' : 'adhan');
    }
  } else if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_sound') {
    console.log('Stop sound action pressed in background');
    audioManager.stopAdhan();
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    await notifee.stopForegroundService();
  }
});

// 2. Register foreground service handler
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // Keep foreground service alive until stopped manually
  });
});

export function App() {
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
